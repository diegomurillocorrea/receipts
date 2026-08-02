/**
 * Money formatting for the whole app.
 * Decimal separator is always a period (.), never a comma.
 */

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/**
 * Format a numeric amount as USD with period decimals (e.g. $1,234.50).
 * @param {number | string | null | undefined} value
 * @param {{ fallback?: string }} [options]
 * @returns {string}
 */
export function formatAmount(value, options = {}) {
  const { fallback = "—" } = options;

  if (value == null || value === "") return fallback;

  const n = Number(value);
  if (Number.isNaN(n)) return fallback;

  return currencyFormatter.format(n);
}
