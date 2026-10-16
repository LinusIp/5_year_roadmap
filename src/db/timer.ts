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
import { forgottenTimer, timerEntries } from '../lib/timer.ts';
import type { ForgottenTimer } from '../lib/timer.ts';

const TIMER_KEY = 'timer';
/** When the app was last used, for "Stop at 16:40". Written at most once a minute. */
const LAST_USED_KEY = 'lastUsedAt';

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

/** Stops the running timer at `stopAt` (now by default) and logs its minutes, each day's part on its own day. */
export async function stopTimer(stopAt: number = Date.now(), database: AtlasDB = db): Promise<number> {
  const timer = await readTimer(database);
  if (!timer) return 0;
  await database.meta.delete(TIMER_KEY);
  let total = 0;
  for (const { date, minutes } of timerEntries(timer, stopAt)) {
    total += minutes;
    await editLog(date, (log) => addEntry(log, { block: timer.block, track: timer.track, ...(timer.refId ? { refId: timer.refId } : {}), minutes }), database);
  }
  if (total > 0 && timer.refId) await setItemStatus(timer.refId, 'active', database).catch(() => undefined);
  return total;
}

/**
 * Starts a block's timer. One runs at a time: a timer on something else is stopped first and its minutes saved.
 * Starting what is already running changes nothing.
 */
export async function startTimer(next: Omit<RunningTimer, 'startedAt' | 'keptAt'>, database: AtlasDB = db): Promise<void> {
  const running = await readTimer(database);
  if (running && running.block === next.block && running.refId === next.refId) return;
  if (running) await stopTimer(Date.now(), database);
  await database.meta.put({ key: TIMER_KEY, value: { ...next, startedAt: Date.now() } });
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
