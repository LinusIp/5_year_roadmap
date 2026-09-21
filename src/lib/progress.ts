/**
 * How far along everything is.
 *
 * Progress on an item is unit-based when it has a checklist, and status-based when it does not: a course
 * with 35 lectures is 20% done after 7 of them, while a book with no chapters listed is 0%, 50% or 100%
 * for todo, active and done. Hours are the currency everywhere else, because that is what the forecast
 * and the budget are measured in.
 */
import type { AppSeed } from '../seed/schema.ts';
import type { BlockId, PlanItem, Project } from '../seed/schema.ts';
import type { ItemStatus, UserItemState } from '../db/types.ts';

export interface ItemProgress {
  refId: string;
  status: ItemStatus;
  /** 0 to 1. */
  fraction: number;
  unitsDone: number;
  unitCount: number;
  estHours: number;
  /** Hours still to do, 0 for a done or dropped item. */
  remainingHours: number;
}

/** An item that is `active` but has ticked nothing yet still shows some progress, so a lane never looks stalled. */
const ACTIVE_WITHOUT_UNITS = 0.5;
const STARTED_MINIMUM = 0.05;

export function fractionDone(status: ItemStatus, unitsDone: number, unitCount: number): number {
  if (status === 'done') return 1;
  if (status === 'dropped') return 0;
  if (unitCount > 0) {
    const fraction = Math.min(1, unitsDone / unitCount);
    // A ticked unit always shows, and an untouched item never shows as finished.
    if (fraction >= 1) return status === 'active' ? 0.99 : 1;
    return status === 'active' ? Math.max(fraction, STARTED_MINIMUM) : fraction;
  }
  return status === 'active' ? ACTIVE_WITHOUT_UNITS : 0;
}

export interface ProgressInput {
  refId: string;
  estHours: number;
  unitCount: number;
  state: UserItemState | undefined;
}

export function itemProgress({ refId, estHours, unitCount, state }: ProgressInput): ItemProgress {
  const status = state?.status ?? 'todo';
  const unitsDone = Math.min(state?.unitsDone.length ?? 0, unitCount);
  const fraction = fractionDone(status, unitsDone, unitCount);
  return {
    refId,
    status,
    fraction,
    unitsDone,
    unitCount,
    estHours,
    remainingHours: status === 'done' || status === 'dropped' ? 0 : estHours * (1 - fraction),
  };
}

/* ------------------------------------------------------------------ plan items */

export interface PlanItemView extends ItemProgress {
  planItem: PlanItem;
  title: string;
  kind: 'resource' | 'project';
  provider?: string;
  type?: string;
  url: string | null;
  searchHint?: string;
  tracks: string[];
  prerequisites: string[];
  /** Prerequisites that are not finished yet: the item is shown as blocked. */
  blockedBy: string[];
  cadence?: Project['cadence'];
  stretch?: boolean;
  note?: string;
  /** The lane's share of a build that spans two blocks. */
  laneHours: number;
}

export function buildPlanItemView(
  planItem: PlanItem,
  seed: AppSeed,
  states: Map<string, UserItemState>,
): PlanItemView | null {
  const refId = planItem.resourceId ?? planItem.projectId;
  if (!refId) return null;
  const resource = planItem.resourceId ? seed.resources.find((r) => r.id === planItem.resourceId) : undefined;
  const project = planItem.projectId ? seed.projects.find((p) => p.id === planItem.projectId) : undefined;
  if (!resource && !project) return null;

  const estHours = planItem.hours ?? resource?.estHours ?? project?.estHours ?? 0;
  const unitCount = resource?.unitCount ?? project?.acceptance.length ?? 0;
  const base = itemProgress({ refId, estHours, unitCount, state: states.get(refId) });
  const prerequisites = resource?.prerequisites ?? [];

  const view: PlanItemView = {
    ...base,
    planItem,
    title: resource?.title ?? project!.title,
    kind: resource ? 'resource' : 'project',
    url: resource?.url ?? project?.sourceUrl ?? null,
    tracks: resource?.tracks ?? project!.tracks,
    prerequisites,
    blockedBy: prerequisites.filter((id) => (states.get(id)?.status ?? 'todo') !== 'done'),
    laneHours: estHours,
  };
  if (resource?.provider) view.provider = resource.provider;
  if (resource?.type) view.type = resource.type;
  if (resource?.searchHint) view.searchHint = resource.searchHint;
  if (resource?.stretch) view.stretch = true;
  if (project?.cadence) view.cadence = project.cadence;
  if (planItem.note) view.note = planItem.note;
  return view;
}

/* ------------------------------------------------------------------ lanes and phases */

export interface LaneProgress {
  block: BlockId;
  items: PlanItemView[];
  totalHours: number;
  remainingHours: number;
  doneHours: number;
  fraction: number;
  /** Hours this lane is given over the phase, from the block's minutes and the phase's length. */
  budgetHours: number;
}

export interface PhaseProgress {
  phaseId: string;
  lanes: LaneProgress[];
  totalHours: number;
  remainingHours: number;
  fraction: number;
  itemsDone: number;
  itemsTotal: number;
}

export function laneProgress(block: BlockId, items: PlanItemView[], budgetHours: number): LaneProgress {
  const totalHours = items.reduce((sum, i) => sum + i.estHours, 0);
  const remainingHours = items.reduce((sum, i) => sum + i.remainingHours, 0);
  return {
    block,
    items,
    totalHours,
    remainingHours,
    doneHours: totalHours - remainingHours,
    fraction: totalHours > 0 ? (totalHours - remainingHours) / totalHours : 0,
    budgetHours,
  };
}

export function phaseProgress(phaseId: string, lanes: LaneProgress[]): PhaseProgress {
  const items = lanes.flatMap((l) => l.items);
  const totalHours = lanes.reduce((sum, l) => sum + l.totalHours, 0);
  const remainingHours = lanes.reduce((sum, l) => sum + l.remainingHours, 0);
  return {
    phaseId,
    lanes,
    totalHours,
    remainingHours,
    fraction: totalHours > 0 ? (totalHours - remainingHours) / totalHours : 0,
    itemsDone: items.filter((i) => i.status === 'done').length,
    itemsTotal: items.length,
  };
}

/** Hours a block is given between two dates, from its minutes and which weekdays it runs on. */
export function budgetHoursBetween(minutesPerDay: number, days: number[], start: string, end: string): number {
  const from = new Date(start + 'T00:00:00');
  const to = new Date(end + 'T00:00:00');
  let count = 0;
  for (const day = new Date(from); day <= to; day.setDate(day.getDate() + 1)) {
    if (days.includes(day.getDay())) count++;
  }
  return (count * minutesPerDay) / 60;
}
