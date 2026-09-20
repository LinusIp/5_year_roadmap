/**
 * Reads /data/**.yaml from disk and validates it. Node only: used by the Vite plugin,
 * by `npm run validate:data`, and by the unit tests that check the real curriculum.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, YAMLParseError } from 'yaml';
import { SEED_KINDS, validateSeed } from '../../src/seed/validate.ts';
import type { RawFile, RawSeed, SeedKind, ValidateOptions, ValidationResult } from '../../src/seed/validate.ts';
import type { Seed } from '../../src/seed/schema.ts';

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
    return { file, data: parse(readFileSync(abs, 'utf8')) };
  } catch (err) {
    if (err instanceof YAMLParseError) {
      const where = err.linePos?.[0] ? ' (line ' + err.linePos[0].line + ', column ' + err.linePos[0].col + ')' : '';
      errors.push(file + where + ': ' + err.message.split('\n')[0]);
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
      const names = readdirSync(dir).filter((n) => n.endsWith('.yaml')).sort();
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
