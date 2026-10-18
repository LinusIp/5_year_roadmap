/**
 * Seeding a lesson checklist's progress (ZOOMCAMP-CHECKLIST): the checklist file says where the user was when it was
 * made (ML Zoomcamp: 1.1 to 1.6 done, 1.7 current), and that goes into their item state once.
 *
 * Once per device (meta "checklistSeeded"), and only into an item state with none of the checklist's units ticked,
 * so it never overwrites a tick. Where the device has no item state yet, the write is silent and dated SEED_STAMP,
 * older than any real edit: the first sync takes the repository's state over it. Where it has one (the item was
 * started before the checklist came), the ticks are added as an ordinary edit, so they sync to the other devices.
 */
import { db } from './db.ts';
import type { AtlasDB } from './db.ts';
import type { UserItemState } from './types.ts';
import type { AppSeed } from '../seed/schema.ts';
import { markSilent } from '../sync/middleware.ts';

export const SEED_STAMP = '2000-01-01T00:00:00.000Z';
/** When the checklist file was made: the day the seeded progress counts as started. */
const FILE_DATE = '2026-10-18';
const FLAG = 'checklistSeeded';

export async function seedChecklistProgress(seed: Pick<AppSeed, 'resources'>, database: AtlasDB = db): Promise<string[]> {
  const started: UserItemState[] = [];
  const done = await database.transaction('rw', database.itemStates, database.meta, async (tx) => {
    markSilent(tx);
    const seeded = new Set(((await database.meta.get(FLAG))?.value as string[] | undefined) ?? []);
    const done: string[] = [];
    for (const resource of seed.resources) {
      const checklist = resource.checklist;
      if (!checklist || checklist.seedDone.length === 0 || seeded.has(resource.id)) continue;
      seeded.add(resource.id);
      const state = await database.itemStates.get(resource.id);
      const ids = new Set(checklist.counted.map((u) => u.id));
      if (state?.unitsDone.some((u) => ids.has(u))) continue;
      done.push(resource.id);
      if (state) {
        started.push({ ...state, unitsDone: [...state.unitsDone, ...checklist.seedDone], status: state.status === 'todo' ? 'active' : state.status, startedAt: state.startedAt ?? FILE_DATE });
        continue;
      }
      await database.itemStates.put({ refId: resource.id, status: 'active', startedAt: FILE_DATE, unitsDone: [...checklist.seedDone], updatedAt: SEED_STAMP });
    }
    await database.meta.put({ key: FLAG, value: [...seeded] });
    return done;
  });
  if (started.length > 0) await database.itemStates.bulkPut(started);
  return done;
}
