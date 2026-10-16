/**
 * Goals ("Ship my inference server by 30 June 2028"): on track or at risk, from the forecast. Each linked item's
 * finish is projected the way a lane's is (src/lib/forecast.ts): the hours of everything before it in its lane
 * and its own, spent day by day at what the schedule plans, scaled by how much of its plan the lane has been
 * getting. A roadmap node is linked through the items that cover it.
 */
import type { DayLog, StoredSettings, UserItemState } from '../db/types.ts';
import type { AppSeed, Goal } from '../seed/schema.ts';
import { addDays } from './dates.ts';
import { paceForBlock, plannedHoursPerDay, projectEnd } from './forecast.ts';
import { itemProgress } from './progress.ts';

export type GoalVerdict = 'done' | 'on-track' | 'at-risk';

export interface GoalStatus {
  goal: Goal;
  verdict: GoalVerdict;
  /** The latest projected finish among the goal's items; null when one has no projection (not planned, stalled). */
  projected: string | null;
  /** Links that are not on the plan and not done: they make the goal at risk. */
  unplanned: string[];
}

function remainingOf(seed: AppSeed, refId: string, states: Map<string, UserItemState>, hours?: number): number {
  const resource = seed.resources.find((r) => r.id === refId);
  const project = seed.projects.find((p) => p.id === refId);
  const estHours = hours ?? resource?.estHours ?? project?.estHours ?? 0;
  const unitCount = resource?.unitCount ?? project?.acceptance.length ?? 0;
  return itemProgress({ refId, estHours, unitCount, state: states.get(refId) }).remainingHours;
}

/** When an item on the plan is projected to finish, or null when it cannot be said. */
export function projectedFinish(seed: AppSeed, settings: StoredSettings, states: Map<string, UserItemState>, logs: DayLog[], refId: string, asOf: string): string | null {
  if (states.get(refId)?.status === 'done') return asOf;
  const phaseIndex = (id: string): number => seed.phases.findIndex((p) => p.id === id);
  const appearances = seed.plan.filter((i) => (i.resourceId ?? i.projectId) === refId);
  if (appearances.length === 0) return null;
  let latest: string | null = asOf;
  for (const item of appearances) {
    const block = item.block;
    // Everything ahead of it in its lane, from this phase on, and the item itself.
    const ahead = seed.plan
      .filter((i) => i.block === block && (phaseIndex(i.phaseId) < phaseIndex(item.phaseId) || (i.phaseId === item.phaseId && i.order <= item.order)))
      .reduce((sum, i) => sum + remainingOf(seed, i.resourceId ?? i.projectId!, states, i.hours), 0);
    const window = settings.core.forecast.paceWindowDays;
    const pace = paceForBlock(logs, block, asOf, window);
    const planned = plannedHoursPerDay(settings, block, addDays(asOf, -(window - 1)), asOf);
    // With nothing logged lately, assume the plan is followed: the projection is then what the plan promises.
    const efficiency = pace > 0 && planned > 0 ? pace / planned : 1;
    const end = projectEnd(settings, block, asOf, ahead, efficiency);
    if (end === null) return null;
    if (latest === null || end > latest) latest = end;
  }
  return latest;
}

export function goalStatus(goal: Goal, seed: AppSeed, settings: StoredSettings, states: Map<string, UserItemState>, logs: DayLog[], asOf: string): GoalStatus {
  const refs = new Set<string>();
  for (const link of goal.links) {
    if (link.includes('/')) {
      for (const r of [...seed.resources, ...seed.projects]) if (r.covers?.includes(link)) refs.add(r.id);
    } else {
      refs.add(link);
    }
  }
  const open = [...refs].filter((id) => states.get(id)?.status !== 'done');
  if (open.length === 0) return { goal, verdict: 'done', projected: null, unplanned: [] };
  const unplanned = open.filter((id) => !seed.plan.some((i) => (i.resourceId ?? i.projectId) === id));
  let projected: string | null = asOf;
  for (const id of open) {
    const end = projectedFinish(seed, settings, states, logs, id, asOf);
    if (end === null) {
      projected = null;
      break;
    }
    if (end > projected!) projected = end;
  }
  const verdict: GoalVerdict = projected !== null && projected <= goal.date && unplanned.length === 0 ? 'on-track' : 'at-risk';
  return { goal, verdict, projected, unplanned };
}
