-- Align DB with Storage buckets: service-logos + payment-proofs only.
-- Bucket rename/delete must use Storage API (direct DELETE on storage.* is blocked).
-- Applied operationally via Storage API; this migration keeps schema/data in sync.

-- Point service image refs at the renamed bucket
UPDATE public.services
SET image_bucket = 'service-logos'
WHERE image_bucket = 'service-images';

-- Drop payment voucher PDF columns (bucket vouchers removed via Storage API)
ALTER TABLE public.payments
  DROP COLUMN IF EXISTS voucher_pdf_bucket,
  DROP COLUMN IF EXISTS voucher_pdf_path;

-- Remove obsolete send_voucher permission
DELETE FROM public.role_permissions
WHERE resource = 'payments'
  AND action = 'send_voucher';
