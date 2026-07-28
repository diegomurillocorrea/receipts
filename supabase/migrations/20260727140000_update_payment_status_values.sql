-- Expand payment status values for /payments workflow.
-- 0 = Registrado, 1 = Pagado, 2 = Cancelado, 3 = Enviado
-- Existing rows with 0/1 keep meaning (Pendiente → Registrado, Pagado → Pagado).

COMMENT ON COLUMN payments.status IS
  '0 = Registrado (al crear el pago sin voucher), 1 = Pagado (manual: cliente entregó el dinero), 2 = Cancelado (al subir voucher: DAIEGO pagó la factura del servicio), 3 = Enviado (confirmación WhatsApp enviada)';
