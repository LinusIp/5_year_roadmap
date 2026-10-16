/**
 * The roadmap the user actually has: the seed curriculum with their edits layered over it.
 *
 * Edits are stored as patches against a stable id rather than as copies, so that editing a YAML file and
 * rebuilding keeps them. A patch that no longer applies (its item was renamed away in /data) is ignored
 * rather than crashing the page.
 */
import { PlanItemSchema, ProjectSchema, ResourceSchema, TrackSchema } from '../seed/schema.ts';
import type { AppResource, AppSeed, Goal, Phase, PlanItem, Project, Track } from '../seed/schema.ts';
import type { CustomEntity, NewPlanPatch, Override, PlanPatch } from '../db/types.ts';

function patched<T extends object>(base: T, patch: Record<string, unknown> | undefined): T {
  return patch ? ({ ...base, ...patch } as T) : base;
}

/** Patches in the order they apply: by time, then by id, so every device applies them alike. */
export function orderPatches(patches: readonly PlanPatch[]): PlanPatch[] {
  return [...patches].sort((a, b) => (a.at === b.at ? a.id.localeCompare(b.id) : a.at.localeCompare(b.at)));
}

/**
 * Plan-item edits as earlier versions stored them (an override per plan item, a "removed" flag, custom plan
 * items), as patches. Used once by the database upgrade, and on any old backup or plan.json read since.
 */
export function legacyPlanPatches(overrides: readonly Override[], customs: readonly CustomEntity[], at: string): PlanPatch[] {
  const out: PlanPatch[] = [];
  const group = 'legacy';
  for (const custom of customs) {
    if (custom.kind !== 'planItem') continue;
    const parsed = PlanItemSchema.safeParse(custom.data);
    if (parsed.success) out.push({ id: 'legacy-add-' + custom.id, at, group, op: 'add', item: parsed.data });
  }
  for (const o of overrides) {
    if (o.kind !== 'planItem') continue;
    const patch = o.patch as Partial<PlanItem>;
    if (typeof patch.order === 'number' || patch.phaseId || patch.block) {
      const move: PlanPatch = { id: 'legacy-move-' + o.id, at, group, op: 'move', planItemId: o.id, order: typeof patch.order === 'number' ? patch.order : NaN };
      if (patch.phaseId) move.phaseId = patch.phaseId;
      if (patch.block) move.block = patch.block;
      out.push(move);
    }
    if (o.removed) out.push({ id: 'legacy-drop-' + o.id, at, group, op: 'drop', planItemId: o.id });
  }
  return out;
}

/** The phases with the user's edits: renamed, re-dated, refocused, and phases of their own inserted. */
function applyPhasePatches(phases: Phase[], patches: PlanPatch[], problems: string[]): Phase[] {
  let out = phases.map((p) => ({ ...p, focus: { ...p.focus } }));
  for (const patch of patches) {
    if (patch.op === 'editPhase') {
      const phase = out.find((p) => p.id === patch.phaseId);
      if (!phase) {
        problems.push('A phase edit names "' + patch.phaseId + '", which no longer exists');
        continue;
      }
      if (patch.title) phase.title = patch.title;
      if (patch.start) phase.start = patch.start;
      if (patch.end) phase.end = patch.end;
      if (patch.goal) phase.goal = patch.goal;
      if (patch.focus) phase.focus = { ...phase.focus, ...patch.focus };
    } else if (patch.op === 'addPhase') {
      const index = out.findIndex((p) => p.id === patch.after);
      if (index < 0) {
        problems.push('A new phase follows "' + patch.after + '", which no longer exists');
        continue;
      }
      if (out.some((p) => p.id === patch.phase.id)) continue;
      const parent = out[index]!;
      const phase: Phase = {
        ...parent,
        id: patch.phase.id,
        title: patch.phase.title,
        start: patch.phase.start,
        end: patch.phase.end,
        goal: patch.phase.goal,
        focus: { ...parent.focus, ...patch.phase.focus },
      };
      delete phase.map;
      out = [...out.slice(0, index + 1), phase, ...out.slice(index + 1)];
    }
  }
  return out;
}

export interface ResolvedPlan {
  plan: PlanItem[];
  dropped: PlanItem[];
  goals: Goal[];
  tracks: Track[];
  phases: Phase[];
  problems: string[];
}

/**
 * Applies plan patches, in order, to the plan items, phases and tracks. A patch naming something that is not
 * there (an item removed from /data, a phase renamed away) is skipped and reported, never fatal.
 */
export function applyPlanPatches(base: { plan: PlanItem[]; phases: Phase[]; tracks: Track[] }, patches: readonly PlanPatch[], known: (refId: string) => boolean): ResolvedPlan {
  const problems: string[] = [];
  const ordered = orderPatches(patches);
  const items = new Map(base.plan.map((i) => [i.id, { ...i }]));
  const dropped = new Set<string>();
  const goals = new Map<string, Goal>();
  const tracks = [...base.tracks];
  const missingItem = (id: string, what: string): void => void problems.push(what + ' names plan item "' + id + '", which no longer exists');

  for (const patch of ordered) {
    switch (patch.op) {
      case 'add':
        if (!items.has(patch.item.id)) items.set(patch.item.id, { ...patch.item });
        break;
      case 'drop':
        if (items.has(patch.planItemId)) dropped.add(patch.planItemId);
        else missingItem(patch.planItemId, 'Taking an item off the plan');
        break;
      case 'restore':
        dropped.delete(patch.planItemId);
        break;
      case 'move': {
        const item = items.get(patch.planItemId);
        if (!item) {
          missingItem(patch.planItemId, 'A move');
          break;
        }
        if (Number.isFinite(patch.order)) item.order = patch.order;
        if (patch.phaseId) item.phaseId = patch.phaseId;
        if (patch.block) item.block = patch.block;
        break;
      }
      case 'swap': {
        const item = items.get(patch.planItemId);
        if (!item) {
          missingItem(patch.planItemId, 'A swap');
          break;
        }
        const ref = patch.resourceId ?? patch.projectId;
        if (!ref || !known(ref)) {
          problems.push('A swap names "' + (ref ?? '?') + '", which is not in the library');
          break;
        }
        delete item.resourceId;
        delete item.projectId;
        if (patch.resourceId) item.resourceId = patch.resourceId;
        else item.projectId = patch.projectId!;
        // The hours of the old item do not carry over to its alternative.
        delete item.hours;
        break;
      }
      case 'custom': {
        const parsed = TrackSchema.safeParse({ ...patch.data, source: 'user' });
        const id = String(patch.data.id ?? '');
        const at = tracks.findIndex((t) => t.id === id);
        if (patch.remove) {
          if (at >= 0 && tracks[at]!.source === 'user') tracks.splice(at, 1);
        } else if (parsed.success) {
          if (at >= 0) tracks[at] = parsed.data;
          else tracks.push(parsed.data);
        }
        break;
      }
      case 'goal':
        if (patch.remove) goals.delete(patch.goal.id);
        else goals.set(patch.goal.id, patch.goal);
        break;
      case 'editPhase':
      case 'addPhase':
        break;
    }
  }
  const phases = applyPhasePatches(base.phases, ordered, problems);
  const phaseIds = new Set(phases.map((p) => p.id));
  const all = [...items.values()].filter((i) => known(i.resourceId ?? i.projectId ?? '') && phaseIds.has(i.phaseId));
  return {
    plan: all.filter((i) => !dropped.has(i.id)),
    dropped: all.filter((i) => dropped.has(i.id)),
    goals: [...goals.values()].sort((a, b) => a.date.localeCompare(b.date)),
    tracks,
    phases,
    problems: [...new Set(problems)],
  };
}

/** Applies the user's custom items, entity edits and plan patches to the seed. Returns a new seed; the original is untouched. */
export function resolveSeed(seed: AppSeed, overrides: Override[], customs: CustomEntity[], patches: readonly PlanPatch[] = []): AppSeed {
  const byKind = <T>(kind: string, rows: { kind: string }[]): T[] => rows.filter((r) => r.kind === kind) as T[];
  const patchFor = (kind: string): Map<string, Override> =>
    new Map(overrides.filter((o) => o.kind === kind).map((o) => [o.id, o]));

  const resourcePatches = patchFor('resource');
  const projectPatches = patchFor('project');

  /* ---- resources: seed rows patched, then the user's own appended */
  const resources: AppResource[] = seed.resources.map((r) => patched(r, resourcePatches.get(r.id)?.patch));
  for (const custom of byKind<CustomEntity>('resource', customs)) {
    const parsed = ResourceSchema.safeParse(custom.data);
    if (!parsed.success) continue;
    const { units, ...rest } = parsed.data;
    resources.push(patched({ ...rest, unitCount: units?.length ?? 0 }, resourcePatches.get(custom.id)?.patch));
  }

  /* ---- projects */
  const projects: Project[] = seed.projects.map((p) => patched(p, projectPatches.get(p.id)?.patch));
  for (const custom of byKind<CustomEntity>('project', customs)) {
    const parsed = ProjectSchema.safeParse(custom.data);
    if (!parsed.success) continue;
    const stage = parsed.data.stage ?? seed.phases.find((ph) => ph.id === parsed.data.phaseId)?.stage ?? 1;
    projects.push(patched({ ...parsed.data, stage }, projectPatches.get(custom.id)?.patch));
  }

  /* ---- plan items: edits stored the old way (a backup from before the patches) first, then the patches */
  const legacy = legacyPlanPatches(overrides, customs, '');
  const known = new Set<string>([...resources.map((r) => r.id), ...projects.map((p) => p.id)]);
  const resolved = applyPlanPatches({ plan: seed.plan, phases: seed.phases, tracks: seed.tracks }, [...legacy, ...patches], (id) => known.has(id));

  return {
    ...seed,
    resources,
    projects,
    tracks: resolved.tracks,
    phases: resolved.phases,
    plan: resolved.plan,
    dropped: resolved.dropped,
    goals: resolved.goals,
    patchProblems: resolved.problems,
  };
}

/** A new id for a patch or a group: time-ordered and unique enough across devices. */
export function patchId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** Stamps new patches as one group: one action, one undo. */
export function stampPatches(patches: readonly NewPlanPatch[], label: string, now: Date = new Date()): PlanPatch[] {
  const group = patchId();
  const at = now.toISOString();
  return patches.map((p, i) => ({ ...p, id: group + '-' + i, at, group, label }) as PlanPatch);
}

export interface EditGroup {
  group: string;
  label: string;
  at: string;
  patches: PlanPatch[];
}

/** The last `limit` edit groups, newest first: what Undo can take back. */
export function undoableGroups(patches: readonly PlanPatch[], limit = 50): EditGroup[] {
  const groups = new Map<string, EditGroup>();
  for (const p of orderPatches(patches)) {
    if (p.group === 'legacy') continue;
    const g = groups.get(p.group) ?? { group: p.group, label: p.label ?? 'Plan edit', at: p.at, patches: [] };
    g.patches.push(p);
    if (p.at > g.at) g.at = p.at;
    groups.set(p.group, g);
  }
  return [...groups.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

/** The next free order value at the end of a lane, leaving room to insert before it later. */
export function nextOrder(plan: PlanItem[], phaseId: string, block: string): number {
  const inLane = plan.filter((i) => i.phaseId === phaseId && i.block === block);
  return inLane.length === 0 ? 10 : Math.max(...inLane.map((i) => i.order)) + 10;
}

/**
 * "Take it" from the project deck: the project becomes the next unfinished item of a lane. An appearance
 * already in that lane moves up; one in another phase moves into this lane; a project with no appearance
 * gets a new one (`add`). The lane is renumbered in tens, and only the items whose place changed are patched.
 */
export function takeIntoLane(
  plan: PlanItem[],
  isOpen: (refId: string) => boolean,
  phaseId: string,
  block: string,
  projectId: string,
): { patches: { id: string; patch: Partial<PlanItem> }[]; add?: Omit<PlanItem, 'id'> } {
  const inLane = (i: PlanItem): boolean => i.phaseId === phaseId && i.block === block;
  const lane = plan.filter(inLane).sort((a, b) => a.order - b.order);
  const existing = lane.find((i) => i.projectId === projectId) ?? plan.find((i) => i.projectId === projectId);
  const rest = lane.filter((i) => i !== existing);
  const firstOpen = rest.findIndex((i) => isOpen(i.resourceId ?? i.projectId ?? ''));
  const at = firstOpen < 0 ? rest.length : firstOpen;

  if (existing && inLane(existing) && lane.indexOf(existing) <= lane.findIndex((i) => isOpen(i.resourceId ?? i.projectId ?? ''))) {
    return { patches: [] };
  }

  const ordered: (PlanItem | null)[] = [...rest];
  ordered.splice(at, 0, existing ?? null);
  const patches: { id: string; patch: Partial<PlanItem> }[] = [];
  let add: Omit<PlanItem, 'id'> | undefined;
  ordered.forEach((item, index) => {
    const order = (index + 1) * 10;
    if (item === null) {
      add = { phaseId, block: block as PlanItem['block'], projectId, order };
    } else if (item === existing && !inLane(item)) {
      patches.push({ id: item.id, patch: { phaseId, block: block as PlanItem['block'], order } });
    } else if (item.order !== order) {
      patches.push({ id: item.id, patch: { order } });
    }
  });
  return add ? { patches, add } : { patches };
}

/**
 * Reorders a lane by moving one item to a new index, and returns the `order` each item should have.
 * Orders are renumbered in tens so a later insert does not need another renumber.
 */
export function reorderLane(items: PlanItem[], fromIndex: number, toIndex: number): { id: string; order: number }[] {
  const ordered = [...items].sort((a, b) => a.order - b.order);
  const moving = ordered[fromIndex];
  if (!moving || toIndex < 0 || toIndex >= ordered.length) return [];
  ordered.splice(fromIndex, 1);
  ordered.splice(toIndex, 0, moving);
  return ordered.map((item, index) => ({ id: item.id, order: (index + 1) * 10 }));
}
