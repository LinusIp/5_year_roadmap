/**
 * The sleep log (SLEEP-LOG): the nights (table `sleep`, synced as sleep/<date>.json) and this device's sleep settings
 * (meta "sleepSettings": the goal and whether Today asks in the morning).
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';
import type { AtlasDB } from './db.ts';
import type { SleepNight } from './types.ts';
import { DEFAULT_GOAL_MINUTES, nightMinutes } from '../lib/sleep.ts';

export interface SleepSettings {
  /** The goal, 6 to 10 hours: the week chart's dashed line and the bedtime tile. */
  goalMinutes: number;
  /** "How did you sleep?" on Today in the morning. */
  prompt: boolean;
}

export const SLEEP_SETTINGS_KEY = 'sleepSettings';
export const DEFAULT_SLEEP_SETTINGS: SleepSettings = { goalMinutes: DEFAULT_GOAL_MINUTES, prompt: true };
export const GOAL_CHOICES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((h) => h * 60);

export async function readSleepSettings(database: AtlasDB = db): Promise<SleepSettings> {
  const value = (await database.meta.get(SLEEP_SETTINGS_KEY))?.value;
  return { ...DEFAULT_SLEEP_SETTINGS, ...(value && typeof value === 'object' ? (value as Partial<SleepSettings>) : {}) };
}

export function useSleepSettings(): SleepSettings | undefined {
  return useLiveQuery(() => readSleepSettings(), []);
}

export async function saveSleepSettings(change: (s: SleepSettings) => SleepSettings, database: AtlasDB = db): Promise<SleepSettings> {
  return database.transaction('rw', database.meta, async () => {
    const next = change(await readSleepSettings(database));
    await database.meta.put({ key: SLEEP_SETTINGS_KEY, value: next });
    return next;
  });
}

export function useSleep(): SleepNight[] | undefined {
  return useLiveQuery(() => db.sleep.toArray(), []);
}

/** Saves a night under its wake-up date, replacing what was there. Returns the night it replaced, for Undo. */
export async function saveNight(night: Pick<SleepNight, 'date' | 'bed' | 'wake'> & { rested?: SleepNight['rested'] }, database: AtlasDB = db): Promise<SleepNight | undefined> {
  return database.transaction('rw', database.sleep, async () => {
    const before = await database.sleep.get(night.date);
    const record: SleepNight = { date: night.date, bed: night.bed, wake: night.wake, minutes: nightMinutes(night.bed, night.wake) };
    if (night.rested !== undefined) record.rested = night.rested;
    await database.sleep.put(record);
    return before;
  });
}

/** Undo of a save: the night as it was, or none. A removal syncs as the file's removal. */
export async function restoreNight(date: string, before: SleepNight | undefined, database: AtlasDB = db): Promise<void> {
  if (before) {
    const { updatedAt: _u, deviceId: _d, ...rest } = before;
    await database.sleep.put(rest);
  } else await database.sleep.delete(date);
}
