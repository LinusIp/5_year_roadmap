/**
 * The data repository's layout (brief 4.10), and which file each record lives in.
 *
 *   README.md
 *   state/items.json       item, paper, certificate and milestone states
 *   state/plan.json        plan edits: overrides, items of your own, re-plans, weekly picks
 *   state/settings.json    blocks, thresholds, streak rules, theme (never the token)
 *   log/2026/10/2026-10-07.json   one day
 *   log/2026/10/2026-10-07.md     its human-readable twin, generated
 *   reviews/2026-W41.md, reviews/2026-10.md, reviews/2027-Q1.md
 *   projects/<project id>.md      a project's write-up, links and checklist, generated
 */
import type { Review } from '../db/types.ts';
import { addDays } from '../lib/dates.ts';

export const README_PATH = 'README.md';
export const ITEMS_PATH = 'state/items.json';
export const PLAN_PATH = 'state/plan.json';
export const SETTINGS_PATH = 'state/settings.json';

/** The tables whose records go to the data repository. `meta` (timer, shortcuts) stays on the device. */
export const SYNCED_TABLES = [
  'dayLogs', 'itemStates', 'paperStates', 'certStates', 'milestoneStates', 'customEntities', 'overrides',
  'reviews', 'weekPicks', 'replans', 'settings',
] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

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

/** The day a log path is for, or null. */
export function dateOfLogPath(path: string): string | null {
  const m = /^log\/\d{4}\/\d{2}\/(\d{4}-\d{2}-\d{2})\.json$/.exec(path);
  return m ? m[1]! : null;
}

/** Files the app reads back on a pull. Markdown twins and project pages are generated, so they are only written. */
export function isPulledPath(path: string): boolean {
  return path === ITEMS_PATH || path === PLAN_PATH || path === SETTINGS_PATH || dateOfLogPath(path) !== null || /^reviews\/[^/]+\.md$/.test(path);
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
      return [PLAN_PATH];
    case 'settings':
      return [SETTINGS_PATH];
    case 'reviews': {
      const id = (record as Review | undefined)?.id ?? String(key);
      return [reviewPath(id as Review['id'])];
    }
  }
}
