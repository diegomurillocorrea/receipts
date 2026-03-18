"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import {
  createClientAction,
  updateClientAction,
  deleteClientAction,
  getServicesListAction,
  getClientReceiptsAction,
  createReceiptAction,
  deleteReceiptByIdAction,
} from "./actions";

const EMPTY_FORM = {
  name: "",
  last_name: "",
  phone_number: "",
  reference: "",
};

function formatDate(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("es-SV", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ClientsView({ initialClients, fetchError }) {
  const router = useRouter();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "mobile";
  const clients = initialClients;
  const [formOpen, setFormOpen] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [servicesList, setServicesList] = useState([]);
  const [clientReceipts, setClientReceipts] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [linkForm, setLinkForm] = useState({ serviceId: null, accountNumber: "" });
  const [linkError, setLinkError] = useState(null);
  const [isLinking, setIsLinking] = useState(false);
  const [unlinkingReceiptId, setUnlinkingReceiptId] = useState(null);
  const [pendingServices, setPendingServices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const isEditing = formOpen && formOpen !== "create";

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.trim().toLowerCase();
    return clients.filter((c) => {
      const name = (c.name ?? "").toLowerCase();
      const lastName = (c.last_name ?? "").toLowerCase();
      const phone = (c.phone_number ?? "").toString();
      const fullName = `${name} ${lastName}`.trim();
      const fullNameReversed = `${lastName} ${name}`.trim();
      return (
        name.includes(q) ||
        lastName.includes(q) ||
        fullName.includes(q) ||
        fullNameReversed.includes(q) ||
        phone.includes(q)
      );
    });
  }, [clients, searchQuery]);

  useEffect(() => {
    if (!formOpen) {
      setServicesList([]);
      setClientReceipts([]);
      return;
    }
    let cancelled = false;
    setServicesLoading(true);
    
    if (isEditing && formOpen?.id) {
      Promise.all([
        getServicesListAction(),
        getClientReceiptsAction(formOpen.id),
      ]).then(([servicesRes, receiptsRes]) => {
        if (cancelled) return;
        setServicesLoading(false);
        if (servicesRes.error) return;
        if (receiptsRes.error) return;
        setServicesList(servicesRes.services ?? []);
        setClientReceipts(receiptsRes.receipts ?? []);
      });
    } else {
      getServicesListAction().then((servicesRes) => {
        if (cancelled) return;
        setServicesLoading(false);
        if (servicesRes.error) return;
        setServicesList(servicesRes.services ?? []);
      });
    }
    
    return () => {
      cancelled = true;
    };
  }, [isEditing, formOpen?.id, formOpen]);

  const openCreate = useCallback(() => {
    setFormOpen("create");
    setFormData(EMPTY_FORM);
    setFormError(null);
    setPendingServices([]);
  }, []);

  const openEdit = useCallback((client) => {
    setFormOpen(client);
    setFormData({
      name: client.name ?? "",
      last_name: client.last_name ?? "",
      phone_number: client.phone_number ?? "",
      reference: client.reference ?? "",
    });
    setFormError(null);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setLinkForm({ serviceId: null, accountNumber: "" });
    setLinkError(null);
    setPendingServices([]);
  }, []);

  const getReceiptsForService = useCallback(
    (serviceId) =>
      clientReceipts.filter((r) => r.service_id === serviceId),
    [clientReceipts]
  );

  const getPendingServicesForService = useCallback(
    (serviceId) =>
      pendingServices.filter((s) => s.service_id === serviceId),
    [pendingServices]
  );

  const handleAddPendingService = (e, serviceId) => {
    e.preventDefault();
    const accountNumber =
      serviceId === linkForm.serviceId
        ? linkForm.accountNumber?.trim()
        : "";
    if (!serviceId || !accountNumber) {
      setLinkError("El número de cuenta/recibo es requerido.");
      return;
    }
    setLinkError(null);
    setPendingServices((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${Math.random()}`,
        service_id: serviceId,
        account_receipt_number: accountNumber,
      },
    ]);
    setLinkForm({ serviceId: null, accountNumber: "" });
  };

  const handleRemovePendingService = (tempId) => {
    setPendingServices((prev) => prev.filter((s) => s.id !== tempId));
  };

  const handleLinkService = async (e, serviceId) => {
    e.preventDefault();
    const accountNumber =
      serviceId === linkForm.serviceId
        ? linkForm.accountNumber?.trim()
        : "";
    if (!isEditing || !serviceId || !accountNumber) {
      setLinkError("El número de cuenta/recibo es requerido.");
      return;
    }
    setLinkError(null);
    setIsLinking(true);
    const result = await createReceiptAction({
      client_id: formOpen.id,
      service_id: serviceId,
      account_receipt_number: accountNumber,
    });
    setIsLinking(false);
    if (result.error) {
      setLinkError(result.error);
      return;
    }
    setLinkForm({ serviceId: null, accountNumber: "" });
    const receiptsRes = await getClientReceiptsAction(formOpen.id);
    if (!receiptsRes.error) setClientReceipts(receiptsRes.receipts ?? []);
    router.refresh();
  };

  const handleUnlinkReceipt = async (receiptId) => {
    if (!isEditing) return;
    setUnlinkingReceiptId(receiptId);
    const result = await deleteReceiptByIdAction(receiptId);
    setUnlinkingReceiptId(null);
    if (!result.error) {
      setClientReceipts((prev) => prev.filter((r) => r.id !== receiptId));
      router.refresh();
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (isEditing) {
      const result = await updateClientAction(formOpen.id, formData);
      setIsSubmitting(false);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      closeForm();
      router.refresh();
      return;
    }

    const result = await createClientAction(formData);
    if (result.error) {
      setIsSubmitting(false);
      setFormError(result.error);
      return;
    }

    if (pendingServices.length > 0 && result.data?.id) {
      const linkPromises = pendingServices.map((service) =>
        createReceiptAction({
          client_id: result.data.id,
          service_id: service.service_id,
          account_receipt_number: service.account_receipt_number,
        })
      );
      await Promise.all(linkPromises);
    }

    setIsSubmitting(false);
    closeForm();
    router.refresh();
  };

  const handleDeleteClick = useCallback((client) => {
    setDeleteTarget(client);
    setDeleteError(null);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteClientAction(deleteTarget.id);
    setIsDeleting(false);
    if (result.error) {
      setDeleteError(result.error);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  };

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null);
    setDeleteError(null);
  }, []);

  const inputClass =
    "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30";

  return (
    <div className="space-y-6 tablet:space-y-8">
      <header className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tablet:text-3xl">
            Clientes
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 tablet:text-base">
            Ver y gestionar clientes. Agregar o editar clientes y asignar servicios.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 min-w-[10rem] items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-all duration-200 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:focus:ring-offset-zinc-900"
          aria-label="Agregar cliente"
        >
          Agregar cliente
        </button>
      </header>

      {fetchError && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {fetchError}
        </div>
      )}

      {clients.length > 0 && (
        <div className="relative">
          <label htmlFor="client-search" className="sr-only">
            Buscar por nombre, apellido o teléfono
          </label>
          <input
            id="client-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, apellido o teléfono..."
            className="w-full rounded-full border border-zinc-300 bg-white pl-10 pr-4 py-2.5 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-500/50 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
            aria-label="Buscar clientes por nombre, apellido o teléfono"
          />
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200/80 bg-zinc-50/50 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-800/30 tablet:px-6">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Lista de clientes
          </h2>
        </div>

        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 px-4 py-20 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Aún no hay clientes. Agrega tu primer cliente para comenzar.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-all hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              aria-label="Agregar cliente"
            >
              Agregar cliente
            </button>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 px-4 py-20 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No se encontraron clientes con ese criterio de búsqueda.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              aria-label="Limpiar búsqueda"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : isMobile ? (
          <ul className="divide-y divide-zinc-200/80 dark:divide-zinc-800" role="list">
            {filteredClients.map((client, index) => (
              <li
                key={client.id}
                className="flex flex-col gap-2 px-4 py-4 first:pt-4 last:pb-4 tablet:px-6"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400" aria-hidden>
                    {index + 1}.
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {client.name} {client.last_name}
                  </span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {client.phone_number || "—"}
                  </span>
                  {client.reference && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-500">
                      Ref: {client.reference}
                    </span>
                  )}
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    {formatDate(client.created_at)}
                  </span>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => openEdit(client)}
                    className="text-sm font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                    aria-label={`Editar ${client.name} ${client.last_name}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(client)}
                    className="text-sm font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                    aria-label={`Eliminar ${client.name} ${client.last_name}`}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" role="grid">
              <thead>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800">
                  <th className="w-12 px-2 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-4" scope="col">
                    #
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Nombre
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Apellido
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Teléfono
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Referencia
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Creado
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client, index) => (
                  <tr
                    key={client.id}
                    className="border-b border-zinc-100 last:border-0 transition-colors hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
                  >
                    <td className="w-12 px-2 py-3.5 text-zinc-500 dark:text-zinc-400 tablet:px-4" aria-label={`Fila ${index + 1}`}>
                      {index + 1}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-zinc-900 dark:text-zinc-50 tablet:px-6">
                      {client.name}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-900 dark:text-zinc-50 tablet:px-6">
                      {client.last_name}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400 tablet:px-6">
                      {client.phone_number || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400 tablet:px-6">
                      {client.reference || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-500 dark:text-zinc-500 tablet:px-6">
                      {formatDate(client.created_at)}
                    </td>
                    <td className="px-4 py-3.5 tablet:px-6">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(client)}
                          className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                          aria-label={`Editar ${client.name} ${client.last_name}`}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(client)}
                          className="font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                          aria-label={`Eliminar ${client.name} ${client.last_name}`}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit modal: scrollable with max-height on mobile; desktop-style on tablet+ */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm tablet:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-form-title"
        >
          <div
            className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90dvh] tablet:max-h-none tablet:p-8 p-6"
            onKeyDown={(e) => e.key === "Escape" && closeForm()}
          >
            <h2 id="client-form-title" className="shrink-0 text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {isEditing ? "Editar cliente" : "Agregar cliente"}
            </h2>
            <div className="min-h-0 flex-1 overflow-y-auto mt-6 -mr-2 pr-2 tablet:mr-0 tablet:pr-0">
            <form
              onSubmit={handleFormSubmit}
              className="flex flex-col gap-5 pb-2"
            >
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
              <div>
                <label
                  htmlFor="client-name"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  id="client-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={isSubmitting}
                  className={inputClass}
                  aria-invalid={!!formError}
                />
              </div>
              <div>
                <label
                  htmlFor="client-last-name"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Apellido <span className="text-red-500">*</span>
                </label>
                <input
                  id="client-last-name"
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                  disabled={isSubmitting}
                  className={inputClass}
                  aria-invalid={!!formError}
                />
              </div>
              <div>
                <label
                  htmlFor="client-phone"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Número de teléfono
                </label>
                <input
                  id="client-phone"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phone_number: e.target.value,
                    }))
                  }
                  disabled={isSubmitting}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="client-reference"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Referencia
                </label>
                <input
                  id="client-reference"
                  type="text"
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      reference: e.target.value,
                    }))
                  }
                  disabled={isSubmitting}
                  className={inputClass}
                />
              </div>
              </div>

              <div className="border-t border-zinc-200/80 pt-5 dark:border-zinc-700">
                <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Servicios
                </h3>
                {!isEditing ? (
                  <>
                    <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                      Agrega servicios que se vincularán automáticamente al crear el cliente.
                    </p>
                    {servicesLoading ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Cargando servicios…
                      </p>
                    ) : servicesList.length === 0 ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Aún no hay servicios definidos. Agrega servicios en la
                        sección de Servicios primero.
                      </p>
                    ) : (
                      <ul className="grid grid-cols-1 gap-3 tablet:grid-cols-2" role="list">
                        {servicesList.map((service) => {
                          const pendingForService = getPendingServicesForService(service.id);
                          return (
                            <li
                              key={service.id}
                              className="flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50"
                            >
                              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                                {service.name}
                              </span>
                              {pendingForService.length > 0 && (
                                <ul className="space-y-1.5" role="list">
                                  {pendingForService.map((pending) => (
                                    <li
                                      key={pending.id}
                                      className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200/80 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                                    >
                                      <span className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                                        {pending.account_receipt_number}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePendingService(pending.id)}
                                        className="shrink-0 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                                        aria-label={`Eliminar ${pending.account_receipt_number}`}
                                      >
                                        Quitar
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Número de cuenta/recibo"
                                  value={
                                    linkForm.serviceId === service.id
                                      ? linkForm.accountNumber
                                      : ""
                                  }
                                  onChange={(e) =>
                                    setLinkForm({
                                      serviceId: service.id,
                                      accountNumber: e.target.value,
                                    })
                                  }
                                  onFocus={() =>
                                    setLinkForm((prev) =>
                                      prev.serviceId === service.id
                                        ? prev
                                        : {
                                            serviceId: service.id,
                                            accountNumber: "",
                                          }
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddPendingService(e, service.id);
                                    }
                                  }}
                                  className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
                                  aria-label={`Número de cuenta/recibo para ${service.name}`}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => handleAddPendingService(e, service.id)}
                                  disabled={
                                    linkForm.serviceId !== service.id ||
                                    !linkForm.accountNumber?.trim()
                                  }
                                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                                  aria-label={`Agregar cuenta de ${service.name}`}
                                >
                                  Agregar
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {linkError && (
                      <div
                        role="alert"
                        className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
                      >
                        {linkError}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                      Vincular o desvincular servicios. Puedes agregar múltiples cuentas por
                      servicio (ej. dos cuentas de Claro con diferentes
                      números de cuenta/recibo).
                    </p>
                    {servicesLoading ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Cargando servicios…
                      </p>
                    ) : servicesList.length === 0 ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Aún no hay servicios definidos. Agrega servicios en la
                        sección de Servicios primero.
                      </p>
                    ) : (
                      <ul className="grid grid-cols-1 gap-3 tablet:grid-cols-2" role="list">
                        {servicesList.map((service) => {
                          const receipts = getReceiptsForService(service.id);
                          return (
                            <li
                              key={service.id}
                              className="flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50"
                            >
                              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                                {service.name}
                              </span>
                              {receipts.length > 0 && (
                                <ul className="space-y-1.5" role="list">
                                  {receipts.map((receipt) => {
                                    const isUnlinking =
                                      unlinkingReceiptId === receipt.id;
                                    return (
                                      <li
                                        key={receipt.id}
                                        className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200/80 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                                      >
                                        <span className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                                          {receipt.account_receipt_number}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUnlinkReceipt(receipt.id)
                                          }
                                          disabled={isUnlinking}
                                          className="shrink-0 text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                                          aria-label={`Eliminar ${receipt.account_receipt_number}`}
                                        >
                                          {isUnlinking ? "…" : "Desvincular"}
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Número de cuenta/recibo"
                                  value={
                                    linkForm.serviceId === service.id
                                      ? linkForm.accountNumber
                                      : ""
                                  }
                                  onChange={(e) =>
                                    setLinkForm({
                                      serviceId: service.id,
                                      accountNumber: e.target.value,
                                    })
                                  }
                                  onFocus={() =>
                                    setLinkForm((prev) =>
                                      prev.serviceId === service.id
                                        ? prev
                                        : {
                                            serviceId: service.id,
                                            accountNumber: "",
                                          }
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleLinkService(e, service.id);
                                    }
                                  }}
                                  disabled={isLinking}
                                  className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
                                  aria-label={`Número de cuenta/recibo para ${service.name}`}
                                />
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleLinkService(e, service.id)
                                  }
                                  disabled={
                                    isLinking ||
                                    (linkForm.serviceId !== service.id
                                      ? true
                                      : !linkForm.accountNumber?.trim())
                                  }
                                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                                  aria-label={`Agregar cuenta de ${service.name}`}
                                >
                                  {receipts.length === 0 ? "Vincular" : "Agregar"}
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {linkError && (
                      <div
                        role="alert"
                        className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
                      >
                        {linkError}
                      </div>
                    )}
                  </>
                )}
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
                >
                  {formError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  aria-label="Cancelar"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:focus:ring-offset-zinc-900"
                  aria-busy={isSubmitting}
                  aria-label={isEditing ? "Guardar cambios" : "Crear cliente"}
                >
                  {isSubmitting
                    ? "Guardando…"
                    : isEditing
                      ? "Guardar"
                      : "Crear"}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-desc"
        >
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id="delete-dialog-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Eliminar cliente
            </h2>
            <p id="delete-dialog-desc" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              ¿Estás seguro de que deseas eliminar a{" "}
              <strong>
                {deleteTarget.name} {deleteTarget.last_name}
              </strong>
              ? Esta acción no se puede deshacer.
            </p>
            {deleteError && (
              <div
                role="alert"
                className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
              >
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                aria-label="Cancelar"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-zinc-900"
                aria-busy={isDeleting}
                aria-label="Eliminar cliente"
              >
                {isDeleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
