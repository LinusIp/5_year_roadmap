/**
 * What to do today. Given the curriculum, the settings and what the user has finished, this decides the
 * specific item each block is on, down to the next lecture or chapter.
 *
 * The rule is deliberately simple and predictable: each lane is an ordered queue, and a block is on the
 * first item in its lane that is not finished or dropped. Nothing is date-driven inside a phase, so falling
 * behind never makes items disappear; the forecast and the re-plan button deal with time.
 *
 * Pure: no database and no clock. Callers pass the date.
 */
import type { AppResource, AppSeed } from '../seed/index.ts';
import type { BlockDef, BlockId, Phase, PlanItem, Project, TrackId } from '../seed/schema.ts';
import type { ItemStatus, StoredSettings, UserItemState } from '../db/types.ts';
import { isWithinRange, weekday } from './dates.ts';

export type ScheduledKind = 'resource' | 'project';

export interface NextUnit {
  id: string;
  title: string;
  url?: string;
  section?: string;
  /** 1-based position of this unit in the resource. */
  position: number;
  total: number;
}

export interface ScheduledItem {
  refId: string;
  kind: ScheduledKind;
  title: string;
  /** A resource's short name for lists, when it has one. */
  short?: string;
  provider?: string;
  /** The track the block's minutes are logged against by default. */
  track: TrackId;
  tracks: TrackId[];
  url: string | null;
  searchHint?: string;
  status: ItemStatus;
  estHours: number;
  /** Unit progress. `total` is 0 for an item without a checklist. */
  unitsDone: number;
  unitCount: number;
  /** Absent until the checklist chunk is loaded, or when the item has no checklist. */
  nextUnit?: NextUnit;
  note?: string;
  cadence?: Project['cadence'];
  parts?: string[];
  /** Projects only: what to build, and what counts as finished. A project has no link to open. */
  brief?: string;
  acceptance?: string[];
}

export type BlockPlanKind = 'item' | 'review' | 'rest' | 'empty';

export interface TodayBlock {
  id: BlockId;
  def: BlockDef;
  kind: BlockPlanKind;
  /** Minutes this block is meant to take today. 0 on a rest day. */
  targetMinutes: number;
  /** The lane's current item, absent on a review or rest day, or when the lane is finished. */
  item?: ScheduledItem;
  /** Block D also carries the week's mini-build. */
  weeklyBuild?: ScheduledItem;
  /** Why there is no item: shown instead of a card. */
  emptyReason?: string;
}

export interface TodayPlan {
  date: string;
  phase: Phase | null;
  blocks: TodayBlock[];
  targetMinutes: number;
  isReviewDay: boolean;
}

export function activePhase(date: string, phases: Phase[]): Phase | null {
  return phases.find((p) => isWithinRange(date, p.start, p.end)) ?? null;
}

/** The phase whose work applies on `date`: the active one, or the nearest if the date is outside the plan. */
export function effectivePhase(date: string, phases: Phase[]): Phase | null {
  const active = activePhase(date, phases);
  if (active) return active;
  if (phases.length === 0) return null;
  if (date < phases[0]!.start) return phases[0]!;
  return phases.at(-1)!;
}

export function statusOf(refId: string, states: Map<string, UserItemState>): ItemStatus {
  return states.get(refId)?.status ?? 'todo';
}

export function isOpen(refId: string, states: Map<string, UserItemState>): boolean {
  const status = statusOf(refId, states);
  return status !== 'done' && status !== 'dropped';
}

export interface ScheduleContext {
  seed: AppSeed;
  states: Map<string, UserItemState>;
  /** Unit checklists, when the chunk is loaded. Without it items still schedule, just without a next unit. */
  units?: Record<string, { id: string; title: string; url?: string; section?: string }[]>;
}

function describeResource(resource: AppResource, state: UserItemState | undefined, ctx: ScheduleContext, note?: string): ScheduledItem {
  const unitsDone = state?.unitsDone ?? [];
  const item: ScheduledItem = {
    refId: resource.id,
    kind: 'resource',
    title: resource.title,
    provider: resource.provider,
    track: resource.tracks[0]!,
    tracks: resource.tracks,
    url: resource.url,
    status: state?.status ?? 'todo',
    estHours: resource.estHours,
    unitsDone: unitsDone.length,
    unitCount: resource.unitCount,
  };
  if (resource.searchHint) item.searchHint = resource.searchHint;
  if (resource.short) item.short = resource.short;
  if (note) item.note = note;

  const list = ctx.units?.[resource.id];
  if (list && list.length > 0) {
    const done = new Set(unitsDone);
    const index = list.findIndex((u) => !done.has(u.id));
    if (index >= 0) {
      const unit = list[index]!;
      const next: NextUnit = { id: unit.id, title: unit.title, position: index + 1, total: list.length };
      if (unit.url) next.url = unit.url;
      if (unit.section) next.section = unit.section;
      item.nextUnit = next;
    }
  }
  return item;
}

function describeProject(project: Project, state: UserItemState | undefined, note?: string): ScheduledItem {
  const item: ScheduledItem = {
    refId: project.id,
    kind: 'project',
    title: project.title,
    track: project.tracks[0]!,
    tracks: project.tracks,
    url: project.sourceUrl ?? null,
    status: state?.status ?? 'todo',
    estHours: project.estHours,
    unitsDone: (state?.unitsDone ?? []).length,
    unitCount: project.acceptance.length,
    cadence: project.cadence,
    brief: project.brief,
    acceptance: project.acceptance,
  };
  if (project.parts && project.parts.length > 0) item.parts = project.parts;
  if (note) item.note = note;
  return item;
}

/** Turns a plan item into a card, or null when what it points at has gone missing. */
export function describePlanItem(planItem: PlanItem, ctx: ScheduleContext): ScheduledItem | null {
  if (planItem.resourceId) {
    const resource = ctx.seed.resources.find((r) => r.id === planItem.resourceId);
    return resource ? describeResource(resource, ctx.states.get(resource.id), ctx, planItem.note) : null;
  }
  const project = ctx.seed.projects.find((p) => p.id === planItem.projectId);
  return project ? describeProject(project, ctx.states.get(project.id), planItem.note) : null;
}

/** The plan items of one lane of one phase, in order. */
export function lane(seed: AppSeed, phaseId: string, block: BlockId): PlanItem[] {
  return seed.plan.filter((i) => i.phaseId === phaseId && i.block === block).sort((a, b) => a.order - b.order);
}

/** The first unfinished item of a lane, looking into later phases once this one is done. */
export function nextInLane(phaseId: string, block: BlockId, ctx: ScheduleContext): { planItem: PlanItem; fromLaterPhase: boolean } | null {
  const phases = ctx.seed.phases;
  const startAt = Math.max(0, phases.findIndex((p) => p.id === phaseId));
  for (let i = startAt; i < phases.length; i++) {
    for (const planItem of lane(ctx.seed, phases[i]!.id, block)) {
      const ref = planItem.resourceId ?? planItem.projectId!;
      if (isOpen(ref, ctx.states)) return { planItem, fromLaterPhase: i > startAt };
    }
  }
  return null;
}

/** The weekly mini-build for a week: the card the user picked, or the best match for the phase. */
export function weeklyBuildFor(
  phase: Phase | null,
  pickedId: string | undefined,
  ctx: ScheduleContext,
): ScheduledItem | null {
  const pool = ctx.seed.projects.filter((p) => p.cadence === 'weekly');
  const picked = pickedId ? pool.find((p) => p.id === pickedId) : undefined;
  const chosen = picked ?? suggestWeeklyBuild(phase, ctx);
  return chosen ? describeProject(chosen, ctx.states.get(chosen.id)) : null;
}

/**
 * "Pick my next project": the first unfinished card of the pool whose tracks overlap the current phase's
 * lanes, preferring the current stage. Deterministic on purpose, so the suggestion does not change under
 * the user between one glance and the next; `skip` walks further down the same list.
 */
export function suggestWeeklyBuild(phase: Phase | null, ctx: ScheduleContext, skip = 0): Project | null {
  const ordered = weeklyPool(phase, ctx);
  return ordered[skip % ordered.length] ?? null;
}

/**
 * The unfinished weekly builds that fit a phase: the current stage, on a track the phase's lanes touch. When
 * nothing matches it widens to the stage, then to every unfinished build.
 */
export function weeklyPool(phase: Phase | null, ctx: ScheduleContext): Project[] {
  const pool = ctx.seed.projects.filter((p) => p.cadence === 'weekly' && isOpen(p.id, ctx.states));
  if (pool.length === 0 || !phase) return pool;

  const phaseTracks = new Set<TrackId>();
  for (const planItem of ctx.seed.plan.filter((i) => i.phaseId === phase.id)) {
    const ref = planItem.resourceId
      ? ctx.seed.resources.find((r) => r.id === planItem.resourceId)
      : ctx.seed.projects.find((p) => p.id === planItem.projectId);
    for (const track of ref?.tracks ?? []) phaseTracks.add(track);
  }
  const sameStage = pool.filter((p) => p.stage === phase.stage);
  const matching = sameStage.filter((p) => p.tracks.some((t) => phaseTracks.has(t)));
  return matching.length > 0 ? matching : sameStage.length > 0 ? sameStage : pool;
}

/** The unfinished monthly projects a phase carries: in its lanes, or assigned to it in the curriculum. */
export function monthlyPool(phase: Phase | null, ctx: ScheduleContext): Project[] {
  const open = ctx.seed.projects.filter((p) => p.cadence === 'monthly' && isOpen(p.id, ctx.states));
  if (!phase) return open;
  const inPhase = new Set(ctx.seed.plan.filter((i) => i.phaseId === phase.id && i.projectId).map((i) => i.projectId!));
  return open.filter((p) => inPhase.has(p.id) || p.phaseId === phase.id);
}

/* ------------------------------------------------------------------ the day */

export interface TodayInput {
  date: string;
  settings: StoredSettings;
  weeklyPickId?: string;
  ctx: ScheduleContext;
}

export function planForDay({ date, settings, weeklyPickId, ctx }: TodayInput): TodayPlan {
  const phase = effectivePhase(date, ctx.seed.phases);
  const day = weekday(date);
  const review = settings.core.review;
  const isReviewDay = day === review.day;

  const blocks: TodayBlock[] = settings.core.blocks.map((def) => {
    const scheduledToday = def.days.includes(day);
    if (!scheduledToday) {
      return { id: def.id, def, kind: 'rest', targetMinutes: 0, emptyReason: 'Not scheduled today' };
    }
    if (isReviewDay && def.id === review.block) {
      return { id: def.id, def, kind: 'review', targetMinutes: def.minutes };
    }
    if (!phase) {
      return { id: def.id, def, kind: 'empty', targetMinutes: def.minutes, emptyReason: 'No phase covers this date' };
    }

    const next = nextInLane(phase.id, def.id, ctx);
    const block: TodayBlock = { id: def.id, def, kind: next ? 'item' : 'empty', targetMinutes: def.minutes };
    if (next) {
      const item = describePlanItem(next.planItem, ctx);
      if (item) {
        if (next.fromLaterPhase) item.note = 'Pulled forward: this lane is finished for ' + phase.title;
        block.item = item;
      } else {
        block.kind = 'empty';
        block.emptyReason = 'The next item in this lane is missing from the curriculum';
      }
    } else {
      block.emptyReason = 'Everything in this lane is done. Add an item on the Roadmap.';
    }

    // The projects block also carries the week's mini-build.
    if (def.id === 'D') {
      const weekly = weeklyBuildFor(phase, weeklyPickId, ctx);
      if (weekly) block.weeklyBuild = weekly;
      if (block.kind === 'empty' && weekly) block.kind = 'item';
    }
    return block;
  });

  return {
    date,
    phase,
    blocks,
    targetMinutes: blocks.reduce((sum, b) => sum + b.targetMinutes, 0),
    isReviewDay,
  };
}

/** The daily target in minutes, for the week's-hours line and the forecast. */
export function dailyTargetMinutes(settings: StoredSettings, date: string): number {
  const day = weekday(date);
  return settings.core.blocks.filter((b) => b.days.includes(day)).reduce((sum, b) => sum + b.minutes, 0);
}

export function weeklyTargetMinutes(settings: StoredSettings): number {
  return settings.core.blocks.reduce((sum, b) => sum + b.minutes * b.days.length, 0);
}
