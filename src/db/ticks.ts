/**
 * What was ticked on which day, for the blog's "What you did today" (DAILY-BLOG). Item states keep which units are
 * done, not when, so each tick is noted here as it happens: on this device only (meta, like the timer), for the last
 * 60 days. An untick the same day takes the note back. Items finished are also known from their synced `doneAt`.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';
import type { AtlasDB } from './db.ts';
import type { UserItemState } from './types.ts';
import { addDays } from '../lib/dates.ts';

export const TICK_LOG_KEY = 'tickLog';
const KEEP_DAYS = 60;

/** A unit or milestone ticked (`unit`), or the item itself marked done (no `unit`). */
export interface TickNote {
  refId: string;
  unit?: string;
}
export type TickLog = Record<string, TickNote[]>;

async function readTickLog(database: AtlasDB): Promise<TickLog> {
  const value = (await database.meta.get(TICK_LOG_KEY))?.value;
  return value && typeof value === 'object' ? (value as TickLog) : {};
}

/** Notes the ticks between two states of an item, on `date`. Call inside a transaction over itemStates and meta. */
export async function noteTicks(before: UserItemState, after: UserItemState, date: string, database: AtlasDB = db): Promise<void> {
  // roadmap.sh nodes are ticked by hand on the roadmaps, not studied: they stay out of the day.
  if (after.refId.startsWith('roadmap:')) return;
  const had = new Set(before.unitsDone);
  const has = new Set(after.unitsDone);
  const added = after.unitsDone.filter((u) => !had.has(u));
  const removed = before.unitsDone.filter((u) => !has.has(u));
  const finished = after.status === 'done' && before.status !== 'done';
  const reopened = before.status === 'done' && after.status !== 'done';
  if (added.length + removed.length === 0 && !finished && !reopened) return;

  const log = await readTickLog(database);
  const cutoff = addDays(date, -KEEP_DAYS);
  const next: TickLog = Object.fromEntries(Object.entries(log).filter(([d]) => d >= cutoff));
  let day = next[date] ?? [];
  const same = (n: TickNote, unit?: string): boolean => n.refId === after.refId && n.unit === unit;
  day = day.filter((n) => !removed.some((u) => same(n, u)) && !(reopened && same(n, undefined)));
  for (const unit of added) if (!day.some((n) => same(n, unit))) day.push({ refId: after.refId, unit });
  if (finished && !day.some((n) => same(n, undefined))) day.push({ refId: after.refId });
  if (day.length > 0) next[date] = day;
  else delete next[date];
  await database.meta.put({ key: TICK_LOG_KEY, value: next });
}

/** The ticks noted on this device for a date, live. */
export function useDayTicks(date: string): TickNote[] | undefined {
  return useLiveQuery(async () => (await readTickLog(db))[date] ?? [], [date]);
}
