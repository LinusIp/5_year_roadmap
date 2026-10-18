import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';
import type { AtlasDB } from './db.ts';
import type { StoredSettings } from './types.ts';
import type { SettingsDefaults } from '../seed/schema.ts';
import { currentSettings, DAILY_SCHEDULE_BLOCK } from '../lib/settings.ts';

export { currentSettings, defaultLayout, defaultSettings, upgradeSettings, withCurrentBlockNames, withCurrentPaperCadence } from '../lib/settings.ts';

export async function readSettings(core: SettingsDefaults, database: AtlasDB = db): Promise<StoredSettings> {
  return currentSettings(await database.settings.get('app'), core);
}

export async function updateSettings(
  core: SettingsDefaults,
  change: (current: StoredSettings) => StoredSettings,
  database: AtlasDB = db,
): Promise<StoredSettings> {
  return database.transaction('rw', database.settings, async () => {
    const next = change(await readSettings(core, database));
    await database.settings.put(next);
    return next;
  });
}

/**
 * Settings saved before the fixed daily schedule switch to it on read (src/lib/settings.ts, withDailySchedule);
 * this writes the switch once, on start-up, so the copy of the old schedule keeps the day it was made and the change
 * syncs. Settings already on the schedule, or none stored yet, are left alone.
 */
export async function persistDailySchedule(core: SettingsDefaults, database: AtlasDB = db): Promise<boolean> {
  return database.transaction('rw', database.settings, async () => {
    const stored = await database.settings.get('app');
    if (!stored || stored.core.blocks.some((b) => b.id === DAILY_SCHEDULE_BLOCK)) return false;
    await database.settings.put(currentSettings(stored, core));
    return true;
  });
}

/** Live settings. `undefined` only while IndexedDB is answering the first read. */
export function useSettings(core: SettingsDefaults): StoredSettings | undefined {
  return useLiveQuery(() => readSettings(core), [core]);
}
