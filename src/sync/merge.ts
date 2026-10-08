/**
 * The merge rules of brief 4.10, for when another device wrote a file first:
 *
 *   - a day (log/): entries are merged by id, union, and the later `updatedAt` wins per entry. A removal is a
 *     tombstone with a time, so "removed here, edited there" goes to whichever happened later. Each day-level
 *     field (reflection, energy, freeze, done blocks) goes to whichever side changed it later.
 *   - state/items.json: per record, by `updatedAt`.
 *   - reviews: per review, by `updatedAt`.
 *   - state/settings.json and state/plan.json: last writer wins for the whole file.
 *
 * Ties (the same millisecond) go to the larger device id, so both devices pick the same winner. Clocks can
 * disagree; a skewed clock can make an older edit of the same record win, but never loses a record or an entry
 * that only one side has.
 */
import { DAY_FIELDS } from '../db/types.ts';
import type { DayLog, DayLogEntry, RemovedEntry } from '../db/types.ts';
import { entryContent } from './daylog.ts';
import type { ItemsData } from './files.ts';

interface Stamped {
  updatedAt?: string;
  deviceId?: string;
}

/** True when `a` is the later write. */
export function isNewer(a: Stamped, b: Stamped): boolean {
  const at = a.updatedAt ?? '';
  const bt = b.updatedAt ?? '';
  if (at !== bt) return at > bt;
  return (a.deviceId ?? '') > (b.deviceId ?? '');
}

/** Union by key; where both sides have a record, the later one. Local order first, then what only remote has. */
export function mergeRecords<T extends Stamped>(local: readonly T[], remote: readonly T[], key: (row: T) => string): T[] {
  const remoteByKey = new Map(remote.map((r) => [key(r), r]));
  const out: T[] = [];
  const seen = new Set<string>();
  for (const row of local) {
    const k = key(row);
    seen.add(k);
    const other = remoteByKey.get(k);
    out.push(other && isNewer(other, row) ? other : row);
  }
  for (const row of remote) if (!seen.has(key(row))) out.push(row);
  return out;
}

export function mergeItems(local: ItemsData, remote: ItemsData): ItemsData {
  const ref = (r: { refId: string }): string => r.refId;
  return {
    itemStates: mergeRecords(local.itemStates, remote.itemStates, ref),
    paperStates: mergeRecords(local.paperStates, remote.paperStates, ref),
    certStates: mergeRecords(local.certStates, remote.certStates, ref),
    milestoneStates: mergeRecords(local.milestoneStates, remote.milestoneStates, ref),
  };
}

/** Last writer wins: which side to keep. */
export function lastWriter(local: Stamped, remote: Stamped): 'local' | 'remote' {
  return isNewer(remote, local) ? 'remote' : 'local';
}

function mergeTombstones(a: readonly RemovedEntry[], b: readonly RemovedEntry[]): Map<string, RemovedEntry> {
  const out = new Map<string, RemovedEntry>();
  for (const t of [...a, ...b]) {
    const current = out.get(t.id);
    if (!current || isNewer({ updatedAt: t.at, deviceId: t.deviceId }, { updatedAt: current.at, deviceId: current.deviceId })) out.set(t.id, t);
  }
  return out;
}

export function mergeDay(local: DayLog, remote: DayLog): DayLog {
  const tombstones = mergeTombstones(local.removed ?? [], remote.removed ?? []);
  const remoteById = new Map(remote.entries.filter((e) => e.id).map((e) => [e.id!, e]));

  const entries: DayLogEntry[] = [];
  const seen = new Set<string>();
  const legacy = new Set<string>();
  const take = (entry: DayLogEntry): void => {
    if (!entry.id) {
      // Written by hand without an id: identical lines are one entry.
      const content = entryContent(entry);
      if (!legacy.has(content)) entries.push(entry);
      legacy.add(content);
      return;
    }
    if (seen.has(entry.id)) return;
    seen.add(entry.id);
    const other = remoteById.get(entry.id);
    const winner = other && isNewer(other, entry) ? other : entry;
    const tomb = tombstones.get(entry.id);
    if (tomb && !isNewer(winner, { updatedAt: tomb.at, deviceId: tomb.deviceId })) return;
    entries.push(winner);
  };
  for (const entry of local.entries) take(entry);
  for (const entry of remote.entries) take(entry);

  // A tombstone outlived by an edit is dropped; the rest are kept so a third copy cannot bring the entry back.
  const live = new Set(entries.map((e) => e.id).filter(Boolean));
  const removed = [...tombstones.values()].filter((t) => !live.has(t.id)).sort((a, b) => a.id.localeCompare(b.id));

  const merged: DayLog = { ...local, entries };
  const fieldsAt: NonNullable<DayLog['fieldsAt']> = {};
  for (const field of DAY_FIELDS) {
    const lt = local.fieldsAt?.[field] ?? '';
    const rt = remote.fieldsAt?.[field] ?? '';
    const useRemote = rt > lt || (rt === lt && local[field] === undefined && remote[field] !== undefined);
    const source = useRemote ? remote : local;
    if (source[field] === undefined) delete merged[field];
    else (merged as Record<string, unknown>)[field] = source[field];
    const at = rt > lt ? rt : lt;
    if (at) fieldsAt[field] = at;
  }
  if (Object.keys(fieldsAt).length > 0) merged.fieldsAt = fieldsAt;
  else delete merged.fieldsAt;
  if (removed.length > 0) merged.removed = removed;
  else delete merged.removed;
  if (isNewer(remote, local)) {
    if (remote.updatedAt) merged.updatedAt = remote.updatedAt;
    if (remote.deviceId) merged.deviceId = remote.deviceId;
  }
  return merged;
}
