-- Store El Salvador client phones as digits only: 503XXXXXXXX (no leading +).
-- Accepts existing +503XXXXXXXX, 503XXXXXXXX, and local 8-digit numbers.

UPDATE public.clients
SET phone_number = CASE
  WHEN regexp_replace(phone_number, '\D', '', 'g') ~ '^503[0-9]{8}$'
    THEN regexp_replace(phone_number, '\D', '', 'g')
  WHEN regexp_replace(phone_number, '\D', '', 'g') ~ '^[0-9]{8}$'
    THEN '503' || regexp_replace(phone_number, '\D', '', 'g')
  ELSE phone_number
END
WHERE phone_number IS NOT NULL
  AND btrim(phone_number) <> ''
  AND (
    regexp_replace(phone_number, '\D', '', 'g') ~ '^503[0-9]{8}$'
    OR regexp_replace(phone_number, '\D', '', 'g') ~ '^[0-9]{8}$'
  )
  AND phone_number IS DISTINCT FROM CASE
    WHEN regexp_replace(phone_number, '\D', '', 'g') ~ '^503[0-9]{8}$'
      THEN regexp_replace(phone_number, '\D', '', 'g')
    WHEN regexp_replace(phone_number, '\D', '', 'g') ~ '^[0-9]{8}$'
      THEN '503' || regexp_replace(phone_number, '\D', '', 'g')
    ELSE phone_number
  END;

COMMENT ON COLUMN public.clients.phone_number IS
  'WhatsApp/phone digits for El Salvador, stored as 503XXXXXXXX (no leading +).';
