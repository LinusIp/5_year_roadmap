/**
 * The user's internship progress (INTERNSHIPS): meta "internships:<goal id>", one row per goal, holding the gate
 * ticks, project status and progress, interview self-ratings, resume ticks and target statuses, every one keyed by
 * the file's ids. Local to the device and in backups (`meta` is exported); never written back into the file.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';
import type { AtlasDB } from './db.ts';
import { EMPTY_PROGRESS } from '../lib/internships.ts';
import type { InternProgress, Rating } from '../lib/internships.ts';
import type { ProjectStatus, TargetStatus } from '../seed/internships.ts';

export const INTERN_KEY_PREFIX = 'internships:';

export function internKey(goalId: string): string {
  return INTERN_KEY_PREFIX + goalId;
}

function clean(value: unknown): InternProgress {
  const v = value && typeof value === 'object' ? (value as Partial<InternProgress>) : {};
  const record = <T,>(x: unknown): Record<string, T> => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, T>) : {});
  return { gates: record(v.gates), projects: record(v.projects), ratings: record(v.ratings), resume: record(v.resume), targets: record(v.targets) };
}

export async function readInternProgress(goalId: string, database: AtlasDB = db): Promise<InternProgress> {
  return clean((await database.meta.get(internKey(goalId)))?.value);
}

/** A goal's progress, live. `undefined` only during the first read. */
export function useInternProgress(goalId: string | null): InternProgress | undefined {
  return useLiveQuery(() => (goalId ? readInternProgress(goalId) : Promise.resolve(EMPTY_PROGRESS)), [goalId]);
}

export async function updateInternProgress(goalId: string, change: (p: InternProgress) => InternProgress, database: AtlasDB = db): Promise<InternProgress> {
  return database.transaction('rw', database.meta, async () => {
    const next = change(await readInternProgress(goalId, database));
    await database.meta.put({ key: internKey(goalId), value: next });
    return next;
  });
}

export async function setGateDone(goalId: string, itemId: string, done: boolean, database: AtlasDB = db): Promise<void> {
  await updateInternProgress(goalId, (p) => ({ ...p, gates: { ...p.gates, [itemId]: done } }), database);
}

export async function setProjectStatus(goalId: string, projectId: string, status: ProjectStatus, database: AtlasDB = db): Promise<void> {
  await updateInternProgress(goalId, (p) => ({ ...p, projects: { ...p.projects, [projectId]: { ...p.projects[projectId], status } } }), database);
}

export async function setProjectProgress(goalId: string, projectId: string, progress: number, database: AtlasDB = db): Promise<void> {
  const value = Math.max(0, Math.min(1, Math.round(progress * 20) / 20));
  await updateInternProgress(goalId, (p) => ({ ...p, projects: { ...p.projects, [projectId]: { ...p.projects[projectId], progress: value } } }), database);
}

export async function setRating(goalId: string, areaId: string, rating: Rating, database: AtlasDB = db): Promise<void> {
  await updateInternProgress(goalId, (p) => ({ ...p, ratings: { ...p.ratings, [areaId]: rating } }), database);
}

export async function setResumeDone(goalId: string, index: number, done: boolean, database: AtlasDB = db): Promise<void> {
  await updateInternProgress(goalId, (p) => ({ ...p, resume: { ...p.resume, [String(index)]: done } }), database);
}

export async function setTargetStatus(goalId: string, targetId: string, status: TargetStatus, database: AtlasDB = db): Promise<void> {
  await updateInternProgress(goalId, (p) => ({ ...p, targets: { ...p.targets, [targetId]: status } }), database);
}

/** Every goal's progress, live, for Today's card and Plan's row. */
export function useInternProgressAll(goalIds: readonly string[]): Map<string, InternProgress> | undefined {
  const key = goalIds.join('\n');
  return useLiveQuery(
    async () => new Map(await Promise.all(key.split('\n').filter(Boolean).map(async (id) => [id, await readInternProgress(id)] as const))),
    [key],
  );
}
