/**
 * Plan editing, pure: each function returns the patches an edit is made of, for addPlanEdit to store as one
 * undoable group. Nothing here touches the database.
 */
import type { NewPlanPatch } from '../db/types.ts';
import type { AppSeed, BlockId, Phase, PlanItem } from '../seed/schema.ts';
import { addDays, daysBetween } from './dates.ts';

function laneOf(plan: PlanItem[], phaseId: string, block: BlockId): PlanItem[] {
  return plan.filter((i) => i.phaseId === phaseId && i.block === block).sort((a, b) => a.order - b.order);
}

/** A plan-item id for a new appearance, unique among the plan's (dropped ones included). */
export function newPlanItemId(refId: string, seed: Pick<AppSeed, 'plan' | 'dropped'>): string {
  const taken = new Set([...seed.plan, ...(seed.dropped ?? [])].map((i) => i.id));
  const base = 'plan.' + refId + '.my';
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(base + n)) return base + n;
}

/**
 * Puts a resource or project into a lane at a position (0 = first; past the end = last). An appearance already in
 * that lane moves; otherwise a new one is added. The lane is renumbered in tens, and only items whose position
 * changes get a patch.
 */
export function placeInLane(seed: Pick<AppSeed, 'plan' | 'dropped' | 'resources'>, refId: string, phaseId: string, block: BlockId, index: number): NewPlanPatch[] {
  const lane = laneOf(seed.plan, phaseId, block);
  const existing = lane.find((i) => (i.resourceId ?? i.projectId) === refId);
  const rest = lane.filter((i) => i !== existing);
  const at = Math.max(0, Math.min(index, rest.length));
  const ordered: (PlanItem | null)[] = [...rest];
  ordered.splice(at, 0, existing ?? null);
  const patches: NewPlanPatch[] = [];
  ordered.forEach((item, i) => {
    const order = (i + 1) * 10;
    if (item === null) {
      const isResource = seed.resources.some((r) => r.id === refId);
      const added: PlanItem = { id: newPlanItemId(refId, seed), phaseId, block, order, ...(isResource ? { resourceId: refId } : { projectId: refId }) };
      patches.push({ op: 'add', item: added });
    } else if (item.order !== order) {
      patches.push({ op: 'move', planItemId: item.id, order });
    }
  });
  return patches;
}

/** Moves a plan item to another phase or lane, at the end of it. */
export function moveToLane(plan: PlanItem[], planItemId: string, phaseId: string, block: BlockId): NewPlanPatch[] {
  const lane = laneOf(plan, phaseId, block).filter((i) => i.id !== planItemId);
  const order = lane.length === 0 ? 10 : lane.at(-1)!.order + 10;
  return [{ op: 'move', planItemId, phaseId, block, order }];
}

/* ------------------------------------------------------------------ prerequisites */

export interface PrereqConflict {
  /** The prerequisite that would come after the item. */
  prereqId: string;
  /** Its earliest appearance, which would have to move. */
  planItem: PlanItem;
  phaseId: string;
}

/**
 * The prerequisites of `refId` that are planned in a phase later than `phaseId`: scheduling the item there would
 * put it before them. A prerequisite that is done, or not on the plan at all, is no conflict.
 */
export function prerequisiteConflicts(seed: AppSeed, refId: string, phaseId: string, isDone: (id: string) => boolean): PrereqConflict[] {
  const resource = seed.resources.find((r) => r.id === refId);
  const prereqs = resource?.prerequisites ?? [];
  const index = (id: string): number => seed.phases.findIndex((p) => p.id === id);
  const target = index(phaseId);
  const out: PrereqConflict[] = [];
  for (const prereqId of prereqs) {
    if (isDone(prereqId)) continue;
    const appearances = seed.plan.filter((i) => i.resourceId === prereqId).sort((a, b) => index(a.phaseId) - index(b.phaseId));
    const first = appearances[0];
    if (first && index(first.phaseId) > target) out.push({ prereqId, planItem: first, phaseId: first.phaseId });
  }
  return out;
}

/** "Move the prerequisite too": each conflicting prerequisite goes to the item's phase, at the end of its own lane. */
export function movePrerequisites(seed: AppSeed, conflicts: PrereqConflict[], phaseId: string): NewPlanPatch[] {
  let plan = seed.plan;
  const patches: NewPlanPatch[] = [];
  for (const c of conflicts) {
    const moves = moveToLane(plan, c.planItem.id, phaseId, c.planItem.block);
    patches.push(...moves);
    plan = plan.map((i) => (i.id === c.planItem.id ? { ...i, phaseId, order: (moves[0] as { order: number }).order } : i));
  }
  return patches;
}

/* ------------------------------------------------------------------ alternatives */

/**
 * What an item can be swapped for: the alternatives the curriculum names (either way round) first, then
 * everything else of the same kind.
 */
export function swapCandidates(seed: AppSeed, refId: string): { named: string[]; others: string[] } {
  const resource = seed.resources.find((r) => r.id === refId);
  if (resource) {
    const named = new Set(resource.alternatives ?? []);
    for (const r of seed.resources) if (r.alternatives?.includes(refId)) named.add(r.id);
    named.delete(refId);
    return { named: [...named], others: seed.resources.filter((r) => r.id !== refId && !named.has(r.id) && !r.reference).map((r) => r.id) };
  }
  return { named: [], others: seed.projects.filter((p) => p.id !== refId && p.cadence !== 'weekly').map((p) => p.id) };
}

/* ------------------------------------------------------------------ phases */

export interface PhaseShift {
  phaseId: string;
  title: string;
  from: { start: string; end: string };
  to: { start: string; end: string };
}

/**
 * Changes a phase's last day. The phases after it keep their length and shift by the same number of days, so the
 * plan stays one unbroken line; the result says where every phase lands, for the preview.
 */
export function shiftPhaseEnd(phases: Phase[], phaseId: string, newEnd: string): { shifts: PhaseShift[]; patches: NewPlanPatch[] } {
  const i = phases.findIndex((p) => p.id === phaseId);
  const phase = phases[i];
  if (!phase || newEnd < phase.start) return { shifts: [], patches: [] };
  const delta = daysBetween(phase.end, newEnd);
  if (delta === 0) return { shifts: [], patches: [] };
  const shifts: PhaseShift[] = [{ phaseId, title: phase.title, from: { start: phase.start, end: phase.end }, to: { start: phase.start, end: newEnd } }];
  for (const later of phases.slice(i + 1)) {
    shifts.push({ phaseId: later.id, title: later.title, from: { start: later.start, end: later.end }, to: { start: addDays(later.start, delta), end: addDays(later.end, delta) } });
  }
  const patches: NewPlanPatch[] = shifts.map((s) => {
    const p: NewPlanPatch = { op: 'editPhase', phaseId: s.phaseId, end: s.to.end };
    if (s.to.start !== s.from.start) p.start = s.to.start;
    return p;
  });
  return { shifts, patches };
}

/** Splits a phase at a date: the first part keeps its items and ends the day before, a new phase starts on it. */
export function splitPhase(phases: Phase[], phaseId: string, at: string, newId: string): NewPlanPatch[] {
  const phase = phases.find((p) => p.id === phaseId);
  if (!phase || at <= phase.start || at > phase.end) return [];
  return [
    { op: 'editPhase', phaseId, end: addDays(at, -1) },
    { op: 'addPhase', after: phaseId, phase: { id: newId, title: phase.title + ', part 2', start: at, end: phase.end, goal: phase.goal } },
  ];
}

/** A phase of the user's after another, `days` long; the phases after it shift to make room. */
export function insertPhase(phases: Phase[], afterId: string, title: string, days: number, newId: string): NewPlanPatch[] {
  const i = phases.findIndex((p) => p.id === afterId);
  const after = phases[i];
  if (!after || days < 1) return [];
  const start = addDays(after.end, 1);
  const end = addDays(start, days - 1);
  const patches: NewPlanPatch[] = [{ op: 'addPhase', after: afterId, phase: { id: newId, title, start, end, goal: title } }];
  for (const later of phases.slice(i + 1)) patches.push({ op: 'editPhase', phaseId: later.id, start: addDays(later.start, days), end: addDays(later.end, days) });
  return patches;
}

export function newPhaseId(phases: Phase[]): string {
  for (let n = 1; ; n++) if (!phases.some((p) => p.id === 'my-phase-' + n)) return 'my-phase-' + n;
}
