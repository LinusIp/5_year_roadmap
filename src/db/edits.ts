/**
 * The user's edits to the roadmap: patches over seed items, and items of their own.
 *
 * Nothing here copies the curriculum. A patch names a stable id and the fields that differ, so editing a
 * YAML file and rebuilding keeps every edit that still applies.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';
import type { AtlasDB } from './db.ts';
import type { CustomEntity, EntityKind, Override } from './types.ts';
import { today } from '../lib/dates.ts';

export function useOverrides(): Override[] | undefined {
  return useLiveQuery(() => db.overrides.toArray(), []);
}

export function useCustomEntities(): CustomEntity[] | undefined {
  return useLiveQuery(() => db.customEntities.toArray(), []);
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

/** Takes a plan item off the roadmap. The resource or project itself stays in the library. */
export async function removePlanItem(id: string, database: AtlasDB = db): Promise<void> {
  await database.transaction('rw', database.overrides, async () => {
    const current = await database.overrides.get(['planItem', id]);
    await database.overrides.put({ kind: 'planItem', id, patch: current?.patch ?? {}, removed: true });
  });
}

export async function restorePlanItem(id: string, database: AtlasDB = db): Promise<void> {
  await database.transaction('rw', database.overrides, async () => {
    const current = await database.overrides.get(['planItem', id]);
    if (!current) return;
    const { removed, ...rest } = current;
    void removed;
    await database.overrides.put(rest);
  });
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
