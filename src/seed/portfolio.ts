/**
 * The portfolio (ATLAS-PORTFOLIO): data/portfolio/projects.json, the nine flagship projects for the 2027–28 internship
 * applications, with a tech doc (data/portfolio/docs/<id>.md) and a design (data/portfolio/design/<id>.yaml) each.
 * They live in their own section and never mix with the plan's projects, the Internships screen's or the Library's
 * project shelves: their own chunk (virtual:atlas-portfolio), their own progress table (`portfolio`, src/db/portfolio.ts).
 * The user's progress is never written back into the file.
 */
import { z } from 'zod';
import type { Design } from './design.ts';

const Id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'an id is lower-case letters, digits and hyphens');
const Text = z.string().min(1);
const Month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'a month is YYYY-MM');
const Https = z.string().regex(/^https:\/\/\S+$/, 'a URL is https');

/** A project's status, in the order a tap cycles them. */
export const PORTFOLIO_STATUSES = ['later', 'next', 'building', 'done'] as const;
export type PortfolioStatus = (typeof PORTFOLIO_STATUSES)[number];

/** The file's tracks: the Library's file vocabulary (inference is its own track there; Atlas logs it as AI). */
export const PORTFOLIO_TRACKS = ['inference', 'ai', 'architecture', 'systems', 'devops', 'languages', 'graphics', 'simulation', 'robotics', 'math', 'engineering', 'hardware', 'quantum', 'gamedev'] as const;

export const PortfolioMilestoneSchema = z.strictObject({
  id: Id,
  title: Text,
  detail: Text,
  hours: z.number().positive(),
  stretch: z.boolean(),
  examples: z.array(Text).optional(),
});
export type PortfolioMilestone = z.infer<typeof PortfolioMilestoneSchema>;

export const PortfolioProjectSchema = z.strictObject({
  id: Id,
  number: z.number().int().min(1),
  code: Text,
  title: Text,
  /** The Overview tab's short title for its table. */
  table_title: Text.optional(),
  summary: Text,
  proves: Text,
  why: Text,
  stack: z.array(Text).min(1),
  weeks: z.number().positive(),
  estHours: z.number().positive(),
  core: z.boolean(),
  track: z.enum(PORTFOLIO_TRACKS),
  areas: z.array(Text).default([]),
  schedule: z.array(z.strictObject({ from: Month, to: Month, what: Text })).min(1),
  milestones: z.array(PortfolioMilestoneSchema),
  done_when: z.array(z.strictObject({ id: Id, text: Text })).min(1),
  hardware_note: Text.nullable(),
  read_first: z.array(z.strictObject({ title: Text, url: Https, library_id: Id.nullable() })),
  tech_doc: z.strictObject({ url: Https, tab: Text }),
  /** Atlas projects that cover similar work: "Also in Atlas" links only, never merged or sharing progress. */
  related: z.array(z.strictObject({ where: z.enum(['internships', 'plan']), id: Id, title: Text })).default([]),
  /** Req ids of `roles`. */
  roles: z.array(Text).default([]),
});
export type PortfolioProject = z.infer<typeof PortfolioProjectSchema>;

export const PortfolioFileSchema = z.strictObject({
  version: z.literal(1),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source_doc: z.strictObject({ title: Text, url: Https, note: Text.optional() }),
  intro: Text,
  focus_note: Text,
  /** The six things every project ships: the ship checklist. */
  rules: z.array(z.strictObject({ id: Id, title: Text, detail: Text })).min(1),
  habits: Text,
  overrun_rule: Text,
  time_note: Text,
  events: z.array(z.strictObject({ id: Id, date: Month, title: Text })).default([]),
  roles: z.array(z.strictObject({ req: Text, title: Text, url: Https.nullable(), projects: z.array(z.number().int().min(1)), note: Text.optional() })).default([]),
  projects: z.array(PortfolioProjectSchema).min(1),
});
export type PortfolioFile = z.infer<typeof PortfolioFileSchema>;

/** What the app's chunk holds: the file, with library ids resolved, and each project's doc (Markdown) and design. */
export interface PortfolioSeed extends PortfolioFile {
  docs: Record<string, string>;
  designs: Record<string, Design>;
}

/**
 * The file's own checks, on top of its shape: unique ids across projects, milestones, done-when items and rules;
 * 3 to 6 milestones adding up to `estHours`; months in order; project numbers unique; roles naming projects that
 * exist. Library ids, docs and designs are checked by the loader, which knows the library.
 */
export function readPortfolio(data: unknown, file: string): { portfolio: PortfolioFile | null; errors: string[] } {
  const parsed = PortfolioFileSchema.safeParse(data);
  if (!parsed.success) return { portfolio: null, errors: parsed.error.issues.map((i) => file + ': ' + (i.path.join('.') || '(root)') + ': ' + i.message) };
  const p = parsed.data;
  const errors: string[] = [];
  const seen = new Map<string, string>();
  const claim = (id: string, what: string): void => {
    const before = seen.get(id);
    if (before) errors.push(file + ': the id "' + id + '" (' + what + ') is already used by ' + before);
    else seen.set(id, what);
  };
  for (const rule of p.rules) claim(rule.id, 'a rule');
  for (const event of p.events) claim(event.id, 'an event');
  const numbers = new Set<number>();
  for (const project of p.projects) {
    claim(project.id, 'a project');
    if (numbers.has(project.number)) errors.push(file + ': project number ' + project.number + ' is used twice');
    numbers.add(project.number);
    const where = file + ' (' + project.id + ')';
    for (const m of project.milestones) claim(m.id, 'a milestone of ' + project.id);
    for (const d of project.done_when) claim(d.id, 'a done-when item of ' + project.id);
    if (project.milestones.length < 3 || project.milestones.length > 6) errors.push(where + ': 3 to 6 milestones, found ' + project.milestones.length);
    const sum = project.milestones.reduce((s, m) => s + m.hours, 0);
    if (Math.abs(sum - project.estHours) > 1e-9) errors.push(where + ': milestones add up to ' + sum + ' h, estHours is ' + project.estHours);
    for (const w of project.schedule) if (w.from > w.to) errors.push(where + ': a schedule window runs from ' + w.from + ' to ' + w.to);
    for (const req of project.roles) if (!p.roles.some((r) => r.req === req)) errors.push(where + ': role "' + req + '" is not in roles');
  }
  for (const role of p.roles) for (const n of role.projects) if (!numbers.has(n)) errors.push(file + ': role ' + role.req + ' names project ' + n + ', which does not exist');
  return { portfolio: p, errors };
}
