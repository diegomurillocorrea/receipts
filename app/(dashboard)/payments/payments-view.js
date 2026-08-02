"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { ActionIconButton } from "@/components/action-icon-button";
import { Copy, LoaderCircle, MessageCircleMore, Pencil, Trash2 } from "lucide-react";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import {
  endOfDayEsSv,
  formatDateTimeEsSv,
  getElSalvadorParts,
  parseDateInputEsSv,
  startOfDayEsSv,
  toDateInputValueEsSv,
} from "@/lib/datetime";
import { formatAmount } from "@/lib/money";
import {
  tableHeadClass,
  tableHeadCellClass,
  tableMobileListClass,
  tableScrollBodyClass,
  tableViewRootClass,
  tableViewSectionClass,
  tableViewSectionTitleClass,
} from "@/lib/table-scroll-shell";
import { deletePaymentAction } from "./actions";
import {
  PAYMENT_STATUS_REGISTERED,
  PAYMENT_STATUS_PAID,
  PAYMENT_STATUS_SENT,
  normalizePaymentStatus,
  getPaymentStatusLabel,
} from "./constants";
import { usePermissions } from "../permissions-provider";

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

function getPaymentServiceName(payment) {
  const receipt = normalizeReceiptRef(payment.receipt ?? payment.receipts);
  if (!receipt) return "";
  const service = receipt.services ?? receipt.service;
  const svc = Array.isArray(service) ? service[0] : service;
  return (svc?.name ?? "").trim();
}

function paymentMatchesSearch(payment, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    getPaymentClientName(payment),
    getPaymentAccountNumber(payment),
    getPaymentServiceName(payment),
    getPaymentStatusLabel(payment?.status),
    formatAmount(payment.total_amount),
    formatAmount(payment.commission),
    formatDateTimeEsSv(payment.created_at),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function hasStoredProof(payment) {
  return Boolean(payment?.proof_bucket && payment?.proof_path);
}

function canShowWhatsAppConfirmation(payment) {
  if (!hasStoredProof(payment)) return false;
  const status = normalizePaymentStatus(payment?.status);
  return status === PAYMENT_STATUS_PAID || status === PAYMENT_STATUS_SENT;
}

function canSendWhatsAppConfirmation(payment) {
  if (!hasStoredProof(payment)) return false;
  return normalizePaymentStatus(payment?.status) === PAYMENT_STATUS_PAID;
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
    case PAYMENT_STATUS_SENT:
      return "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300";
    case PAYMENT_STATUS_REGISTERED:
    default:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
  }
}

const PERIOD_OPTIONS = [
  { value: "diario", label: "Diario" },
  { value: "semanal", label: "Semanal" },
  { value: "mensual", label: "Mensual" },
  { value: "anual", label: "Anual" },
  { value: "personalizado", label: "Personalizado" },
];

const filterControlClass =
  "w-full min-w-40 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30";

/** Query format: DDMMYYYY (e.g. 01082026 → 1 Aug 2026), El Salvador calendar day */
function formatDateQueryParam(date) {
  const { year, month, day } = getElSalvadorParts(date);
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);
  return `${dd}${mm}${yyyy}`;
}

function parseDateQueryParam(value) {
  if (!value || !/^\d{8}$/.test(value)) return null;
  const day = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const year = Number(value.slice(4, 8));
  if (!day || !month || !year) return null;
  return parseDateInputEsSv(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  );
}

function resolveSelectedDateValue(dateParam) {
  const fromUrl = parseDateQueryParam(dateParam);
  return toDateInputValueEsSv(fromUrl ?? new Date());
}

function getPeriodRange(period, selectedDateValue, customFrom, customTo) {
  if (period === "personalizado") {
    const fromDate = parseDateInputEsSv(customFrom);
    const toDate = parseDateInputEsSv(customTo);
    if (!fromDate || !toDate) return null;

    return {
      from: startOfDayEsSv(fromDate),
      to: endOfDayEsSv(toDate),
    };
  }

  const selectedDate = parseDateInputEsSv(selectedDateValue) ?? new Date();
  const selectedParts = getElSalvadorParts(selectedDate);

  if (period === "diario") {
    return {
      from: startOfDayEsSv(selectedDate),
      to: endOfDayEsSv(selectedDate),
    };
  }

  if (period === "semanal") {
    const weekday = new Date(
      Date.UTC(selectedParts.year, selectedParts.month - 1, selectedParts.day)
    ).getUTCDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const mondayDay = selectedParts.day + mondayOffset;
    const mondayUtc = new Date(
      Date.UTC(selectedParts.year, selectedParts.month - 1, mondayDay, 12)
    );
    const sundayUtc = new Date(
      Date.UTC(selectedParts.year, selectedParts.month - 1, mondayDay + 6, 12)
    );
    return { from: startOfDayEsSv(mondayUtc), to: endOfDayEsSv(sundayUtc) };
  }

  if (period === "mensual") {
    const start = parseDateInputEsSv(
      `${selectedParts.year}-${String(selectedParts.month).padStart(2, "0")}-01`
    );
    const lastDay = new Date(
      Date.UTC(selectedParts.year, selectedParts.month, 0)
    ).getUTCDate();
    const end = parseDateInputEsSv(
      `${selectedParts.year}-${String(selectedParts.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    );
    if (!start || !end) return null;
    return { from: startOfDayEsSv(start), to: endOfDayEsSv(end) };
  }

  if (period === "anual") {
    const start = parseDateInputEsSv(`${selectedParts.year}-01-01`);
    const end = parseDateInputEsSv(`${selectedParts.year}-12-31`);
    if (!start || !end) return null;
    return { from: startOfDayEsSv(start), to: endOfDayEsSv(end) };
  }

  return null;
}

function isPaymentInRange(payment, range) {
  if (!range) return true;
  if (!payment?.created_at) return false;
  const createdAt = new Date(payment.created_at);
  if (Number.isNaN(createdAt.getTime())) return false;
  return createdAt >= range.from && createdAt <= range.to;
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
          tone="info"
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

  if (canShowWhatsAppConfirmation(payment)) {
    const isSendingWhatsApp = sendingWhatsAppPaymentIds.has(payment.id);
    const isAlreadySent =
      normalizePaymentStatus(payment?.status) === PAYMENT_STATUS_SENT;
    const isWhatsAppDisabled = isSendingWhatsApp || isAlreadySent;
    items.push({
      id: "whatsapp-confirmation",
      node: (
        <ActionIconButton
          label={
            isAlreadySent
              ? "Confirmación de pago ya enviada por WhatsApp"
              : "Enviar confirmación de pago por WhatsApp"
          }
          tone="primary"
          disabled={isWhatsAppDisabled}
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
  }

  if (items.length === 0) {
    return <span className="text-sm text-zinc-400 dark:text-zinc-500">—</span>;
  }

  return (
    <div className="flex flex-nowrap items-center justify-center gap-0.5">
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
  const serviceName = getPaymentServiceName(payment);
  const imageUrl = getPaymentServiceImageUrl(payment);

  return (
    <div className="flex min-w-0 items-start gap-3 text-left">
      <ServiceImageThumb
        url={imageUrl}
        size="h-10 w-10"
        rounded="rounded-full"
      />
      <div className="min-w-0 flex-1 space-y-1.5 leading-relaxed">
        {serviceName ? (
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {serviceName}
          </p>
        ) : null}
        <div className="flex min-w-0 items-center gap-1">
          <p className="min-w-0 truncate text-sm text-zinc-600 dark:text-zinc-300">
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
          <p className="min-w-0 truncate text-sm text-zinc-600 dark:text-zinc-300">
            <span className="font-medium text-zinc-500 dark:text-zinc-400">
              ID:{" "}
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "mobile";
  const dateParam = searchParams.get("date");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [whatsAppFeedback, setWhatsAppFeedback] = useState(null);
  const [sendingWhatsAppPaymentIds, setSendingWhatsAppPaymentIds] = useState(
    () => new Set()
  );
  const [period, setPeriod] = useState("diario");
  const [selectedDate, setSelectedDate] = useState(() =>
    resolveSelectedDateValue(dateParam)
  );
  const [customFrom, setCustomFrom] = useState(() =>
    resolveSelectedDateValue(dateParam)
  );
  const [customTo, setCustomTo] = useState(() =>
    resolveSelectedDateValue(dateParam)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const sendingWhatsAppPaymentIdsRef = useRef(new Set());

  const { can } = usePermissions();
  const canEditPaymentPerm = can("payments", "edit");
  const canDeletePayment = can("payments", "delete");

  const allPayments = initialPayments ?? [];
  const periodRange = getPeriodRange(
    period,
    selectedDate,
    customFrom,
    customTo
  );
  const payments =
    !periodRange
      ? []
      : allPayments.filter((payment) => isPaymentInRange(payment, periodRange));
  const filteredPayments = payments.filter((payment) =>
    paymentMatchesSearch(payment, searchQuery)
  );
  const periodSpentTotal = filteredPayments.reduce((sum, payment) => {
    const amount = Number(payment.total_amount);
    if (Number.isNaN(amount)) return sum;
    return sum + amount;
  }, 0);
  const periodEarningsTotal = filteredPayments.reduce((sum, payment) => {
    const commission = Number(payment.commission);
    if (Number.isNaN(commission)) return sum;
    return sum + commission;
  }, 0);
  const filteredPaymentsCount = filteredPayments.length;
  const filteredPaymentsCountLabel = `${filteredPaymentsCount} ${
    filteredPaymentsCount === 1 ? "pago" : "pagos"
  }`;
  const periodLabel =
    PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? "Período";

  const updateDateInUrl = useCallback(
    (yyyyMmDd) => {
      const date = parseDateInputEsSv(yyyyMmDd);
      if (!date) return;
      const nextParam = formatDateQueryParam(date);
      if (searchParams.get("date") === nextParam) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("date", nextParam);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const next = resolveSelectedDateValue(dateParam);
    setSelectedDate((current) => (current === next ? current : next));
  }, [dateParam]);

  useEffect(() => {
    if (parseDateQueryParam(dateParam)) return;
    updateDateInUrl(selectedDate);
  }, [dateParam, selectedDate, updateDateInUrl]);

  const handlePeriodChange = useCallback(
    (event) => {
      const nextPeriod = event.target.value;
      setPeriod(nextPeriod);
      if (nextPeriod === "personalizado") {
        setCustomFrom(selectedDate);
        setCustomTo(selectedDate);
      }
    },
    [selectedDate]
  );

  const handleSelectedDateChange = useCallback(
    (event) => {
      const value = event.target.value;
      setSelectedDate(value);
      updateDateInUrl(value);
    },
    [updateDateInUrl]
  );

  const handleCustomFromChange = useCallback((event) => {
    setCustomFrom(event.target.value);
  }, []);

  const handleCustomToChange = useCallback((event) => {
    setCustomTo(event.target.value);
  }, []);

  const handleSearchChange = useCallback((event) => {
    setSearchQuery(event.target.value);
  }, []);

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
      if (!canSendWhatsAppConfirmation(payment)) {
        setWhatsAppFeedback({
          type: "error",
          message:
            normalizePaymentStatus(payment?.status) === PAYMENT_STATUS_SENT
              ? "Esta confirmación ya fue enviada por WhatsApp."
              : "Solo los pagos con estado Pagado pueden confirmarse por WhatsApp.",
        });
        return;
      }

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
    <div className={tableViewRootClass}>
      <header className="flex shrink-0 flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
        <div className="flex items-center gap-3">
          <span
            className="h-10 w-1 shrink-0 rounded-full bg-emerald-500"
            aria-hidden
          />
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tablet:text-3xl">
            Pagos
          </h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-40">
            <label
              htmlFor="payments-period"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Período
            </label>
            <select
              id="payments-period"
              value={period}
              onChange={handlePeriodChange}
              className={filterControlClass}
              aria-label="Filtrar pagos por período"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {period === "personalizado" ? (
            <>
              <div className="min-w-40">
                <label
                  htmlFor="payments-period-from"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Desde
                </label>
                <input
                  id="payments-period-from"
                  type="date"
                  value={customFrom}
                  onChange={handleCustomFromChange}
                  max={customTo || undefined}
                  className={filterControlClass}
                  aria-label="Fecha inicial del período personalizado"
                />
              </div>
              <div className="min-w-40">
                <label
                  htmlFor="payments-period-to"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Hasta
                </label>
                <input
                  id="payments-period-to"
                  type="date"
                  value={customTo}
                  onChange={handleCustomToChange}
                  min={customFrom || undefined}
                  className={filterControlClass}
                  aria-label="Fecha final del período personalizado"
                />
              </div>
            </>
          ) : (
            <div className="min-w-40">
              <label
                htmlFor="payments-selected-date"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Fecha
              </label>
              <input
                id="payments-selected-date"
                type="date"
                value={selectedDate}
                onChange={handleSelectedDateChange}
                className={filterControlClass}
                aria-label="Seleccionar fecha específica del período"
              />
            </div>
          )}

          <div className="min-w-40">
            <p className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Total pagado
            </p>
            <div
              className={`${filterControlClass} flex items-center font-semibold tabular-nums`}
              role="status"
              aria-live="polite"
              aria-label={`Total pagado por clientes en ${periodLabel}: ${formatAmount(periodSpentTotal)}, ${filteredPaymentsCountLabel}`}
              title={`${filteredPaymentsCountLabel} · ${periodLabel}`}
            >
              {formatAmount(periodSpentTotal)}
            </div>
          </div>

          <div className="min-w-40">
            <p className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Total ganancias
            </p>
            <div
              className={`${filterControlClass} flex items-center font-semibold tabular-nums`}
              role="status"
              aria-live="polite"
              aria-label={`Total ganancias por comisiones en ${periodLabel}: ${formatAmount(periodEarningsTotal)}, ${filteredPaymentsCountLabel}`}
              title={`${filteredPaymentsCountLabel} · ${periodLabel}`}
            >
              {formatAmount(periodEarningsTotal)}
            </div>
          </div>
        </div>
      </header>

      {fetchError && (
        <div
          role="alert"
          className="shrink-0 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {fetchError}
        </div>
      )}

      {payments.length > 0 && (
        <div className="relative shrink-0">
          <label htmlFor="payment-search" className="sr-only">
            Buscar pagos por cliente, ID de servicio, estado o monto
          </label>
          <input
            id="payment-search"
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Buscar por cliente, ID de servicio, estado o monto..."
            className="w-full rounded-full border border-zinc-300 bg-white pl-10 pr-4 py-2.5 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-500/50 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
            aria-label="Buscar pagos por cliente, ID de servicio, estado o monto"
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

      <section
        className={tableViewSectionClass}
        aria-label="Lista de pagos"
      >
        <div className={tableViewSectionTitleClass}>
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
              {allPayments.length === 0
                ? "No hay pagos para mostrar."
                : "No hay pagos en el período seleccionado."}
            </p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center"
            role="status"
          >
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No se encontraron pagos que coincidan con la búsqueda.
            </p>
          </div>
        ) : isMobile ? (
          <ul className={tableMobileListClass}>
            {filteredPayments.map((payment) => (
              <li
                key={payment.id}
                className="space-y-4 px-5 py-5 transition-colors hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10"
              >
                <ServicioCell
                  payment={payment}
                  onCopied={handleCopied}
                  onCopyError={handleCopyError}
                />
                <div className="flex flex-col gap-3 text-sm leading-relaxed">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      Monto: {formatAmount(payment.total_amount)}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Comisión: {formatAmount(payment.commission)}
                    </span>
                    <StatusBadge status={payment.status} />
                  </div>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {formatDateTimeEsSv(payment.created_at)}
                  </span>
                </div>
                <div className="pt-1">
                  <PaymentActions
                    payment={payment}
                    {...actionHandlers}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className={tableScrollBodyClass}>
            <table className="w-full table-fixed text-sm" role="grid">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[19%]" />
                <col className="w-[13%]" />
              </colgroup>
              <thead className={tableHeadClass}>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800">
                  <th
                    className={`${tableHeadCellClass} px-4 py-4 text-left font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-5 tablet:py-4.5`}
                    scope="col"
                  >
                    Servicio
                  </th>
                  <th
                    className={`${tableHeadCellClass} px-4 py-4 text-center font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-5 tablet:py-4.5`}
                    scope="col"
                  >
                    Monto
                  </th>
                  <th
                    className={`${tableHeadCellClass} px-4 py-4 text-center font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-5 tablet:py-4.5`}
                    scope="col"
                  >
                    Comisión
                  </th>
                  <th
                    className={`${tableHeadCellClass} px-4 py-4 text-center font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-5 tablet:py-4.5`}
                    scope="col"
                  >
                    Estado
                  </th>
                  <th
                    className={`${tableHeadCellClass} px-4 py-4 text-center font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-5 tablet:py-4.5`}
                    scope="col"
                  >
                    Fecha / Hora
                  </th>
                  <th
                    className={`${tableHeadCellClass} px-4 py-4 text-center font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-5 tablet:py-4.5`}
                    scope="col"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-zinc-100 last:border-0 transition-colors hover:bg-emerald-50/40 dark:border-zinc-800 dark:hover:bg-emerald-950/10"
                  >
                    <td className="min-w-0 px-4 py-4 text-left tablet:px-5 tablet:py-4.5">
                      <ServicioCell
                        payment={payment}
                        onCopied={handleCopied}
                        onCopyError={handleCopyError}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center font-medium tabular-nums text-zinc-900 dark:text-zinc-50 tablet:px-5 tablet:py-4.5">
                      {formatAmount(payment.total_amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center tabular-nums text-zinc-600 dark:text-zinc-400 tablet:px-5 tablet:py-4.5">
                      {formatAmount(payment.commission)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center tablet:px-5 tablet:py-4.5">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-zinc-600 dark:text-zinc-400 tablet:px-5 tablet:py-4.5">
                      {formatDateTimeEsSv(payment.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center tablet:px-5 tablet:py-4.5">
                      <div className="flex w-full justify-center">
                        <PaymentActions
                          payment={payment}
                          {...actionHandlers}
                        />
                      </div>
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
