/**
 * The local half of GitHub Sync: the device's records as repository files, and repository files applied back
 * to the device. Writes made here are silent (not stamped, not queued): they are GitHub's version, not edits.
 */
import Dexie from 'dexie';
import type { AtlasDB } from '../db/db.ts';
import type {
  CertState, CustomEntity, DayLog, MilestoneState, Override, PaperState, ReplanRecord, Review, StoredSettings,
  UserItemState, WeekPick,
} from '../db/types.ts';
import { renderDayMarkdown, titleIndex } from '../lib/day-markdown.ts';
import type { AppSeed } from '../seed/schema.ts';
import { renderDay, renderItems, renderPlan, renderProject, renderReview, renderSettings } from './files.ts';
import type { ItemsData, PlanData } from './files.ts';
import { markSilent } from './middleware.ts';
import {
  ITEMS_PATH, PLAN_PATH, SETTINGS_PATH, dateOfLogPath, logMarkdownPath, logPath, projectPath, reviewPath,
} from './paths.ts';

export interface LocalState {
  dayLogs: DayLog[];
  itemStates: UserItemState[];
  paperStates: PaperState[];
  certStates: CertState[];
  milestoneStates: MilestoneState[];
  customEntities: CustomEntity[];
  overrides: Override[];
  reviews: Review[];
  weekPicks: WeekPick[];
  replans: ReplanRecord[];
  settings: StoredSettings[];
}

export async function readLocal(database: AtlasDB): Promise<LocalState> {
  return database.transaction(
    'r',
    [database.dayLogs, database.itemStates, database.paperStates, database.certStates, database.milestoneStates, database.customEntities, database.overrides, database.reviews, database.weekPicks, database.replans, database.settings],
    async () => ({
      dayLogs: await database.dayLogs.toArray(),
      itemStates: await database.itemStates.toArray(),
      paperStates: await database.paperStates.toArray(),
      certStates: await database.certStates.toArray(),
      milestoneStates: await database.milestoneStates.toArray(),
      customEntities: await database.customEntities.toArray(),
      overrides: await database.overrides.toArray(),
      reviews: await database.reviews.toArray(),
      weekPicks: await database.weekPicks.toArray(),
      replans: await database.replans.toArray(),
      settings: await database.settings.toArray(),
    }),
  );
}

export function itemsOf(local: LocalState): ItemsData {
  return { itemStates: local.itemStates, paperStates: local.paperStates, certStates: local.certStates, milestoneStates: local.milestoneStates };
}

export function planOf(local: LocalState): PlanData {
  return { overrides: local.overrides, customEntities: local.customEntities, replans: local.replans, weekPicks: local.weekPicks };
}

/** Every file the device's records make, for a first sync or after an import. */
export function allPaths(local: LocalState, seed: AppSeed): string[] {
  const projects = new Set(seed.projects.map((p) => p.id));
  const paths = [ITEMS_PATH, PLAN_PATH];
  if (local.settings.length > 0) paths.push(SETTINGS_PATH);
  for (const log of local.dayLogs) paths.push(logPath(log.date));
  for (const review of local.reviews) paths.push(reviewPath(review.id));
  for (const state of local.itemStates) if (projects.has(state.refId)) paths.push(projectPath(state.refId));
  return paths;
}

/** The outbox's paths with their generated companions: a day's Markdown twin goes with its JSON. */
export function withCompanions(paths: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const path of paths) {
    out.add(path);
    const date = dateOfLogPath(path);
    if (date) out.add(logMarkdownPath(date));
  }
  return [...out].sort();
}

/** A file's content as the device's records have it, or null when the file should not exist. */
export function renderPath(path: string, local: LocalState, seed: AppSeed): string | null {
  if (path === ITEMS_PATH) return renderItems(itemsOf(local));
  if (path === PLAN_PATH) return renderPlan(planOf(local));
  if (path === SETTINGS_PATH) return local.settings[0] ? renderSettings(local.settings[0]) : null;

  const date = dateOfLogPath(path);
  if (date) {
    const log = local.dayLogs.find((l) => l.date === date);
    return log ? renderDay(log) : null;
  }
  const mdDate = /^log\/\d{4}\/\d{2}\/(\d{4}-\d{2}-\d{2})\.md$/.exec(path)?.[1];
  if (mdDate) {
    const log = local.dayLogs.find((l) => l.date === mdDate);
    if (!log) return null;
    const core = local.settings[0]?.core ?? seed.settings;
    return renderDayMarkdown(log, { core, titles: titleIndex(seed), planStart: seed.phases[0]!.start, states: itemsOf(local) }, { reflections: true });
  }
  if (path.startsWith('reviews/')) {
    const review = local.reviews.find((r) => reviewPath(r.id) === path);
    return review ? renderReview(review) : null;
  }
  const projectId = /^projects\/(.+)\.md$/.exec(path)?.[1];
  if (projectId) {
    const project = seed.projects.find((p) => p.id === projectId);
    const state = local.itemStates.find((s) => s.refId === projectId);
    return project && state ? renderProject(project, state) : null;
  }
  return null;
}

/* ------------------------------------------------------------------ applying GitHub's version */

async function silently(database: AtlasDB, tables: Dexie.Table[], fn: () => Promise<void>): Promise<void> {
  await database.transaction('rw', tables, async () => {
    markSilent(Dexie.currentTransaction);
    await fn();
  });
}

export async function writeItems(database: AtlasDB, data: ItemsData): Promise<void> {
  await silently(database, [database.itemStates, database.paperStates, database.certStates, database.milestoneStates], async () => {
    await database.itemStates.clear();
    await database.itemStates.bulkPut(data.itemStates);
    await database.paperStates.clear();
    await database.paperStates.bulkPut(data.paperStates);
    await database.certStates.clear();
    await database.certStates.bulkPut(data.certStates);
    await database.milestoneStates.clear();
    await database.milestoneStates.bulkPut(data.milestoneStates);
  });
}

export async function writePlan(database: AtlasDB, data: PlanData): Promise<void> {
  await silently(database, [database.overrides, database.customEntities, database.replans, database.weekPicks], async () => {
    await database.overrides.clear();
    await database.overrides.bulkPut(data.overrides);
    await database.customEntities.clear();
    await database.customEntities.bulkPut(data.customEntities);
    await database.replans.clear();
    await database.replans.bulkPut(data.replans);
    await database.weekPicks.clear();
    await database.weekPicks.bulkPut(data.weekPicks);
  });
}

export async function writeSettings(database: AtlasDB, settings: StoredSettings): Promise<void> {
  await silently(database, [database.settings], async () => {
    await database.settings.put(settings);
  });
}

export async function writeDay(database: AtlasDB, log: DayLog | null, date: string): Promise<void> {
  await silently(database, [database.dayLogs], async () => {
    if (log) await database.dayLogs.put(log);
    else await database.dayLogs.delete(date);
  });
}

export async function writeReview(database: AtlasDB, review: Review): Promise<void> {
  await silently(database, [database.reviews], async () => {
    await database.reviews.put(review);
  });
}
