/**
 * The timer, the only way to log time (manual minutes live behind "Edit logged time" in Calendar's day view).
 *
 * It stores when it started, never a running count, so a reload, a closed tab, a locked phone or another app in
 * front lose nothing: the elapsed time is always now minus the start. One timer runs at a time; starting another
 * block stops the first and saves its minutes.
 *
 * A timer left running is caught on the next open: after three hours, or once the day it started on is over, the
 * app asks "Still working on Core? You started at 14:10" with Keep, Stop at the last time the app was used, and
 * Stop now. Keep asks again after another three hours, or at the next midnight.
 *
 * Pure: the database parts are in src/db/state.ts.
 */
import { toIsoDate } from './dates.ts';
import type { IsoDate } from './dates.ts';

export interface TimerState {
  block: string;
  track: string;
  refId?: string;
  startedAt: number;
  /** When Keep last answered the forgotten-timer question. */
  keptAt?: number;
}

/** Three hours: a block is at most two, so a timer running this long was most likely forgotten. */
export const FORGOTTEN_AFTER_MS = 3 * 60 * 60 * 1000;

export interface ForgottenTimer {
  reason: 'long' | 'midnight';
  startedAt: number;
  /** The last time the app was used before this open, if it is after the start: the "Stop at" option. */
  lastUsedAt?: number;
}

/** Local midnight at the end of the day that `ms` falls on. */
function nextMidnight(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

/**
 * Whether opening the app at `now` should ask about the timer. Measured from the start, or from the last Keep:
 * three hours, or a midnight passed since.
 */
export function forgottenTimer(timer: TimerState | null | undefined, now: number, lastUsedAt?: number): ForgottenTimer | null {
  if (!timer) return null;
  const since = timer.keptAt ?? timer.startedAt;
  const reason = now >= nextMidnight(since) ? 'midnight' : now - since >= FORGOTTEN_AFTER_MS ? 'long' : null;
  if (!reason) return null;
  const result: ForgottenTimer = { reason, startedAt: timer.startedAt };
  if (lastUsedAt !== undefined && lastUsedAt > timer.startedAt && lastUsedAt < now) result.lastUsedAt = lastUsedAt;
  return result;
}

/**
 * The minutes a timer logs when it stops at `stopAt`, by local date: a timer that ran past midnight logs each
 * side on its own day. Whole minutes, rounded; a part under half a minute logs nothing.
 */
export function timerEntries(timer: Pick<TimerState, 'startedAt'>, stopAt: number): { date: IsoDate; minutes: number }[] {
  const end = Math.max(stopAt, timer.startedAt);
  const out: { date: IsoDate; minutes: number }[] = [];
  let from = timer.startedAt;
  while (from < end) {
    const to = Math.min(end, nextMidnight(from));
    const minutes = Math.round((to - from) / 60_000);
    if (minutes > 0) out.push({ date: toIsoDate(new Date(from)), minutes });
    from = to;
  }
  return out;
}

/** What starting a block does to the running timer: nothing to stop, the same block (no change), or a switch. */
export function startPlan(running: TimerState | null | undefined, block: string, refId: string | undefined): 'start' | 'same' | 'switch' {
  if (!running) return 'start';
  return running.block === block && running.refId === refId ? 'same' : 'switch';
}

/** The local date a timer started on. */
export function timerDate(timer: Pick<TimerState, 'startedAt'>): IsoDate {
  return toIsoDate(new Date(timer.startedAt));
}
