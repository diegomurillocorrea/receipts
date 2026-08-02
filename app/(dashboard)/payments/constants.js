/**
 * Payment status assignment:
 * - Registrado (0): set automatically when the payment is logged/created without a voucher
 * - Pagado (1): set manually when the client has given the money, or when a voucher is uploaded
 * - Enviado (3): set when the WhatsApp payment confirmation was sent successfully
 */
export const PAYMENT_STATUS_REGISTERED = 0;
export const PAYMENT_STATUS_PAID = 1;
export const PAYMENT_STATUS_SENT = 3;

/** @deprecated Use PAYMENT_STATUS_REGISTERED */
export const PAYMENT_STATUS_PENDING = PAYMENT_STATUS_REGISTERED;

/** Legacy value previously labeled "Cancelado"; treated as Pagado. */
export const LEGACY_PAYMENT_STATUS_CANCELLED = 2;

export const PAYMENT_STATUSES = [
  PAYMENT_STATUS_REGISTERED,
  PAYMENT_STATUS_PAID,
  PAYMENT_STATUS_SENT,
];

/** Bucket for internal payment proof uploads (recibos) */
export const PAYMENT_PROOF_BUCKET = "payment-proofs";

export const STATUS_LABELS = {
  [PAYMENT_STATUS_REGISTERED]: "Registrado",
  [PAYMENT_STATUS_PAID]: "Pagado",
  [PAYMENT_STATUS_SENT]: "Enviado",
};

/**
 * @param {unknown} status
 * @returns {number}
 */
export function normalizePaymentStatus(status) {
  const n = Number(status);
  if (n === LEGACY_PAYMENT_STATUS_CANCELLED) return PAYMENT_STATUS_PAID;
  if (PAYMENT_STATUSES.includes(n)) return n;
  return PAYMENT_STATUS_REGISTERED;
}

/**
 * @param {unknown} status
 * @returns {string}
 */
export function getPaymentStatusLabel(status) {
  return STATUS_LABELS[normalizePaymentStatus(status)] ?? STATUS_LABELS[PAYMENT_STATUS_REGISTERED];
}
