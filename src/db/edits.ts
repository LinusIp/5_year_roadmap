/**
 * The user's edits to the roadmap: patches over seed items, and items of their own.
 *
 * Nothing here copies the curriculum. A patch names a stable id and the fields that differ, so editing a
 * YAML file and rebuilding keeps every edit that still applies.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';
import type { AtlasDB } from './db.ts';
import type { CustomEntity, EntityKind, NewPlanPatch, Override, PlanPatch } from './types.ts';
import { today } from '../lib/dates.ts';
import { stampPatches, undoableGroups } from '../lib/plan.ts';
import { announceEdit } from '../lib/edit-events.ts';

export function useOverrides(): Override[] | undefined {
  return useLiveQuery(() => db.overrides.toArray(), []);
}

export function useCustomEntities(): CustomEntity[] | undefined {
  return useLiveQuery(() => db.customEntities.toArray(), []);
}

export function usePlanPatches(): PlanPatch[] | undefined {
  return useLiveQuery(() => db.planPatches.toArray(), []);
}

/* ------------------------------------------------------------------ plan edits (flexibility brief) */

/**
 * Records one plan edit, made of one or more patches, as one undoable group, and announces it so the toast can
 * offer Undo. Returns the group id.
 */
export async function addPlanEdit(patches: readonly NewPlanPatch[], label: string, database: AtlasDB = db): Promise<string | null> {
  if (patches.length === 0) return null;
  const stamped = stampPatches(patches, label);
  await database.planPatches.bulkPut(stamped);
  const group = stamped[0]!.group;
  if (database === db) announceEdit({ group, label });
  return group;
}

/** Takes one edit group back. Only the last 50 groups can be undone. */
export async function undoPlanEdit(group: string, database: AtlasDB = db): Promise<boolean> {
  return database.transaction('rw', database.planPatches, async () => {
    const all = await database.planPatches.toArray();
    if (!undoableGroups(all).some((g) => g.group === group)) return false;
    await database.planPatches.bulkDelete(all.filter((p) => p.group === group).map((p) => p.id));
    return true;
  });
}

/** Undoes the newest edit group, if any. Returns its label. */
export async function undoLastPlanEdit(database: AtlasDB = db): Promise<string | null> {
  const last = undoableGroups(await database.planPatches.toArray(), 1)[0];
  if (!last) return null;
  await undoPlanEdit(last.group, database);
  return last.label;
}

/** Merges fields into an item's patch, leaving the rest of the patch alone. */
export async function patchEntity(
  kind: EntityKind,
  id: string,
  patch: Record<string, unknown>,
  database: AtlasDB = db,
): Promise<void> {
  await database.transaction('rw', database.overrides, async () => {
    const current = await database.overrides.get([kind, id]);
    await database.overrides.put({ kind, id, ...current, patch: { ...current?.patch, ...patch } });
  });
}

export async function patchMany(
  kind: EntityKind,
  patches: { id: string; patch: Record<string, unknown> }[],
  database: AtlasDB = db,
): Promise<void> {
  await database.transaction('rw', database.overrides, async () => {
    for (const { id, patch } of patches) {
      const current = await database.overrides.get([kind, id]);
      await database.overrides.put({ kind, id, ...current, patch: { ...current?.patch, ...patch } });
    }
  });
}

/** Takes a plan item off the roadmap, into the lane's "Dropped" group. The resource or project stays in the library. */
export async function removePlanItem(id: string, label = 'Took an item off the plan', database: AtlasDB = db): Promise<void> {
  await addPlanEdit([{ op: 'drop', planItemId: id }], label, database);
}

export async function restorePlanItem(id: string, label = 'Restored an item', database: AtlasDB = db): Promise<void> {
  await addPlanEdit([{ op: 'restore', planItemId: id }], label, database);
}

/** Undoes every edit to one item, putting it back to what /data says. */
export async function resetEntity(kind: EntityKind, id: string, database: AtlasDB = db): Promise<void> {
  await database.overrides.delete([kind, id]);
}

export async function addCustomEntity(
  kind: EntityKind,
  id: string,
  data: Record<string, unknown>,
  database: AtlasDB = db,
): Promise<void> {
  await database.customEntities.put({ kind, id, data, createdAt: today() });
}

export async function deleteCustomEntity(kind: EntityKind, id: string, database: AtlasDB = db): Promise<void> {
  await database.transaction('rw', database.customEntities, database.overrides, async () => {
    await database.customEntities.delete([kind, id]);
    await database.overrides.delete([kind, id]);
  });
}

/** An id for something the user added, derived from its title and kept unique. */
export function slugifyId(title: string, taken: Set<string>, prefix = 'my'): string {
  const base =
    prefix +
    '-' +
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
      .replace(/-+$/g, '');
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = base + '-' + n;
    if (!taken.has(candidate)) return candidate;
  }
}
