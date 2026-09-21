/**
 * The roadmap the user actually has: the seed curriculum with their edits layered over it.
 *
 * Edits are stored as patches against a stable id rather than as copies, so that editing a YAML file and
 * rebuilding keeps them. A patch that no longer applies (its item was renamed away in /data) is ignored
 * rather than crashing the page.
 */
import { PlanItemSchema, ProjectSchema, ResourceSchema } from '../seed/schema.ts';
import type { AppResource, AppSeed, PlanItem, Project } from '../seed/schema.ts';
import type { CustomEntity, Override } from '../db/types.ts';

function patched<T extends object>(base: T, patch: Record<string, unknown> | undefined): T {
  return patch ? ({ ...base, ...patch } as T) : base;
}

/** Applies the user's custom items and patches to the seed. Returns a new seed; the original is untouched. */
export function resolveSeed(seed: AppSeed, overrides: Override[], customs: CustomEntity[]): AppSeed {
  const byKind = <T>(kind: string, rows: { kind: string }[]): T[] => rows.filter((r) => r.kind === kind) as T[];
  const patchFor = (kind: string): Map<string, Override> =>
    new Map(overrides.filter((o) => o.kind === kind).map((o) => [o.id, o]));

  const resourcePatches = patchFor('resource');
  const projectPatches = patchFor('project');
  const planPatches = patchFor('planItem');

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

  /* ---- plan items: patched, removed ones dropped, custom ones appended */
  const plan: PlanItem[] = [];
  for (const item of seed.plan) {
    const override = planPatches.get(item.id);
    if (override?.removed) continue;
    plan.push(patched(item, override?.patch));
  }
  for (const custom of byKind<CustomEntity>('planItem', customs)) {
    const parsed = PlanItemSchema.safeParse(custom.data);
    if (!parsed.success) continue;
    const override = planPatches.get(custom.id);
    if (override?.removed) continue;
    plan.push(patched(parsed.data, override?.patch));
  }

  // Drop plan items whose target has gone: the curriculum may have been edited since.
  const known = new Set<string>([...resources.map((r) => r.id), ...projects.map((p) => p.id)]);
  const live = plan.filter((i) => known.has(i.resourceId ?? i.projectId ?? ''));

  return { ...seed, resources, projects, plan: live };
}

/** The next free order value at the end of a lane, leaving room to insert before it later. */
export function nextOrder(plan: PlanItem[], phaseId: string, block: string): number {
  const inLane = plan.filter((i) => i.phaseId === phaseId && i.block === block);
  return inLane.length === 0 ? 10 : Math.max(...inLane.map((i) => i.order)) + 10;
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
