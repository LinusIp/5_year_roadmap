/**
 * Re-plan, three ways (flexibility brief, section 3). Each returns a preview (what changes, in words) and what
 * applying it would store; nothing is applied silently.
 *
 *   1. push dates back: each phase from today on is stretched until every lane's unfinished work fits in it, and
 *      the phases after shift with it;
 *   2. redistribute across lanes: in the current phase, lanes with room give minutes a day to lanes that are
 *      short, as custom paces from today, so the day's total stays the same;
 *   3. drop or defer the lowest-priority items: where a lane does not fit its phase, its stretch items go first,
 *      then the items teaching the lowest-priority roadmap (graphics after architecture after inference), then
 *      the latest; each moves to the start of the next phase, or off the plan in the last one. An item that
 *      something still in its phase needs is never moved ahead of it.
 */
import type { LanePace, NewPlanPatch, StoredSettings, UserItemState } from '../db/types.ts';
import type { AppSeed, BlockId, Phase, PlanItem } from '../seed/schema.ts';
import { addDays, daysBetween } from './dates.ts';
import { plannedOver } from './day-plan.ts';
import { shiftPhaseEnd } from './plan-edit.ts';
import type { PhaseShift } from './plan-edit.ts';
import { itemPriority } from './pace.ts';
import { itemProgress } from './progress.ts';

export type Strategy = 'push' | 'redistribute' | 'defer';

export interface StrategyInput {
  seed: AppSeed;
  settings: StoredSettings;
  states: Map<string, UserItemState>;
  asOf: string;
}

function remainingOf(item: PlanItem, seed: AppSeed, states: Map<string, UserItemState>): number {
  const refId = item.resourceId ?? item.projectId!;
  const resource = item.resourceId ? seed.resources.find((r) => r.id === item.resourceId) : undefined;
  const project = item.projectId ? seed.projects.find((p) => p.id === item.projectId) : undefined;
  const estHours = item.hours ?? resource?.estHours ?? project?.estHours ?? 0;
  const unitCount = resource?.unitCount ?? project?.acceptance.length ?? 0;
  return itemProgress({ refId, estHours, unitCount, state: states.get(refId) }).remainingHours;
}

/** The phases that can still take work: the one holding today and those after it. */
function openPhases(phases: Phase[], asOf: string): Phase[] {
  const first = phases.findIndex((p) => p.end >= asOf);
  return first < 0 ? [] : phases.slice(first);
}

/** Hours a lane has in a phase from today (or the phase's start), and the hours of unfinished work in it. */
function laneLoad(input: StrategyInput, phase: Phase, block: BlockId, plan: PlanItem[] = input.seed.plan): { capacity: number; load: number } {
  const start = input.asOf > phase.start ? input.asOf : phase.start;
  const capacity = plannedOver(input.settings, start, phase.end, block) / 60;
  const load = plan.filter((i) => i.phaseId === phase.id && i.block === block).reduce((s, i) => s + remainingOf(i, input.seed, input.states), 0);
  return { capacity, load };
}

/* ------------------------------------------------------------------ 1. push dates back */

export interface PushResult {
  shifts: PhaseShift[];
  patches: NewPlanPatch[];
  /** Days the plan's last day moves. */
  days: number;
}

export function pushDatesBack(input: StrategyInput): PushResult {
  let phases = input.seed.phases.map((p) => ({ ...p }));
  const shifted = new Map<string, PhaseShift>();
  for (const original of openPhases(input.seed.phases, input.asOf)) {
    const phase = phases.find((p) => p.id === original.id)!;
    let extraDays = 0;
    for (const def of input.settings.core.blocks) {
      const { capacity, load } = laneLoad({ ...input, seed: { ...input.seed, phases } }, phase, def.id);
      if (load <= capacity + 0.5) continue;
      const start = input.asOf > phase.start ? input.asOf : phase.start;
      const days = daysBetween(start, phase.end) + 1;
      const perDay = days > 0 ? plannedOver(input.settings, start, phase.end, def.id) / 60 / days : 0;
      if (perDay <= 0) continue;
      extraDays = Math.max(extraDays, Math.ceil((load - capacity) / perDay));
    }
    if (extraDays === 0) continue;
    const { shifts } = shiftPhaseEnd(phases, phase.id, addDays(phase.end, extraDays));
    for (const s of shifts) {
      const first = shifted.get(s.phaseId);
      shifted.set(s.phaseId, { ...s, from: first?.from ?? s.from });
      phases = phases.map((p) => (p.id === s.phaseId ? { ...p, start: s.to.start, end: s.to.end } : p));
    }
  }
  const shifts = [...shifted.values()];
  const patches: NewPlanPatch[] = shifts.map((s) => {
    const p: NewPlanPatch = { op: 'editPhase', phaseId: s.phaseId, end: s.to.end };
    if (s.to.start !== s.from.start) p.start = s.to.start;
    return p;
  });
  const last = input.seed.phases.at(-1);
  const lastShift = last ? shifted.get(last.id) : undefined;
  return { shifts, patches, days: lastShift ? daysBetween(lastShift.from.end, lastShift.to.end) : 0 };
}

/* ------------------------------------------------------------------ 2. redistribute */

export interface Redistribution {
  block: BlockId;
  /** Average planned minutes a day for the rest of the phase, before and after. */
  before: number;
  after: number;
}

export interface RedistributeResult {
  changes: Redistribution[];
  pace: Record<BlockId, LanePace>;
  /** Hours still short across the phase when the room the other lanes have is not enough. */
  stillShortHours: number;
}

export function redistribute(input: StrategyInput): RedistributeResult {
  const phase = openPhases(input.seed.phases, input.asOf)[0];
  if (!phase) return { changes: [], pace: {}, stillShortHours: 0 };
  const start = input.asOf > phase.start ? input.asOf : phase.start;
  const days = daysBetween(start, phase.end) + 1;
  const lanes = input.settings.core.blocks.map((b) => {
    const { capacity, load } = laneLoad(input, phase, b.id);
    return { block: b.id, perDay: (capacity * 60) / days, needPerDay: (load * 60) / days };
  });
  // Minutes a day the short lanes need, and the room the others can give.
  const need = lanes.reduce((s, l) => s + Math.max(0, l.needPerDay - l.perDay), 0);
  const room = lanes.reduce((s, l) => s + Math.max(0, l.perDay - l.needPerDay), 0);
  const give = Math.min(need, room);
  if (give < 5) return { changes: [], pace: {}, stillShortHours: Math.max(0, ((need - room) * days) / 60) };
  const stillShortHours = Math.max(0, ((need - give) * days) / 60);
  const changes: Redistribution[] = [];
  const pace: Record<BlockId, LanePace> = {};
  const shortTotal = need;
  const roomTotal = room;
  for (const l of lanes) {
    let after = l.perDay;
    if (l.needPerDay > l.perDay) after = l.perDay + (give * (l.needPerDay - l.perDay)) / shortTotal;
    else if (l.perDay > l.needPerDay) after = l.perDay - (give * (l.perDay - l.needPerDay)) / roomTotal;
    const rounded = Math.round(after / 5) * 5;
    if (Math.abs(rounded - Math.round(l.perDay)) < 5) continue;
    changes.push({ block: l.block, before: Math.round(l.perDay), after: rounded });
    pace[l.block] = { mode: 'custom', minutes: rounded, from: input.asOf };
  }
  return { changes, pace, stillShortHours };
}

/* ------------------------------------------------------------------ 3. drop or defer */

export interface Deferral {
  planItemId: string;
  refId: string;
  block: BlockId;
  fromPhaseId: string;
  /** Null: dropped (it was in the last phase). */
  toPhaseId: string | null;
  hours: number;
  why: 'stretch' | 'lower priority' | 'last in the lane';
}

export interface DeferResult {
  deferrals: Deferral[];
  patches: NewPlanPatch[];
}

function priorityOf(seed: AppSeed, item: PlanItem): number {
  return itemPriority(seed, item.resourceId ?? item.projectId!);
}

export function dropOrDefer(input: StrategyInput): DeferResult {
  const { seed } = input;
  const phases = openPhases(seed.phases, input.asOf);
  let plan = seed.plan.map((i) => ({ ...i }));
  const deferrals: Deferral[] = [];
  const isStretch = (i: PlanItem): boolean => Boolean(i.resourceId && seed.resources.find((r) => r.id === i.resourceId)?.stretch);
  // What an item is needed by: a resource whose prerequisites list it.
  const neededBy = (refId: string): string[] => seed.resources.filter((r) => r.prerequisites.includes(refId)).map((r) => r.id);

  phases.forEach((phase, index) => {
    const next = phases[index + 1] ?? null;
    for (const def of input.settings.core.blocks) {
      const capacity = laneLoad(input, phase, def.id, plan).capacity;
      let load = laneLoad(input, phase, def.id, plan).load;
      if (load <= capacity + 0.5) continue;
      const lane = plan.filter((i) => i.phaseId === phase.id && i.block === def.id && remainingOf(i, seed, input.states) > 0).sort((a, b) => a.order - b.order);
      const candidates = [...lane].sort(
        (a, b) => Number(isStretch(b)) - Number(isStretch(a)) || priorityOf(seed, b) - priorityOf(seed, a) || b.order - a.order,
      );
      for (const item of candidates) {
        if (load <= capacity + 0.5) break;
        const refId = item.resourceId ?? item.projectId!;
        // Something still in this phase or earlier needs it: moving it would put that before its prerequisite.
        const blocked = neededBy(refId).some((dependent) =>
          plan.some((i) => i.resourceId === dependent && seed.phases.findIndex((p) => p.id === i.phaseId) <= seed.phases.findIndex((p) => p.id === phase.id) && remainingOf(i, seed, input.states) > 0),
        );
        if (blocked) continue;
        const hours = remainingOf(item, seed, input.states);
        const why: Deferral['why'] = isStretch(item) ? 'stretch' : priorityOf(seed, item) < 4 && priorityOf(seed, item) > 1 ? 'lower priority' : 'last in the lane';
        // An item deferred again keeps one entry: where it started and where it ends up.
        const earlier = deferrals.find((d) => d.planItemId === item.id);
        if (earlier) earlier.toPhaseId = next?.id ?? null;
        else deferrals.push({ planItemId: item.id, refId, block: def.id, fromPhaseId: phase.id, toPhaseId: next?.id ?? null, hours, why });
        load -= hours;
        if (next) {
          // First in the next phase's lane: it was meant to come earlier than what is there.
          const firstOrder = Math.min(10, ...plan.filter((i) => i.phaseId === next.id && i.block === def.id).map((i) => i.order)) - 10;
          plan = plan.map((i) => (i.id === item.id ? { ...i, phaseId: next.id, order: firstOrder - deferrals.length } : i));
        } else {
          plan = plan.filter((i) => i.id !== item.id);
        }
      }
    }
  });

  const patches: NewPlanPatch[] = deferrals.map((d) => {
    if (d.toPhaseId === null) return { op: 'drop', planItemId: d.planItemId };
    const moved = plan.find((i) => i.id === d.planItemId)!;
    return { op: 'move', planItemId: d.planItemId, phaseId: d.toPhaseId, order: moved.order };
  });
  return { deferrals, patches };
}
