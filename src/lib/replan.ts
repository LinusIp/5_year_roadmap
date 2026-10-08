/**
 * Re-planning: lay the unfinished work out again from today, within the hours each block actually has.
 *
 * Three rules, in this order:
 *   1. Nothing is ever dropped. Every unfinished item comes out the other side, in some phase.
 *   2. Nothing moves before a prerequisite. An item lands in the phase after the last one its
 *      prerequisites land in, at the earliest.
 *   3. A phase takes only as many hours as its blocks give it. Overflow goes to the next phase; work that
 *      does not fit before the plan ends piles into the last phase, and the diff says so.
 *
 * The result is a diff, not a change: the page shows it and the user decides. Pure and deterministic.
 */
import { daysBetween } from './dates.ts';
import type { AppSeed, BlockId, Phase, PlanItem } from '../seed/schema.ts';
import type { StoredSettings, UserItemState } from '../db/types.ts';
import { itemProgress } from './progress.ts';

export interface ReplanMove {
  planItemId: string;
  refId: string;
  title: string;
  block: BlockId;
  fromPhaseId: string;
  toPhaseId: string;
  fromOrder: number;
  toOrder: number;
  remainingHours: number;
  /** Why it moved, in the words the diff shows. */
  reason: 'no room in this phase' | 'waiting on a prerequisite' | 'phase has already ended' | 'pulled earlier';
}

export interface ReplanLaneSummary {
  block: BlockId;
  phaseId: string;
  budgetHours: number;
  plannedHours: number;
  /** Positive when the lane is asked for more hours than it has. */
  overflowHours: number;
}

export interface ReplanResult {
  /** Items that change phase: what the diff shows. */
  moves: ReplanMove[];
  /**
   * Items that stay in their phase but take a new position in it. Not shown as moves, but applied with
   * them: otherwise an item moved in could share an `order` with one already there.
   */
  reorders: { planItemId: string; order: number }[];
  lanes: ReplanLaneSummary[];
  /** Items that did not fit before the plan's last day, all of which sit in the final phase. */
  pastPlanEnd: ReplanMove[];
  unchanged: number;
}

export interface ReplanInput {
  seed: AppSeed;
  settings: StoredSettings;
  states: Map<string, UserItemState>;
  /** Today. Phases that have already ended are not scheduled into. */
  asOf: string;
}

/** Hours a lane has between two dates, from the block's minutes and the weekdays it runs on. */
export function laneCapacity(settings: StoredSettings, block: BlockId, start: string, end: string): number {
  const def = settings.core.blocks.find((b) => b.id === block);
  if (!def || end < start) return 0;
  const days = daysBetween(start, end) + 1;
  // Average over whole weeks rather than counting weekdays one by one: the difference is under a day.
  return (def.minutes * def.days.length * (days / 7)) / 60;
}

function remainingHoursOf(item: PlanItem, seed: AppSeed, states: Map<string, UserItemState>): number {
  const refId = item.resourceId ?? item.projectId!;
  const resource = item.resourceId ? seed.resources.find((r) => r.id === item.resourceId) : undefined;
  const project = item.projectId ? seed.projects.find((p) => p.id === item.projectId) : undefined;
  const estHours = item.hours ?? resource?.estHours ?? project?.estHours ?? 0;
  const unitCount = resource?.unitCount ?? project?.acceptance.length ?? 0;
  return itemProgress({ refId, estHours, unitCount, state: states.get(refId) }).remainingHours;
}

function titleOf(item: PlanItem, seed: AppSeed): string {
  return (
    seed.resources.find((r) => r.id === item.resourceId)?.title ??
    seed.projects.find((p) => p.id === item.projectId)?.title ??
    (item.resourceId ?? item.projectId ?? item.id)
  );
}

export function replan({ seed, settings, states, asOf }: ReplanInput): ReplanResult {
  const phases = seed.phases;
  if (phases.length === 0) return { moves: [], reorders: [], lanes: [], pastPlanEnd: [], unchanged: 0 };

  // Phases that can still take work: the one containing today, and everything after it.
  const firstOpen = Math.max(
    0,
    phases.findIndex((p) => p.end >= asOf),
  );
  const openPhases = phases.slice(firstOpen === -1 ? phases.length - 1 : firstOpen);
  const target = openPhases.length > 0 ? openPhases : [phases.at(-1)!];

  const moves: ReplanMove[] = [];
  const reorders: { planItemId: string; order: number }[] = [];
  const lanes: ReplanLaneSummary[] = [];
  const pastPlanEnd: ReplanMove[] = [];
  let unchanged = 0;

  // Where each item ends up, so a later item can see where its prerequisites landed.
  const landedIn = new Map<string, number>();
  const phaseIndex = new Map(phases.map((p, i) => [p.id, i]));
  for (const item of seed.plan) {
    const refId = item.resourceId ?? item.projectId!;
    if (remainingHoursOf(item, seed, states) <= 0) landedIn.set(refId, phaseIndex.get(item.phaseId) ?? 0);
  }

  for (const block of settings.core.blocks.map((b) => b.id)) {
    // Every unfinished item of this lane, in their present order, across every phase.
    const queue = seed.plan
      .filter((i) => i.block === block)
      .sort((a, b) => (phaseIndex.get(a.phaseId) ?? 0) - (phaseIndex.get(b.phaseId) ?? 0) || a.order - b.order)
      .filter((i) => remainingHoursOf(i, seed, states) > 0);

    // Capacity of each open phase for this lane. The phase containing today counts only from today on.
    const capacity = target.map((phase, index) => {
      const start = index === 0 && asOf > phase.start ? asOf : phase.start;
      return laneCapacity(settings, block, start, phase.end);
    });
    const used = target.map(() => 0);

    let cursor = 0;
    const orderInPhase = target.map(() => 0);
    // Items that stay where they are (finished, or with no hours) keep their positions: numbering skips them.
    const taken = target.map(
      (phase) => new Set(seed.plan.filter((i) => i.block === block && i.phaseId === phase.id && remainingHoursOf(i, seed, states) <= 0).map((i) => i.order)),
    );

    for (const item of queue) {
      const refId = item.resourceId ?? item.projectId!;
      const hours = remainingHoursOf(item, seed, states);
      const resource = seed.resources.find((r) => r.id === item.resourceId);

      // Rule 2: not before the phase its prerequisites land in.
      let earliest = cursor;
      let waiting = false;
      for (const prerequisite of resource?.prerequisites ?? []) {
        const landed = landedIn.get(prerequisite);
        if (landed === undefined) continue;
        const relative = landed - (phaseIndex.get(target[0]!.id) ?? 0);
        if (relative >= earliest) {
          earliest = Math.min(relative + 1, target.length - 1);
          waiting = true;
        }
      }

      // Rule 3: the first phase from `earliest` with room, or the last phase when nothing has room.
      let slot = earliest;
      while (slot < target.length - 1 && used[slot]! + hours > capacity[slot]!) slot++;
      const noRoom = used[slot]! + hours > capacity[slot]!;

      used[slot] = used[slot]! + hours;
      do orderInPhase[slot] = (orderInPhase[slot] ?? 0) + 10;
      while (taken[slot]!.has(orderInPhase[slot]!));
      const toPhase = target[slot]!;
      landedIn.set(refId, phaseIndex.get(toPhase.id)!);
      cursor = Math.max(cursor, slot);

      const toOrder = orderInPhase[slot]!;
      const overflowsPlan = noRoom && slot === target.length - 1;

      if (toPhase.id === item.phaseId) {
        unchanged++;
        if (toOrder !== item.order) reorders.push({ planItemId: item.id, order: toOrder });
        if (overflowsPlan) {
          pastPlanEnd.push({
            planItemId: item.id, refId, title: titleOf(item, seed), block, fromPhaseId: item.phaseId,
            toPhaseId: toPhase.id, fromOrder: item.order, toOrder, remainingHours: hours, reason: 'no room in this phase',
          });
        }
        continue;
      }

      const fromIndex = phaseIndex.get(item.phaseId) ?? 0;
      const toIndex = phaseIndex.get(toPhase.id)!;
      const reason: ReplanMove['reason'] = waiting
        ? 'waiting on a prerequisite'
        : toIndex < fromIndex
          ? 'pulled earlier'
          : fromIndex < firstOpen
            ? 'phase has already ended'
            : 'no room in this phase';

      const move: ReplanMove = {
        planItemId: item.id,
        refId,
        title: titleOf(item, seed),
        block,
        fromPhaseId: item.phaseId,
        toPhaseId: toPhase.id,
        fromOrder: item.order,
        toOrder,
        remainingHours: hours,
        reason,
      };
      moves.push(move);
      if (overflowsPlan) pastPlanEnd.push(move);
    }

    target.forEach((phase, index) => {
      lanes.push({
        block,
        phaseId: phase.id,
        budgetHours: capacity[index]!,
        plannedHours: used[index]!,
        overflowHours: Math.max(0, used[index]! - capacity[index]!),
      });
    });
  }

  return { moves, reorders, lanes, pastPlanEnd, unchanged };
}

/** Everything a re-plan changes, as plan-item patches ready to store as overrides. */
export function replanToPatches(result: Pick<ReplanResult, 'moves' | 'reorders'>): { id: string; patch: Record<string, unknown> }[] {
  return [
    ...result.moves.map((move) => ({ id: move.planItemId, patch: { phaseId: move.toPhaseId, order: move.toOrder } })),
    ...result.reorders.map((r) => ({ id: r.planItemId, patch: { order: r.order } })),
  ];
}

export function describeReason(reason: ReplanMove['reason']): string {
  switch (reason) {
    case 'no room in this phase':
      return 'no room left in that phase';
    case 'waiting on a prerequisite':
      return 'waits on a prerequisite';
    case 'phase has already ended':
      return 'its phase has already ended';
    case 'pulled earlier':
      return 'pulled earlier: the lane is ahead';
  }
}

export type { Phase };
