/**
 * Reads /data/**.yaml from disk and validates it. Node only: used by the Vite plugin,
 * by `npm run validate:data`, and by the unit tests that check the real curriculum.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CORE_SCHEMA, load, YAMLException } from 'js-yaml';
import { SEED_KINDS, validateSeed } from '../../src/seed/validate.ts';
import type { RawFile, RawSeed, SeedKind, ValidateOptions, ValidationResult } from '../../src/seed/validate.ts';
import type { AppSeed, ChecklistSummary, Seed, Unit } from '../../src/seed/schema.ts';
import { unitHours } from '../../src/lib/checklist.ts';

/** Where each kind of seed data lives. A trailing slash means "every .yaml file in this folder". */
export const SEED_SOURCES: Record<SeedKind, string> = {
  tracks: 'tracks.yaml',
  settings: 'settings.yaml',
  phases: 'phases.yaml',
  resources: 'resources/',
  units: 'units/',
  plan: 'plan.yaml',
  projects: 'projects/',
  papers: 'papers.yaml',
  paperSources: 'paper-sources.yaml',
  certs: 'certs.yaml',
  subjects: 'subjects.yaml',
  roadmaps: 'roadmaps.yaml',
};

export const REPO_ROOT = join(import.meta.dirname, '..', '..');
export const DATA_DIR = join(REPO_ROOT, 'data');

function readYaml(dataDir: string, relPath: string, errors: string[]): RawFile | null {
  const file = 'data/' + relPath;
  const abs = join(dataDir, relPath);
  if (!existsSync(abs)) {
    errors.push(file + ': file is missing');
    return null;
  }
  try {
    // js-yaml's core schema reads the same values as `yaml` did (dates stay strings) in a tenth of the time, which
    // the 10,000-resource Library made matter: every build, test run and check loads these files.
    return { file, data: load(readFileSync(abs, 'utf8'), { schema: CORE_SCHEMA, filename: file }) };
  } catch (err) {
    if (err instanceof YAMLException) {
      const where = err.mark ? ' (line ' + (err.mark.line + 1) + ', column ' + (err.mark.column + 1) + ')' : '';
      errors.push(file + where + ': ' + err.reason);
    } else {
      errors.push(file + ': ' + String(err));
    }
    return null;
  }
}

export function readRawSeed(dataDir: string = DATA_DIR): { raw: RawSeed; errors: string[] } {
  const errors: string[] = [];
  const raw = Object.fromEntries(SEED_KINDS.map((k) => [k, [] as RawFile[]])) as RawSeed;
  for (const kind of SEED_KINDS) {
    const source = SEED_SOURCES[kind];
    if (source.endsWith('/')) {
      const dir = join(dataDir, source);
      if (!existsSync(dir)) {
        errors.push('data/' + source + ': folder is missing');
        continue;
      }
      // Lesson checklists may be JSON (data/units/<id>.json, ZOOMCAMP-CHECKLIST); YAML parses JSON as it is.
      const names = readdirSync(dir).filter((n) => n.endsWith('.yaml') || (kind === 'units' && n.endsWith('.json'))).sort();
      for (const name of names) {
        const parsed = readYaml(dataDir, source + name, errors);
        if (parsed) raw[kind].push(parsed);
      }
    } else {
      const parsed = readYaml(dataDir, source, errors);
      if (parsed) raw[kind].push(parsed);
    }
  }
  return { raw, errors };
}

/**
 * Also enforce the brief's content quotas (all sixteen tracks, a phase per year, a capstone per year,
 * a weekly pool of 100+ cards). On since milestone 2 put the real curriculum in /data.
 */
export const REQUIRE_COMPLETE = true;

export function loadSeed(dataDir: string = DATA_DIR, options: ValidateOptions = { requireComplete: REQUIRE_COMPLETE }): ValidationResult {
  const { raw, errors: readErrors } = readRawSeed(dataDir);
  const result = validateSeed(raw, options);
  const errors = readErrors.concat(result.errors);
  return { seed: errors.length > 0 ? null : result.seed, errors, warnings: result.warnings };
}

export function loadSeedOrThrow(dataDir: string = DATA_DIR): Seed {
  const { seed, errors } = loadSeed(dataDir);
  if (!seed) {
    throw new Error('The curriculum in /data is invalid (' + errors.length + ' problem' + (errors.length === 1 ? '' : 's') + '):\n  - ' + errors.join('\n  - '));
  }
  return seed;
}

/**
 * The app's view of the curriculum: unit checklists split off, each resource keeping a `unitCount`. The Vite
 * plugin serves the two halves as separate modules; the scripts use the same split.
 */
export function splitSeed(seed: Seed): { app: AppSeed; units: Record<string, Unit[]> } {
  const units: Record<string, Unit[]> = {};
  const resources = seed.resources.map((resource) => {
    const { units: list, checklistMeta, ...rest } = resource;
    if (list && list.length > 0) units[resource.id] = list;
    if (!list || !list.some((u) => u.kind)) return { ...rest, unitCount: list?.length ?? 0 };
    // A lesson checklist: what counts toward progress (not optional, not outdated), with its hours.
    const counted = list.filter((u) => !u.optional && !u.outdated).map((u) => ({ id: u.id, hours: unitHours(u), video: u.kind === 'video' }));
    const checklist: ChecklistSummary = { counted, seedDone: checklistMeta?.seedDone ?? [] };
    if (checklistMeta?.playlist) checklist.playlist = checklistMeta.playlist;
    // Its estimate is what the checklist adds up to, so the pace and the Library say the same.
    return { ...rest, estHours: Math.round(counted.reduce((sum, u) => sum + u.hours, 0)), unitCount: counted.length, checklist };
  });
  return { app: { ...seed, resources } as AppSeed, units };
}

/**
 * The curriculum's core and the Library's long tail (ATLAS-LIBRARY). The core is what the day-to-day plan touches:
 * every resource on the plan or named by a certification, with a checklist, covering a roadmap.sh node or counting
 * towards a subject, and whatever those name as a prerequisite, an alternative or a soft prerequisite. The rest, about
 * nine tenths of 2,400 resources, only ever appears in the Library; the Vite plugin serves it as its own chunk, so it
 * never delays Today.
 */
export function splitLibrary(app: AppSeed): { core: AppSeed; library: AppSeed['resources'] } {
  const byId = new Map(app.resources.map((r) => [r.id, r]));
  const core = new Set<string>();
  const keep = (id: string): void => {
    const resource = byId.get(id);
    if (!resource || core.has(id)) return;
    core.add(id);
    for (const next of [...resource.prerequisites, ...(resource.alternatives ?? []), ...(resource.after ?? [])]) keep(next);
  };
  for (const item of app.plan) if (item.resourceId) keep(item.resourceId);
  for (const cert of app.certs) for (const id of cert.prepResources) keep(id);
  for (const r of app.resources) if (r.unitCount > 0 || (r.covers?.length ?? 0) > 0 || r.subject) keep(r.id);
  return {
    core: { ...app, resources: app.resources.filter((r) => core.has(r.id)) },
    library: app.resources.filter((r) => !core.has(r.id)),
  };
}
