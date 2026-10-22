/**
 * An internship goal (INTERNSHIPS): data/internships*.json, one file per goal. The company's roles in the order to
 * apply, the phases with the gate before each next one, the projects that prove the fit, the open-source plans, what
 * the interviews cover, the resume checklist and the questions for the recruiter. The user's progress (gates ticked,
 * project status, interview self-ratings, resume ticks, a target's status) lives in the local progress store
 * (src/db/internships.ts) and is never written back into the file.
 */
import { z } from 'zod';

const Id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'an id is lower-case letters, digits and hyphens');
const Text = z.string().min(1);
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'a date is YYYY-MM-DD');

export const FITS = ['strong', 'medium', 'stretch'] as const;
export type Fit = (typeof FITS)[number];
/** A project's status in the file and in the progress store, in the order a tap cycles them. */
export const PROJECT_STATUSES = ['later', 'next', 'building', 'done'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
/** A target's status: the file's own words, kept as free text for the label, plus the two the user can set. */
export const TARGET_STATUSES = ['preparing', 'later', 'apply-light-now', 'applied', 'declined'] as const;
export type TargetStatus = (typeof TARGET_STATUSES)[number];

export const TargetSchema = z.strictObject({
  id: Id,
  order: z.number().int().min(1),
  title: Text,
  req: Text,
  location: Text,
  degree: Text,
  fit: z.enum(FITS),
  fit_note: Text,
  apply: z.strictObject({ label: Text, date: IsoDate.nullable() }),
  wave: z.number().int().min(1),
  status: z.enum(TARGET_STATUSES),
  /** Projects (by id) and other evidence that show the fit. */
  evidence: z.array(Text).default([]),
});
export type Target = z.infer<typeof TargetSchema>;

export const GateItemSchema = z.strictObject({ id: Id, text: Text });
export type GateItem = z.infer<typeof GateItemSchema>;

export const PhaseSchema = z.strictObject({
  id: Id,
  n: z.number().int().min(1),
  name: Text,
  start: IsoDate.nullable(),
  end: IsoDate.nullable(),
  weeks: z.array(z.strictObject({ range: Text, focus: Text })).default([]),
  gate: z.array(GateItemSchema).default([]),
  /** Library resource (or reading-queue paper) ids. */
  resources: z.array(Id).default([]),
});
export type InternPhase = z.infer<typeof PhaseSchema>;

export const ProjectSchema = z.strictObject({
  id: Id,
  code: Text,
  title: Text,
  roles: z.array(Id).default([]),
  phase: Text,
  duration: Text.optional(),
  proves: Text,
  done_when: Text,
  status: z.enum(PROJECT_STATUSES),
  progress: z.number().min(0).max(1).default(0),
  note: Text.optional(),
});
export type InternProject = z.infer<typeof ProjectSchema>;

export const OpenSourceSchema = z.strictObject({
  id: Id,
  name: Text,
  plan: Text,
  target: Text.optional(),
  resource: Id.optional(),
});
export type OpenSource = z.infer<typeof OpenSourceSchema>;

export const InterviewAreaSchema = z.strictObject({ id: Id, name: Text, be_able_to: Text });
export type InterviewArea = z.infer<typeof InterviewAreaSchema>;

export const InternshipGoalSchema = z.strictObject({
  version: z.literal(1),
  updated: IsoDate,
  source_doc: z.url().optional(),
  goal: z.strictObject({
    id: Id,
    title: Text,
    company: Text,
    primary_track: Text.optional(),
    skip_for_now: Text.optional(),
  }),
  targets: z.array(TargetSchema).min(1),
  phases: z.array(PhaseSchema).min(1),
  projects: z.array(ProjectSchema).default([]),
  open_source: z.array(OpenSourceSchema).default([]),
  interview_areas: z.array(InterviewAreaSchema).default([]),
  resume_checklist: z.array(Text).default([]),
  recruiter_questions: z.array(Text).default([]),
  schedule: z
    .strictObject({
      block: Text,
      hours_per_day: z.number().positive(),
      slots: z.number().int().positive().optional(),
      slot_minutes: z.number().int().positive().optional(),
      guardrails: z.array(Text).default([]),
    })
    .optional(),
});
export type InternshipGoal = z.infer<typeof InternshipGoalSchema>;

function describeIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.length ? issue.path.map(String).join('.') + ': ' : '';
  return path + issue.message;
}

/**
 * Checks one file against the schema and the library: ids unique across targets, phases, gate items, projects and
 * open-source items; every resource named by a phase or an open-source item in the library; a project's roles
 * naming targets; dates in order. The errors carry the file name, as the curriculum's do.
 */
export function readInternshipGoal(data: unknown, file: string, libraryIds: ReadonlySet<string>): { goal: InternshipGoal | null; errors: string[] } {
  const parsed = InternshipGoalSchema.safeParse(data);
  if (!parsed.success) return { goal: null, errors: parsed.error.issues.map((i) => file + ': ' + describeIssue(i)) };
  const goal = parsed.data;
  const errors: string[] = [];
  const seen = new Map<string, string>();
  const unique = (id: string, what: string): void => {
    const before = seen.get(id);
    if (before) errors.push(file + ': the id "' + id + '" is used twice (' + before + ' and ' + what + ')');
    else seen.set(id, what);
  };
  for (const t of goal.targets) unique(t.id, 'a target');
  for (const p of goal.phases) {
    unique(p.id, 'a phase');
    for (const g of p.gate) unique(g.id, 'a gate item of ' + p.id);
  }
  for (const p of goal.projects) unique(p.id, 'a project');
  for (const o of goal.open_source) unique(o.id, 'an open-source item');
  for (const a of goal.interview_areas) unique(a.id, 'an interview area');
  const targetIds = new Set(goal.targets.map((t) => t.id));
  for (const p of goal.phases) {
    for (const id of p.resources) if (!libraryIds.has(id)) errors.push(file + ': phase ' + p.id + ' names "' + id + '", which is not in the library');
    if (p.start && p.end && p.end < p.start) errors.push(file + ': phase ' + p.id + ' ends before it starts');
  }
  for (const o of goal.open_source) if (o.resource && !libraryIds.has(o.resource)) errors.push(file + ': open-source item ' + o.id + ' names "' + o.resource + '", which is not in the library');
  for (const p of goal.projects) for (const role of p.roles) if (!targetIds.has(role)) errors.push(file + ': project ' + p.id + ' names the target "' + role + '", which the file does not have');
  const numbers = goal.phases.map((p) => p.n);
  if (new Set(numbers).size !== numbers.length) errors.push(file + ': two phases have the same number');
  return { goal: errors.length > 0 ? null : goal, errors };
}
