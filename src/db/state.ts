/**
 * Live reads and small writes of user state. Pages use these hooks and never touch Dexie directly.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';
import type { AtlasDB } from './db.ts';
import type { ItemStatus, PaperState, PaperStatus, RunningTimer, UserItemState, WeekPick } from './types.ts';
import { TimerSchema } from './types.ts';
import { today } from '../lib/dates.ts';

/* ------------------------------------------------------------------ item state */

export function newItemState(refId: string): UserItemState {
  return { refId, status: 'todo', unitsDone: [] };
}

export async function readItemStates(database: AtlasDB = db): Promise<Map<string, UserItemState>> {
  const rows = await database.itemStates.toArray();
  return new Map(rows.map((row) => [row.refId, row]));
}

/** Every item state, live. `undefined` only during the first read. */
export function useItemStates(): Map<string, UserItemState> | undefined {
  return useLiveQuery(() => readItemStates(), []);
}

export function useItemState(refId: string | undefined): UserItemState | undefined {
  return useLiveQuery(async () => (refId ? ((await db.itemStates.get(refId)) ?? newItemState(refId)) : undefined), [refId]);
}

export async function editItemState(
  refId: string,
  change: (state: UserItemState) => UserItemState,
  database: AtlasDB = db,
): Promise<UserItemState> {
  return database.transaction('rw', database.itemStates, async () => {
    const current = (await database.itemStates.get(refId)) ?? newItemState(refId);
    const next = change(current);
    await database.itemStates.put(next);
    return next;
  });
}

export async function setItemStatus(refId: string, status: ItemStatus, database: AtlasDB = db): Promise<void> {
  const now = today();
  await editItemState(
    refId,
    (state) => {
      const next: UserItemState = { ...state, status };
      if (status === 'active' && !next.startedAt) next.startedAt = now;
      if (status === 'done') next.doneAt = now;
      else delete next.doneAt;
      return next;
    },
    database,
  );
}

/** Ticks a unit on or off, and starts the item when its first unit is ticked. */
export async function toggleUnit(refId: string, unitId: string, database: AtlasDB = db): Promise<void> {
  await editItemState(
    refId,
    (state) => {
      const has = state.unitsDone.includes(unitId);
      const unitsDone = has ? state.unitsDone.filter((u) => u !== unitId) : [...state.unitsDone, unitId];
      const next: UserItemState = { ...state, unitsDone };
      if (!has && state.status === 'todo') {
        next.status = 'active';
        next.startedAt ??= today();
      }
      return next;
    },
    database,
  );
}

/* ------------------------------------------------------------------ papers */

export function usePaperStates(): Map<string, PaperState> | undefined {
  return useLiveQuery(async () => new Map((await db.paperStates.toArray()).map((row) => [row.refId, row])), []);
}

export async function setPaperStatus(refId: string, status: PaperStatus, database: AtlasDB = db): Promise<void> {
  const now = today();
  await database.transaction('rw', database.paperStates, async () => {
    const current = (await database.paperStates.get(refId)) ?? { refId, status: 'queued' as PaperStatus };
    const next: PaperState = { ...current, status };
    if (status === 'reading') next.startedAt ??= now;
    if (status === 'read' || status === 'implemented') next.readAt ??= now;
    await database.paperStates.put(next);
  });
}

/* ------------------------------------------------------------------ the week's mini-build */

export function useWeekPick(weekStart: string): WeekPick | undefined {
  return useLiveQuery(() => db.weekPicks.get(weekStart), [weekStart]);
}

export async function setWeekPick(weekStart: string, projectId: string, database: AtlasDB = db): Promise<void> {
  await database.weekPicks.put({ weekStart, projectId, pickedAt: today() });
}

/* ------------------------------------------------------------------ the running timer */

const TIMER_KEY = 'timer';

/** The running timer, if any. Stored in the database so it survives a reload or a closed tab. */
export function useRunningTimer(): RunningTimer | null | undefined {
  return useLiveQuery(async () => {
    const row = await db.meta.get(TIMER_KEY);
    if (!row) return null;
    const parsed = TimerSchema.safeParse(row.value);
    return parsed.success ? parsed.data : null;
  }, []);
}

export async function startTimer(timer: Omit<RunningTimer, 'startedAt'>, database: AtlasDB = db): Promise<void> {
  await database.meta.put({ key: TIMER_KEY, value: { ...timer, startedAt: Date.now() } });
}

export async function clearTimer(database: AtlasDB = db): Promise<void> {
  await database.meta.delete(TIMER_KEY);
}

/* ------------------------------------------------------------------ small meta values */

export async function readMeta<T>(key: string, fallback: T, database: AtlasDB = db): Promise<T> {
  const row = await database.meta.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function writeMeta(key: string, value: unknown, database: AtlasDB = db): Promise<void> {
  await database.meta.put({ key, value });
}

export function useMeta<T>(key: string, fallback: T): T | undefined {
  return useLiveQuery(() => readMeta(key, fallback), [key]);
}
