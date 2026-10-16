/**
 * Reads data/projects/docs/<project id>.md and checks each against its project: every template section, the
 * milestone hours adding up to the project's estHours, references that resolve, roadmap nodes that exist, a
 * Parts and budget section for stage 2 builds that list parts, and 300-700 words.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDoc } from '../../src/lib/project-doc.ts';
import type { ProjectDoc } from '../../src/lib/project-doc.ts';
import type { Seed } from '../../src/seed/schema.ts';
import { DATA_DIR } from './load-seed.ts';

export interface DocsResult {
  docs: Record<string, string>;
  parsed: Record<string, ProjectDoc>;
  errors: string[];
  warnings: string[];
}

/** Projects that must have a doc: every one but the weekly mini-builds. */
export function needsDoc(project: Seed['projects'][number]): boolean {
  return project.cadence !== 'weekly';
}

export function loadDocs(seed: Seed, dataDir: string = DATA_DIR, options: { requireAll?: boolean; extraIds?: Iterable<string> } = {}): DocsResult {
  const dir = join(dataDir, 'projects', 'docs');
  const errors: string[] = [];
  const warnings: string[] = [];
  const docs: Record<string, string> = {};
  const parsed: Record<string, ProjectDoc> = {};
  const projects = new Map(seed.projects.map((p) => [p.id, p]));
  const known = new Set<string>([
    ...seed.resources.map((r) => r.id), ...seed.projects.map((p) => p.id), ...seed.papers.map((p) => p.id),
    ...seed.certs.map((c) => c.id), ...seed.paperSources.map((s) => s.id), ...(options.extraIds ?? []),
  ]);
  const nodes = new Set(seed.roadmaps.flatMap((r) => r.sections.flatMap((s) => s.nodes.map((n) => r.id + '/' + n.id))));
  const roadmapIds = new Set<string>(seed.roadmaps.map((r) => r.id));

  const files = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.md')).sort() : [];
  for (const name of files) {
    const id = name.slice(0, -3);
    const file = 'data/projects/docs/' + name;
    const project = projects.get(id);
    if (!project) {
      errors.push(file + ': no project has the id "' + id + '"');
      continue;
    }
    const text = readFileSync(join(dir, name), 'utf8');
    docs[id] = text;
    const { doc, errors: problems } = parseDoc(text);
    for (const p of problems) errors.push(file + ': ' + p);
    if (!doc) continue;
    parsed[id] = doc;
    const sum = doc.milestones.reduce((s, m) => s + m.hours, 0);
    if (Math.abs(sum - project.estHours) > 1e-9) errors.push(file + ': milestones add up to ' + sum + ' h, the project is ' + project.estHours + ' h');
    for (const ref of doc.references) if (!known.has(ref)) errors.push(file + ': reference "' + ref + '" is not a catalogue id');
    if (doc.references.length === 0) errors.push(file + ': References needs at least one catalogue id');
    for (const m of (doc.sections.Why ?? '').matchAll(/\b([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)\b/g)) {
      if (roadmapIds.has(m[1]!) && !nodes.has(m[0])) errors.push(file + ': roadmap node "' + m[0] + '" does not exist');
    }
    if (project.stage === 2 && project.parts && project.parts.length > 0 && !doc.sections['Parts and budget']) {
      errors.push(file + ': a stage 2 build with parts needs a "Parts and budget" section');
    }
    if (doc.words < 300 || doc.words > 700) errors.push(file + ': ' + doc.words + ' words, the template asks for 300-700');
  }
  const missing = seed.projects.filter((p) => needsDoc(p) && !docs[p.id]).map((p) => p.id);
  if (missing.length > 0) {
    const message = missing.length + ' project' + (missing.length === 1 ? ' has' : 's have') + ' no tech doc: ' + missing.slice(0, 12).join(', ') + (missing.length > 12 ? ', …' : '');
    (options.requireAll ? errors : warnings).push(message);
  }
  return { docs, parsed, errors, warnings };
}
