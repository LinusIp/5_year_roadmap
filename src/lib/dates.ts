/**
 * Dates, always local.
 *
 * The user is in UTC+5. `new Date().toISOString().slice(0, 10)` would call 00:30 on the 5th "the 4th",
 * which would put a late-night study session on the wrong day, break the streak and move a heatmap cell.
 * So every date in Atlas is a "YYYY-MM-DD" string built from the local calendar fields, and every
 * conversion back to a Date uses local midnight. Nothing here touches UTC.
 */

export type IsoDate = string;

const MS_PER_DAY = 86_400_000;

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/** The local calendar date of a Date object. */
export function toIsoDate(date: Date): IsoDate {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

/** Local midnight of an ISO date. Throws on a malformed string, which can only be a bug. */
export function fromIsoDate(iso: IsoDate): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error('not a YYYY-MM-DD date: ' + iso);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function today(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}

/** Days between two dates, by local calendar day, ignoring any clock time. Positive when `b` is later. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  const from = fromIsoDate(a);
  const to = fromIsoDate(b);
  // Both are local midnight, so the difference is a whole number of days even across a DST change,
  // as long as we round: a 23- or 25-hour day would otherwise give 0.958 or 1.042.
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** 0 = Sunday … 6 = Saturday, in local time. */
export function weekday(iso: IsoDate): number {
  return fromIsoDate(iso).getDay();
}

export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return a < b;
}

export function isWithinRange(iso: IsoDate, start: IsoDate, end: IsoDate): boolean {
  return iso >= start && iso <= end;
}

export function clampDate(iso: IsoDate, start: IsoDate, end: IsoDate): IsoDate {
  return iso < start ? start : iso > end ? end : iso;
}

/** The first day of the week containing `iso`, for a week starting on Sunday (0) or Monday (1). */
export function startOfWeek(iso: IsoDate, weekStartsOn: 0 | 1): IsoDate {
  const day = weekday(iso);
  const back = weekStartsOn === 1 ? (day + 6) % 7 : day;
  return addDays(iso, -back);
}

export function endOfWeek(iso: IsoDate, weekStartsOn: 0 | 1): IsoDate {
  return addDays(startOfWeek(iso, weekStartsOn), 6);
}

/** "2026-09" for the month containing `iso`. */
export function monthKey(iso: IsoDate): string {
  return iso.slice(0, 7);
}

export function startOfMonth(iso: IsoDate): IsoDate {
  return iso.slice(0, 8) + '01';
}

export function endOfMonth(iso: IsoDate): IsoDate {
  const date = fromIsoDate(iso);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

/** Every date from `start` to `end` inclusive. */
export function eachDay(start: IsoDate, end: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/* ------------------------------------------------------------------ formatting */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dayName(iso: IsoDate, short = false): string {
  const day = weekday(iso);
  return (short ? DAY_SHORT : DAY_NAMES)[day]!;
}

export function monthName(month: number, short = false): string {
  return (short ? MONTH_SHORT : MONTH_NAMES)[month]!;
}

/** "Monday, 21 September 2026". Written out rather than localised: the app ships no i18n. */
export function formatLong(iso: IsoDate): string {
  const date = fromIsoDate(iso);
  return dayName(iso) + ', ' + date.getDate() + ' ' + monthName(date.getMonth()) + ' ' + date.getFullYear();
}

/** "21 Sep 2026", or "21 Sep" when it is in `referenceYear`. */
export function formatShort(iso: IsoDate, referenceYear?: number): string {
  const date = fromIsoDate(iso);
  const head = date.getDate() + ' ' + monthName(date.getMonth(), true);
  return date.getFullYear() === referenceYear ? head : head + ' ' + date.getFullYear();
}

/** "21 Sep 2026 to 31 Jan 2027", collapsing the parts the two dates share. */
export function formatRange(start: IsoDate, end: IsoDate): string {
  const a = fromIsoDate(start);
  const b = fromIsoDate(end);
  if (a.getFullYear() === b.getFullYear()) {
    if (a.getMonth() === b.getMonth()) return a.getDate() + ' to ' + b.getDate() + ' ' + monthName(b.getMonth(), true) + ' ' + b.getFullYear();
    return formatShort(start) + ' to ' + formatShort(end);
  }
  return formatShort(start) + ' to ' + formatShort(end);
}

/* ------------------------------------------------------------------ durations */

/** 135 -> "2h 15m", 60 -> "1h", 45 -> "45m", 0 -> "0m". */
export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  const sign = rounded < 0 ? '-' : '';
  const total = Math.abs(rounded);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return sign + rest + 'm';
  if (rest === 0) return sign + hours + 'h';
  return sign + hours + 'h ' + rest + 'm';
}

/** 135 -> "2.3h". For totals, where one decimal reads better than "2h 15m". */
export function formatHours(minutes: number, decimals = 1): string {
  return (minutes / 60).toFixed(decimals).replace(/\.0$/, '') + 'h';
}

/** Elapsed milliseconds as "1:23:45" or "23:45", for a running timer. */
export function formatStopwatch(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return (hours > 0 ? hours + ':' + pad(minutes) : String(minutes)) + ':' + pad(seconds);
}

/** Parses "90", "1h30", "1h 30m", "1.5h", "90m" into minutes. Returns null when it cannot. */
export function parseDuration(input: string): number | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text));
  const match = /^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+(?:\.\d+)?)\s*m(?:in)?)?$/.exec(text);
  if (match && (match[1] || match[2])) return Math.round(Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0));
  const hoursThenMinutes = /^(\d+)\s*h\s*(\d+)$/.exec(text);
  if (hoursThenMinutes) return Number(hoursThenMinutes[1]) * 60 + Number(hoursThenMinutes[2]);
  return null;
}
