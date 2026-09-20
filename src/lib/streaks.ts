/**
 * Streaks and heatmap intensity.
 *
 * The rules come from Settings, not from code: a day counts from `minMinutes` logged, and the user has
 * `freezesPerMonth` freeze days that do not break the streak. A freeze is spent on a day that would
 * otherwise end the streak, and only while the month still has one left.
 *
 * Pure. Every date is a local "YYYY-MM-DD" (see dates.ts).
 */
import type { DayLog } from '../db/types.ts';
import type { SettingsDefaults } from '../seed/schema.ts';
import { addDays, daysBetween, eachDay, monthKey, today } from './dates.ts';

export interface StreakRules {
  minMinutes: number;
  freezesPerMonth: number;
  autoFreeze: boolean;
}

export interface DayTotals {
  date: string;
  minutes: number;
  frozen: boolean;
}

/** One entry per day between the first and last log, with zero-minute days filled in. */
export function dailyTotals(logs: DayLog[], from?: string, to?: string): DayTotals[] {
  const byDate = new Map(logs.map((log) => [log.date, log]));
  const dates = logs.map((l) => l.date).sort();
  const start = from ?? dates[0];
  const end = to ?? dates.at(-1);
  if (!start || !end || start > end) return [];
  return eachDay(start, end).map((date) => {
    const log = byDate.get(date);
    return {
      date,
      minutes: log ? log.entries.reduce((sum, e) => sum + e.minutes, 0) : 0,
      frozen: Boolean(log?.frozen),
    };
  });
}

export function counts(total: DayTotals, rules: StreakRules): boolean {
  return total.minutes >= rules.minMinutes;
}

export interface StreakState {
  current: number;
  longest: number;
  /** Days the current streak has been kept alive by a freeze. */
  freezesInUse: number;
  /** The first day of the current streak, or null when there is none. */
  startedOn: string | null;
  /** The last day that counted, or null. */
  lastCountedOn: string | null;
  /** True when today has not met the minimum yet but yesterday did, so the streak is still alive. */
  atRisk: boolean;
}

interface Walk {
  length: number;
  start: string | null;
  freezes: number;
}

/**
 * Walks days forward, keeping a running streak. A day either counts, is frozen (explicitly or by spending
 * one of the month's freezes), or ends the streak.
 */
function walk(totals: DayTotals[], rules: StreakRules): { longest: number; run: Walk; runs: Walk[] } {
  let longest = 0;
  let run: Walk = { length: 0, start: null, freezes: 0 };
  const runs: Walk[] = [];
  const freezesUsed = new Map<string, number>();

  const spendFreeze = (date: string): boolean => {
    const month = monthKey(date);
    const used = freezesUsed.get(month) ?? 0;
    if (used >= rules.freezesPerMonth) return false;
    freezesUsed.set(month, used + 1);
    return true;
  };

  for (const total of totals) {
    if (counts(total, rules)) {
      run = { length: run.length + 1, start: run.start ?? total.date, freezes: run.freezes };
    } else if (total.frozen && spendFreeze(total.date)) {
      // An explicit freeze holds the streak without adding a day to it.
      run = { ...run, freezes: run.freezes + 1 };
    } else if (rules.autoFreeze && run.length > 0 && spendFreeze(total.date)) {
      run = { ...run, freezes: run.freezes + 1 };
    } else {
      if (run.length > 0) runs.push(run);
      longest = Math.max(longest, run.length);
      run = { length: 0, start: null, freezes: 0 };
    }
  }
  if (run.length > 0) runs.push(run);
  return { longest: Math.max(longest, run.length), run, runs };
}

export function streak(logs: DayLog[], rules: StreakRules, asOf: string = today()): StreakState {
  const totals = dailyTotals(logs, undefined, asOf).filter((t) => t.date <= asOf);
  if (totals.length === 0) {
    return { current: 0, longest: 0, freezesInUse: 0, startedOn: null, lastCountedOn: null, atRisk: false };
  }
  const counted = totals.filter((t) => counts(t, rules));
  const lastCountedOn = counted.at(-1)?.date ?? null;

  const full = walk(totals, rules);
  // Today not being finished yet must not end the streak: if today does not count, judge the streak as of
  // yesterday and mark it at risk.
  const todayCounts = counts(totals.at(-1)!, rules);
  const state = todayCounts ? full : walk(totals.slice(0, -1), rules);
  const alive = todayCounts || state.run.length > 0;

  return {
    current: alive ? state.run.length : 0,
    longest: Math.max(full.longest, state.longest),
    freezesInUse: alive ? state.run.freezes : 0,
    startedOn: alive ? state.run.start : null,
    lastCountedOn,
    atRisk: !todayCounts && alive,
  };
}

/**
 * Freezes already spent in the month of `date`, explicit or automatic.
 *
 * `date` itself counts only when the user froze it on purpose: an unfinished day has not spent a freeze
 * yet, the same rule that keeps today from breaking the streak.
 */
export function freezesSpentInMonth(logs: DayLog[], rules: StreakRules, date: string): number {
  const month = monthKey(date);
  const totals = dailyTotals(logs, undefined, date).filter((t) => monthKey(t.date) === month);
  let used = 0;
  for (const total of totals) {
    if (counts(total, rules)) continue;
    if (total.frozen) used++;
    else if (rules.autoFreeze && total.date < date) used++;
  }
  return Math.min(used, rules.freezesPerMonth);
}

/* ------------------------------------------------------------------ heatmap intensity */

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/** Which of the five intensity steps a day falls into. Thresholds come from Settings. */
export function heatLevel(minutes: number, thresholds: SettingsDefaults['heatmapThresholds']): HeatLevel {
  if (minutes >= thresholds[3]) return 4;
  if (minutes >= thresholds[2]) return 3;
  if (minutes >= thresholds[1]) return 2;
  if (minutes >= thresholds[0]) return 1;
  return 0;
}

/** Human-readable band for a level, for the legend and tooltips. */
export function heatLabel(level: HeatLevel, thresholds: SettingsDefaults['heatmapThresholds']): string {
  if (level === 0) return 'Nothing logged';
  if (level === 4) return thresholds[3] / 60 + ' h or more';
  const lower = thresholds[level - 1]!;
  const upper = thresholds[level]! - 1;
  return Math.round(lower) + ' to ' + Math.round(upper) + ' minutes';
}

/* ------------------------------------------------------------------ rolling windows */

/** Minutes per day over the last `days` days ending at `asOf`, oldest first. */
export function recentTotals(logs: DayLog[], days: number, asOf: string = today()): DayTotals[] {
  return dailyTotals(logs, addDays(asOf, -(days - 1)), asOf);
}

/** Average minutes a day over a window, counting days with nothing logged. */
export function averageMinutes(logs: DayLog[], days: number, asOf: string = today()): number {
  const totals = recentTotals(logs, days, asOf);
  if (totals.length === 0) return 0;
  return totals.reduce((sum, t) => sum + t.minutes, 0) / totals.length;
}

/** Days since the first logged day, inclusive; 0 when nothing is logged. */
export function daysTracked(logs: DayLog[], asOf: string = today()): number {
  const first = logs.map((l) => l.date).sort()[0];
  return first ? daysBetween(first, asOf) + 1 : 0;
}
