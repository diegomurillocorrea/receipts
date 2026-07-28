-- Normalize existing El Salvador client phone numbers to E.164 (+503...).
-- Local 8-digit numbers become +503XXXXXXXX.
-- Numbers already stored as 503XXXXXXXX become +503XXXXXXXX.

UPDATE public.clients
SET phone_number = CASE
  WHEN regexp_replace(phone_number, '\D', '', 'g') ~ '^503[0-9]{8}$'
    THEN '+' || regexp_replace(phone_number, '\D', '', 'g')
  WHEN regexp_replace(phone_number, '\D', '', 'g') ~ '^[0-9]{8}$'
    THEN '+503' || regexp_replace(phone_number, '\D', '', 'g')
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
      THEN '+' || regexp_replace(phone_number, '\D', '', 'g')
    WHEN regexp_replace(phone_number, '\D', '', 'g') ~ '^[0-9]{8}$'
      THEN '+503' || regexp_replace(phone_number, '\D', '', 'g')
    ELSE phone_number
  END;

COMMENT ON COLUMN public.clients.phone_number IS
  'WhatsApp/phone in E.164. El Salvador numbers are stored as +503XXXXXXXX.';
