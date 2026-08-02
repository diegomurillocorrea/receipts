/** El Salvador (UTC-6, no DST). All app date/time display and day boundaries use this zone. */
export const EL_SALVADOR_TIME_ZONE = "America/El_Salvador";

/**
 * @param {Date} date
 * @returns {{ year: number; month: number; day: number; hour: number; minute: number; second: number }}
 */
export function getElSalvadorParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EL_SALVADOR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const map = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour === "24" ? "0" : map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/**
 * Build a UTC Date from a wall-clock time in El Salvador.
 * @param {{ year: number; month: number; day: number; hour?: number; minute?: number; second?: number; millisecond?: number }} parts
 * @returns {Date}
 */
export function elSalvadorWallTimeToUtc({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
}) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  const asParts = getElSalvadorParts(utcGuess);
  const asUtcMs = Date.UTC(
    asParts.year,
    asParts.month - 1,
    asParts.day,
    asParts.hour,
    asParts.minute,
    asParts.second,
    millisecond
  );
  const wantedMs = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  return new Date(utcGuess.getTime() + (wantedMs - asUtcMs));
}

/**
 * Format ISO timestamp as a short date in El Salvador (e.g. "1 ago 2026").
 * @param {string | null | undefined} isoString
 * @returns {string}
 */
export function formatDateEsSv(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-SV", {
    timeZone: EL_SALVADOR_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format ISO timestamp as: dd/mm/aa - h:mm a.m.|p.m. (El Salvador).
 * @param {string | null | undefined} isoString
 * @returns {string}
 */
export function formatDateTimeEsSv(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "—";

  const { year, month, day, hour, minute } = getElSalvadorParts(d);
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const aa = String(year).slice(-2);
  const minutes = String(minute).padStart(2, "0");
  const isPm = hour >= 12;
  const hours12 = hour % 12 || 12;
  const meridiem = isPm ? "p.m." : "a.m.";

  return `${dd}/${mm}/${aa} - ${hours12}:${minutes} ${meridiem}`;
}

/**
 * YYYY-MM-DD for date inputs, using El Salvador calendar day.
 * @param {Date | string | null | undefined} value
 * @returns {string}
 */
export function toDateInputValueEsSv(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(d.getTime())) return "";
  const { year, month, day } = getElSalvadorParts(d);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Parse YYYY-MM-DD as a calendar day in El Salvador (noon wall time, for safe day math).
 * @param {string | null | undefined} value
 * @returns {Date | null}
 */
export function parseDateInputEsSv(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = elSalvadorWallTimeToUtc({ year, month, day, hour: 12 });
  const parts = getElSalvadorParts(date);
  if (parts.year !== year || parts.month !== month || parts.day !== day) return null;
  return date;
}

/**
 * @param {Date} date
 * @returns {Date}
 */
export function startOfDayEsSv(date) {
  const { year, month, day } = getElSalvadorParts(date);
  return elSalvadorWallTimeToUtc({ year, month, day, hour: 0, minute: 0, second: 0, millisecond: 0 });
}

/**
 * @param {Date} date
 * @returns {Date}
 */
export function endOfDayEsSv(date) {
  const { year, month, day } = getElSalvadorParts(date);
  return elSalvadorWallTimeToUtc({
    year,
    month,
    day,
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999,
  });
}

/**
 * ISO timestamp for a YYYY-MM-DD in El Salvador using the current El Salvador clock time.
 * @param {string} yyyyMmDd
 * @returns {string | null}
 */
export function dateInputToIsoWithCurrentTimeEsSv(yyyyMmDd) {
  if (!yyyyMmDd) return null;
  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  if (!year || !month || !day) return null;
  const now = getElSalvadorParts(new Date());
  return elSalvadorWallTimeToUtc({
    year,
    month,
    day,
    hour: now.hour,
    minute: now.minute,
    second: now.second,
  }).toISOString();
}
