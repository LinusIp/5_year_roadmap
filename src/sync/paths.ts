/**
 * The data repository's layout (brief 4.10), and which file each record lives in.
 *
 *   README.md
 *   state/items.json       item, paper, certificate and milestone states
 *   state/plan.json        plan edits: patches, items of your own, re-plans, weekly picks
 *   state/settings.json    blocks, thresholds, streak rules, theme (never the token)
 *   state/challenges.json  catalogue challenges solved, skipped or hidden
 *   log/2026/10/2026-10-07.json   one day
 *   log/2026/10/2026-10-07.md     its human-readable twin, generated
 *   reviews/2026-W41.md, reviews/2026-10.md, reviews/2027-Q1.md
 *   projects/<project id>.md      a project's write-up, links and checklist, generated
 *   blog/2026-10-18.json          whether the day's blog post was written (the post is in the user's own blog)
 *   sleep/2026-10-18.json         the night that ended that morning: bedtime, wake time, minutes
 *
 * state/practice.json (practice answers) may still be there from before Practice was removed (pull request #6). It is
 * archived: Atlas no longer reads it, writes it or deletes it.
 */
import type { BlogPost, Review, SleepNight } from '../db/types.ts';
import { addDays } from '../lib/dates.ts';

export const README_PATH = 'README.md';
export const ITEMS_PATH = 'state/items.json';
export const PLAN_PATH = 'state/plan.json';
export const SETTINGS_PATH = 'state/settings.json';
export const CHALLENGES_PATH = 'state/challenges.json';

/** The tables whose records go to the data repository. `meta` (timer, shortcuts) stays on the device. */
export const SYNCED_TABLES = [
  'dayLogs', 'itemStates', 'paperStates', 'certStates', 'milestoneStates', 'customEntities', 'overrides',
  'reviews', 'weekPicks', 'replans', 'planPatches', 'challenges', 'blogPosts', 'sleep', 'settings',
] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

/**
 * Files of the data repository that Atlas once wrote and now leaves alone: never read, rewritten or deleted, even when
 * an outbox entry for one is left over from an older build. The user's practice answers stay in the repository.
 */
export const ARCHIVED_PATHS: readonly string[] = ['state/practice.json'];

export function isArchivedPath(path: string): boolean {
  return ARCHIVED_PATHS.includes(path);
}

export function isSyncedTable(name: string): name is SyncedTable {
  return (SYNCED_TABLES as readonly string[]).includes(name);
}

export function logPath(date: string): string {
  return 'log/' + date.slice(0, 4) + '/' + date.slice(5, 7) + '/' + date + '.json';
}

export function logMarkdownPath(date: string): string {
  return logPath(date).replace(/\.json$/, '.md');
}

/** The ISO week a review week belongs to: the week of its fourth day, whichever day weeks start on. */
export function isoWeek(weekStart: string): string {
  const d = new Date(addDays(weekStart, 3) + 'T00:00:00Z');
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return thursday.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

export function reviewPath(id: Review['id']): string {
  if (id.startsWith('week:')) return 'reviews/' + isoWeek(id.slice(5)) + '.md';
  return 'reviews/' + id.slice(id.indexOf(':') + 1) + '.md';
}

export function projectPath(projectId: string): string {
  return 'projects/' + projectId + '.md';
}

export function blogPath(date: string): string {
  return 'blog/' + date + '.json';
}

/** The day a blog path is for, or null. */
export function dateOfBlogPath(path: string): string | null {
  const m = /^blog\/(\d{4}-\d{2}-\d{2})\.json$/.exec(path);
  return m ? m[1]! : null;
}

export function sleepPath(date: string): string {
  return 'sleep/' + date + '.json';
}

/** The wake-up date a sleep path is for, or null. */
export function dateOfSleepPath(path: string): string | null {
  const m = /^sleep\/(\d{4}-\d{2}-\d{2})\.json$/.exec(path);
  return m ? m[1]! : null;
}

/** The day a log path is for, or null. */
export function dateOfLogPath(path: string): string | null {
  const m = /^log\/\d{4}\/\d{2}\/(\d{4}-\d{2}-\d{2})\.json$/.exec(path);
  return m ? m[1]! : null;
}

/** Files the app reads back on a pull. Markdown twins and project pages are generated, so they are only written. */
export function isPulledPath(path: string): boolean {
  return path === ITEMS_PATH || path === PLAN_PATH || path === SETTINGS_PATH || path === CHALLENGES_PATH || dateOfLogPath(path) !== null || dateOfBlogPath(path) !== null || dateOfSleepPath(path) !== null || /^reviews\/[^/]+\.md$/.test(path);
}

/**
 * The files a changed record touches. `key` is the record's primary key, `record` the new value when there is
 * one. `isProject` says which item states also have a project page.
 */
export function pathsForRecord(table: SyncedTable, key: unknown, record: unknown, isProject: (id: string) => boolean): string[] {
  switch (table) {
    case 'dayLogs':
      return [logPath(String(key))];
    case 'itemStates': {
      const id = String(key);
      return isProject(id) ? [ITEMS_PATH, projectPath(id)] : [ITEMS_PATH];
    }
    case 'paperStates':
    case 'certStates':
    case 'milestoneStates':
      return [ITEMS_PATH];
    case 'customEntities':
    case 'overrides':
    case 'weekPicks':
    case 'replans':
    case 'planPatches':
      return [PLAN_PATH];
    case 'settings':
      return [SETTINGS_PATH];
    case 'challenges':
      return [CHALLENGES_PATH];
    case 'blogPosts':
      return [blogPath((record as BlogPost | undefined)?.date ?? String(key))];
    case 'sleep':
      return [sleepPath((record as SleepNight | undefined)?.date ?? String(key))];
    case 'reviews': {
      const id = (record as Review | undefined)?.id ?? String(key);
      return [reviewPath(id as Review['id'])];
    }
  }
}
