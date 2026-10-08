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

/**
 * Settings saved before a curriculum renamed a block still carry the old default name (and its summary). A block
 * whose name is one of the defaults' former names takes the new name and summary; a name the user chose is kept.
 */
export function withCurrentBlockNames(stored: StoredSettings, core: SettingsDefaults): StoredSettings {
  let changed = false;
  const blocks = stored.core.blocks.map((block) => {
    const fresh = core.blocks.find((b) => b.id === block.id);
    if (!fresh || !fresh.formerNames?.includes(block.name)) return block;
    changed = true;
    return { ...block, name: fresh.name, summary: fresh.summary, formerNames: fresh.formerNames };
  });
  return changed ? { ...stored, core: { ...stored.core, blocks } } : stored;
}

/** The paper cadence of earlier curricula, never edited by the user, gives way to the current default. */
export function withCurrentPaperCadence(stored: StoredSettings, core: SettingsDefaults): StoredSettings {
  const cadence = stored.core.paperCadence;
  const untouchedOldDefault = cadence.fromPhase === undefined && cadence.fromYear === 2 && cadence.perWeek === 1;
  if (!untouchedOldDefault || core.paperCadence.fromPhase === undefined) return stored;
  return { ...stored, core: { ...stored.core, paperCadence: { ...core.paperCadence } } };
}

export async function readSettings(core: SettingsDefaults, database: AtlasDB = db): Promise<StoredSettings> {
  const stored = await database.settings.get('app');
  return stored ? withCurrentPaperCadence(withCurrentBlockNames(stored, core), core) : defaultSettings(core);
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
