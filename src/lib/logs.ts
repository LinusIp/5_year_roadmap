/**
 * Reading and writing DayLogs. Pure functions over a log plus the Dexie calls that persist them,
 * kept together so that a page never has to know the storage shape.
 */
import { db } from '../db/db.ts';
import type { AtlasDB } from '../db/db.ts';
import type { BlockId, TrackId } from '../seed/schema.ts';
import type { DayLog, DayLogEntry } from '../db/types.ts';
import { monthKey, today } from './dates.ts';
import { withSyncBookkeeping } from '../sync/daylog.ts';

export function emptyLog(date: string): DayLog {
  return { date, entries: [] };
}

export function totalMinutes(log: DayLog | undefined): number {
  return log ? log.entries.reduce((sum, e) => sum + e.minutes, 0) : 0;
}

export function minutesByBlock(log: DayLog | undefined): Record<BlockId, number> {
  const out: Record<BlockId, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const entry of log?.entries ?? []) out[entry.block] += entry.minutes;
  return out;
}

export function minutesByTrack(log: DayLog | undefined): Partial<Record<TrackId, number>> {
  const out: Partial<Record<TrackId, number>> = {};
  for (const entry of log?.entries ?? []) out[entry.track] = (out[entry.track] ?? 0) + entry.minutes;
  return out;
}

/** Minutes logged against one thing (a resource, project, paper or cert) on this day. */
export function minutesForRef(log: DayLog | undefined, refId: string): number {
  return (log?.entries ?? []).filter((e) => e.refId === refId).reduce((sum, e) => sum + e.minutes, 0);
}

export function isBlockDone(log: DayLog | undefined, block: BlockId): boolean {
  return Boolean(log?.doneBlocks?.includes(block));
}

/** True when the day has nothing worth keeping, so it can be deleted rather than stored empty. */
export function isEmptyLog(log: DayLog): boolean {
  return (
    log.entries.length === 0 &&
    !log.reflection &&
    log.energy === undefined &&
    !log.frozen &&
    (log.doneBlocks?.length ?? 0) === 0
  );
}

/* ------------------------------------------------------------------ edits (pure) */

export interface AddEntryInput {
  block: BlockId;
  track: TrackId;
  refId?: string;
  minutes: number;
  note?: string;
  auto?: boolean;
}

/**
 * Adds minutes to a day. Repeated work on the same thing in the same block merges into one entry, so a
 * day that was timed in six sittings does not read as six rows; a note or a different item starts a new one.
 */
export function addEntry(log: DayLog, input: AddEntryInput): DayLog {
  if (input.minutes === 0) return log;
  const entries = [...log.entries];
  const mergeable = entries.findIndex(
    (e) => e.block === input.block && e.track === input.track && e.refId === input.refId && !e.note && !input.note,
  );
  if (mergeable >= 0) {
    const existing = entries[mergeable]!;
    const merged: DayLogEntry = { ...existing, minutes: Math.max(0, existing.minutes + input.minutes) };
    if (!input.auto) delete merged.auto;
    entries[mergeable] = merged;
  } else {
    const entry: DayLogEntry = { block: input.block, track: input.track, minutes: Math.max(0, input.minutes) };
    if (input.refId) entry.refId = input.refId;
    if (input.note) entry.note = input.note;
    if (input.auto) entry.auto = true;
    entries.push(entry);
  }
  return { ...log, entries: entries.filter((e) => e.minutes > 0 || e.note) };
}

export function updateEntry(log: DayLog, index: number, change: Partial<DayLogEntry>): DayLog {
  const entries = [...log.entries];
  const existing = entries[index];
  if (!existing) return log;
  const next = { ...existing, ...change };
  if (next.minutes <= 0 && !next.note) entries.splice(index, 1);
  else entries[index] = next;
  return { ...log, entries };
}

export function removeEntry(log: DayLog, index: number): DayLog {
  const entries = [...log.entries];
  entries.splice(index, 1);
  return { ...log, entries };
}

/**
 * Sets the total minutes for one block and item, replacing whatever the timer accumulated. The replacement keeps
 * the id of the entry it replaces, so on another device it reads as that entry edited, not a second one.
 */
export function setBlockMinutes(log: DayLog, block: BlockId, track: TrackId, refId: string | undefined, minutes: number): DayLog {
  const matches = (e: DayLogEntry): boolean => e.block === block && e.refId === refId && !e.note;
  const first = log.entries.find(matches);
  const kept = log.entries.filter((e) => !matches(e));
  if (minutes <= 0) return { ...log, entries: kept };
  const entry: DayLogEntry = { block, track, minutes };
  if (refId) entry.refId = refId;
  if (first?.id) entry.id = first.id;
  return { ...log, entries: [...kept, entry] };
}

export function toggleBlockDone(log: DayLog, block: BlockId): DayLog {
  const current = log.doneBlocks ?? [];
  const doneBlocks = current.includes(block) ? current.filter((b) => b !== block) : [...current, block];
  return { ...log, doneBlocks };
}

/* ------------------------------------------------------------------ persistence */

export async function readLog(date: string, database: AtlasDB = db): Promise<DayLog | undefined> {
  return database.dayLogs.get(date);
}

export async function readLogs(from: string, to: string, database: AtlasDB = db): Promise<DayLog[]> {
  return database.dayLogs.where('date').between(from, to, true, true).toArray();
}

/**
 * Applies `change` to a day and stores the result, with the bookkeeping GitHub Sync merges by (entry ids,
 * tombstones, field times). The row is deleted when nothing is left on it, unless it remembers a removed entry.
 */
export async function editLog(date: string, change: (log: DayLog) => DayLog, database: AtlasDB = db): Promise<DayLog> {
  return database.transaction('rw', database.dayLogs, async () => {
    const current = (await database.dayLogs.get(date)) ?? emptyLog(date);
    const next = withSyncBookkeeping(current, change(current));
    if (isEmptyLog(next) && !next.removed?.length) await database.dayLogs.delete(date);
    else await database.dayLogs.put(next);
    return next;
  });
}

/** Freeze days already spent in the month of `date`, for the streak rules. */
export async function freezesUsedInMonth(date: string, database: AtlasDB = db): Promise<number> {
  const month = monthKey(date);
  const logs = await database.dayLogs.where('date').between(month + '-01', month + '-31', true, true).toArray();
  return logs.filter((log) => log.frozen).length;
}

export async function logsUpTo(date: string = today(), database: AtlasDB = db): Promise<DayLog[]> {
  return database.dayLogs.where('date').belowOrEqual(date).toArray();
}
