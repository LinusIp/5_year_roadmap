/**
 * The bookkeeping that lets two devices edit the same day (brief 4.10: "merge entry lists by id; later
 * updatedAt wins per entry"). Applied by `editLog`, the one place days are written:
 *
 *   - every entry gets a stable id, and a new `updatedAt` when its content changes;
 *   - an entry that disappears leaves a tombstone, so another device's copy is not merged back in;
 *   - each day-level field (reflection, energy, freeze, done blocks) records when it last changed, so a
 *     reflection written on the phone survives a timer stopped on the laptop.
 */
import { DAY_FIELDS } from '../db/types.ts';
import type { DayLog, DayLogEntry, RemovedEntry } from '../db/types.ts';
import { deviceId, newId, stampNow } from './device.ts';

/** Tombstones older than this are dropped: a device offline for longer may bring a removed entry back. */
export const TOMBSTONE_DAYS = 60;

const SYNC_KEYS = new Set(['id', 'updatedAt', 'deviceId']);

/** An entry's content, without its sync bookkeeping, for "did it change?". */
export function entryContent(entry: DayLogEntry): string {
  return JSON.stringify(
    Object.keys(entry)
      .filter((k) => !SYNC_KEYS.has(k))
      .sort()
      .map((k) => [k, entry[k as keyof DayLogEntry]]),
  );
}

export function withSyncBookkeeping(before: DayLog, after: DayLog, now: number = Date.now(), device: string = deviceId()): DayLog {
  const at = stampNow(now);
  const previous = new Map(before.entries.filter((e) => e.id).map((e) => [e.id!, e]));
  const seen = new Set<string>();

  const entries = after.entries.map((entry) => {
    let id = entry.id;
    if (!id || seen.has(id)) id = newId();
    seen.add(id);
    const old = previous.get(id);
    if (old && entry.id === id && entryContent(old) === entryContent(entry)) return entry;
    return { ...entry, id, updatedAt: at, deviceId: device };
  });

  const cutoff = stampNow(now - TOMBSTONE_DAYS * 86_400_000);
  const removed: RemovedEntry[] = (after.removed ?? before.removed ?? []).filter((r) => r.at >= cutoff && !seen.has(r.id));
  for (const id of previous.keys()) {
    if (!seen.has(id) && !removed.some((r) => r.id === id)) removed.push({ id, at, deviceId: device });
  }

  const fieldsAt: NonNullable<DayLog['fieldsAt']> = { ...(before.fieldsAt ?? {}), ...(after.fieldsAt ?? {}) };
  for (const field of DAY_FIELDS) {
    if (JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null)) fieldsAt[field] = at;
  }

  const next: DayLog = { ...after, entries };
  if (removed.length > 0) next.removed = removed;
  else delete next.removed;
  if (Object.keys(fieldsAt).length > 0) next.fieldsAt = fieldsAt;
  else delete next.fieldsAt;
  return next;
}
