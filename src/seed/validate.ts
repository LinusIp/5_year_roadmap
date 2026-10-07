/**
 * Turns parsed YAML into a validated Seed, or a list of every problem found.
 * Pure: no file system, no network. The loader in scripts/lib feeds it; tests feed it fixtures.
 */
import { z } from 'zod';
import {
  BLOCK_IDS, CertSchema, PaperSchema, PaperSourceSchema, PhaseSchema, PlanPhaseInputSchema,
  ProjectSchema, ResourceSchema, SettingsDefaultsSchema, SubjectSchema, TRACK_IDS, TrackSchema, UnitsInput,
} from './schema.ts';
import type {
  Cert, Paper, PaperSource, Phase, PlanItem, PlanPhaseInput, Project, Resource, Seed,
  SettingsDefaults, Subject, Track,
} from './schema.ts';

export interface RawFile {
  /** Path relative to the repo root, used in messages: "data/resources/math.yaml". */
  file: string;
  data: unknown;
}

export const SEED_KINDS = [
  'tracks', 'settings', 'phases', 'resources', 'units', 'plan', 'projects', 'papers', 'paperSources', 'certs', 'subjects',
] as const;
export type SeedKind = (typeof SEED_KINDS)[number];
export type RawSeed = Record<SeedKind, RawFile[]>;

export interface ValidationResult {
  seed: Seed | null;
  errors: string[];
  warnings: string[];
}

/** Minimum size of the weekly mini-build pool, and of its stage 2 share (brief, section 6). */
export const MIN_WEEKLY_PROJECTS = 100;
export const MIN_WEEKLY_STAGE2 = 30;

function describeIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.length ? issue.path.map(String).join('.') + ': ' : '';
  return path + issue.message;
}

function idHint(item: unknown): string {
  if (item && typeof item === 'object' && 'id' in item && typeof (item as { id: unknown }).id === 'string') {
    return ' (id: ' + (item as { id: string }).id + ')';
  }
  return '';
}

/** Parses every element of every list file of one kind, collecting all issues instead of stopping at the first. */
function parseList<S extends z.ZodType>(files: RawFile[], schema: S, errors: string[]): { item: z.output<S>; file: string }[] {
  const out: { item: z.output<S>; file: string }[] = [];
  for (const { file, data } of files) {
    if (data === null || data === undefined) continue; // an empty YAML file is an empty list
    if (!Array.isArray(data)) {
      errors.push(file + ': expected a YAML list at the top level');
      continue;
    }
    data.forEach((raw, index) => {
      const res = schema.safeParse(raw);
      if (res.success) out.push({ item: res.data, file });
      else for (const issue of res.error.issues) errors.push(file + ' [' + index + ']' + idHint(raw) + ': ' + describeIssue(issue));
    });
  }
  return out;
}

function findDuplicates<T extends { item: { id: string }; file: string }>(kind: string, entries: T[], errors: string[]): void {
  const seen = new Map<string, string>();
  for (const e of entries) {
    const first = seen.get(e.item.id);
    if (first !== undefined) errors.push(e.file + ': duplicate ' + kind + ' id "' + e.item.id + '" (first defined in ' + first + ')');
    else seen.set(e.item.id, e.file);
  }
}

/** Returns the ids on a prerequisite cycle, or null. */
function findPrerequisiteCycle(resources: Resource[]): string[] | null {
  const byId = new Map(resources.map((r) => [r.id, r]));
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    const s = state.get(id);
    if (s === 'done') return null;
    if (s === 'visiting') return stack.slice(stack.indexOf(id)).concat(id);
    state.set(id, 'visiting');
    stack.push(id);
    for (const pre of byId.get(id)?.prerequisites ?? []) {
      if (!byId.has(pre)) continue;
      const cycle = visit(pre);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, 'done');
    return null;
  };
  for (const r of resources) {
    const cycle = visit(r.id);
    if (cycle) return cycle;
  }
  return null;
}

function flattenPlan(inputs: { item: PlanPhaseInput; file: string }[], errors: string[]): PlanItem[] {
  const plan: PlanItem[] = [];
  const seenPhases = new Set<string>();
  // An item split over the same lane of two phases (a book begun in one year and finished in the next) needs
  // the phase in its id; everywhere else the block is enough, which keeps the ids of split capstones unchanged.
  const lanesPerRef = new Map<string, number>();
  for (const { item } of inputs) {
    for (const block of BLOCK_IDS) {
      for (const entry of item.lanes[block]) {
        const ref = entry.resource ?? entry.project;
        if (ref && entry.hours !== undefined) lanesPerRef.set(ref + '/' + block, (lanesPerRef.get(ref + '/' + block) ?? 0) + 1);
      }
    }
  }
  for (const { item, file } of inputs) {
    if (seenPhases.has(item.phase)) errors.push(file + ': phase "' + item.phase + '" is listed twice');
    seenPhases.add(item.phase);
    for (const block of BLOCK_IDS) {
      item.lanes[block].forEach((entry, index) => {
        const ref = entry.resource ?? entry.project;
        if (!ref) return; // already reported by the schema
        const planItem: PlanItem = {
          // Stable across reordering and across moves between phases: derived from what is planned, not where.
          id: entry.id ?? 'plan.' + ref + (entry.hours === undefined ? '' : ((lanesPerRef.get(ref + '/' + block) ?? 0) > 1 ? '.' + item.phase : '') + '.' + block.toLowerCase()),
          phaseId: item.phase,
          block,
          order: (index + 1) * 10,
        };
        if (entry.resource) planItem.resourceId = entry.resource;
        if (entry.project) planItem.projectId = entry.project;
        if (entry.note) planItem.note = entry.note;
        if (entry.hours !== undefined) planItem.hours = entry.hours;
        plan.push(planItem);
      });
    }
  }
  return plan;
}

function checkPhases(phases: Phase[], errors: string[], requireComplete: boolean): void {
  if (phases.length === 0) {
    errors.push('data/phases.yaml: at least one phase is required');
    return;
  }
  for (let i = 1; i < phases.length; i++) {
    const prev = phases[i - 1]!;
    const cur = phases[i]!;
    if (cur.start <= prev.end) errors.push('data/phases.yaml: phase "' + cur.id + '" starts on or before the end of "' + prev.id + '"');
    if (cur.year < prev.year) errors.push('data/phases.yaml: phase "' + cur.id + '" is out of order (year goes backwards)');
  }
  if (!requireComplete) return;
  for (const year of [1, 2, 3, 4, 5]) {
    if (!phases.some((p) => p.year === year)) errors.push('data/phases.yaml: no phase covers year ' + year);
  }
}

export interface ValidateOptions {
  /**
   * Also enforce the brief's content quotas: all sixteen tracks, a phase for each of the five
   * years, a capstone per year, and a weekly pool of 100+ cards (30+ of them stage 2).
   * Defaults to true. Tests switch it off so that fixtures can stay small.
   */
  requireComplete?: boolean;
}

export function validateSeed(raw: RawSeed, options: ValidateOptions = {}): ValidationResult {
  const requireComplete = options.requireComplete ?? true;
  const errors: string[] = [];
  const warnings: string[] = [];

  const tracks = parseList(raw.tracks, TrackSchema, errors);
  const phases = parseList(raw.phases, PhaseSchema, errors);
  const resources = parseList(raw.resources, ResourceSchema, errors);
  const planInputs = parseList(raw.plan, PlanPhaseInputSchema, errors);
  const projects = parseList(raw.projects, ProjectSchema, errors);
  const papers = parseList(raw.papers, PaperSchema, errors);
  const paperSources = parseList(raw.paperSources, PaperSourceSchema, errors);
  const certs = parseList(raw.certs, CertSchema, errors);
  const subjects = parseList(raw.subjects, SubjectSchema, errors);

  let settings: SettingsDefaults | null = null;
  if (raw.settings.length !== 1) {
    errors.push('data/settings.yaml: exactly one settings file is required');
  } else {
    const res = SettingsDefaultsSchema.safeParse(raw.settings[0]!.data);
    if (res.success) settings = res.data;
    else for (const issue of res.error.issues) errors.push(raw.settings[0]!.file + ': ' + describeIssue(issue));
  }

  /* ---- duplicate ids, within each collection and across everything a log entry can point at */
  findDuplicates('track', tracks, errors);
  findDuplicates('phase', phases, errors);
  findDuplicates('resource', resources, errors);
  findDuplicates('project', projects, errors);
  findDuplicates('paper', papers, errors);
  findDuplicates('paper source', paperSources, errors);
  findDuplicates('cert', certs, errors);
  findDuplicates('subject', subjects, errors);

  // DayLog.entries[].refId and UserItemState.refId carry no "kind", so ids must be unique across kinds.
  const owner = new Map<string, string>();
  const claim = (kind: string, entries: { item: { id: string }; file: string }[]): void => {
    for (const e of entries) {
      const other = owner.get(e.item.id);
      if (other !== undefined && other !== kind) errors.push(e.file + ': id "' + e.item.id + '" is used by both a ' + other + ' and a ' + kind);
      owner.set(e.item.id, kind);
    }
  };
  claim('resource', resources);
  claim('project', projects);
  claim('paper', papers);
  claim('cert', certs);

  /* ---- tracks: exactly the sixteen ids of the data model */
  const trackIds = new Set(tracks.map((t) => t.item.id));
  if (requireComplete) {
    for (const id of TRACK_IDS) if (!trackIds.has(id)) errors.push('data/tracks.yaml: track "' + id + '" is missing');
  }

  const phaseList: Phase[] = phases.map((p) => p.item);
  checkPhases(phaseList, errors, requireComplete);
  const phaseById = new Map(phaseList.map((p) => [p.id, p]));
  const phaseIndex = new Map(phaseList.map((p, i) => [p.id, i]));

  const resourceList: Resource[] = resources.map((r) => r.item);
  const resourceById = new Map(resourceList.map((r) => [r.id, r]));
  const subjectIds = new Set(subjects.map((s) => s.item.id));
  const certIds = new Set(certs.map((c) => c.item.id));

  /* ---- resources */
  for (const { item, file } of resources) {
    for (const pre of item.prerequisites) {
      if (!resourceById.has(pre)) errors.push(file + ' (id: ' + item.id + '): prerequisite "' + pre + '" is not a resource');
    }
    if (item.subject && !subjectIds.has(item.subject)) errors.push(file + ' (id: ' + item.id + '): subject "' + item.subject + '" has no row in data/subjects.yaml');
    if (item.reference && item.estHours > 0) warnings.push(file + ' (id: ' + item.id + '): reference works normally carry estHours: 0');
  }
  /* ---- units files: data/units/<resource-id>.yaml */
  for (const { file, data } of raw.units) {
    const id = file.split('/').pop()!.replace(/\.yaml$/, '');
    const target = resourceById.get(id);
    if (!target) {
      errors.push(file + ': no resource has the id "' + id + '"');
      continue;
    }
    if (target.units) {
      errors.push(file + ': resource "' + id + '" already lists its units inline');
      continue;
    }
    const res = UnitsInput.safeParse(data);
    if (!res.success) {
      for (const issue of res.error.issues) errors.push(file + ': ' + describeIssue(issue));
      continue;
    }
    const seenUnits = new Set<string>();
    for (const u of res.data) {
      if (seenUnits.has(u.id)) errors.push(file + ': duplicate unit id "' + u.id + '"');
      seenUnits.add(u.id);
    }
    target.units = res.data;
  }

  const cycle = findPrerequisiteCycle(resourceList);
  if (cycle) errors.push('data/resources: prerequisite cycle ' + cycle.join(' -> '));

  /* ---- projects */
  const projectList: Project[] = [];
  for (const { item, file } of projects) {
    let stage = item.stage;
    if (item.phaseId) {
      const phase = phaseById.get(item.phaseId);
      if (!phase) errors.push(file + ' (id: ' + item.id + '): phaseId "' + item.phaseId + '" is not a phase');
      else if (stage === undefined) stage = phase.stage;
      else if (stage !== phase.stage) errors.push(file + ' (id: ' + item.id + '): stage ' + stage + ' contradicts phase "' + phase.id + '" (stage ' + phase.stage + ')');
    }
    if (stage === undefined) {
      errors.push(file + ' (id: ' + item.id + '): needs a `stage` (1 or 2) or a `phaseId` to derive it from');
      stage = 1;
    }
    if (item.subject && !subjectIds.has(item.subject)) errors.push(file + ' (id: ' + item.id + '): subject "' + item.subject + '" has no row in data/subjects.yaml');
    if (stage === 2 && item.cadence !== 'weekly' && !item.parts) warnings.push(file + ' (id: ' + item.id + '): stage 2 project with no `parts` field. List what to have on the bench, or `parts: []` if it needs none.');
    projectList.push({ ...item, stage });
  }
  const projectById = new Map(projectList.map((p) => [p.id, p]));

  const numbers = new Map<number, string>();
  for (const p of projectList) {
    if (p.number === undefined) continue;
    const other = numbers.get(p.number);
    if (other) errors.push('data/projects: projects "' + other + '" and "' + p.id + '" share number ' + p.number);
    numbers.set(p.number, p.id);
  }

  if (requireComplete) {
    const weekly = projectList.filter((p) => p.cadence === 'weekly');
    const weeklyStage2 = weekly.filter((p) => p.stage === 2);
    if (weekly.length < MIN_WEEKLY_PROJECTS) errors.push('data/projects: the weekly pool has ' + weekly.length + ' cards; the brief requires at least ' + MIN_WEEKLY_PROJECTS);
    if (weeklyStage2.length < MIN_WEEKLY_STAGE2) errors.push('data/projects: the weekly pool has ' + weeklyStage2.length + ' stage 2 cards; the brief requires at least ' + MIN_WEEKLY_STAGE2);
    for (const year of [1, 2, 3, 4, 5]) {
      const hasCapstone = projectList.some((p) => p.cadence === 'capstone' && p.phaseId !== undefined && phaseById.get(p.phaseId)?.year === year);
      if (!hasCapstone) errors.push('data/projects: year ' + year + ' has no capstone (every year needs one)');
    }
  }

  /* ---- plan */
  const plan = flattenPlan(planInputs, errors);
  const planFile = 'data/plan.yaml';
  const plannedRefs = new Map<string, PlanItem>();
  const planIds = new Set<string>();
  for (const item of plan) {
    const ref = (item.resourceId ?? item.projectId)!;
    if (!phaseById.has(item.phaseId)) errors.push(planFile + ': phase "' + item.phaseId + '" is not defined in data/phases.yaml');
    if (planIds.has(item.id)) errors.push(planFile + ': duplicate plan item id "' + item.id + '"');
    planIds.add(item.id);
    const earlier = plannedRefs.get(ref);
    if (earlier) {
      // An item may be split: a capstone draws on two blocks of one phase, a book may begin in one year and finish
      // in the next. Every appearance then states its share of the hours, so nothing is counted twice.
      const split = item.hours !== undefined && earlier.hours !== undefined && !(earlier.block === item.block && earlier.phaseId === item.phaseId);
      if (!split) errors.push(planFile + ': "' + ref + '" is planned twice (' + earlier.phaseId + ' and ' + item.phaseId + '); an item may appear more than once only with `hours` on every appearance, never twice in one lane');
    } else {
      plannedRefs.set(ref, item);
    }

    const target = item.resourceId ? resourceById.get(item.resourceId) : projectById.get(item.projectId!);
    if (!target) {
      errors.push(planFile + ' (' + item.phaseId + ', block ' + item.block + '): "' + ref + '" is not a ' + (item.resourceId ? 'resource' : 'project'));
      continue;
    }
    // Brief 4.7: no subject may appear in the roadmap without a row in the credential map.
    if (!target.subject) errors.push(planFile + ' (' + item.phaseId + ', block ' + item.block + '): "' + ref + '" is on the roadmap but has no `subject`, so it has no credential-map row');
    if ('cadence' in target && target.cadence === 'weekly') errors.push(planFile + ': "' + ref + '" is a weekly mini-build; those are drawn from the pool, not planned');
  }

  // A planned resource must not sit before a planned prerequisite.
  for (const item of plan) {
    if (!item.resourceId) continue;
    const res = resourceById.get(item.resourceId);
    if (!res) continue;
    for (const pre of res.prerequisites) {
      const preItem = plannedRefs.get(pre);
      if (!preItem) continue;
      const a = phaseIndex.get(preItem.phaseId) ?? 0;
      const b = phaseIndex.get(item.phaseId) ?? 0;
      const sameLaneLater = a === b && preItem.block === item.block && preItem.order > item.order;
      if (a > b || sameLaneLater) errors.push(planFile + ': "' + res.id + '" (' + item.phaseId + ') is scheduled before its prerequisite "' + pre + '" (' + preItem.phaseId + ')');
    }
  }

  for (const p of projectList) {
    const mustBePlanned = p.cadence === 'capstone' || p.number !== undefined;
    if (mustBePlanned && !plannedRefs.has(p.id)) errors.push('data/projects: ' + p.cadence + ' project "' + p.id + '" is not on the plan');
  }

  /* ---- certs and the credential map */
  for (const { item, file } of certs) {
    if (!subjectIds.has(item.subject)) errors.push(file + ' (id: ' + item.id + '): subject "' + item.subject + '" has no row in data/subjects.yaml');
    for (const prep of item.prepResources) if (!resourceById.has(prep)) errors.push(file + ' (id: ' + item.id + '): prepResource "' + prep + '" is not a resource');
    // The brief forbids it: the certificate was discontinued.
    if (/tensorflow\s+developer/i.test(item.title)) errors.push(file + ' (id: ' + item.id + '): the TensorFlow Developer Certificate is discontinued and must not be included');
    const year = Number(item.targetQuarter.slice(0, 4));
    const inYear = phaseList.filter((p) => p.year === item.targetYear);
    const first = inYear[0];
    const last = inYear[inYear.length - 1];
    if (first && last && (year < Number(first.start.slice(0, 4)) || year > Number(last.end.slice(0, 4)))) {
      errors.push(file + ' (id: ' + item.id + '): targetQuarter ' + item.targetQuarter + ' is outside plan year ' + item.targetYear);
    }
  }

  const certSubject = new Map(certs.map((c) => [c.item.id, c.item.subject]));
  for (const { item, file } of subjects) {
    for (const c of item.certs) {
      if (!certIds.has(c)) errors.push(file + ' (id: ' + item.id + '): cert "' + c + '" is not defined in data/certs.yaml');
      else if (certSubject.get(c) !== item.id) errors.push(file + ' (id: ' + item.id + '): cert "' + c + '" belongs to subject "' + certSubject.get(c) + '"');
    }
    if (item.certs.length === 0 && !item.certNote) errors.push(file + ' (id: ' + item.id + '): needs either `certs` or a `certNote` saying why there is none');
    if (item.kind === 'subject' && item.milestones.length === 0) errors.push(file + ' (id: ' + item.id + '): every subject needs a portfolio milestone');
    for (const m of item.milestones) {
      for (const p of m.projects) if (!projectById.has(p)) errors.push(file + ' (id: ' + item.id + '): milestone "' + m.id + '" points at unknown project "' + p + '"');
    }
  }
  const milestoneIds = new Set<string>();
  for (const { item, file } of subjects) {
    for (const m of item.milestones) {
      if (milestoneIds.has(m.id)) errors.push(file + ': duplicate milestone id "' + m.id + '"');
      milestoneIds.add(m.id);
    }
  }
  for (const { item, file } of certs) {
    const row = subjects.find((s) => s.item.id === item.subject);
    if (row && !row.item.certs.includes(item.id)) errors.push(file + ' (id: ' + item.id + '): not listed under subject "' + item.subject + '" in data/subjects.yaml');
  }

  if (errors.length > 0 || !settings) return { seed: null, errors, warnings };

  const seed: Seed = {
    tracks: tracks.map((t): Track => t.item),
    settings,
    phases: phaseList,
    resources: resourceList,
    plan,
    projects: projectList,
    papers: papers.map((p): Paper => p.item),
    paperSources: paperSources.map((p): PaperSource => p.item),
    certs: certs.map((c): Cert => c.item),
    subjects: subjects.map((s): Subject => s.item),
  };
  return { seed, errors, warnings };
}
