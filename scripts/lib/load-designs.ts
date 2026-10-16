/**
 * Reads data/projects/design/<id>.yaml and checks each against src/seed/design.ts: its shape and the rules for its
 * weight. Every monthly case and every plan project with a tech doc needs a full design, every weekly build a light
 * one; a design file for anything else is an error. Node only: used by validate:data, the Vite plugin and the tests.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { checkDesign, DesignSchema } from '../../src/seed/design.ts';
import type { Design, DesignWeight } from '../../src/seed/design.ts';
import type { CatalogueItem } from '../../src/seed/catalogue.ts';
import type { Seed } from '../../src/seed/schema.ts';
import { DATA_DIR } from './load-seed.ts';

export interface DesignsResult {
  designs: Record<string, Design>;
  weights: Map<string, DesignWeight>;
  errors: string[];
}

/** Which items need a design, and how full: cases and documented plan projects full, builds light. */
export function designWeights(items: readonly Pick<CatalogueItem, 'id' | 'kind'>[], dataDir: string = DATA_DIR): Map<string, DesignWeight> {
  const weights = new Map<string, DesignWeight>();
  for (const item of items) if (item.kind === 'case') weights.set(item.id, 'full');
  for (const item of items) if (item.kind === 'build') weights.set(item.id, 'light');
  const docDir = join(dataDir, 'projects', 'docs');
  for (const name of existsSync(docDir) ? readdirSync(docDir) : []) if (name.endsWith('.md')) weights.set(name.slice(0, -3), 'full');
  return weights;
}

export function loadDesigns(seed: Seed, items: readonly Pick<CatalogueItem, 'id' | 'kind'>[], dataDir: string = DATA_DIR, only?: readonly string[]): DesignsResult {
  const dir = join(dataDir, 'projects', 'design');
  const weights = designWeights(items, dataDir);
  const resourceIds = new Set(seed.resources.map((r) => r.id));
  const designs: Record<string, Design> = {};
  const errors: string[] = [];
  const files = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.yaml')).sort() : [];
  const have = new Set(files.map((f) => f.slice(0, -5)));
  for (const name of files) {
    const id = name.slice(0, -5);
    if (only && !only.includes(id)) continue;
    const file = 'data/projects/design/' + name;
    const weight = weights.get(id);
    if (!weight) {
      errors.push(file + ': no monthly case, weekly build or documented plan project has the id "' + id + '"');
      continue;
    }
    let raw: unknown;
    try {
      raw = parse(readFileSync(join(dir, name), 'utf8'));
    } catch (e) {
      errors.push(file + ': YAML: ' + (e instanceof Error ? e.message.split('\n')[0] : String(e)));
      continue;
    }
    const parsed = DesignSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) errors.push(file + ': ' + issue.path.join('.') + ': ' + issue.message);
      continue;
    }
    for (const problem of checkDesign(parsed.data, weight, resourceIds)) errors.push(file + ': ' + problem);
    designs[id] = parsed.data;
  }
  if (!only) for (const id of weights.keys()) if (!have.has(id)) errors.push('data/projects/design/' + id + '.yaml: missing (a ' + (weights.get(id) === 'full' ? 'full' : 'light') + ' design is required)');
  return { designs, weights, errors };
}
