/**
 * Reads the project catalogue (data/projects/*.jsonl) and checks it against the curriculum. Node only: used by
 * the Vite plugin, by validate:data and by the unit tests.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOGUE_FILES, parseCatalogue } from '../../src/seed/catalogue.ts';
import type { CatalogueItem, CatalogueRefs } from '../../src/seed/catalogue.ts';
import type { Seed } from '../../src/seed/schema.ts';
import { DATA_DIR } from './load-seed.ts';

export function catalogueRefs(seed: Seed): CatalogueRefs {
  return {
    takenIds: new Set([...seed.resources, ...seed.projects, ...seed.papers, ...seed.certs].map((x) => x.id)),
    projectIds: new Set(seed.projects.map((p) => p.id)),
    resourceIds: new Set(seed.resources.map((r) => r.id)),
    phaseIds: new Set(seed.phases.map((p) => p.id)),
    nodes: new Set(seed.roadmaps.flatMap((r) => r.sections.flatMap((s) => s.nodes.map((n) => r.id + '/' + n.id)))),
  };
}

export function loadCatalogue(seed: Seed, dataDir: string = DATA_DIR): { items: CatalogueItem[]; errors: string[] } {
  const files: { file: string; text: string }[] = [];
  const errors: string[] = [];
  for (const name of CATALOGUE_FILES) {
    const abs = join(dataDir, 'projects', name);
    if (!existsSync(abs)) errors.push('data/projects/' + name + ': file is missing');
    else files.push({ file: 'data/projects/' + name, text: readFileSync(abs, 'utf8') });
  }
  const parsed = parseCatalogue(files, catalogueRefs(seed));
  return { items: parsed.items, errors: errors.concat(parsed.errors) };
}
