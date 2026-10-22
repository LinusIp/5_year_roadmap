/**
 * Reads the internship goals (data/internships*.json, INTERNSHIPS) and checks each against the library. Node only:
 * used by the Vite plugin, by validate:data and by the unit tests. The app loads them as their own chunk.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readInternshipGoal } from '../../src/seed/internships.ts';
import type { InternshipGoal } from '../../src/seed/internships.ts';
import type { Seed } from '../../src/seed/schema.ts';
import { DATA_DIR } from './load-seed.ts';

/** The files, in name order: internships.json, then internships-<anything>.json. */
export function internshipFiles(dataDir: string = DATA_DIR): string[] {
  if (!existsSync(dataDir)) return [];
  return readdirSync(dataDir)
    .filter((n) => /^internships(-[a-z0-9-]+)?\.json$/.test(n))
    .sort();
}

/** The ids a phase or an open-source item may name: the Library's resources and the reading queue's papers. */
export function libraryIds(seed: Pick<Seed, 'resources' | 'papers'>): Set<string> {
  return new Set([...seed.resources.map((r) => r.id), ...seed.papers.map((p) => p.id)]);
}

export function loadInternships(seed: Pick<Seed, 'resources' | 'papers'>, dataDir: string = DATA_DIR): { goals: InternshipGoal[]; errors: string[] } {
  const goals: InternshipGoal[] = [];
  const errors: string[] = [];
  const ids = libraryIds(seed);
  const goalIds = new Map<string, string>();
  for (const name of internshipFiles(dataDir)) {
    const file = 'data/' + name;
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(join(dataDir, name), 'utf8'));
    } catch (err) {
      errors.push(file + ': ' + (err instanceof Error ? err.message : String(err)));
      continue;
    }
    const read = readInternshipGoal(data, file, ids);
    errors.push(...read.errors);
    if (!read.goal) continue;
    const before = goalIds.get(read.goal.goal.id);
    if (before) errors.push(file + ': the goal id "' + read.goal.goal.id + '" is already used by ' + before);
    else {
      goalIds.set(read.goal.goal.id, file);
      goals.push(read.goal);
    }
  }
  return { goals, errors };
}
