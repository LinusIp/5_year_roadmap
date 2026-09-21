/**
 * Am I on track?
 *
 * The honest version of that question: at the pace of the last few weeks, when does the work left in this
 * lane actually finish, and how does that compare with the date the plan wanted? Everything here is
 * measured in hours logged against hours estimated, because those are the two numbers the user has.
 *
 * Pure: the caller passes the date and the logs.
 */
import type { DayLog, StoredSettings } from '../db/types.ts';
import type { BlockId, Phase, SettingsDefaults } from '../seed/schema.ts';
import { addDays, clampDate, daysBetween } from './dates.ts';
import type { LaneProgress } from './progress.ts';

export type Verdict = 'ahead' | 'on-track' | 'behind' | 'stalled' | 'done' | 'not-started';

export interface LaneForecast {
  block: BlockId;
  remainingHours: number;
  /** Hours a day this lane has actually been getting, over the pace window. */
  paceHoursPerDay: number;
  /** Hours a day the plan assumes, from the block's settings. */
  plannedHoursPerDay: number;
  /** When the lane's remaining work finishes at the current pace. Null when the pace is zero. */
  projectedEnd: string | null;
  /** Whole weeks between the projected end and the phase's end. Negative means early. */
  weeksLate: number | null;
  verdict: Verdict;
}

export interface PhaseForecast {
  phase: Phase;
  lanes: LaneForecast[];
  /** The latest projected end across the lanes: when the phase really finishes. */
  projectedEnd: string | null;
  weeksLate: number | null;
  verdict: Verdict;
  remainingHours: number;
}

/** Hours a day logged against one block over the pace window, counting every day in the window. */
export function paceForBlock(logs: DayLog[], block: BlockId, asOf: string, windowDays: number): number {
  const from = addDays(asOf, -(windowDays - 1));
  let minutes = 0;
  for (const log of logs) {
    if (log.date < from || log.date > asOf) continue;
    for (const entry of log.entries) {
      if (entry.block === block) minutes += entry.minutes;
    }
  }
  return minutes / 60 / windowDays;
}

export function plannedHoursPerDay(settings: StoredSettings, block: BlockId): number {
  const def = settings.core.blocks.find((b) => b.id === block);
  if (!def) return 0;
  return (def.minutes * def.days.length) / 7 / 60;
}

/**
 * The verdict for a lane.
 *
 * `stalled` is kept separate from `behind` on purpose: a lane with work left and no hours going into it
 * has no projected end at all, and saying "0 weeks behind" would be worse than saying nothing.
 */
function verdictFor(remainingHours: number, pace: number, weeksLate: number | null, started: boolean): Verdict {
  if (remainingHours <= 0) return 'done';
  if (pace <= 0) return started ? 'stalled' : 'not-started';
  if (weeksLate === null) return 'stalled';
  if (weeksLate <= -1) return 'ahead';
  if (weeksLate <= 0) return 'on-track';
  return 'behind';
}

export interface ForecastInput {
  phase: Phase;
  lanes: LaneProgress[];
  logs: DayLog[];
  settings: StoredSettings;
  asOf: string;
}

export function forecastPhase({ phase, lanes, logs, settings, asOf }: ForecastInput): PhaseForecast {
  const windowDays = settings.core.forecast.paceWindowDays;
  const from = clampDate(asOf, phase.start, phase.end);

  const laneForecasts: LaneForecast[] = lanes.map((lane) => {
    const pace = paceForBlock(logs, lane.block, asOf, windowDays);
    const planned = plannedHoursPerDay(settings, lane.block);
    const remaining = lane.remainingHours;
    const started = lane.doneHours > 0;

    let projectedEnd: string | null = null;
    let weeksLate: number | null = null;
    if (remaining > 0 && pace > 0) {
      const days = Math.ceil(remaining / pace);
      projectedEnd = addDays(from, days);
      weeksLate = Math.round(daysBetween(phase.end, projectedEnd) / 7);
    }

    return {
      block: lane.block,
      remainingHours: remaining,
      paceHoursPerDay: pace,
      plannedHoursPerDay: planned,
      projectedEnd,
      weeksLate,
      verdict: verdictFor(remaining, pace, weeksLate, started),
    };
  });

  const ends = laneForecasts.map((l) => l.projectedEnd).filter((d): d is string => d !== null);
  const projectedEnd = ends.length > 0 ? ends.reduce((a, b) => (a > b ? a : b)) : null;
  const remainingHours = lanes.reduce((sum, l) => sum + l.remainingHours, 0);
  const weeksLate = projectedEnd ? Math.round(daysBetween(phase.end, projectedEnd) / 7) : null;

  // The phase is as late as its latest lane, and stalled if any lane with work left has no pace.
  const anyStalled = laneForecasts.some((l) => l.verdict === 'stalled');
  const verdict: Verdict =
    remainingHours <= 0
      ? 'done'
      : anyStalled && projectedEnd === null
        ? 'stalled'
        : verdictFor(remainingHours, projectedEnd ? 1 : 0, weeksLate, true);

  return { phase, lanes: laneForecasts, projectedEnd, weeksLate, verdict, remainingHours };
}

/* ------------------------------------------------------------------ wording */

export function describeVerdict(verdict: Verdict, weeksLate: number | null): string {
  switch (verdict) {
    case 'done':
      return 'Finished';
    case 'not-started':
      return 'Not started';
    case 'stalled':
      return 'No hours logged lately';
    case 'ahead': {
      const weeks = Math.abs(weeksLate ?? 0);
      return weeks + (weeks === 1 ? ' week early' : ' weeks early');
    }
    case 'on-track':
      return 'On track';
    case 'behind': {
      const weeks = weeksLate ?? 0;
      return weeks + (weeks === 1 ? ' week behind' : ' weeks behind');
    }
  }
}

export function verdictTone(verdict: Verdict): 'good' | 'warning' | 'critical' | 'muted' {
  switch (verdict) {
    case 'done':
    case 'ahead':
      return 'good';
    case 'on-track':
      return 'muted';
    case 'behind':
      return 'warning';
    case 'stalled':
      return 'critical';
    case 'not-started':
      return 'muted';
  }
}

/* ------------------------------------------------------------------ overall pace */

export interface PaceSummary {
  /** Hours a day over the window, all blocks. */
  actual: number;
  /** Hours a day the settings plan for. */
  planned: number;
  /** actual / planned, so 1 is exactly on budget. */
  ratio: number;
  windowDays: number;
}

export function paceSummary(logs: DayLog[], settings: StoredSettings, asOf: string): PaceSummary {
  const windowDays = settings.core.forecast.paceWindowDays;
  const from = addDays(asOf, -(windowDays - 1));
  let minutes = 0;
  for (const log of logs) {
    if (log.date < from || log.date > asOf) continue;
    minutes += log.entries.reduce((sum, e) => sum + e.minutes, 0);
  }
  const actual = minutes / 60 / windowDays;
  const planned = settings.core.blocks.reduce((sum, b) => sum + (b.minutes * b.days.length) / 7 / 60, 0);
  return { actual, planned, ratio: planned > 0 ? actual / planned : 0, windowDays };
}

/** Hours a lane gets over a phase, used to show a lane that is over its budget before any pace is known. */
export function laneBudget(settings: StoredSettings, block: BlockId, start: string, end: string): number {
  const def = settings.core.blocks.find((b) => b.id === block);
  if (!def) return 0;
  const days = daysBetween(start, end) + 1;
  const weeks = days / 7;
  return (def.minutes * def.days.length * weeks) / 60;
}

export type { SettingsDefaults };
