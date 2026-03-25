/** Payment status: 0 = Pendiente, 1 = Pagado */
export const PAYMENT_STATUS_PENDING = 0;
export const PAYMENT_STATUS_PAID = 1;

/** Bucket for internal payment proof uploads (recibos) */
export const PAYMENT_PROOF_BUCKET = "payment-proofs";

/** Bucket for generated PDF vouchers sent to clients */
export const PAYMENT_VOUCHER_BUCKET = "vouchers";

/** Folder prefix within the voucher bucket */
export const PAYMENT_VOUCHER_PREFIX = "vouchers";

export const STATUS_LABELS = {
  [PAYMENT_STATUS_PENDING]: "Pendiente",
  [PAYMENT_STATUS_PAID]: "Pagado",
};
