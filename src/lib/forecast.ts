/**
 * Am I on track?
 *
 * The honest version of that question: at the pace of the last few weeks, when does the work left in this
 * lane actually finish, and how does that compare with the date the plan wanted? Everything here is
 * measured in hours logged against hours estimated, because those are the two numbers the user has.
 *
 * Two things are kept apart (ATLAS-FORECAST-FIX): the plan being too full for the days left, which no pace can
 * mend, and the pace itself. And the pace is only judged once there is something to judge it on: the window
 * never reaches back before the phase started or before the first day anything was logged, and under a week of
 * it, or under three logged days, the verdict is "too early to tell".
 *
 * Pure: the caller passes the date and the logs.
 */
import type { DayLog, StoredSettings } from '../db/types.ts';
import type { BlockId, Phase, SettingsDefaults } from '../seed/schema.ts';
import { addDays, clampDate, daysBetween, monthName } from './dates.ts';
import { plannedForBlock, plannedOver } from './day-plan.ts';
import type { LaneProgress } from './progress.ts';

export type Verdict = 'ahead' | 'on-track' | 'behind' | 'stalled' | 'done' | 'not-started' | 'early' | 'over-planned';

/** A verdict needs at least this many days in the pace window… */
export const MIN_WINDOW_DAYS = 7;
/** …and at least this many of them with something logged. */
export const MIN_LOGGED_DAYS = 3;
/** Past this many weeks late, the lane says the month it finishes in rather than a count of weeks. */
export const CLAMP_WEEKS = 12;

export interface PaceWindow {
  /** The first day counted: the latest of the window's own start, the phase start and the first day with a log. */
  from: string;
  to: string;
  /** Days from `from` to `to`, both included. */
  days: number;
  /** Days in the window with any minutes logged, on any block. */
  loggedDays: number;
}

export interface LaneForecast {
  block: BlockId;
  remainingHours: number;
  /** Hours a day this lane has actually been getting, over the pace window. */
  paceHoursPerDay: number;
  /** Hours a day the plan assumes, from the block's settings. */
  plannedHoursPerDay: number;
  /** Hours the schedule plans for this lane from today to the phase end. */
  capacityHours: number;
  /** Hours the lane's remaining work exceeds that capacity by; 0 when it fits. */
  overflowHours: number;
  /** When the lane's remaining work finishes at the current pace. Null when the pace is zero. */
  projectedEnd: string | null;
  /** Whole weeks between the projected end and the phase's end. Negative means early. */
  weeksLate: number | null;
  verdict: Verdict;
}

export interface PhaseForecast {
  phase: Phase;
  lanes: LaneForecast[];
  /** The latest projected end across the lanes whose plan fits: when the phase really finishes. */
  projectedEnd: string | null;
  weeksLate: number | null;
  verdict: Verdict;
  remainingHours: number;
  /** Lanes whose remaining work does not fit the days left. */
  overPlanned: number;
  window: PaceWindow;
}

/** The first day with any minutes logged, or null when nothing has been logged yet. */
export function firstLogDay(logs: DayLog[]): string | null {
  let first: string | null = null;
  for (const log of logs) {
    if (!log.entries.some((e) => e.minutes > 0)) continue;
    if (first === null || log.date < first) first = log.date;
  }
  return first;
}

/**
 * The pace window ending on `asOf`: the last `windowDays` days, but never a day before `phaseStart` and never a
 * day before anything was logged. Days before tracking started are not days the plan was missed.
 */
export function paceWindow(logs: DayLog[], phaseStart: string, asOf: string, windowDays: number): PaceWindow {
  let from = addDays(asOf, -(windowDays - 1));
  if (phaseStart > from) from = phaseStart;
  const first = firstLogDay(logs);
  if (first !== null && first > from) from = first;
  if (from > asOf) from = asOf;
  const loggedDays = logs.filter((l) => l.date >= from && l.date <= asOf && l.entries.some((e) => e.minutes > 0)).length;
  return { from, to: asOf, days: daysBetween(from, asOf) + 1, loggedDays };
}

/**
 * Hours a day logged against one block over the pace window, counting every day in the window. With `from`, the
 * window starts there instead of `windowDays` back (see paceWindow).
 */
export function paceForBlock(logs: DayLog[], block: BlockId, asOf: string, windowDays: number, from: string = addDays(asOf, -(windowDays - 1))): number {
  const days = daysBetween(from, asOf) + 1;
  if (days <= 0) return 0;
  let minutes = 0;
  for (const log of logs) {
    if (log.date < from || log.date > asOf) continue;
    for (const entry of log.entries) {
      if (entry.block === block) minutes += entry.minutes;
    }
  }
  return minutes / 60 / days;
}

/** Hours a day the schedule plans for a lane between two dates, on average (templates, overrides, pace, pauses). */
export function plannedHoursPerDay(settings: StoredSettings, block: BlockId, from: string, to: string): number {
  if (to < from) return 0;
  return plannedOver(settings, from, to, block) / 60 / (daysBetween(from, to) + 1);
}

/** Days are walked at most this far ahead; past it a lane has no projected end. */
const HORIZON_DAYS = 365 * 12;

/**
 * When a lane's remaining hours run out if each future day gets what the schedule plans for it, scaled by how
 * much of its plan the lane has actually been getting lately. An exam week or a paused lane plans nothing, so it
 * pushes the date out by exactly as long as it lasts.
 */
export function projectEnd(settings: StoredSettings, block: BlockId, from: string, remainingHours: number, efficiency: number): string | null {
  if (remainingHours <= 0) return from;
  if (efficiency <= 0) return null;
  let left = remainingHours * 60;
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const date = addDays(from, i);
    left -= plannedForBlock(date, settings, block) * efficiency;
    if (left <= 0) return date;
  }
  return null;
}

/**
 * The verdict for a lane, in this order: finished; the plan does not fit the days left (no pace can mend that,
 * so it is said instead of a count of weeks); too little logged to judge; nothing going in; then the pace.
 *
 * `stalled` is kept separate from `behind` on purpose: a lane with work left and no hours going into it
 * has no projected end at all, and saying "0 weeks behind" would be worse than saying nothing.
 */
function verdictFor(remainingHours: number, pace: number, weeksLate: number | null, started: boolean, overflowHours: number, enough: boolean): Verdict {
  if (remainingHours <= 0) return 'done';
  if (overflowHours > 0) return 'over-planned';
  if (!enough) return 'early';
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
  const window = paceWindow(logs, phase.start, asOf, windowDays);
  // Before anything is logged there is nothing to be early about: a lane is simply not started.
  const enough = window.loggedDays === 0 || (window.days >= MIN_WINDOW_DAYS && window.loggedDays >= MIN_LOGGED_DAYS);

  const laneForecasts: LaneForecast[] = lanes.map((lane) => {
    const pace = paceForBlock(logs, lane.block, asOf, windowDays, window.from);
    const planned = plannedHoursPerDay(settings, lane.block, from, phase.end);
    const capacityHours = from <= phase.end ? plannedOver(settings, from, phase.end, lane.block) / 60 : 0;
    const remaining = lane.remainingHours;
    const overflowHours = Math.max(0, remaining - capacityHours);
    const started = lane.doneHours > 0;

    let projectedEnd: string | null = null;
    let weeksLate: number | null = null;
    if (remaining > 0 && pace > 0) {
      // How much of its plan the lane got over the window; the future plan is scaled by the same share.
      const plannedInWindow = plannedHoursPerDay(settings, lane.block, window.from, asOf);
      projectedEnd = plannedInWindow > 0 ? projectEnd(settings, lane.block, from, remaining, pace / plannedInWindow) : null;
      // A lane that planned nothing lately but got hours anyway: fall back to its pace.
      projectedEnd ??= addDays(from, Math.ceil(remaining / pace));
      weeksLate = Math.round(daysBetween(phase.end, projectedEnd) / 7);
    }

    return {
      block: lane.block,
      remainingHours: remaining,
      paceHoursPerDay: pace,
      plannedHoursPerDay: planned,
      capacityHours,
      overflowHours,
      projectedEnd,
      weeksLate,
      verdict: verdictFor(remaining, pace, weeksLate, started, overflowHours, enough),
    };
  });

  // An over-planned lane is reported as that; its date would only say the same thing as a count of weeks.
  const paced = laneForecasts.filter((l) => l.verdict !== 'over-planned');
  const ends = paced.map((l) => l.projectedEnd).filter((d): d is string => d !== null);
  const projectedEnd = ends.length > 0 ? ends.reduce((a, b) => (a > b ? a : b)) : null;
  const remainingHours = lanes.reduce((sum, l) => sum + l.remainingHours, 0);
  const weeksLate = projectedEnd ? Math.round(daysBetween(phase.end, projectedEnd) / 7) : null;
  const overPlanned = laneForecasts.filter((l) => l.verdict === 'over-planned').length;

  // The phase is as late as its latest lane, and stalled if any lane with work left has no pace.
  const open = laneForecasts.filter((l) => l.verdict !== 'done');
  const anyStalled = laneForecasts.some((l) => l.verdict === 'stalled');
  const verdict: Verdict =
    remainingHours <= 0
      ? 'done'
      : overPlanned > 0
        ? 'over-planned'
        : open.length > 0 && open.every((l) => l.verdict === 'early')
          ? 'early'
          : anyStalled && projectedEnd === null
            ? 'stalled'
            : verdictFor(remainingHours, projectedEnd ? 1 : 0, weeksLate, true, 0, true);

  return { phase, lanes: laneForecasts, projectedEnd, weeksLate, verdict, remainingHours, overPlanned, window };
}

/* ------------------------------------------------------------------ wording */

/** "February 2027". */
export function monthYear(date: string): string {
  const [y, m] = date.split('-').map(Number) as [number, number];
  return monthName(m - 1) + ' ' + y;
}

export interface VerdictDetail {
  /** The lane's projected end, for the clamped wording past CLAMP_WEEKS. */
  projectedEnd?: string | null;
  /** Hours an over-planned lane exceeds its capacity by. */
  overflowHours?: number;
  /** For a phase: how many of its lanes are over-planned. */
  lanesOver?: number;
}

export function describeVerdict(verdict: Verdict, weeksLate: number | null, detail: VerdictDetail = {}): string {
  switch (verdict) {
    case 'done':
      return 'Finished';
    case 'not-started':
      return 'Not started';
    case 'early':
      return 'Too early to tell';
    case 'stalled':
      return 'No hours logged lately';
    case 'over-planned': {
      if (detail.lanesOver !== undefined) return detail.lanesOver + (detail.lanesOver === 1 ? ' lane over-planned' : ' lanes over-planned');
      return 'Plan too full by ' + Math.max(1, Math.round(detail.overflowHours ?? 0)) + ' h';
    }
    case 'ahead': {
      const weeks = Math.abs(weeksLate ?? 0);
      return weeks + (weeks === 1 ? ' week early' : ' weeks early');
    }
    case 'on-track':
      return 'On track';
    case 'behind': {
      const weeks = weeksLate ?? 0;
      if (weeks > CLAMP_WEEKS && detail.projectedEnd) {
        const [y, m] = detail.projectedEnd.split('-').map(Number) as [number, number];
        const months = Math.max(1, Math.round(weeks / (52 / 12)));
        return 'Finishes ~' + monthName(m - 1, true) + ' ' + y + ' (' + months + (months === 1 ? ' month late)' : ' months late)');
      }
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
    case 'over-planned':
      return 'warning';
    case 'stalled':
      return 'critical';
    case 'not-started':
    case 'early':
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
  const planned = plannedOver(settings, from, asOf) / 60 / windowDays;
  return { actual, planned, ratio: planned > 0 ? actual / planned : 0, windowDays };
}

/** Hours a lane gets over a phase, used to show a lane that is over its budget before any pace is known. */
export function laneBudget(settings: StoredSettings, block: BlockId, start: string, end: string): number {
  return plannedOver(settings, start, end, block) / 60;
}

export type { SettingsDefaults };
