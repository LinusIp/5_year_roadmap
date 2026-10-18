/**
 * The running timer in the database (meta key "timer"; this device only, like a stopwatch in a pocket). See
 * src/lib/timer.ts for the rules: it stores its start, one runs at a time, a forgotten one is caught on the next
 * open, and a stop logs each day's part on its day.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';
import type { AtlasDB } from './db.ts';
import { TimerSchema } from './types.ts';
import type { RunningTimer } from './types.ts';
import { setItemStatus } from './state.ts';
import { addEntry, editLog } from '../lib/logs.ts';
import { forgottenTimer, settleTimer } from '../lib/timer.ts';
import type { ForgottenTimer, TimerCarry } from '../lib/timer.ts';

const TIMER_KEY = 'timer';
/** When the app was last used, for "Stop at 16:40". Written at most once a minute. */
const LAST_USED_KEY = 'lastUsedAt';
/** The seconds stops could not log yet (src/lib/timer.ts, TimerCarry). */
const CARRY_KEY = 'timerCarry';

async function readCarry(database: AtlasDB): Promise<TimerCarry> {
  const row = await database.meta.get(CARRY_KEY);
  const value = row?.value;
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] > 0 && e[1] < 60_000));
}

/** The carried seconds, for totals that count every second; `undefined` while the first read is in flight. */
export function useTimerCarry(): TimerCarry | undefined {
  return useLiveQuery(() => readCarry(db), []);
}

async function readTimer(database: AtlasDB): Promise<RunningTimer | null> {
  const row = await database.meta.get(TIMER_KEY);
  if (!row) return null;
  const parsed = TimerSchema.safeParse(row.value);
  return parsed.success ? parsed.data : null;
}

/** The running timer, if any; `undefined` while the first read is in flight. */
export function useRunningTimer(): RunningTimer | null | undefined {
  return useLiveQuery(() => readTimer(db), []);
}

/**
 * Stops the running timer at `stopAt` (now by default) and logs its minutes, each day's part on its own day, with
 * the seconds no whole minute holds carried to the next session (nothing is rounded away). The logs, the carry and
 * the cleared timer are written in one transaction: a reload or a closed tab never keeps half of it.
 */
export async function stopTimer(stopAt: number = Date.now(), database: AtlasDB = db): Promise<number> {
  const stopped = await database.transaction('rw', database.meta, database.dayLogs, async () => {
    const timer = await readTimer(database);
    if (!timer) return null;
    const { entries, carry } = settleTimer(timer, stopAt, await readCarry(database));
    let total = 0;
    for (const { date, minutes } of entries) {
      total += minutes;
      await editLog(date, (log) => addEntry(log, { block: timer.block, track: timer.track, ...(timer.refId ? { refId: timer.refId } : {}), minutes }), database);
    }
    await database.meta.put({ key: CARRY_KEY, value: carry });
    await database.meta.delete(TIMER_KEY);
    return { timer, total };
  });
  if (!stopped) return 0;
  // Time on an item not started yet starts it; a finished one stays finished.
  const { timer, total } = stopped;
  if (total > 0 && timer.refId && ((await database.itemStates.get(timer.refId))?.status ?? 'todo') === 'todo') await setItemStatus(timer.refId, 'active', database);
  return total;
}

/**
 * Starts a block's timer. One runs at a time: a timer on something else is stopped first and its minutes saved,
 * by the same path as Stop. Starting what is already running changes nothing. Starts run one after another, so two
 * quick taps (A to B and back within a second) can neither lose a session nor log one twice. The tap's moment is
 * both the other timer's stop and this one's start, however long the writes before it take.
 */
let starting: Promise<void> = Promise.resolve();
export function startTimer(next: Omit<RunningTimer, 'startedAt' | 'keptAt'>, database: AtlasDB = db, at: number = Date.now()): Promise<void> {
  const run = async (): Promise<void> => {
    const running = await readTimer(database);
    if (running && running.block === next.block && running.refId === next.refId) return;
    if (running) await stopTimer(Math.max(at, running.startedAt), database);
    await database.meta.put({ key: TIMER_KEY, value: { ...next, startedAt: at } });
  };
  starting = starting.then(run, run);
  return starting;
}

/** "Keep": the timer runs on, and the question waits another three hours, or the next midnight. */
export async function keepTimer(now: number = Date.now(), database: AtlasDB = db): Promise<void> {
  const timer = await readTimer(database);
  if (timer) await database.meta.put({ key: TIMER_KEY, value: { ...timer, keptAt: now } });
}

/** The last time the app was used before now. */
export async function readLastUsed(database: AtlasDB = db): Promise<number | undefined> {
  const row = await database.meta.get(LAST_USED_KEY);
  return typeof row?.value === 'number' ? row.value : undefined;
}

let lastWrite = 0;
/** Marks the app as used now: a tap, a key or coming back to the tab. Throttled to once a minute. */
export async function markUsed(now: number = Date.now(), database: AtlasDB = db): Promise<void> {
  if (now - lastWrite < 60_000) return;
  lastWrite = now;
  await database.meta.put({ key: LAST_USED_KEY, value: now });
}

/** What the next open should ask about the timer, read before this open marks the app as used. */
export async function checkForgotten(now: number = Date.now(), database: AtlasDB = db): Promise<ForgottenTimer | null> {
  return forgottenTimer(await readTimer(database), now, await readLastUsed(database));
}
