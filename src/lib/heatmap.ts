/**
 * The contribution grid: 53 columns of 7 days, laid out the way GitHub's is.
 *
 * Pure geometry and arithmetic, so the SVG component has nothing to decide. Every date is a local
 * calendar date (see dates.ts); a cell is a day, a column is a week.
 */
import type { DayLog } from '../db/types.ts';
import type { BlockId, SettingsDefaults, TrackId } from '../seed/schema.ts';
import { addDays, daysBetween, monthName, startOfWeek, weekday } from './dates.ts';
import { heatLevel } from './streaks.ts';
import type { HeatLevel } from './streaks.ts';

export interface HeatCell {
  date: string;
  /** Minutes counted after any track filter. */
  minutes: number;
  /** Minutes on the day regardless of the filter, so a filtered view can still say what else happened. */
  totalMinutes: number;
  level: HeatLevel;
  /** Column (week) and row (weekday) in the grid. */
  column: number;
  row: number;
  frozen: boolean;
  /** True for a day outside the requested range: drawn as a gap, not a zero. */
  outside: boolean;
}

export interface MonthLabel {
  /** Column the month's first full week starts at. */
  column: number;
  label: string;
}

export interface HeatGrid {
  cells: HeatCell[];
  columns: number;
  months: MonthLabel[];
  start: string;
  end: string;
  /** Totals over the range, after the filter. */
  totalMinutes: number;
  daysWithActivity: number;
  maxMinutes: number;
}

export interface GridOptions {
  from: string;
  to: string;
  logs: DayLog[];
  thresholds: SettingsDefaults['heatmapThresholds'];
  /** Only count minutes on these tracks. Empty or absent means all of them. */
  tracks?: TrackId[];
  weekStartsOn?: 0 | 1;
}

function minutesOf(log: DayLog | undefined, tracks: Set<TrackId> | null): number {
  if (!log) return 0;
  let total = 0;
  for (const entry of log.entries) {
    if (!tracks || tracks.has(entry.track)) total += entry.minutes;
  }
  return total;
}

/** Where one day sits in a grid of whole weeks: columns are weeks, rows are weekdays. */
export interface GridSlot {
  date: string;
  column: number;
  row: number;
  /** True for a day outside the requested range: drawn as a gap, not a zero. */
  outside: boolean;
}

export interface GridLayout {
  slots: GridSlot[];
  columns: number;
  months: MonthLabel[];
  start: string;
  end: string;
}

/**
 * Lays out the days from `from` to `to` in whole weeks. Any two grids over the same range and week start
 * line up column for column, which is what lets the GitHub calendar sit under the Atlas one.
 */
export function layoutGrid(from: string, to: string, weekStartsOn: 0 | 1 = 1): GridLayout {
  // Pad to whole weeks so the grid is rectangular.
  const gridStart = startOfWeek(from, weekStartsOn);
  const gridEnd = addDays(startOfWeek(to, weekStartsOn), 6);
  const dayCount = daysBetween(gridStart, gridEnd) + 1;

  const slots: GridSlot[] = [];
  const months: MonthLabel[] = [];
  let lastMonth = '';
  for (let i = 0; i < dayCount; i++) {
    const date = addDays(gridStart, i);
    const column = Math.floor(i / 7);
    const row = (weekday(date) - weekStartsOn + 7) % 7;
    const outside = date < from || date > to;
    slots.push({ date, column, row, outside });
    // Label a month at the column where its first day of the week falls.
    const month = date.slice(0, 7);
    if (!outside && month !== lastMonth && row === 0) {
      months.push({ column, label: monthName(Number(date.slice(5, 7)) - 1, true) });
      lastMonth = month;
    }
  }
  return { slots, columns: Math.ceil(dayCount / 7), months, start: gridStart, end: gridEnd };
}

export function buildGrid({ from, to, logs, thresholds, tracks, weekStartsOn = 1 }: GridOptions): HeatGrid {
  const byDate = new Map(logs.map((log) => [log.date, log]));
  const filter = tracks && tracks.length > 0 ? new Set(tracks) : null;
  const layout = layoutGrid(from, to, weekStartsOn);

  let totalMinutes = 0;
  let daysWithActivity = 0;
  let maxMinutes = 0;
  const cells = layout.slots.map((slot): HeatCell => {
    const log = slot.outside ? undefined : byDate.get(slot.date);
    const minutes = minutesOf(log, filter);
    if (!slot.outside) {
      totalMinutes += minutes;
      if (minutes > 0) daysWithActivity++;
      maxMinutes = Math.max(maxMinutes, minutes);
    }
    return {
      ...slot,
      minutes,
      totalMinutes: minutesOf(log, null),
      level: slot.outside ? 0 : heatLevel(minutes, thresholds),
      frozen: Boolean(log?.frozen),
    };
  });

  return {
    cells,
    columns: layout.columns,
    months: layout.months,
    start: layout.start,
    end: layout.end,
    totalMinutes,
    daysWithActivity,
    maxMinutes,
  };
}

/* ------------------------------------------------------------------ totals for the counters */

export interface TrackTotal {
  track: TrackId;
  minutes: number;
  share: number;
}

export function minutesPerTrack(logs: DayLog[], from?: string, to?: string): TrackTotal[] {
  const totals = new Map<TrackId, number>();
  let grand = 0;
  for (const log of logs) {
    if (from && log.date < from) continue;
    if (to && log.date > to) continue;
    for (const entry of log.entries) {
      totals.set(entry.track, (totals.get(entry.track) ?? 0) + entry.minutes);
      grand += entry.minutes;
    }
  }
  return [...totals.entries()]
    .map(([track, minutes]) => ({ track, minutes, share: grand > 0 ? minutes / grand : 0 }))
    .sort((a, b) => b.minutes - a.minutes);
}

export function minutesPerBlock(logs: DayLog[], from?: string, to?: string): Record<BlockId, number> {
  const out: Record<BlockId, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const log of logs) {
    if (from && log.date < from) continue;
    if (to && log.date > to) continue;
    for (const entry of log.entries) out[entry.block] += entry.minutes;
  }
  return out;
}

/** What a day's tooltip shows: minutes per block, and which items were touched. */
export interface DayDetail {
  date: string;
  totalMinutes: number;
  byBlock: { block: BlockId; minutes: number }[];
  refIds: string[];
  notes: string[];
  frozen: boolean;
  energy?: 1 | 2 | 3 | 4 | 5;
  reflection?: string;
}

export function dayDetail(log: DayLog | undefined, date: string): DayDetail {
  if (!log) return { date, totalMinutes: 0, byBlock: [], refIds: [], notes: [], frozen: false };
  const blocks = new Map<BlockId, number>();
  const refIds: string[] = [];
  const notes: string[] = [];
  for (const entry of log.entries) {
    blocks.set(entry.block, (blocks.get(entry.block) ?? 0) + entry.minutes);
    if (entry.refId && !refIds.includes(entry.refId)) refIds.push(entry.refId);
    if (entry.note) notes.push(entry.note);
  }
  const detail: DayDetail = {
    date,
    totalMinutes: log.entries.reduce((sum, e) => sum + e.minutes, 0),
    byBlock: [...blocks.entries()].map(([block, minutes]) => ({ block, minutes })).sort((a, b) => a.block.localeCompare(b.block)),
    refIds,
    notes,
    frozen: Boolean(log.frozen),
  };
  if (log.energy !== undefined) detail.energy = log.energy;
  if (log.reflection) detail.reflection = log.reflection;
  return detail;
}

/** The plan's years, for the year switcher: [2026, …, 2031] from the phase dates. */
export function planYears(start: string, end: string): number[] {
  const first = Number(start.slice(0, 4));
  const last = Number(end.slice(0, 4));
  const years: number[] = [];
  for (let y = first; y <= last; y++) years.push(y);
  return years;
}

/** The range of one calendar year, clipped to the plan. */
export function yearRange(year: number, planStart: string, planEnd: string): { from: string; to: string } {
  const from = year + '-01-01';
  const to = year + '-12-31';
  return { from: from < planStart ? planStart : from, to: to > planEnd ? planEnd : to };
}
