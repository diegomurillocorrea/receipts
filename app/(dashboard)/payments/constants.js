/** Payment status: 0 = Pendiente, 1 = Pagado */
export const PAYMENT_STATUS_PENDING = 0;
export const PAYMENT_STATUS_PAID = 1;

/** Bucket for internal payment proof uploads (recibos) */
export const PAYMENT_PROOF_BUCKET = "payment-proofs";

export const STATUS_LABELS = {
  [PAYMENT_STATUS_PENDING]: "Pendiente",
  [PAYMENT_STATUS_PAID]: "Pagado",
};
