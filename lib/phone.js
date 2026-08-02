const EL_SALVADOR_COUNTRY_CODE = "503";

/**
 * Format a stored El Salvador phone (503XXXXXXXX) for UI display as +503 xxxx xxxx.
 * @param {string | null | undefined} phone
 * @returns {string}
 */
export function formatElSalvadorPhoneDisplay(phone) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";

  const localDigits =
    digits.startsWith(EL_SALVADOR_COUNTRY_CODE) && digits.length >= 11
      ? digits.slice(EL_SALVADOR_COUNTRY_CODE.length)
      : digits.slice(-8);

  if (localDigits.length !== 8) {
    return `+${EL_SALVADOR_COUNTRY_CODE} ${localDigits}`;
  }

  return `+${EL_SALVADOR_COUNTRY_CODE} ${localDigits.slice(0, 4)} ${localDigits.slice(4)}`;
}

/**
 * Format local 8-digit input for the phone field UI (xxxx xxxx).
 * @param {string | null | undefined} digits
 * @returns {string}
 */
export function formatLocalElSalvadorPhoneInput(digits) {
  const clean = (digits ?? "").replace(/\D/g, "").slice(0, 8);
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)} ${clean.slice(4)}`;
}
