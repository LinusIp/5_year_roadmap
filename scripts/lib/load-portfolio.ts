/**
 * Reads the portfolio (ATLAS-PORTFOLIO): data/portfolio/projects.json, one tech doc per project
 * (data/portfolio/docs/<id>.md) and one design (data/portfolio/design/<id>.yaml), and checks each against the library
 * and the template. Node only: used by the Vite plugin (virtual:atlas-portfolio, its own chunk), by validate:data and
 * by the unit tests. The plan's loaders (`loadDocs`, `loadDesigns`) keep reading only data/projects/.
 *
 * The file is written against the Atlas Library file's ids; a row the Library holds under an older id is found through
 * data/library-aliases.json, and the chunk carries the Library's ids. The files themselves are never rewritten.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { parseDoc } from '../../src/lib/project-doc.ts';
import { checkDesign, DesignSchema } from '../../src/seed/design.ts';
import type { Design } from '../../src/seed/design.ts';
import type { InternshipGoal } from '../../src/seed/internships.ts';
import { readPortfolio } from '../../src/seed/portfolio.ts';
import type { PortfolioSeed } from '../../src/seed/portfolio.ts';
import type { Seed } from '../../src/seed/schema.ts';
import { DATA_DIR } from './load-seed.ts';

export const ALIASES_FILE = 'library-aliases.json';

export interface AliasesResult {
  aliases: Map<string, string>;
  errors: string[];
}

/** The file id → Library id map. A key that is itself a Library id, or a target that is not, is an error. */
export function loadAliases(seed: Pick<Seed, 'resources' | 'papers'>, dataDir: string = DATA_DIR): AliasesResult {
  const path = join(dataDir, ALIASES_FILE);
  const aliases = new Map<string, string>();
  const errors: string[] = [];
  if (!existsSync(path)) return { aliases, errors };
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    return { aliases, errors: ['data/' + ALIASES_FILE + ': ' + (err instanceof Error ? err.message : String(err))] };
  }
  const map = data && typeof data === 'object' ? (data as { aliases?: unknown }).aliases : undefined;
  if (!map || typeof map !== 'object' || Array.isArray(map)) return { aliases, errors: ['data/' + ALIASES_FILE + ': "aliases" must be an object of file id → Library id'] };
  const ids = new Set([...seed.resources.map((r) => r.id), ...seed.papers.map((p) => p.id)]);
  for (const [from, to] of Object.entries(map as Record<string, unknown>)) {
    if (typeof to !== 'string') errors.push('data/' + ALIASES_FILE + ': "' + from + '" must map to an id');
    else if (ids.has(from)) errors.push('data/' + ALIASES_FILE + ': "' + from + '" is a Library id itself');
    else if (!ids.has(to)) errors.push('data/' + ALIASES_FILE + ': "' + from + '" maps to "' + to + '", which is not in the Library');
    else aliases.set(from, to);
  }
  return { aliases, errors };
}

export interface PortfolioResult {
  portfolio: PortfolioSeed | null;
  errors: string[];
  /** A `related` id that no longer exists: shown nowhere, listed here. */
  warnings: string[];
  /** File ids the aliases resolved, for the report: "paper-eagle → eagle". */
  resolved: string[];
}

export interface PortfolioContext {
  seed: Pick<Seed, 'resources' | 'papers' | 'projects'>;
  internships?: readonly InternshipGoal[];
  dataDir?: string;
  aliases?: Map<string, string>;
}

/** The ids each kind of reference may name: the Library's resources and the reading queue's papers. */
function libraryIds(seed: Pick<Seed, 'resources' | 'papers'>): Set<string> {
  return new Set([...seed.resources.map((r) => r.id), ...seed.papers.map((p) => p.id)]);
}

export function loadPortfolio({ seed, internships = [], dataDir = DATA_DIR, aliases }: PortfolioContext): PortfolioResult {
  const dir = join(dataDir, 'portfolio');
  const file = 'data/portfolio/projects.json';
  const errors: string[] = [];
  const warnings: string[] = [];
  const resolvedIds = new Set<string>();
  if (!existsSync(join(dir, 'projects.json'))) return { portfolio: null, errors, warnings, resolved: [] };
  const map = aliases ?? loadAliases(seed, dataDir).aliases;
  const library = libraryIds(seed);
  const resolve = (id: string): string => {
    const to = map.get(id);
    if (to) resolvedIds.add(id + ' → ' + to);
    return to ?? id;
  };

  let data: unknown;
  try {
    data = JSON.parse(readFileSync(join(dir, 'projects.json'), 'utf8'));
  } catch (err) {
    return { portfolio: null, errors: [file + ': ' + (err instanceof Error ? err.message : String(err))], warnings, resolved: [] };
  }
  const read = readPortfolio(data, file);
  errors.push(...read.errors);
  if (!read.portfolio) return { portfolio: null, errors, warnings, resolved: [] };
  const file_ = read.portfolio;

  // Portfolio ids never collide with the plan's projects or the Internships screen's.
  const planIds = new Set(seed.projects.map((p) => p.id));
  const internIds = new Set(internships.flatMap((g) => g.projects.map((p) => p.id)));
  const docs: Record<string, string> = {};
  const designs: Record<string, Design> = {};
  const projects = file_.projects.map((project) => {
    const where = file + ' (' + project.id + ')';
    if (planIds.has(project.id)) errors.push(where + ': the id is a plan project\'s');
    if (internIds.has(project.id)) errors.push(where + ': the id is an Internships project\'s');
    const readFirst = project.read_first.map((r) => {
      if (r.library_id === null) return r;
      const id = resolve(r.library_id);
      if (!library.has(id)) errors.push(where + ': read_first "' + r.title + '" names "' + r.library_id + '", which is not in the Library');
      return { ...r, library_id: id };
    });
    const related = project.related.filter((rel) => {
      const exists = rel.where === 'plan' ? planIds.has(rel.id) : internIds.has(rel.id);
      if (!exists) warnings.push(where + ': related ' + rel.where + ' project "' + rel.id + '" (' + rel.title + ') no longer exists; dropped');
      return exists;
    });

    // The tech doc: the template, 300–700 words, references in the Library, no URLs, milestones one for one.
    const docPath = join(dir, 'docs', project.id + '.md');
    if (!existsSync(docPath)) errors.push('data/portfolio/docs/' + project.id + '.md: missing (every portfolio project has a tech doc)');
    else {
      const docFile = 'data/portfolio/docs/' + project.id + '.md';
      const text = readFileSync(docPath, 'utf8');
      const { doc, errors: problems } = parseDoc(text);
      for (const p of problems) errors.push(docFile + ': ' + p);
      if (doc) {
        if (doc.words < 300 || doc.words > 700) errors.push(docFile + ': ' + doc.words + ' words, the template asks for 300-700');
        if (doc.references.length === 0) errors.push(docFile + ': References needs at least one Library id');
        for (const ref of doc.references) if (!library.has(resolve(ref))) errors.push(docFile + ': reference "' + ref + '" is not a Library id');
        const inDoc = doc.milestones.map((m) => m.title + ' (' + m.hours + ' h)');
        const inFile = project.milestones.map((m) => m.title + ' (' + m.hours + ' h)');
        if (inDoc.join(' · ') !== inFile.join(' · ')) errors.push(docFile + ': milestones read "' + inDoc.join(' · ') + '", projects.json has "' + inFile.join(' · ') + '"');
        // The chunk carries the Library's ids in the References line.
        docs[project.id] = text.replace(/^(\*\*References\.\*\*\s?)(.*)$/m, (_all, label: string, list: string) => label + list.replace(/[a-z0-9][a-z0-9-]*/g, (id) => (doc.references.includes(id) ? resolve(id) : id)));
      }
    }

    // The design: its shape and the full weight's rules; a learn ref may name a resource or a reading-queue paper.
    const designPath = join(dir, 'design', project.id + '.yaml');
    const designFile = 'data/portfolio/design/' + project.id + '.yaml';
    if (!existsSync(designPath)) errors.push(designFile + ': missing (every portfolio project has a full design)');
    else {
      let raw: unknown;
      try {
        raw = parse(readFileSync(designPath, 'utf8'));
      } catch (e) {
        errors.push(designFile + ': YAML: ' + (e instanceof Error ? e.message.split('\n')[0] : String(e)));
      }
      const parsed = raw === undefined ? null : DesignSchema.safeParse(raw);
      if (parsed && !parsed.success) for (const issue of parsed.error.issues) errors.push(designFile + ': ' + issue.path.join('.') + ': ' + issue.message);
      if (parsed?.success) {
        const design: Design = { ...parsed.data, learn: parsed.data.learn.map((l) => (l.ref ? { ...l, ref: resolve(l.ref) } : l)) };
        for (const problem of checkDesign(design, 'full', library)) errors.push(designFile + ': ' + problem.replace('which is not a resource', 'which is not in the Library'));
        designs[project.id] = design;
      }
    }
    return { ...project, read_first: readFirst, related };
  });
  return { portfolio: { ...file_, projects, docs, designs }, errors, warnings, resolved: [...resolvedIds].sort() };
}
