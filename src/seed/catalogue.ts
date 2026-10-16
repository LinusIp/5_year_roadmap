/**
 * The three-tier project catalogue (data/projects/*.jsonl): easy challenges for every day, medium challenges and
 * builds for the week, advanced real-case projects for the month. It is a pool to pick from, not plan items: the
 * curriculum's own projects keep their numbering, phases and capstones.
 *
 *   challenge  an algorithm exercise: statement, input and output, constraints, examples, hints, approach
 *   build      a medium mini-project: goal, approach steps, stack, done when, measure, pitfalls
 *   case       an advanced real case: scenario, requirements, architecture, data, milestones, deliverables
 *
 * The files are read as they were written (the `Raw…` schemas) and normalised here, the one place that knows their
 * quirks: phases are "Y1-P0" or "Y2" (the curriculum's ids are lower case), `measure` is a string or a list,
 * `parts` a comma-separated string, milestones `{ step, hours }`, and two catalogue domains are not tracks.
 *
 * Pure: shared by the app, by validate:data and by the tests.
 */
import { z } from 'zod';
import type { TrackId } from './schema.ts';
import { TRACK_IDS } from './schema.ts';

export const CATALOGUE_FILES = ['daily-easy.jsonl', 'weekly-medium.jsonl', 'monthly-advanced.jsonl'] as const;
export const DIFFICULTIES = ['easy', 'medium', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export type CatalogueCadence = 'daily' | 'weekly' | 'monthly';
/** Each tier has one difficulty: daily is easy, weekly medium, monthly advanced. */
export const CADENCE_OF: Record<Difficulty, CatalogueCadence> = { easy: 'daily', medium: 'weekly', advanced: 'monthly' };

const Text = z.string().trim().min(1);
const Id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lower-case words joined by hyphens');
const NodeRef = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must look like roadmap-id/node-id');
const Phase = z.string().regex(/^Y[1-5](?:-P[0-9])?$/, 'must be a phase such as Y1-P0 or Y2');
/** Added by scripts/map-catalogue.ts: resource ids and roadmap.sh nodes, empty when the mapping was unsure. */
const Mapping = { refs: z.array(Id).optional(), covers: z.array(NodeRef).optional() };

export const RawChallengeSchema = z.strictObject({
  id: Id,
  title: Text,
  kind: z.literal('challenge'),
  cadence: z.enum(['daily', 'weekly', 'monthly']),
  difficulty: z.enum(DIFFICULTIES),
  topic: Id,
  estMinutes: z.number().int().min(5).max(240),
  statement: Text,
  input: Text,
  output: Text,
  constraints: Text,
  examples: z.array(z.strictObject({ in: z.string(), out: z.string(), why: z.string().optional() })),
  hints: z.array(Text),
  approach: Text,
  complexity: Text,
  edgeCases: z.array(Text),
  tags: z.array(Text),
  prereq: z.array(Id).optional(),
  ...Mapping,
});

export const RawBuildSchema = z.strictObject({
  id: Id,
  title: Text,
  kind: z.literal('build'),
  cadence: z.enum(['daily', 'weekly', 'monthly']),
  difficulty: z.enum(DIFFICULTIES),
  phase: Phase,
  tracks: z.array(z.string()).min(1),
  level: z.number().int().min(1).max(5),
  estHours: z.number().min(1).max(200),
  domain: Id,
  stack: Text,
  goal: Text,
  approach: z.array(Text).min(1),
  doneWhen: Text,
  measure: z.union([z.string().trim(), z.array(Text)]),
  pitfalls: z.array(Text),
  parts: z.string().trim().optional(),
  prereq: z.array(Id).optional(),
  ...Mapping,
});

export const RawCaseSchema = z.strictObject({
  id: Id,
  title: Text,
  kind: z.literal('case'),
  cadence: z.enum(['daily', 'weekly', 'monthly']),
  difficulty: z.enum(DIFFICULTIES),
  phase: Phase,
  tracks: z.array(z.string()).min(1),
  level: z.number().int().min(1).max(5),
  estHours: z.number().min(1).max(400),
  domain: Id,
  scenario: Text,
  functional: z.array(Text).min(1),
  nonFunctional: z.array(Text),
  constraints: z.array(Text),
  architecture: Text,
  components: z.array(Text),
  stack: Text,
  data: Text,
  milestones: z.array(z.strictObject({ step: Text, hours: z.number().positive() })).min(1),
  deliverables: z.array(Text),
  doneWhen: Text,
  measure: z.union([z.string().trim(), z.array(Text)]),
  pitfalls: z.array(Text),
  stretch: z.array(Text),
  parts: z.string().trim().optional(),
  prereq: z.array(Id).optional(),
  ...Mapping,
});

export const RawCatalogueItemSchema = z.discriminatedUnion('kind', [RawChallengeSchema, RawBuildSchema, RawCaseSchema]);
export type RawCatalogueItem = z.infer<typeof RawCatalogueItemSchema>;

interface Common {
  id: string;
  title: string;
  difficulty: Difficulty;
  cadence: CatalogueCadence;
  prereq: string[];
  refs: string[];
  covers: string[];
}

export interface Challenge extends Common {
  kind: 'challenge';
  topic: string;
  estMinutes: number;
  statement: string;
  input: string;
  output: string;
  constraints: string;
  examples: { in: string; out: string; why?: string }[];
  hints: string[];
  approach: string;
  complexity: string;
  edgeCases: string[];
  tags: string[];
}

interface Sized extends Common {
  phaseId: string;
  tracks: TrackId[];
  level: number;
  estHours: number;
  domain: string;
  stack: string;
  doneWhen: string;
  measure: string[];
  pitfalls: string[];
  parts: string[];
}

export interface Build extends Sized {
  kind: 'build';
  goal: string;
  approach: string[];
}

export interface CaseMilestone {
  /** Stored in the item's unitsDone, like a tech doc's milestones: `milestone-1`, … */
  id: string;
  title: string;
  hours: number;
}

export interface Case extends Sized {
  kind: 'case';
  scenario: string;
  functional: string[];
  nonFunctional: string[];
  constraints: string[];
  architecture: string;
  components: string[];
  data: string;
  milestones: CaseMilestone[];
  deliverables: string[];
  stretch: string[];
}

export type CatalogueItem = Challenge | Build | Case;
export type CatalogueKind = CatalogueItem['kind'];

/** What lists, filters and Today need of an item: small enough to load with Today. */
export interface CatalogueEntry {
  id: string;
  kind: CatalogueKind;
  title: string;
  difficulty: Difficulty;
  cadence: CatalogueCadence;
  /** A challenge's topic, or a build's or case's domain. */
  group: string;
  phaseId?: string;
  tracks: TrackId[];
  level?: number;
  /** Hours for a build or case; a challenge's minutes as hours. */
  hours: number;
  estMinutes?: number;
  /** A build's approach steps or a case's milestones: the checkboxes its progress counts. */
  steps?: number;
}

/** Catalogue domains that are not tracks of the curriculum, and the track each counts toward. */
const TRACK_OF_DOMAIN: Record<string, TrackId> = { inference: 'ai', research: 'ai' };

export function normaliseTracks(tracks: string[]): TrackId[] {
  const out: TrackId[] = [];
  for (const t of tracks) {
    const track = (TRACK_IDS as readonly string[]).includes(t) ? (t as TrackId) : TRACK_OF_DOMAIN[t];
    if (track && !out.includes(track)) out.push(track);
  }
  return out;
}

/** "Y1-P0" is the curriculum's `y1-p0`; "Y2" is `y2`. */
export function phaseIdOf(phase: string): string {
  return phase.toLowerCase();
}

/** "Load cell 1-5 kg $8, op-amp quad $2-4" as a list; a comma inside a number ("1,200") does not split. */
export function splitParts(parts: string | undefined): string[] {
  if (!parts) return [];
  return parts
    .split(/,(?!\d{3}\b)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function normalise(raw: RawCatalogueItem): CatalogueItem {
  const common = { id: raw.id, title: raw.title, difficulty: raw.difficulty, cadence: raw.cadence, prereq: raw.prereq ?? [], refs: raw.refs ?? [], covers: raw.covers ?? [] };
  if (raw.kind === 'challenge') {
    const { kind: _kind, cadence: _c, difficulty: _d, prereq: _p, refs: _r, covers: _v, ...rest } = raw;
    return { ...rest, ...common, kind: 'challenge' };
  }
  const sized = {
    ...common,
    phaseId: phaseIdOf(raw.phase),
    tracks: normaliseTracks(raw.tracks),
    level: raw.level,
    estHours: raw.estHours,
    domain: raw.domain,
    stack: raw.stack,
    doneWhen: raw.doneWhen,
    measure: typeof raw.measure === 'string' ? (raw.measure ? [raw.measure] : []) : raw.measure,
    pitfalls: raw.pitfalls,
    parts: splitParts(raw.parts),
  };
  if (raw.kind === 'build') return { ...sized, kind: 'build', goal: raw.goal, approach: raw.approach };
  return {
    ...sized,
    kind: 'case',
    scenario: raw.scenario,
    functional: raw.functional,
    nonFunctional: raw.nonFunctional,
    constraints: raw.constraints,
    architecture: raw.architecture,
    components: raw.components,
    data: raw.data,
    milestones: raw.milestones.map((m, i) => ({ id: 'milestone-' + (i + 1), title: m.step, hours: m.hours })),
    deliverables: raw.deliverables,
    stretch: raw.stretch,
  };
}

export function entryOf(item: CatalogueItem): CatalogueEntry {
  const entry: CatalogueEntry = {
    id: item.id,
    kind: item.kind,
    title: item.title,
    difficulty: item.difficulty,
    cadence: item.cadence,
    group: item.kind === 'challenge' ? item.topic : item.domain,
    tracks: item.kind === 'challenge' ? ['swe'] : item.tracks,
    hours: item.kind === 'challenge' ? item.estMinutes / 60 : item.estHours,
  };
  if (item.kind === 'challenge') entry.estMinutes = item.estMinutes;
  else {
    entry.phaseId = item.phaseId;
    entry.level = item.level;
    entry.steps = catalogueUnitCount(item);
  }
  return entry;
}

/** A build's approach steps (`step-1`, …) and a case's milestones (`milestone-1`, …) are checkboxes that count toward its progress. */
export function stepId(index: number): string {
  return 'step-' + (index + 1);
}

export function catalogueUnitCount(item: CatalogueItem): number {
  return item.kind === 'case' ? item.milestones.length : item.kind === 'build' ? item.approach.length : 0;
}

export interface CatalogueRefs {
  /** Ids already taken by the curriculum: resources, projects, papers, certificates. */
  takenIds: Set<string>;
  projectIds: Set<string>;
  resourceIds: Set<string>;
  phaseIds: Set<string>;
  nodes: Set<string>;
}

const URL_RE = /https?:\/\/|www\.[a-z0-9-]+\.[a-z]/i;

/** Parses the three files' lines and checks them against each other and the curriculum. */
export function parseCatalogue(files: { file: string; text: string }[], refs: CatalogueRefs): { items: CatalogueItem[]; errors: string[] } {
  const errors: string[] = [];
  const items: CatalogueItem[] = [];
  const where = new Map<string, string>();
  for (const { file, text } of files) {
    text.split('\n').forEach((line, i) => {
      if (!line.trim()) return;
      const at = file + ':' + (i + 1);
      let json: unknown;
      try {
        json = JSON.parse(line);
      } catch {
        errors.push(at + ': not valid JSON');
        return;
      }
      const parsed = RawCatalogueItemSchema.safeParse(json);
      if (!parsed.success) {
        const issue = parsed.error.issues[0]!;
        errors.push(at + ': ' + (issue.path.join('.') || 'item') + ' ' + issue.message);
        return;
      }
      const raw = parsed.data;
      if (URL_RE.test(line)) errors.push(at + ': ' + raw.id + ' has a URL in its text (reference catalogue ids instead)');
      if (CADENCE_OF[raw.difficulty] !== raw.cadence) errors.push(at + ': ' + raw.id + ' is ' + raw.difficulty + ' but its cadence is ' + raw.cadence + ' (expected ' + CADENCE_OF[raw.difficulty] + ')');
      if (where.has(raw.id)) errors.push(at + ': ' + raw.id + ' is also at ' + where.get(raw.id));
      else if (refs.takenIds.has(raw.id)) errors.push(at + ': ' + raw.id + ' is already the id of something in the curriculum');
      where.set(raw.id, at);
      const item = normalise(raw);
      if (item.kind === 'challenge' && item.examples.length === 0) errors.push(at + ': ' + item.id + ' has no examples');
      if (item.kind !== 'challenge') {
        if (!refs.phaseIds.has(item.phaseId)) errors.push(at + ': ' + item.id + ' names phase "' + item.phaseId + '", which does not exist');
        if (item.tracks.length === 0) errors.push(at + ': ' + item.id + ' has no track the curriculum knows');
      }
      if (item.kind === 'case') {
        const sum = item.milestones.reduce((s, m) => s + m.hours, 0);
        if (Math.abs(sum - item.estHours) > 1e-9) errors.push(at + ': ' + item.id + ' milestones add up to ' + sum + ' h, not its ' + item.estHours + ' h');
      }
      for (const r of item.refs) if (!refs.resourceIds.has(r)) errors.push(at + ': ' + item.id + ' refs "' + r + '", which is not a resource');
      for (const c of item.covers) if (!refs.nodes.has(c)) errors.push(at + ': ' + item.id + ' covers "' + c + '", which is not a roadmap node');
      items.push(item);
    });
  }
  const ids = new Set(items.map((i) => i.id));
  for (const item of items) {
    for (const p of item.prereq) if (!ids.has(p) && !refs.projectIds.has(p)) errors.push(item.id + ': prereq "' + p + '" is neither a catalogue item nor a project');
  }
  return { items, errors };
}
