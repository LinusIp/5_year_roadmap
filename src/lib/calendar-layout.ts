/**
 * Clock times for a day's blocks, as Calendar's day view draws them and Today orders them.
 *
 * Blocks only have minutes; a template can give a block a start time, and a date can move it. Blocks without one
 * follow each other from 08:00 with 15-minute breaks. Busy events (a university class, once or every week) are
 * fixed: a block never overlaps one, or another block. Where it would, it moves to just after (with the break),
 * and the blocks after it move along.
 *
 * Times are minutes since local midnight. Pure.
 */
import { weekday } from './dates.ts';
import type { IsoDate } from './dates.ts';

/** The first block of a day with no times set starts here. */
export const DAY_START = 8 * 60;
/** Between two blocks, and after a busy event. */
export const BREAK = 15;
/** The day view's grid: 06:00 to 24:00. */
export const GRID_START = 6 * 60;
export const GRID_END = 24 * 60;
/** Drags and resizes snap to this. */
export const SNAP = 15;

/** "09:30" -> 570. */
export function parseHm(text: string): number {
  const [h, m] = text.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

/** 570 -> "09:30"; 1440 and later stay past midnight as "24:00". */
export function hm(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

/** Rounds to the nearest 15 minutes. */
export function snap(minutes: number, step = SNAP): number {
  return Math.round(minutes / step) * step;
}

/** A fixed commitment: once on a date, or every week on a weekday from a date (until another, if set). */
export interface BusyEvent {
  id: string;
  title: string;
  /** "09:00" */
  start: string;
  minutes: number;
  /** Once: this date. */
  date?: IsoDate;
  /** Weekly: this weekday (0 = Sunday), from `from`, until `until` if set. */
  weekday?: number;
  from?: IsoDate;
  until?: IsoDate;
}

export interface Interval {
  start: number;
  end: number;
}

/** Whether a busy event takes place on a date. */
export function busyOccursOn(event: BusyEvent, date: IsoDate): boolean {
  if (event.date !== undefined) return event.date === date;
  if (event.weekday === undefined || weekday(date) !== event.weekday) return false;
  if (event.from && date < event.from) return false;
  if (event.until && date > event.until) return false;
  return true;
}

/** The busy events of a date, earliest first. */
export function busyOn(events: readonly BusyEvent[], date: IsoDate): BusyEvent[] {
  return events.filter((e) => busyOccursOn(e, date)).sort((a, b) => parseHm(a.start) - parseHm(b.start));
}

export interface LayoutBlock {
  id: string;
  minutes: number;
  /** A start time the template or the date sets; without one the block follows the one before it. */
  start?: number;
}

export interface PlacedBlock {
  id: string;
  start: number;
  minutes: number;
  /** Whether the block has a time of its own (template or date). */
  fixed: boolean;
  /** Whether it sits later than its own time, moved by a busy event or another block. */
  shifted: boolean;
}

const overlaps = (a: Interval, b: Interval): boolean => a.start < b.end && b.start < a.end;

/** The first start at or after `from` where `minutes` fit without touching anything in `taken`. */
function firstFree(from: number, minutes: number, taken: readonly Interval[]): number {
  let start = from;
  for (;;) {
    const hit = taken.find((t) => overlaps({ start, end: start + minutes }, t));
    if (!hit) return start;
    start = hit.end + BREAK;
  }
}

/**
 * Places a day's blocks. Blocks with a time go first, earliest first, each at its time or just after whatever it
 * would overlap; then the others in their order, from 08:00 and one after another with breaks, in the gaps left.
 * Busy time is never used. A zero-minute block is left out.
 */
export function layoutDay(blocks: readonly LayoutBlock[], busy: readonly Interval[]): PlacedBlock[] {
  const taken: Interval[] = busy.map((b) => ({ ...b }));
  const placed = new Map<string, PlacedBlock>();
  const timed = blocks.filter((b) => b.start !== undefined && b.minutes > 0).sort((a, b) => a.start! - b.start!);
  for (const block of timed) {
    const start = firstFree(block.start!, block.minutes, taken);
    taken.push({ start, end: start + block.minutes });
    placed.set(block.id, { id: block.id, start, minutes: block.minutes, fixed: true, shifted: start !== block.start });
  }
  let cursor = DAY_START;
  for (const block of blocks) {
    if (block.minutes <= 0) continue;
    // A block with its own time does not carry the others with it: they fill around it.
    if (placed.has(block.id)) continue;
    const start = firstFree(cursor, block.minutes, taken);
    taken.push({ start, end: start + block.minutes });
    placed.set(block.id, { id: block.id, start, minutes: block.minutes, fixed: false, shifted: start !== cursor });
    cursor = start + block.minutes + BREAK;
  }
  return [...placed.values()].sort((a, b) => a.start - b.start);
}

/** The default start times of a template's blocks: from 08:00, one after another with 15-minute breaks. */
export function defaultStarts(blocks: readonly { id: string; minutes: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  let cursor = DAY_START;
  for (const b of blocks) {
    if (b.minutes <= 0) continue;
    out.set(b.id, cursor);
    cursor += b.minutes + BREAK;
  }
  return out;
}

/** The busy event a block placed at `start` for `minutes` would overlap, if any. */
export function busyConflict(events: readonly BusyEvent[], date: IsoDate, start: number, minutes: number): BusyEvent | undefined {
  return busyOn(events, date).find((e) => overlaps({ start, end: start + minutes }, { start: parseHm(e.start), end: parseHm(e.start) + e.minutes }));
}

/** Busy events of a date as intervals. */
export function busyIntervals(events: readonly BusyEvent[], date: IsoDate): Interval[] {
  return busyOn(events, date).map((e) => ({ start: parseHm(e.start), end: parseHm(e.start) + e.minutes }));
}
