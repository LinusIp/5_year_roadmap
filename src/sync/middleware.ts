/**
 * The write side of GitHub Sync, as a Dexie middleware, so no screen has to remember it:
 *
 *   - every write to a synced table is stamped with `updatedAt` and `deviceId`;
 *   - the files it touches are queued in the outbox, with a summary for the commit message;
 *   - the writes the brief flushes at once (a block done, a timer stopped, an item done, a review saved) are
 *     signalled as urgent.
 *
 * Writes made inside a transaction marked with `markSilent` (an import, or a pull applying GitHub's version)
 * are left alone: they are not the user's edits, and stamping them would change what was imported.
 */
import Dexie from 'dexie';
import type { DBCore, DBCoreMutateRequest, DBCoreTable, Middleware, Transaction } from 'dexie';
import type { DayLog, OutboxEntry, UserItemState } from '../db/types.ts';
import { deviceId, stampNow } from './device.ts';
import { isSyncedTable, pathsForRecord } from './paths.ts';
import type { SyncedTable } from './paths.ts';

const SILENT = '__atlasSilent';

/** Marks a transaction's writes as not the user's own. Call first thing inside `database.transaction`. */
export function markSilent(tx: Transaction | null): void {
  if (tx) (tx.idbtrans as unknown as Record<string, unknown>)[SILENT] = true;
}

function isSilent(trans: unknown): boolean {
  return Boolean((trans as Record<string, unknown> | null)?.[SILENT]);
}

/** What the app knows about the curriculum, for project pages and commit messages. Set at startup. */
export interface SyncVocabulary {
  isProject: (id: string) => boolean;
  /** A short name for an item, and the title of one of its units: "18.06 Linear Algebra", "Lecture 9: ...". */
  nameOf: (id: string) => string;
  unitTitle: (id: string, unitId: string) => string | undefined;
}

let vocabulary: SyncVocabulary = { isProject: () => false, nameOf: (id) => id, unitTitle: () => undefined };

export function setSyncVocabulary(v: SyncVocabulary): void {
  vocabulary = v;
}

export interface ChangeSignal {
  urgent: boolean;
}

type Listener = (signal: ChangeSignal) => void;
const listeners = new Set<Listener>();

/** Called after a synced write is queued. The sync engine listens to schedule a flush. */
export function onSyncChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(signal: ChangeSignal): void {
  for (const listener of listeners) listener(signal);
}

/** "Lecture 9: Elimination" -> "lecture 9". */
function unitLabel(title: string): string {
  const head = title.split(':')[0]!.trim();
  return head.charAt(0).toLowerCase() + head.slice(1);
}

/** One line on what changed in an item state, for the commit message. */
export function describeItemChange(before: UserItemState | undefined, after: UserItemState, v: SyncVocabulary = vocabulary): string {
  const name = v.nameOf(after.refId);
  if (after.status !== before?.status) {
    if (after.status === 'done') return 'mark ' + name + ' done';
    if (after.status === 'dropped') return 'drop ' + name;
    if (after.status === 'active' && (before?.status ?? 'todo') === 'todo' && after.unitsDone.length === (before?.unitsDone.length ?? 0)) return 'start ' + name;
  }
  const had = new Set(before?.unitsDone ?? []);
  const added = after.unitsDone.filter((u) => !had.has(u));
  if (added.length > 0) {
    const title = v.unitTitle(after.refId, added[0]!);
    const what = title ? name + ' ' + unitLabel(title) : name + ' ' + added[0];
    return 'mark ' + what + ' done' + (added.length > 1 ? ' and ' + (added.length - 1) + ' more' : '');
  }
  const now = new Set(after.unitsDone);
  const removed = (before?.unitsDone ?? []).filter((u) => !now.has(u));
  if (removed.length > 0) {
    const title = v.unitTitle(after.refId, removed[0]!);
    return 'untick ' + (title ? name + ' ' + unitLabel(title) : name + ' ' + removed[0]);
  }
  if (after.status !== before?.status) return 'set ' + name + ' to ' + after.status;
  return 'update ' + name;
}

const TABLE_SUMMARY: Partial<Record<SyncedTable, string>> = {
  paperStates: 'update the reading list',
  certStates: 'update certificates',
  milestoneStates: 'update portfolio milestones',
  customEntities: 'update items of your own',
  overrides: 'update the plan',
  weekPicks: "pick the week's build",
  replans: 're-plan',
  settings: 'update settings',
};

/** The urgent writes of brief 4.10: a block marked done, an item marked done, a review saved. */
function isUrgent(table: SyncedTable, before: unknown, after: unknown): boolean {
  if (table === 'reviews') return true;
  if (table === 'itemStates') return (after as UserItemState | undefined)?.status === 'done' && (before as UserItemState | undefined)?.status !== 'done';
  if (table === 'dayLogs') {
    const a = (after as DayLog | undefined)?.doneBlocks ?? [];
    const b = (before as DayLog | undefined)?.doneBlocks ?? [];
    return a.length > b.length;
  }
  return false;
}

const inFlight = new Set<Promise<unknown>>();

/** Resolves once every change made so far is in the outbox. The engine waits for it before a flush reads the outbox. */
export async function queuedWrites(): Promise<void> {
  while (inFlight.size > 0) await Promise.all([...inFlight]);
}

/** Queues paths in the outbox: a path already waiting keeps its first time and gains the newest summary. */
export async function enqueue(database: Dexie, entries: { path: string; summary?: string }[], now: number = Date.now()): Promise<void> {
  if (entries.length === 0) return;
  const outbox = database.table<OutboxEntry, string>('outbox');
  await database.transaction('rw', outbox, async () => {
    for (const { path, summary } of entries) {
      const existing = await outbox.get(path);
      const next: OutboxEntry = { path, queuedAt: existing?.queuedAt ?? now, seq: (existing?.seq ?? 0) + 1 };
      const text = summary ?? existing?.summary;
      if (text) next.summary = text;
      await outbox.put(next);
    }
  });
}

export function syncMiddleware(database: Dexie): Middleware<DBCore> {
  return {
    stack: 'dbcore',
    name: 'atlas-sync',
    create(down) {
      return {
        ...down,
        table(name: string): DBCoreTable {
          const table = down.table(name);
          if (name === 'meta') {
            // Stopping a timer deletes it: the brief flushes on a block's stop.
            return {
              ...table,
              async mutate(req: DBCoreMutateRequest) {
                const result = await table.mutate(req);
                if (req.type === 'delete' && req.keys.includes('timer')) emit({ urgent: true });
                return result;
              },
            };
          }
          if (!isSyncedTable(name)) return table;
          const primaryKey = table.schema.primaryKey;
          return {
            ...table,
            async mutate(req: DBCoreMutateRequest) {
              if (isSilent(req.trans) || req.type === 'deleteRange') return table.mutate(req);

              let request = req;
              let keys: unknown[] = [];
              let after: unknown[] = [];
              if (req.type === 'add' || req.type === 'put') {
                const at = stampNow();
                const device = deviceId();
                const values = req.values.map((v: Record<string, unknown>) => ({ ...v, updatedAt: at, deviceId: device }));
                request = { ...req, values };
                after = values;
                keys = req.keys ?? values.map((v) => primaryKey.extractKey!(v));
              } else {
                keys = req.keys;
              }
              const before: unknown[] = name === 'itemStates' || name === 'dayLogs' ? await table.getMany({ trans: req.trans, keys }) : [];

              const result = await table.mutate(request);

              const entries: { path: string; summary?: string }[] = [];
              let urgent = false;
              keys.forEach((key, i) => {
                const value = after[i];
                let summary: string | undefined;
                if (name === 'itemStates' && value) summary = describeItemChange(before[i] as UserItemState | undefined, value as UserItemState);
                else if (name === 'reviews') summary = 'write a review';
                else summary = TABLE_SUMMARY[name];
                for (const path of pathsForRecord(name, key, value, vocabulary.isProject)) entries.push(summary ? { path, summary } : { path });
                if (isUrgent(name, before[i], value)) urgent = true;
              });
              // A separate transaction, not awaited: the outbox is not part of the one this write runs in, and
              // waiting on another transaction could let IndexedDB commit this one early.
              const queued = Dexie.ignoreTransaction(() => enqueue(database, entries))
                .catch((err: unknown) => console.error('Atlas could not queue a change for sync', err))
                .finally(() => inFlight.delete(queued));
              inFlight.add(queued);
              emit({ urgent });
              return result;
            },
          };
        },
      };
    },
  };
}
