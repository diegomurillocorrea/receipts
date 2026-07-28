-- Server-side idempotency and future delivery-status tracking for WhatsApp payment confirmations.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS whatsapp_payment_notification_status text,
  ADD COLUMN IF NOT EXISTS whatsapp_payment_notification_message_id text,
  ADD COLUMN IF NOT EXISTS whatsapp_payment_notification_submitted_at timestamptz;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_whatsapp_payment_notification_status_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_whatsapp_payment_notification_status_check
  CHECK (
    whatsapp_payment_notification_status IS NULL OR
    whatsapp_payment_notification_status IN (
      'PENDING',
      'SUBMITTED',
      'SENT',
      'DELIVERED',
      'READ',
      'FAILED'
    )
  );

COMMENT ON COLUMN public.payments.whatsapp_payment_notification_status IS
  'WhatsApp payment confirmation lifecycle: PENDING, SUBMITTED, SENT, DELIVERED, READ, or FAILED.';
COMMENT ON COLUMN public.payments.whatsapp_payment_notification_message_id IS
  'Message identifier returned by WhatsApp Cloud API after Meta accepts the template message.';
COMMENT ON COLUMN public.payments.whatsapp_payment_notification_submitted_at IS
  'Timestamp when Meta accepted the WhatsApp payment confirmation for processing.';
