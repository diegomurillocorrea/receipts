-- PDF voucher generated for clients (Supabase Storage path references).
-- Uses the same public bucket pattern as payment proofs: e.g. payment-proofs bucket with path vouchers/...

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS voucher_pdf_bucket text,
  ADD COLUMN IF NOT EXISTS voucher_pdf_path text;

COMMENT ON COLUMN payments.voucher_pdf_bucket IS 'Supabase Storage bucket for generated payment voucher PDF';
COMMENT ON COLUMN payments.voucher_pdf_path IS 'Path within bucket for generated payment voucher PDF';
