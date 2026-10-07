import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';
import type { AtlasDB } from './db.ts';
import type { StoredSettings } from './types.ts';
import type { SettingsDefaults } from '../seed/schema.ts';

/** A fresh install starts from data/settings.yaml; nothing about blocks or thresholds is hard-coded. */
export function defaultSettings(core: SettingsDefaults): StoredSettings {
  return {
    id: 'app',
    core: structuredClone(core),
    theme: 'light',
    github: { username: '', showCalendar: false },
    backup: {},
  };
}

export async function readSettings(core: SettingsDefaults, database: AtlasDB = db): Promise<StoredSettings> {
  return (await database.settings.get('app')) ?? defaultSettings(core);
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

/** Live settings. `undefined` only while IndexedDB is answering the first read. */
export function useSettings(core: SettingsDefaults): StoredSettings | undefined {
  return useLiveQuery(() => readSettings(core), [core]);
}
