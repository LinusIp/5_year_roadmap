/**
 * The Internships screen's arithmetic (INTERNSHIPS), pure: the next application and its days, the current phase and
 * its week, the gate's progress, the library items a phase names, and the one line Today shows. The goal comes from
 * data/internships*.json; the progress from the local store (src/db/internships.ts).
 */
import { addDays, daysBetween } from './dates.ts';
import type { InternPhase, InternProject, InternshipGoal, ProjectStatus, Target, TargetStatus } from '../seed/internships.ts';
import { PROJECT_STATUSES } from '../seed/internships.ts';
import type { AppSeed } from '../seed/schema.ts';
import type { ItemStatus } from '../db/types.ts';

/** A confidence from 0 (not yet) to 3 (ready). */
export type Rating = 0 | 1 | 2 | 3;
export const READY: Rating = 3;

/** What the user has done, keyed by the file's ids; never written back into the file. */
export interface InternProgress {
  /** Gate items ticked, by item id. */
  gates: Record<string, boolean>;
  /** A project's status and progress once the user has changed them; the file's values until then. */
  projects: Record<string, { status?: ProjectStatus; progress?: number }>;
  /** Interview self-ratings, by area id. */
  ratings: Record<string, Rating>;
  /** Resume checklist ticks, by the line's position ("0", "1", …): the lines have no ids. */
  resume: Record<string, boolean>;
  /** A target's status once the user has changed it. */
  targets: Record<string, TargetStatus>;
}

export const EMPTY_PROGRESS: InternProgress = { gates: {}, projects: {}, ratings: {}, resume: {}, targets: {} };

/* ------------------------------------------------------------------ targets */

export function targetStatus(target: Target, progress: InternProgress): TargetStatus {
  return progress.targets[target.id] ?? target.status;
}

/** The targets in the order to apply. */
export function orderedTargets(goal: InternshipGoal): Target[] {
  return [...goal.targets].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

/** Applied or declined: nothing left to do for it. */
export function targetClosed(target: Target, progress: InternProgress): boolean {
  const status = targetStatus(target, progress);
  return status === 'applied' || status === 'declined';
}

/**
 * The next application: the open target whose apply date is today or later and soonest (then first in order).
 * A past date is skipped, as is a target without one. Null when every dated target is applied or past.
 */
export function nextApplication(goal: InternshipGoal, progress: InternProgress, today: string): { target: Target; days: number } | null {
  const open = orderedTargets(goal).filter((t) => t.apply.date !== null && t.apply.date >= today && !targetClosed(t, progress));
  open.sort((a, b) => a.apply.date!.localeCompare(b.apply.date!) || a.order - b.order);
  const target = open[0];
  return target ? { target, days: daysBetween(today, target.apply.date!) } : null;
}

/** "40 days to apply", "Apply today", "1 day to apply". */
export function daysToApply(days: number): string {
  return days === 0 ? 'Apply today' : days + (days === 1 ? ' day' : ' days') + ' to apply';
}

export function fitLabel(fit: Target['fit']): string {
  return fit === 'strong' ? 'Strong fit' : fit === 'medium' ? 'Medium fit' : 'Stretch';
}

export function targetStatusLabel(status: TargetStatus): string {
  switch (status) {
    case 'preparing':
      return 'Preparing';
    case 'later':
      return 'Later';
    case 'apply-light-now':
      return 'Apply light now';
    case 'applied':
      return 'Applied';
    case 'declined':
      return 'Not applying';
  }
}

/* ------------------------------------------------------------------ phases */

export function orderedPhases(goal: InternshipGoal): InternPhase[] {
  return [...goal.phases].sort((a, b) => a.n - b.n);
}

export function gateProgress(phase: InternPhase, progress: InternProgress): { done: number; total: number } {
  return { done: phase.gate.filter((g) => progress.gates[g.id] === true).length, total: phase.gate.length };
}

export function gateDone(phase: InternPhase, progress: InternProgress): boolean {
  const { done, total } = gateProgress(phase, progress);
  return done === total;
}

/** A phase's dates hold the day: from its start to its end, an open end running on. */
export function phaseHolds(phase: InternPhase, today: string): boolean {
  if (phase.start && today < phase.start) return false;
  if (phase.end && today > phase.end) return false;
  return phase.start !== null || phase.end !== null;
}

/**
 * The current phase: the one whose dates hold today, else the first whose gate is not done, else the last. A later
 * phase whose dates hold today still waits on an earlier gate that is open: the dates win, as the rule says, so a
 * slipped gate shows beside the phase the calendar says.
 */
export function currentPhase(goal: InternshipGoal, progress: InternProgress, today: string): InternPhase {
  const phases = orderedPhases(goal);
  return phases.find((p) => phaseHolds(p, today)) ?? phases.find((p) => !gateDone(p, progress)) ?? phases[phases.length - 1]!;
}

/** The phase after this one, if any. */
export function phaseAfter(goal: InternshipGoal, phase: InternPhase): InternPhase | null {
  const phases = orderedPhases(goal);
  return phases[phases.findIndex((p) => p.id === phase.id) + 1] ?? null;
}

/**
 * "Week 3 of 9": the week of the phase today falls in, from its start, and how many weeks it has (none when its end
 * is open). Before the start the week is 0; after the end it is the last week.
 */
export function weekOf(phase: InternPhase, today: string): { week: number; of: number | null } {
  const of = phase.start && phase.end ? Math.max(1, Math.ceil((daysBetween(phase.start, phase.end) + 1) / 7)) : null;
  if (!phase.start) return { week: 0, of };
  if (today < phase.start) return { week: 0, of };
  const week = Math.floor(daysBetween(phase.start, today) / 7) + 1;
  return { week: of === null ? week : Math.min(week, of), of };
}

export function weekLabel(phase: InternPhase, today: string): string {
  const { week, of } = weekOf(phase, today);
  if (week === 0) return phase.start ? 'starts ' + shortDate(phase.start) : 'no dates';
  return 'week ' + week + (of === null ? '' : ' of ' + of);
}

/** "Nov–Dec 2026", "Jan–Feb 2027", "from Jul 2027". */
export function phaseSpan(phase: InternPhase): string {
  const month = (d: string): string => MONTHS[Number(d.slice(5, 7)) - 1]!;
  const year = (d: string): string => d.slice(0, 4);
  if (phase.start && phase.end) {
    return year(phase.start) === year(phase.end) ? month(phase.start) + '–' + month(phase.end) + ' ' + year(phase.end) : month(phase.start) + ' ' + year(phase.start) + ' – ' + month(phase.end) + ' ' + year(phase.end);
  }
  if (phase.start) return 'from ' + month(phase.start) + ' ' + year(phase.start);
  if (phase.end) return 'until ' + month(phase.end) + ' ' + year(phase.end);
  return 'no dates';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "1 Dec 2026". */
export function shortDate(iso: string): string {
  return Number(iso.slice(8, 10)) + ' ' + MONTHS[Number(iso.slice(5, 7)) - 1] + ' ' + iso.slice(0, 4);
}

/** The first unfinished gate item of a phase. */
export function nextGateItem(phase: InternPhase, progress: InternProgress): InternPhase['gate'][number] | null {
  return phase.gate.find((g) => progress.gates[g.id] !== true) ?? null;
}

/** "Phase 2", "Phases 2–3": a project's phase field names one phase id or a range "p2-p3". */
export function phaseLabel(goal: InternshipGoal, ref: string): string {
  const byId = new Map(goal.phases.map((p) => [p.id, p.n]));
  const parts = ref.split('-').map((id) => byId.get(id));
  if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) return 'Phases ' + parts[0] + '–' + parts[1];
  if (parts.length === 1 && parts[0] !== undefined) return 'Phase ' + parts[0];
  return ref;
}

/* ------------------------------------------------------------------ projects */

export function projectStatus(project: InternProject, progress: InternProgress): ProjectStatus {
  return progress.projects[project.id]?.status ?? project.status;
}

export function projectProgress(project: InternProject, progress: InternProgress): number {
  const own = progress.projects[project.id]?.progress;
  const value = own ?? project.progress;
  return projectStatus(project, progress) === 'done' ? 1 : Math.max(0, Math.min(1, value));
}

/** later → next → building → done → later. */
export function cycleStatus(status: ProjectStatus): ProjectStatus {
  return PROJECT_STATUSES[(PROJECT_STATUSES.indexOf(status) + 1) % PROJECT_STATUSES.length]!;
}

export function projectStatusLabel(status: ProjectStatus): string {
  return status === 'later' ? 'Later' : status === 'next' ? 'Next' : status === 'building' ? 'Building' : 'Done';
}

export function orderedProjects(goal: InternshipGoal): InternProject[] {
  const n = new Map(goal.phases.map((p) => [p.id, p.n]));
  const first = (p: InternProject): number => n.get(p.phase.split('-')[0]!) ?? 99;
  return [...goal.projects].sort((a, b) => first(a) - first(b) || a.code.localeCompare(b.code, undefined, { numeric: true }));
}

/* ------------------------------------------------------------------ the library */

export interface LinkedItem {
  id: string;
  title: string;
  /** "Course", "Paper", … for the row's meta. */
  kind: string;
  status: ItemStatus | 'queued' | 'reading' | 'read' | 'implemented';
  /** Where a tap opens it: the Library's sheet, or the reading queue's. */
  to: string;
}

/**
 * The library items a phase names, in the file's order, with each one's status. A resource opens in the Library's
 * sheet, a paper of the reading queue in its own. An id the library no longer has is left out (validate:data refuses
 * the file, so this only happens when the data moves under a built app).
 */
export function resolveResources(ids: readonly string[], seed: Pick<AppSeed, 'resources' | 'papers'>, states: ReadonlyMap<string, { status: ItemStatus }>, paperStates?: ReadonlyMap<string, { status: 'queued' | 'reading' | 'read' | 'implemented' }>): LinkedItem[] {
  const out: LinkedItem[] = [];
  for (const id of ids) {
    const resource = seed.resources.find((r) => r.id === id);
    if (resource) {
      out.push({ id, title: resource.title, kind: kindLabel(resource.type), status: states.get(id)?.status ?? 'todo', to: '/library/' + id });
      continue;
    }
    const paper = seed.papers.find((p) => p.id === id);
    if (paper) out.push({ id, title: paper.title, kind: 'Paper', status: paperStates?.get(id)?.status ?? 'queued', to: '/library?paper=' + id });
  }
  return out;
}

function kindLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function linkedStatusLabel(status: LinkedItem['status']): string {
  switch (status) {
    case 'todo':
    case 'queued':
      return 'Not started';
    case 'active':
    case 'reading':
      return 'In progress';
    case 'done':
    case 'read':
    case 'implemented':
      return 'Done';
    case 'dropped':
      return 'Dropped';
  }
}

/* ------------------------------------------------------------------ prep */

export function readyCount(goal: InternshipGoal, progress: InternProgress): { ready: number; total: number } {
  return { ready: goal.interview_areas.filter((a) => (progress.ratings[a.id] ?? 0) >= READY).length, total: goal.interview_areas.length };
}

export function ratingLabel(rating: Rating): string {
  return ['Not yet', 'Started', 'Getting there', 'Ready'][rating]!;
}

/* ------------------------------------------------------------------ Today */

export interface TodayCard {
  target: Target;
  days: number;
  phase: InternPhase;
  gate: { done: number; total: number };
  week: string;
  /** "Today in Intern Prep": the first unfinished gate item, else the project being built. */
  line: string | null;
  /** The schedule block's name, for the line's label. */
  block: string;
}

/**
 * Today's card, while a target has an upcoming apply date. The one line is the current phase's first unfinished gate
 * item, else the first project being built; none when both are done.
 */
export function todayCard(goal: InternshipGoal, progress: InternProgress, today: string): TodayCard | null {
  const next = nextApplication(goal, progress, today);
  if (!next) return null;
  const phase = currentPhase(goal, progress, today);
  const gateItem = nextGateItem(phase, progress);
  const building = orderedProjects(goal).find((p) => projectStatus(p, progress) === 'building');
  const line = gateItem ? gateItem.text : building ? 'Build ' + building.title : null;
  return { target: next.target, days: next.days, phase, gate: gateProgress(phase, progress), week: weekLabel(phase, today), line, block: goal.schedule?.block ?? 'Intern prep' };
}

/** A short role name for a card: "AI Agent Engineer Intern, AI Enablement Process" → "AI Agent Engineer Intern". */
export function roleName(target: Target): string {
  return target.title.split(/,|·|\(/)[0]!.trim();
}

/** The day the first apply date lands, for a sentence like "early December". */
export function applyWhen(target: Target): string {
  return target.apply.label;
}

export { addDays };

/** "NVIDIA 2027": the company and the year of the last apply date, for Plan's row and Today's card. */
export function goalName(goal: InternshipGoal): string {
  const years = goal.targets.map((t) => t.apply.date?.slice(0, 4)).filter((y): y is string => Boolean(y));
  return years.length > 0 ? goal.goal.company + ' ' + years.sort()[years.length - 1] : goal.goal.title;
}
