/**
 * The GitHub connection: the token, kept in the local-only `secrets` table, and the calendars fetched with it.
 *
 * Components never handle the token after it is typed in. They ask this module to connect, refresh or
 * disconnect, and read back only the login (in settings) and the cached calendars.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';
import type { AtlasDB } from './db.ts';
import { updateSettings } from './settings.ts';
import type { CachedCalendar } from './types.ts';
import { calendarQueryRange, fetchCalendar, fetchViewer } from '../lib/github.ts';
import type { FetchLike, GithubFailure, GithubResult } from '../lib/github.ts';
import type { SettingsDefaults } from '../seed/schema.ts';

/** A calendar younger than this is drawn from the cache without asking GitHub again. */
export const CALENDAR_MAX_AGE_MS = 60 * 60 * 1000;

const ID = 'github';

export function calendarKey(from: string, to: string): string {
  return from + '..' + to;
}

/**
 * Checks the token with GitHub, then stores it and turns the calendar on. A token GitHub refuses is not
 * stored. Replacing a token drops the calendars fetched with the old one.
 */
export async function connectGithub(
  core: SettingsDefaults,
  input: string,
  options: { fetchImpl?: FetchLike; database?: AtlasDB } = {},
): Promise<GithubResult<{ login: string }>> {
  const database = options.database ?? db;
  const token = input.trim();
  if (!token || /\s/.test(token)) {
    return { ok: false, reason: 'unauthorized', message: 'Paste the whole token: one piece of text, no spaces.' };
  }
  const viewer = await fetchViewer(token, options.fetchImpl);
  if (!viewer.ok) return viewer;
  await database.secrets.put({ id: ID, token });
  await updateSettings(core, (s) => ({ ...s, github: { username: viewer.value.login, showCalendar: true } }), database);
  return viewer;
}

/** Asks GitHub whose stored token this is, and records the answer. */
export async function checkGithub(
  core: SettingsDefaults,
  options: { fetchImpl?: FetchLike; database?: AtlasDB } = {},
): Promise<GithubResult<{ login: string }>> {
  const database = options.database ?? db;
  const row = await database.secrets.get(ID);
  if (!row) return { ok: false, reason: 'unauthorized', message: 'No token is stored in this browser.' };
  const viewer = await fetchViewer(row.token, options.fetchImpl);
  if (viewer.ok) {
    await updateSettings(core, (s) => ({ ...s, github: { ...s.github, username: viewer.value.login } }), database);
  }
  return viewer;
}

/** Forgets the token and everything fetched with it. */
export async function disconnectGithub(core: SettingsDefaults, database: AtlasDB = db): Promise<void> {
  await database.secrets.delete(ID);
  await updateSettings(core, (s) => ({ ...s, github: { username: '', showCalendar: false } }), database);
}

export type RefreshOutcome =
  | { status: 'fresh' | 'fetched' | 'no-token' | 'not-started' }
  | { status: 'failed'; reason: GithubFailure; message: string };

const inFlight = new Map<string, Promise<RefreshOutcome>>();

/**
 * Makes sure the calendar for a range is cached and recent: fetches when it is missing, older than an hour,
 * or `force` is set. Concurrent calls for the same range share one request.
 */
export function refreshCalendar(
  from: string,
  to: string,
  options: { force?: boolean; now?: number; asOf?: string; fetchImpl?: FetchLike; database?: AtlasDB } = {},
): Promise<RefreshOutcome> {
  const key = calendarKey(from, to);
  const running = inFlight.get(key);
  if (running) return running;

  const task = (async (): Promise<RefreshOutcome> => {
    const database = options.database ?? db;
    const row = await database.secrets.get(ID);
    if (!row) return { status: 'no-token' };
    if (!calendarQueryRange(from, to, options.asOf)) return { status: 'not-started' };
    const now = options.now ?? Date.now();
    const cached = row.calendars?.[key];
    if (!options.force && cached && now - cached.fetchedAt < CALENDAR_MAX_AGE_MS) return { status: 'fresh' };

    const result = await fetchCalendar(row.token, from, to, { asOf: options.asOf, fetchImpl: options.fetchImpl });
    if (!result.ok) return { status: 'failed', reason: result.reason, message: result.message };

    await database.transaction('rw', database.secrets, async () => {
      // The user may have disconnected, or switched tokens, while the request was out.
      const current = await database.secrets.get(ID);
      if (current?.token !== row.token) return;
      const entry: CachedCalendar = { fetchedAt: now, days: result.value.days };
      await database.secrets.put({ ...current, calendars: { ...current.calendars, [key]: entry } });
    });
    return { status: 'fetched' };
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, task);
  return task;
}

/** Whether a token is stored: `undefined` while loading. The token itself is not returned. */
export function useGithubConnected(): boolean | undefined {
  return useLiveQuery(async () => (await db.secrets.get(ID)) !== undefined, []);
}

/** The cached calendar for a range, `null` if there is none yet, `undefined` while loading. */
export function useCachedCalendar(from: string, to: string): CachedCalendar | null | undefined {
  return useLiveQuery(async () => (await db.secrets.get(ID))?.calendars?.[calendarKey(from, to)] ?? null, [from, to]);
}
