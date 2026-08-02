-- Remove Cancelado (2). Existing Cancelado rows become Pagado (1).
-- Status values: 0 = Registrado, 1 = Pagado, 3 = Enviado

UPDATE public.payments
SET status = 1
WHERE status = 2;

COMMENT ON COLUMN public.payments.status IS
  '0 = Registrado (al crear el pago sin voucher), 1 = Pagado (cliente entregó el dinero o se subió voucher), 3 = Enviado (confirmación WhatsApp enviada)';
