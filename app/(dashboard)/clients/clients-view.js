"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useMemo } from "react";
import { ActionIconButton } from "@/components/action-icon-button";
import { TableEditDeleteActions } from "@/components/table-edit-delete-actions";
import { Pencil, Trash2 } from "lucide-react";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { usePermissions } from "../permissions-provider";
import { formatDateEsSv } from "@/lib/datetime";
import {
  tableHeadClass,
  tableMobileListAltClass,
  tableScrollBodyClass,
  tableViewRootClass,
  tableViewSectionClass,
  tableViewSectionTitleClass,
} from "@/lib/table-scroll-shell";
import { formatElSalvadorPhoneDisplay } from "@/lib/phone";
import {
  createClientAction,
  updateClientAction,
  deleteClientAction,
  getServicesListAction,
  getClientReceiptsAction,
  createReceiptAction,
  updateReceiptAction,
  deleteReceiptByIdAction,
} from "./actions";

const EMPTY_FORM = {
  name: "",
  last_name: "",
  phone_number: "",
  reference: "",
};

const EL_SALVADOR_PHONE_PREFIX = "503";

/**
 * Show only the local 8 digits in the form (country code is fixed in the UI).
 * @param {string | null | undefined} phone
 * @returns {string}
 */
function toLocalPhoneInput(phone) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("503") && digits.length === 11) {
    return digits.slice(3);
  }
  return digits.slice(-8);
}

function getServiceImageUrl(service) {
  if (!service?.image_bucket || !service?.image_path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${service.image_bucket}/${service.image_path}`;
}

export function ClientsView({ initialClients, fetchError }) {
  const router = useRouter();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "mobile";
  const { can } = usePermissions();
  const canCreate = can("clients", "create");
  const canEdit = can("clients", "edit");
  const canDelete = can("clients", "delete");
  const clients = initialClients;
  const [formOpen, setFormOpen] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [duplicateClient, setDuplicateClient] = useState(null);

  const [servicesList, setServicesList] = useState([]);
  const [clientReceipts, setClientReceipts] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const [isLinking, setIsLinking] = useState(false);
  const [unlinkingReceiptId, setUnlinkingReceiptId] = useState(null);
  const [editingReceiptId, setEditingReceiptId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingError, setEditingError] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingServices, setPendingServices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [adderOpen, setAdderOpen] = useState(false);
  const [adderStep, setAdderStep] = useState("select");
  const [adderServiceId, setAdderServiceId] = useState("");
  const [adderValue, setAdderValue] = useState("");

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

  const resetAdder = useCallback(() => {
    setAdderOpen(false);
    setAdderStep("select");
    setAdderServiceId("");
    setAdderValue("");
    setLinkError(null);
    setEditingReceiptId(null);
    setEditingValue("");
    setEditingError(null);
  }, []);

  const openCreate = useCallback(() => {
    setFormOpen("create");
    setFormData(EMPTY_FORM);
    setFormError(null);
    setPendingServices([]);
    resetAdder();
  }, [resetAdder]);

  const openEdit = useCallback((client) => {
    setFormOpen(client);
    setFormData({
      name: client.name ?? "",
      last_name: client.last_name ?? "",
      phone_number: toLocalPhoneInput(client.phone_number),
      reference: client.reference ?? "",
    });
    setFormError(null);
    resetAdder();
  }, [resetAdder]);

  const closeForm = useCallback(() => {
    setFormOpen(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setLinkError(null);
    setPendingServices([]);
    resetAdder();
  }, [resetAdder]);

  const serviceNameById = useMemo(() => {
    const map = {};
    servicesList.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [servicesList]);

  const serviceImageUrlById = useMemo(() => {
    const map = {};
    servicesList.forEach((s) => {
      map[s.id] = getServiceImageUrl(s);
    });
    return map;
  }, [servicesList]);

  const addedServices = useMemo(() => {
    if (isEditing) {
      return clientReceipts.map((r) => ({
        id: r.id,
        serviceId: r.service_id,
        accountNumber: r.account_receipt_number,
      }));
    }
    return pendingServices.map((s) => ({
      id: s.id,
      serviceId: s.service_id,
      accountNumber: s.account_receipt_number,
    }));
  }, [isEditing, clientReceipts, pendingServices]);

  const handleOpenAdder = () => {
    setAdderOpen(true);
    setAdderStep("select");
    setAdderServiceId(servicesList[0]?.id ?? "");
    setAdderValue("");
    setLinkError(null);
  };

  const handleAdderAccept = () => {
    if (!adderServiceId) {
      setLinkError("Selecciona un servicio.");
      return;
    }
    setLinkError(null);
    setAdderStep("input");
  };

  const handleAdderSave = async () => {
    const value = adderValue.trim();
    if (!adderServiceId || !value) {
      setLinkError("El número de cuenta/recibo es requerido.");
      return;
    }
    setLinkError(null);

    if (isEditing) {
      setIsLinking(true);
      const result = await createReceiptAction({
        client_id: formOpen.id,
        service_id: adderServiceId,
        account_receipt_number: value,
      });
      setIsLinking(false);
      if (result.error) {
        setLinkError(result.error);
        return;
      }
      const receiptsRes = await getClientReceiptsAction(formOpen.id);
      if (!receiptsRes.error) setClientReceipts(receiptsRes.receipts ?? []);
      router.refresh();
    } else {
      setPendingServices((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}-${Math.random()}`,
          service_id: adderServiceId,
          account_receipt_number: value,
        },
      ]);
    }
    resetAdder();
  };

  const handleRemovePendingService = (tempId) => {
    setPendingServices((prev) => prev.filter((s) => s.id !== tempId));
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

  const handleStartEdit = (item) => {
    setEditingReceiptId(item.id);
    setEditingValue(item.accountNumber ?? "");
    setEditingError(null);
  };

  const handleCancelEdit = () => {
    setEditingReceiptId(null);
    setEditingValue("");
    setEditingError(null);
  };

  const handleSaveEdit = async (item) => {
    const value = editingValue.trim();
    if (!value) {
      setEditingError("El número de cuenta/recibo es requerido.");
      return;
    }
    setEditingError(null);

    if (isEditing) {
      setIsSavingEdit(true);
      const result = await updateReceiptAction(item.id, value);
      setIsSavingEdit(false);
      if (result.error) {
        setEditingError(result.error);
        return;
      }
      setClientReceipts((prev) =>
        prev.map((r) =>
          r.id === item.id ? { ...r, account_receipt_number: value } : r
        )
      );
      router.refresh();
    } else {
      setPendingServices((prev) =>
        prev.map((s) =>
          s.id === item.id ? { ...s, account_receipt_number: value } : s
        )
      );
    }
    handleCancelEdit();
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (isEditing) {
      const result = await updateClientAction(formOpen.id, formData);
      setIsSubmitting(false);
      if (result.duplicate) {
        setDuplicateClient(result.duplicate);
        return;
      }
      if (result.error) {
        setFormError(result.error);
        return;
      }
      closeForm();
      router.refresh();
      return;
    }

    const result = await createClientAction(formData);
    if (result.duplicate) {
      setIsSubmitting(false);
      setDuplicateClient(result.duplicate);
      return;
    }
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
    <div className={tableViewRootClass}>
      <header className="shrink-0 space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="h-10 w-1 shrink-0 rounded-full bg-emerald-500"
              aria-hidden
            />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tablet:text-3xl">
              Clientes
            </h1>
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-11 w-fit shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-all duration-200 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:focus:ring-offset-zinc-900"
              aria-label="Agregar cliente"
            >
              Agregar cliente
            </button>
          )}
        </div>
        <p className="pl-4 text-sm text-zinc-600 dark:text-zinc-400 tablet:text-base">
          Ver y gestionar clientes. Agregar o editar clientes y asignar servicios.
          {clients.length > 0 ? (
            <>
              {" "}
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                {clients.length}{" "}
                {clients.length === 1 ? "cliente" : "clientes"}
              </span>
            </>
          ) : null}
        </p>
      </header>

      {fetchError && (
        <div
          role="alert"
          className="shrink-0 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {fetchError}
        </div>
      )}

      {clients.length > 0 && (
        <div className="relative shrink-0">
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

      <div className={tableViewSectionClass}>
        <div className={tableViewSectionTitleClass}>
          <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Lista de clientes
          </h2>
        </div>

        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 px-4 py-20 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              aria-hidden
            >
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Aún no hay clientes. Agrega tu primer cliente para comenzar.
            </p>
            {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-all hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              aria-label="Agregar cliente"
            >
              Agregar cliente
            </button>
            )}
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
          <ul className={tableMobileListAltClass} role="list">
            {filteredClients.map((client, index) => (
              <li
                key={client.id}
                className="flex flex-col gap-2 px-4 py-4 first:pt-4 last:pb-4 transition-colors hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 tablet:px-6"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400" aria-hidden>
                    {index + 1}.
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {client.name} {client.last_name}
                  </span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {formatElSalvadorPhoneDisplay(client.phone_number) || "—"}
                  </span>
                  {client.reference && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-500">
                      Ref: {client.reference}
                    </span>
                  )}
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    {formatDateEsSv(client.created_at)}
                  </span>
                </div>
                <TableEditDeleteActions
                  canEdit={canEdit}
                  canDelete={canDelete}
                  editLabel={`Editar ${client.name} ${client.last_name}`}
                  deleteLabel={`Eliminar ${client.name} ${client.last_name}`}
                  onEdit={() => openEdit(client)}
                  onDelete={() => handleDeleteClick(client)}
                  className="flex items-center gap-1 pt-2"
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className={tableScrollBodyClass}>
            <table className="w-full text-left text-sm" role="grid">
              <thead className={tableHeadClass}>
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
                  {(canEdit || canDelete) && (
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Acciones
                  </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client, index) => (
                  <tr
                    key={client.id}
                    className="border-b border-zinc-100 last:border-0 transition-colors hover:bg-emerald-50/40 dark:border-zinc-800 dark:hover:bg-emerald-950/10"
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
                      {formatElSalvadorPhoneDisplay(client.phone_number) || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400 tablet:px-6">
                      {client.reference || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-500 dark:text-zinc-500 tablet:px-6">
                      {formatDateEsSv(client.created_at)}
                    </td>
                    {(canEdit || canDelete) && (
                    <td className="px-4 py-3.5 tablet:px-6">
                      <TableEditDeleteActions
                        canEdit={canEdit}
                        canDelete={canDelete}
                        editLabel={`Editar ${client.name} ${client.last_name}`}
                        deleteLabel={`Eliminar ${client.name} ${client.last_name}`}
                        onEdit={() => openEdit(client)}
                        onDelete={() => handleDeleteClick(client)}
                      />
                    </td>
                    )}
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
                <div className="flex overflow-hidden rounded-xl border border-zinc-300 bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:focus-within:border-emerald-400 dark:focus-within:ring-emerald-500/30">
                  <span
                    className="flex shrink-0 items-center border-r border-zinc-300 bg-zinc-50 px-3 text-sm font-medium text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300"
                    aria-hidden
                  >
                    {EL_SALVADOR_PHONE_PREFIX}
                  </span>
                  <input
                    id="client-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={8}
                    placeholder="70000000"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        phone_number: e.target.value.replace(/\D/g, "").slice(0, 8),
                      }))
                    }
                    disabled={isSubmitting}
                    className="w-full border-0 bg-transparent px-4 py-2.5 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-0 disabled:opacity-50 dark:text-zinc-100 dark:placeholder-zinc-500"
                    aria-label="Número de teléfono de El Salvador"
                  />
                </div>
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Se guarda como {EL_SALVADOR_PHONE_PREFIX} + 8 dígitos
                </p>
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
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Servicios
                  </h3>
                  {!adderOpen && servicesList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleOpenAdder}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                      aria-label="Agregar servicio"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Agregar
                    </button>
                  )}
                </div>
                <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                  {isEditing
                    ? "Vincular o desvincular servicios. Puedes agregar múltiples cuentas por servicio (ej. dos cuentas de Claro con diferentes números de cuenta/recibo)."
                    : "Agrega servicios que se vincularán automáticamente al crear el cliente."}
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
                  <>
                    {addedServices.length > 0 ? (
                      <ul className="space-y-2" role="list">
                        {addedServices.map((item) => {
                          const isUnlinking = unlinkingReceiptId === item.id;
                          const isRowEditing = editingReceiptId === item.id;
                          return (
                            <li
                              key={item.id}
                              className="flex flex-col gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                {serviceImageUrlById[item.serviceId] ? (
                                  <img
                                    src={serviceImageUrlById[item.serviceId]}
                                    alt={`Imagen de ${serviceNameById[item.serviceId] ?? "servicio"}`}
                                    className="h-10 w-10 shrink-0 rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
                                  />
                                ) : (
                                  <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-600"
                                    aria-hidden
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                                <div className="flex min-w-0 flex-1 flex-col">
                                  <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                                    {serviceNameById[item.serviceId] ?? "Servicio"}
                                  </span>
                                  {isRowEditing ? (
                                    <>
                                      <input
                                        type="text"
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleSaveEdit(item);
                                          }
                                          if (e.key === "Escape") handleCancelEdit();
                                        }}
                                        disabled={isSavingEdit}
                                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                        placeholder="Número de cuenta/recibo"
                                        aria-label="Editar número de cuenta/recibo"
                                        autoFocus
                                      />
                                      {editingError && (
                                        <span className="mt-1 text-xs text-red-600 dark:text-red-400">
                                          {editingError}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                                      {item.accountNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
                                {isRowEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEdit(item)}
                                      disabled={isSavingEdit}
                                      className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50 dark:text-emerald-400"
                                      aria-label={`Guardar ${item.accountNumber}`}
                                    >
                                      {isSavingEdit ? "…" : "Guardar"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEdit}
                                      disabled={isSavingEdit}
                                      className="text-xs font-medium text-zinc-500 hover:underline disabled:opacity-50 dark:text-zinc-400"
                                      aria-label="Cancelar edición"
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <ActionIconButton
                                      label={`Editar ${item.accountNumber}`}
                                      tone="info"
                                      onClick={() => handleStartEdit(item)}
                                      disabled={isUnlinking}
                                    >
                                      <Pencil className="h-4 w-4" aria-hidden />
                                    </ActionIconButton>
                                    <ActionIconButton
                                      label={
                                        isEditing
                                          ? `Desvincular ${item.accountNumber}`
                                          : `Quitar ${item.accountNumber}`
                                      }
                                      tone="danger"
                                      onClick={() =>
                                        isEditing
                                          ? handleUnlinkReceipt(item.id)
                                          : handleRemovePendingService(item.id)
                                      }
                                      disabled={isEditing && isUnlinking}
                                    >
                                      <Trash2 className="h-4 w-4" aria-hidden />
                                    </ActionIconButton>
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      !adderOpen && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          Aún no hay servicios vinculados. Usa el botón “Agregar”.
                        </p>
                      )
                    )}

                    {adderOpen && (
                      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-emerald-300/70 bg-emerald-50/40 p-4 dark:border-emerald-500/40 dark:bg-emerald-950/20">
                        {adderStep === "select" ? (
                          <>
                            <label
                              htmlFor="adder-service"
                              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                            >
                              Servicio
                            </label>
                            <select
                              id="adder-service"
                              value={adderServiceId}
                              onChange={(e) => setAdderServiceId(e.target.value)}
                              className={inputClass}
                              aria-label="Seleccionar servicio"
                            >
                              {servicesList.map((service) => (
                                <option key={service.id} value={service.id}>
                                  {service.name}
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={resetAdder}
                                className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                aria-label="Cancelar"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleAdderAccept}
                                disabled={!adderServiceId}
                                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                                aria-label="Aceptar servicio"
                              >
                                Aceptar
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <label
                              htmlFor="adder-value"
                              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                            >
                              {serviceNameById[adderServiceId] ?? "Servicio"} ·
                              Número de cuenta/recibo
                            </label>
                            <input
                              id="adder-value"
                              type="text"
                              autoFocus
                              placeholder="Número de cuenta/recibo"
                              value={adderValue}
                              onChange={(e) => setAdderValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAdderSave();
                                }
                              }}
                              disabled={isLinking}
                              className={inputClass}
                              aria-label="Número de cuenta/recibo"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setAdderStep("select")}
                                disabled={isLinking}
                                className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                aria-label="Volver"
                              >
                                Atrás
                              </button>
                              <button
                                type="button"
                                onClick={handleAdderSave}
                                disabled={isLinking || !adderValue.trim()}
                                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                                aria-label="Guardar servicio"
                              >
                                {isLinking ? "Guardando…" : "Guardar"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {linkError && (
                  <div
                    role="alert"
                    className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
                  >
                    {linkError}
                  </div>
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

      {/* Duplicate phone number warning */}
      {duplicateClient && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="duplicate-dialog-title"
          aria-describedby="duplicate-dialog-desc"
        >
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                <svg
                  className="h-5 w-5 text-amber-600 dark:text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <h2
                  id="duplicate-dialog-title"
                  className="text-xl font-bold text-zinc-900 dark:text-zinc-50"
                >
                  Número de teléfono duplicado
                </h2>
                <p
                  id="duplicate-dialog-desc"
                  className="mt-2 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  Ya existe un contacto registrado con el número{" "}
                  <strong className="text-zinc-900 dark:text-zinc-50">
                    {formatElSalvadorPhoneDisplay(duplicateClient.phone_number)}
                  </strong>
                  .
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Contacto existente
              </p>
              <p className="mt-1.5 font-semibold text-zinc-900 dark:text-zinc-50">
                {duplicateClient.name} {duplicateClient.last_name}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {formatElSalvadorPhoneDisplay(duplicateClient.phone_number) || "—"}
              </p>
              {duplicateClient.reference && (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                  Ref: {duplicateClient.reference}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 tablet:flex-row">
              <button
                type="button"
                onClick={() => setDuplicateClient(null)}
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                aria-label="Cerrar y corregir el número"
              >
                Corregir número
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = duplicateClient;
                  setDuplicateClient(null);
                  openEdit(target);
                }}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:focus:ring-offset-zinc-900"
                aria-label="Ver el contacto existente"
              >
                Ver contacto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
