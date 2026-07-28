"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DaiegoLogo } from "@/components/daiego-logo";
import {
  createPaymentAction,
  uploadPaymentProofAction,
} from "../../payments/actions";
import { usePermissions } from "../../permissions-provider";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30";

const ALLOWED_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

/**
 * Commission by total_amount (mirrors server computeCommission).
 * @param {number} totalAmount
 * @returns {number}
 */
function computeCommission(totalAmount) {
  const n = Number(totalAmount);
  if (Number.isNaN(n) || n < 0) return 0;
  if (n === 0) return 0;
  if (n === 0.5) return 0.25;
  if (n === 1) return 0.5;
  if (n < 50) return 1;
  return Math.floor(n / 50) + 1;
}

function formatAmount(value) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return new Intl.NumberFormat("es-SV", {
      style: "currency",
      currency: "USD",
    }).format(0);
  }
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function getDefaultPaymentMethodId(methods) {
  const list = methods ?? [];
  const efectivo = list.find(
    (m) => (m?.name ?? "").trim().toLowerCase() === "efectivo"
  );
  return efectivo?.id ?? list[0]?.id ?? "";
}

function getServiceImageUrl(service) {
  if (!service?.image_bucket || !service?.image_path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${service.image_bucket}/${service.image_path}`;
}

function getClientDisplayName(clients) {
  const client = Array.isArray(clients) ? clients[0] : clients;
  if (!client) return "Sin cliente";
  const fullName = [client.name, client.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || "Sin cliente";
}

function ServicePlaceholder({ className = "h-full w-full" }) {
  return (
    <div
      className={`flex items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 ${className}`}
      aria-hidden
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  );
}

export function PaymentRegisterView({
  receipt,
  service,
  paymentMethods,
  backHref,
}) {
  const router = useRouter();
  const { can, isLoading: isPermissionsLoading } = usePermissions();
  const amountId = useId();
  const commissionId = useId();
  const methodId = useId();
  const proofId = useId();
  const proofInputRef = useRef(null);

  const canCreate = isPermissionsLoading || can("payments", "create");
  const canManageProof =
    isPermissionsLoading || can("payments", "manage_proof");

  const [amount, setAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState(() =>
    getDefaultPaymentMethodId(paymentMethods)
  );
  const [proofFile, setProofFile] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const serviceName = service?.name?.trim() || "Servicio";
  const serviceImageUrl = getServiceImageUrl(service);
  const clientLabel = getClientDisplayName(receipt?.clients);
  const accountNumber = (receipt?.account_receipt_number ?? "").trim();
  const contextLabel = accountNumber
    ? `${clientLabel} - ${accountNumber}`
    : clientLabel;

  const commission =
    amount.trim() === "" ? 0 : computeCommission(Number(amount));

  const handleAmountChange = (event) => {
    setAmount(event.target.value);
    setFormError(null);
  };

  const handleMethodChange = (event) => {
    setPaymentMethodId(event.target.value);
    setFormError(null);
  };

  const handleProofChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setFormError(null);

    if (!file) {
      setProofFile(null);
      return;
    }

    if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
      setProofFile(null);
      if (proofInputRef.current) proofInputRef.current.value = "";
      setFormError("Formato no válido. Usa JPG, PNG, GIF o WebP.");
      return;
    }

    if (file.size > MAX_PROOF_BYTES) {
      setProofFile(null);
      if (proofInputRef.current) proofInputRef.current.value = "";
      setFormError("La imagen no debe superar 5 MB.");
      return;
    }

    setProofFile(file);
  };

  const handleClearProof = () => {
    setProofFile(null);
    if (proofInputRef.current) proofInputRef.current.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || isSuccess) return;

    if (!canCreate) {
      setFormError("No tienes permiso para registrar pagos.");
      return;
    }

    const totalAmount = Number(amount);
    if (amount.trim() === "" || Number.isNaN(totalAmount) || totalAmount < 0) {
      setFormError("El monto debe ser cero o mayor.");
      return;
    }

    if (!paymentMethodId) {
      setFormError("El método de pago es requerido.");
      return;
    }

    if (proofFile && !canManageProof) {
      setFormError("No tienes permiso para subir comprobantes.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const createResult = await createPaymentAction({
      receipt_id: receipt.id,
      total_amount: totalAmount,
      payment_method_id: paymentMethodId,
      add_commission: true,
    });

    if (createResult.error) {
      setIsSubmitting(false);
      setFormError(createResult.error);
      return;
    }

    if (proofFile && createResult.id) {
      const formData = new FormData();
      formData.append("proof", proofFile);
      const uploadResult = await uploadPaymentProofAction(
        createResult.id,
        formData
      );
      if (uploadResult.error) {
        setIsSubmitting(false);
        setFormError(
          `Pago registrado, pero el comprobante no se pudo subir: ${uploadResult.error}`
        );
        setIsSuccess(true);
        return;
      }
    }

    setIsSubmitting(false);
    setIsSuccess(true);
    router.push("/payments");
    router.refresh();
  };

  return (
    <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-1">
      <Link
        href={backHref || `/${service.id}`}
        className="fixed left-4 top-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-950"
        aria-label={`Volver a búsqueda de ${serviceName}`}
      >
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Volver
      </Link>

      <div className="flex flex-1 flex-col items-center justify-center py-16">
        <div
          className="mb-6 flex items-center justify-center gap-3 tablet:mb-8 tablet:gap-4"
          role="group"
          aria-label={`DAIEGO y ${serviceName}`}
        >
          <div className="flex h-[7.5rem] w-[7.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 tablet:h-36 tablet:w-36 tablet:p-3">
            <DaiegoLogo
              width={144}
              height={144}
              priority
              className="h-full w-full object-contain"
            />
          </div>
          <div
            className="flex h-[7.5rem] w-[7.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 tablet:h-36 tablet:w-36"
            title={serviceName}
          >
            {serviceImageUrl ? (
              <img
                src={serviceImageUrl}
                alt={`Logo de ${serviceName}`}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <ServicePlaceholder className="h-full w-full" />
            )}
          </div>
        </div>

        <p className="mb-6 max-w-md text-center text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {contextLabel}
        </p>

        <form
          onSubmit={handleSubmit}
          className="w-full space-y-4"
          aria-label="Registrar pago"
          noValidate
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={amountId}
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Monto
              </label>
              <input
                id={amountId}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                required
                disabled={isSubmitting || isSuccess || !canCreate}
                className={inputClassName}
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? "payment-register-error" : undefined}
              />
            </div>
            <div>
              <label
                htmlFor={commissionId}
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Comisión
              </label>
              <input
                id={commissionId}
                type="text"
                value={formatAmount(commission)}
                readOnly
                tabIndex={0}
                className={`${inputClassName} cursor-default bg-zinc-50 dark:bg-zinc-800/80`}
                aria-label={`Comisión calculada: ${formatAmount(commission)}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={methodId}
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Método de pago
              </label>
              <select
                id={methodId}
                value={paymentMethodId}
                onChange={handleMethodChange}
                required
                disabled={isSubmitting || isSuccess || !canCreate}
                className={inputClassName}
                aria-label="Método de pago"
              >
                <option value="" disabled>
                  Selecciona un método
                </option>
                {(paymentMethods ?? []).map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={proofId}
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Comprobante
              </label>
              {canManageProof ? (
                <div className="relative">
                  <input
                    ref={proofInputRef}
                    id={proofId}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleProofChange}
                    disabled={isSubmitting || isSuccess || !canCreate}
                    className="sr-only"
                    aria-label="Subir comprobante"
                  />
                  {proofFile ? (
                    <div
                      className={`${inputClassName} flex items-center gap-2 py-2.5`}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {proofFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={handleClearProof}
                        disabled={isSubmitting || isSuccess}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
                        aria-label="Quitar comprobante"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => proofInputRef.current?.click()}
                      disabled={isSubmitting || isSuccess || !canCreate}
                      className={`${inputClassName} flex items-center justify-center gap-2 text-sm font-medium text-zinc-600 hover:border-emerald-500 hover:text-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-400 dark:hover:text-zinc-50`}
                      aria-label="Subir comprobante"
                    >
                      <svg
                        className="h-4 w-4 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      Subir
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className={`${inputClassName} flex items-center justify-center text-sm text-zinc-400 dark:text-zinc-500`}
                  role="status"
                  aria-label="Sin permiso para subir comprobante"
                >
                  —
                </div>
              )}
            </div>
          </div>

          {formError ? (
            <p
              id="payment-register-error"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isSuccess || !canCreate}
              className="inline-flex h-12 min-w-[10rem] items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-zinc-950"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Registrando…" : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PaymentRegisterViewSkeleton() {
  return (
    <div
      className="relative mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-1 py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="sr-only">Cargando registro de pago…</p>
      <div className="mb-6 flex items-center justify-center gap-3 tablet:mb-8 tablet:gap-4">
        <div className="h-[7.5rem] w-[7.5rem] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800 tablet:h-36 tablet:w-36" />
        <div className="h-[7.5rem] w-[7.5rem] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800 tablet:h-36 tablet:w-36" />
      </div>
      <div className="mb-6 h-6 w-56 max-w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid w-full grid-cols-2 gap-3">
        <div className="h-12 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-12 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-12 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-12 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="mt-6 h-12 w-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
