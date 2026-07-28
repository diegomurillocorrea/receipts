"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { Copy, LoaderCircle, MessageCircleMore, Pencil, Trash2 } from "lucide-react";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { deletePaymentAction } from "./actions";
import {
  PAYMENT_STATUS_REGISTERED,
  PAYMENT_STATUS_PAID,
  PAYMENT_STATUS_CANCELLED,
  PAYMENT_STATUS_SENT,
  normalizePaymentStatus,
  getPaymentStatusLabel,
} from "./constants";
import { usePermissions } from "../permissions-provider";

function formatAmount(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

/** Format: dd/mm/aa - h:mm a.m.|p.m. (12h) */
function formatPaymentDateHour(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "—";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const aa = String(d.getFullYear()).slice(-2);

  const hours24 = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const isPm = hours24 >= 12;
  const hours12 = hours24 % 12 || 12;
  const meridiem = isPm ? "p.m." : "a.m.";

  return `${dd}/${mm}/${aa} - ${hours12}:${minutes} ${meridiem}`;
}

function normalizeReceiptRef(receipt) {
  if (!receipt) return null;
  if (Array.isArray(receipt)) return receipt[0] ?? null;
  return receipt;
}

function normalizeClient(client) {
  if (!client) return null;
  if (Array.isArray(client)) return client[0] ?? null;
  return client;
}

function getClientDisplayName(client) {
  const c = normalizeClient(client);
  if (!c) return "—";
  const fullName = [c.name, c.last_name].filter(Boolean).join(" ").trim();
  return fullName || "—";
}

function getReceiptLabel(receipt) {
  const r = normalizeReceiptRef(receipt);
  if (!r) return "";
  const clientName = getClientDisplayName(r.clients ?? r.client);
  const service = r.services ?? r.service;
  const svc = Array.isArray(service) ? service[0] : service;
  const serviceName = svc?.name ?? "—";
  const account = r.account_receipt_number ?? "";
  return `${clientName} · ${serviceName}${account ? ` (${account})` : ""}`;
}

function getPaymentReceiptDisplay(payment) {
  return getReceiptLabel(payment.receipt ?? payment.receipts);
}

function getPaymentClientName(payment) {
  const receipt = normalizeReceiptRef(payment.receipt ?? payment.receipts);
  return getClientDisplayName(receipt?.clients ?? receipt?.client);
}

function getPaymentAccountNumber(payment) {
  const receipt = normalizeReceiptRef(payment.receipt ?? payment.receipts);
  return (receipt?.account_receipt_number ?? "").trim();
}

function getPaymentServiceId(payment) {
  const receipt = normalizeReceiptRef(payment.receipt ?? payment.receipts);
  if (!receipt) return null;
  const service = receipt.services ?? receipt.service;
  const svc = Array.isArray(service) ? service[0] : service;
  return svc?.id ?? null;
}

function getPaymentServiceImageUrl(payment) {
  const receipt = normalizeReceiptRef(payment.receipt ?? payment.receipts);
  if (!receipt) return null;
  const service = receipt.services ?? receipt.service;
  const svc = Array.isArray(service) ? service[0] : service;
  if (!svc?.image_bucket || !svc?.image_path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${svc.image_bucket}/${svc.image_path}`;
}

function ServiceImageThumb({ url, size = "h-9 w-9", rounded = "rounded-lg" }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`${size} shrink-0 ${rounded} border border-zinc-200 object-contain bg-white dark:border-zinc-700 dark:bg-zinc-800`}
      />
    );
  }
  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center ${rounded} border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-600`}
      aria-hidden
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

function getStatusBadgeClass(status) {
  switch (normalizePaymentStatus(status)) {
    case PAYMENT_STATUS_PAID:
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
    case PAYMENT_STATUS_CANCELLED:
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
    case PAYMENT_STATUS_SENT:
      return "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300";
    case PAYMENT_STATUS_REGISTERED:
    default:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
  }
}

function isPaidStatus(status) {
  return normalizePaymentStatus(status) === PAYMENT_STATUS_PAID;
}

function StatusBadge({ status }) {
  const label = getPaymentStatusLabel(status);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(status)}`}
      aria-label={`Estado: ${label}`}
    >
      {label}
    </span>
  );
}

const actionIconBaseClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50";

function ActionIconButton({
  label,
  onClick,
  disabled,
  tone = "muted",
  children,
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40"
      : tone === "primary"
        ? "text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800";

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${actionIconBaseClass} ${toneClass}`}
        aria-label={label}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {label}
      </span>
    </span>
  );
}

function CopyIconButton({ value, label, onCopied, onError }) {
  const handleClick = async () => {
    const text = (value ?? "").trim();
    if (!text || text === "—") {
      onError?.("No hay texto para copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      onCopied?.(label);
    } catch {
      onError?.("No se pudo copiar.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
      aria-label={label}
      title={label}
    >
      <Copy className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

function PaymentActions({
  payment,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onSendWhatsAppConfirmation,
  sendingWhatsAppPaymentIds,
}) {
  const items = [];

  if (canEdit) {
    items.push({
      id: "edit",
      node: (
        <ActionIconButton
          label="Editar"
          tone="primary"
          onClick={() => onEdit(payment)}
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </ActionIconButton>
      ),
    });
  }

  if (canDelete) {
    items.push({
      id: "delete",
      node: (
        <ActionIconButton
          label="Eliminar"
          tone="danger"
          onClick={() => onDelete(payment)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </ActionIconButton>
      ),
    });
  }

  const isSendingWhatsApp = sendingWhatsAppPaymentIds.has(payment.id);
  items.push({
    id: "whatsapp-confirmation",
    node: (
      <ActionIconButton
        label="Enviar confirmación de pago por WhatsApp"
        tone="primary"
        disabled={isSendingWhatsApp}
        onClick={() => onSendWhatsAppConfirmation(payment)}
      >
        {isSendingWhatsApp ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <MessageCircleMore className="h-4 w-4" aria-hidden />
        )}
      </ActionIconButton>
    ),
  });

  if (items.length === 0) {
    return <span className="text-sm text-zinc-400 dark:text-zinc-500">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map((item) => (
        <span key={item.id} className="inline-flex">
          {item.node}
        </span>
      ))}
    </div>
  );
}

function ServicioCell({ payment, onCopied, onCopyError }) {
  const clientName = getPaymentClientName(payment);
  const accountNumber = getPaymentAccountNumber(payment) || "—";
  const imageUrl = getPaymentServiceImageUrl(payment);

  return (
    <div className="flex min-w-0 items-start gap-3 text-left">
      <ServiceImageThumb
        url={imageUrl}
        size="h-11 w-11"
        rounded="rounded-full"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 items-center gap-1">
          <p className="min-w-0 truncate text-sm text-zinc-900 dark:text-zinc-50">
            <span className="font-medium text-zinc-500 dark:text-zinc-400">
              Cliente:{" "}
            </span>
            {clientName}
          </p>
          <CopyIconButton
            value={clientName}
            label="Copiar nombre del cliente"
            onCopied={onCopied}
            onError={onCopyError}
          />
        </div>
        <div className="flex min-w-0 items-center gap-1">
          <p className="min-w-0 truncate text-sm text-zinc-900 dark:text-zinc-50">
            <span className="font-medium text-zinc-500 dark:text-zinc-400">
              ID Servicio:{" "}
            </span>
            {accountNumber}
          </p>
          <CopyIconButton
            value={accountNumber}
            label="Copiar ID de servicio"
            onCopied={onCopied}
            onError={onCopyError}
          />
        </div>
      </div>
    </div>
  );
}

export function PaymentsView({ initialPayments, initialPaymentMethods, fetchError }) {
  const router = useRouter();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "mobile";

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [whatsAppFeedback, setWhatsAppFeedback] = useState(null);
  const [sendingWhatsAppPaymentIds, setSendingWhatsAppPaymentIds] = useState(
    () => new Set()
  );
  const sendingWhatsAppPaymentIdsRef = useRef(new Set());

  const { can } = usePermissions();
  const canEditPaymentPerm = can("payments", "edit");
  const canDeletePayment = can("payments", "delete");

  const payments = initialPayments ?? [];

  useEffect(() => {
    if (!copyFeedback && !whatsAppFeedback) return;
    const timer = setTimeout(() => {
      setCopyFeedback(null);
      setWhatsAppFeedback(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [copyFeedback, whatsAppFeedback]);

  const handleEditPayment = useCallback(
    (payment) => {
      const serviceId = getPaymentServiceId(payment);
      const account = getPaymentAccountNumber(payment);
      if (!serviceId || !account || !payment?.id) return;
      router.push(
        `/${serviceId}/${encodeURIComponent(account)}?paymentId=${payment.id}`
      );
    },
    [router]
  );

  const handleDeleteClick = useCallback((payment) => {
    setDeleteTarget(payment);
    setDeleteError(null);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deletePaymentAction(deleteTarget.id);
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

  const handleSendWhatsAppConfirmation = useCallback(
    async (payment) => {
      const paymentId = payment?.id;
      if (!paymentId || sendingWhatsAppPaymentIdsRef.current.has(paymentId)) return;

      sendingWhatsAppPaymentIdsRef.current.add(paymentId);
      setSendingWhatsAppPaymentIds((current) => new Set(current).add(paymentId));
      setWhatsAppFeedback(null);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);

      try {
        const response = await fetch(
          `/api/payments/${encodeURIComponent(paymentId)}/send-whatsapp`,
          {
            method: "POST",
            cache: "no-store",
            signal: controller.signal,
          }
        );
        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.error ?? "No se pudo enviar la confirmación por WhatsApp."
          );
        }

        setWhatsAppFeedback({
          type: "success",
          message:
            "Confirmación de pago por WhatsApp enviada a Meta correctamente.",
        });
        router.refresh();
      } catch (error) {
        const message =
          error?.name === "AbortError"
            ? "El envío tardó demasiado. Revisa el estado antes de volver a intentarlo."
            : error instanceof Error
              ? error.message
              : "No se pudo enviar la confirmación por WhatsApp.";
        setWhatsAppFeedback({ type: "error", message });
      } finally {
        clearTimeout(timeout);
        sendingWhatsAppPaymentIdsRef.current.delete(paymentId);
        setSendingWhatsAppPaymentIds((current) => {
          const next = new Set(current);
          next.delete(paymentId);
          return next;
        });
      }
    },
    [router]
  );

  const handleCopied = useCallback((label) => {
    setCopyFeedback(
      label.includes("cliente") ? "Nombre copiado" : "ID de servicio copiado"
    );
  }, []);

  const handleCopyError = useCallback((message) => {
    setCopyFeedback(message);
  }, []);

  const actionHandlers = {
    canEdit: canEditPaymentPerm,
    canDelete: canDeletePayment,
    onEdit: handleEditPayment,
    onDelete: handleDeleteClick,
    onSendWhatsAppConfirmation: handleSendWhatsAppConfirmation,
    sendingWhatsAppPaymentIds,
  };

  return (
    <div className="space-y-6 tablet:space-y-8">
      <header className="flex items-start gap-3">
        <span
          className="mt-1 h-10 w-1 shrink-0 rounded-full bg-emerald-500"
          aria-hidden
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tablet:text-3xl">
            Pagos
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 tablet:text-base">
            Consulta y gestiona los pagos registrados.
            {payments.length > 0 ? (
              <>
                {" "}
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  {payments.length} {payments.length === 1 ? "pago" : "pagos"}
                </span>
              </>
            ) : null}
          </p>
        </div>
      </header>

      {fetchError && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {fetchError}
        </div>
      )}

      <section
        className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        aria-label="Lista de pagos"
      >
        <div className="border-b-2 border-emerald-500 bg-emerald-50/40 px-4 py-3.5 dark:bg-emerald-950/20 tablet:px-6">
          <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Lista de pagos
          </h2>
        </div>

        {payments.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center"
            role="status"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              aria-hidden
            >
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No hay pagos para mostrar.
            </p>
          </div>
        ) : isMobile ? (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="space-y-3 px-4 py-4 transition-colors hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10"
              >
                <ServicioCell
                  payment={payment}
                  onCopied={handleCopied}
                  onCopyError={handleCopyError}
                />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span
                    className={`font-medium ${
                      isPaidStatus(payment.status)
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-zinc-900 dark:text-zinc-50"
                    }`}
                  >
                    Monto: {formatAmount(payment.total_amount)}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Comisión: {formatAmount(payment.commission)}
                  </span>
                  <StatusBadge status={payment.status} />
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {formatPaymentDateHour(payment.created_at)}
                  </span>
                </div>
                <PaymentActions
                  payment={payment}
                  {...actionHandlers}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="grid">
              <thead>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800">
                  <th
                    className="px-4 py-3.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6"
                    scope="col"
                  >
                    Servicio
                  </th>
                  <th
                    className="px-4 py-3.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6"
                    scope="col"
                  >
                    Monto
                  </th>
                  <th
                    className="px-4 py-3.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6"
                    scope="col"
                  >
                    Comisión
                  </th>
                  <th
                    className="px-4 py-3.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6"
                    scope="col"
                  >
                    Estado
                  </th>
                  <th
                    className="px-4 py-3.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6"
                    scope="col"
                  >
                    Fecha / Hora
                  </th>
                  <th
                    className="px-4 py-3.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6"
                    scope="col"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-zinc-100 last:border-0 transition-colors hover:bg-emerald-50/40 dark:border-zinc-800 dark:hover:bg-emerald-950/10"
                  >
                    <td className="max-w-md px-4 py-3.5 tablet:px-6">
                      <ServicioCell
                        payment={payment}
                        onCopied={handleCopied}
                        onCopyError={handleCopyError}
                      />
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3.5 font-medium tablet:px-6 ${
                        isPaidStatus(payment.status)
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-zinc-900 dark:text-zinc-50"
                      }`}
                    >
                      {formatAmount(payment.total_amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-zinc-600 dark:text-zinc-400 tablet:px-6">
                      {formatAmount(payment.commission)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 tablet:px-6">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-zinc-600 dark:text-zinc-400 tablet:px-6">
                      {formatPaymentDateHour(payment.created_at)}
                    </td>
                    <td className="px-4 py-3.5 tablet:px-6">
                      <PaymentActions
                        payment={payment}
                        {...actionHandlers}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {copyFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-4 right-4 z-40 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200 tablet:left-auto tablet:right-4 tablet:max-w-sm"
        >
          {copyFeedback}
        </div>
      )}

      {whatsAppFeedback && (
        <div
          role={whatsAppFeedback.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`fixed bottom-4 left-4 right-4 z-40 rounded-xl px-4 py-3 text-sm shadow-lg tablet:left-auto tablet:right-4 tablet:max-w-sm ${
            whatsAppFeedback.type === "error"
              ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span>{whatsAppFeedback.message}</span>
            <button
              type="button"
              onClick={() => setWhatsAppFeedback(null)}
              className="shrink-0 rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Cerrar"
            >
              <span aria-hidden>×</span>
            </button>
          </div>
        </div>
      )}

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
              Eliminar pago
            </h2>
            <p id="delete-dialog-desc" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              ¿Eliminar el pago de{" "}
              <strong>{formatAmount(deleteTarget.total_amount)}</strong>? Esta acción no se
              puede deshacer.
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
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                aria-busy={isDeleting}
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
