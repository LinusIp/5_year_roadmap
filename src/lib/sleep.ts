/**
 * The sleep log (SLEEP-LOG): one night per wake-up date, entered by hand as a bedtime and a wake time. Times are the
 * user's local wall-clock times ("2026-10-17T23:00", Asia/Tashkent); the length is the difference of the two wall
 * clocks, which is the time slept where there is no daylight saving (Tashkent has none).
 */
import { addDays, eachDay, startOfWeek } from './dates.ts';
import type { IsoDate } from './dates.ts';

export interface Night {
  /** The wake-up date: the night belongs to the morning it ends on. */
  date: IsoDate;
  /** Local times, "YYYY-MM-DDTHH:MM". */
  bed: string;
  wake: string;
  minutes: number;
}

export const DEFAULT_GOAL_MINUTES = 8 * 60;
export const DEFAULT_BEDTIME = '23:00';
export const DEFAULT_WAKE = '06:00';
/** A night outside 1 to 16 hours is saved only once the user says so. */
export const SHORTEST = 60;
export const LONGEST = 16 * 60;
/** The week chart's scale: a full bar is 9 hours. */
export const CHART_MINUTES = 9 * 60;

/** "23:00" -> 1380. */
export function clockMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

/** 1380 -> "23:00", wrapping around midnight. */
export function clockText(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

function wallMs(local: string): number {
  const [date, time = '00:00'] = local.split('T') as [string, string?];
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number];
  const [h, mi] = time.split(':').map(Number) as [number, number];
  return Date.UTC(y, mo - 1, d, h, mi);
}

/** Minutes from bed to wake, across midnight; negative when wake is not after bed. */
export function nightMinutes(bed: string, wake: string): number {
  return Math.round((wallMs(wake) - wallMs(bed)) / 60_000);
}

/** The time of day of a local time: "2026-10-17T23:00" -> "23:00". */
export function timeOf(local: string): string {
  return local.slice(11, 16);
}

/**
 * A night from two times of day and the wake-up date. The bedtime is on the evening before when it is later in the day
 * than the wake time (23:00 -> 05:40), and on the wake-up date itself when it is earlier (00:30 -> 06:00, after
 * midnight).
 */
export function nightOf(date: IsoDate, bedTime: string, wakeTime: string): Night {
  const bedDate = clockMinutes(bedTime) >= clockMinutes(wakeTime) ? addDays(date, -1) : date;
  const bed = bedDate + 'T' + bedTime;
  const wake = date + 'T' + wakeTime;
  return { date, bed, wake, minutes: nightMinutes(bed, wake) };
}

/** The night's date: the date it was woken up on. */
export function wakeDateOf(wake: string): IsoDate {
  return wake.slice(0, 10);
}

export type NightCheck = { ok: false; error: string } | { ok: true; confirm?: string };

/** Wake must be after bed; a length outside 1 to 16 hours asks "Are you sure?" instead of refusing. */
export function checkNight(night: Pick<Night, 'bed' | 'wake'>): NightCheck {
  const minutes = nightMinutes(night.bed, night.wake);
  if (minutes <= 0) return { ok: false, error: 'Woke up has to be after bedtime.' };
  if (minutes < SHORTEST || minutes > LONGEST) return { ok: true, confirm: 'Are you sure? That is ' + lengthText(minutes) + '.' };
  return { ok: true };
}

/** "6 h 40 m", "8 h 05 m", "8 h", "45 m": as the app writes durations. */
export function lengthText(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return m + ' m';
  return m === 0 ? h + ' h' : h + ' h ' + String(m).padStart(2, '0') + ' m';
}

/** The median of some times of day. Times before noon count as after midnight, so 23:30 and 00:30 average to 00:00. */
export function medianClock(times: readonly string[], night = true): string | null {
  if (times.length === 0) return null;
  const values = times.map((t) => {
    const m = clockMinutes(t);
    return night && m < 12 * 60 ? m + 1440 : m;
  });
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 === 1 ? values[mid]! : (values[mid - 1]! + values[mid]!) / 2;
  return clockText(median);
}

/** The last `n` nights logged up to `date`, newest first. */
export function lastNights(nights: readonly Night[], date: IsoDate, n: number): Night[] {
  return nights
    .filter((x) => x.date <= date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, n);
}

/** The usual bedtime: the median of the last 7 nights, or null before the first. */
export function usualBedtime(nights: readonly Night[], date: IsoDate): string | null {
  return medianClock(lastNights(nights, date, 7).map((x) => timeOf(x.bed)));
}

export function usualWake(nights: readonly Night[], date: IsoDate): string | null {
  return medianClock(
    lastNights(nights, date, 7).map((x) => timeOf(x.wake)),
    false,
  );
}

/** The bedtime that gives `goal` minutes of sleep before a start time: 8 h before 06:00 is 22:00. */
export function bedtimeFor(goalMinutes: number, start: string): string {
  return clockText(clockMinutes(start) - goalMinutes);
}

/** Rounded to the nearest 5 minutes: "05:43" -> "05:45". */
export function roundToFive(minutes: number): string {
  return clockText(Math.round(minutes / 5) * 5);
}

/**
 * What the Sleep screen starts from for a night with no entry: the usual bedtime (23:00 at first), and as wake time
 * now, rounded to 5 minutes, when it is before noon on that very morning, else the usual wake time (06:00 at first).
 */
export function defaultTimes(nights: readonly Night[], date: IsoDate, now: Date): { bed: string; wake: string } {
  const bed = usualBedtime(nights, addDays(date, -1)) ?? DEFAULT_BEDTIME;
  const minute = now.getHours() * 60 + now.getMinutes();
  const isThatMorning = localDate(now) === date && minute < 12 * 60;
  const wake = isThatMorning ? roundToFive(minute) : (usualWake(nights, addDays(date, -1)) ?? DEFAULT_WAKE);
  return { bed, wake };
}

function localDate(d: Date): IsoDate {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** A time of day moved by `delta` minutes, around midnight. */
export function stepClock(time: string, delta: number): string {
  return clockText(clockMinutes(time) + delta);
}

export interface WeekBar {
  date: IsoDate;
  minutes: number | null;
}

/** This week's nights, Monday to Sunday (or as the week starts), each with its minutes or null. */
export function weekBars(nights: readonly Night[], date: IsoDate, weekStartsOn: 0 | 1 = 1): WeekBar[] {
  const start = startOfWeek(date, weekStartsOn);
  const byDate = new Map(nights.map((x) => [x.date, x.minutes]));
  return eachDay(start, addDays(start, 6)).map((d) => ({ date: d, minutes: byDate.get(d) ?? null }));
}

/** The average of the nights logged among some days, or null when none was. */
export function averageMinutes(bars: readonly WeekBar[]): number | null {
  const logged = bars.filter((b) => b.minutes !== null).map((b) => b.minutes!);
  return logged.length === 0 ? null : Math.round(logged.reduce((s, m) => s + m, 0) / logged.length);
}

/** The `n` days up to `date`, oldest first, each with its night's minutes or null. */
export function recentBars(nights: readonly Night[], date: IsoDate, n: number): WeekBar[] {
  const byDate = new Map(nights.map((x) => [x.date, x.minutes]));
  return eachDay(addDays(date, -(n - 1)), date).map((d) => ({ date: d, minutes: byDate.get(d) ?? null }));
}

/** "6.7": a bar's hours, one decimal. */
export function barHours(minutes: number): string {
  return (Math.round((minutes / 60) * 10) / 10).toFixed(1);
}
