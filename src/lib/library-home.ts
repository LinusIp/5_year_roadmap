/**
 * The Library's home, organised: what is in progress, the plan's paths (one per family of tracks, its items in plan
 * order), the next few steps across all of them, and the shelves to browse when something else is needed. Built
 * from the resolved plan, so the user's edits (moves, drops, additions) show; dropped items stay off the home.
 *
 * Pure.
 */
import type { ItemStatus, UserItemState } from '../db/types.ts';
import type { AppSeed } from '../seed/index.ts';
import type { BlockId } from '../seed/schema.ts';

/** A path: a family of tracks as the plan teaches it. Career and review is not a path. */
export interface PathDef {
  id: string;
  name: string;
  /** The track family (tracks.yaml) it gathers. */
  family: string;
}

/** In the board's order: the lanes of the first year first, then the second stage. */
export const PATHS: readonly PathDef[] = [
  { id: 'ai', name: 'AI engineering', family: 'AI & ML' },
  { id: 'languages', name: 'Languages', family: 'Languages' },
  { id: 'graphics', name: 'Graphics', family: 'Graphics, simulation & games' },
  { id: 'math', name: 'Math and physics', family: 'Math & science' },
  { id: 'systems', name: 'Systems', family: 'Software & systems' },
  { id: 'ee', name: 'Electrical and embedded', family: 'Electrical & embedded' },
  { id: 'me', name: 'Mechanical and robotics', family: 'Mechanical & robotics' },
];

export interface PathStep {
  refId: string;
  kind: 'resource' | 'project';
  title: string;
  status: ItemStatus;
  phaseId: string;
  block: BlockId;
  hours: number;
  /** The resource type ("course", "book") or "project". */
  type: string;
}

export interface LibraryPath extends PathDef {
  steps: PathStep[];
  /** The first step not done, or -1 when every step is. */
  current: number;
  done: number;
}

const titleOf = (seed: AppSeed, kind: 'resource' | 'project', id: string): string => {
  if (kind === 'resource') {
    const r = seed.resources.find((x) => x.id === id);
    return r?.short ?? r?.title ?? id;
  }
  return seed.projects.find((p) => p.id === id)?.title ?? id;
};

/**
 * The plan's items in order: by the phase's start, then the lane (A to E), then their order in the lane. An item
 * that appears twice (LearnOpenGL across two phases) counts once, at its first place.
 */
export function planInOrder(seed: AppSeed): AppSeed['plan'] {
  const start = new Map(seed.phases.map((p) => [p.id, p.start]));
  const seen = new Set<string>();
  return [...seed.plan]
    .sort((a, b) => (start.get(a.phaseId) ?? '').localeCompare(start.get(b.phaseId) ?? '') || a.block.localeCompare(b.block) || a.order - b.order)
    .filter((item) => {
      const ref = item.resourceId ?? item.projectId!;
      if (seen.has(ref)) return false;
      seen.add(ref);
      return true;
    });
}

/** Every path that has plan items, each with its steps in plan order. Dropped items are left out. */
export function buildPaths(seed: AppSeed, states: ReadonlyMap<string, UserItemState>): LibraryPath[] {
  const familyOf = new Map(seed.tracks.map((t) => [t.id, t.family]));
  const byPath = new Map<string, PathStep[]>(PATHS.map((p) => [p.id, []]));
  for (const item of planInOrder(seed)) {
    const kind = item.resourceId ? 'resource' : 'project';
    const refId = (item.resourceId ?? item.projectId)!;
    const status = states.get(refId)?.status ?? 'todo';
    if (status === 'dropped') continue;
    const source = kind === 'resource' ? seed.resources.find((r) => r.id === refId) : seed.projects.find((p) => p.id === refId);
    if (!source) continue;
    const family = familyOf.get(source.tracks[0]!);
    const path = PATHS.find((p) => p.family === family);
    if (!path) continue;
    const hours = item.hours ?? source.estHours;
    const type = kind === 'resource' ? (seed.resources.find((r) => r.id === refId)?.type ?? 'course') : 'project';
    byPath.get(path.id)!.push({ refId, kind, title: titleOf(seed, kind, refId), status, phaseId: item.phaseId, block: item.block, hours, type });
  }
  return PATHS.flatMap((def) => {
    const steps = byPath.get(def.id)!;
    if (steps.length === 0) return [];
    const current = steps.findIndex((s) => s.status !== 'done');
    return [{ ...def, steps, current, done: steps.filter((s) => s.status === 'done').length }];
  });
}

export type Dot = 'done' | 'current' | 'later';

/**
 * A path's subway line: at most `max` dots, starting just before the current step so it shows, and "+N" for the
 * steps beyond the far end.
 */
export function pathDots(path: Pick<LibraryPath, 'steps' | 'current'>, max = 8): { dots: Dot[]; more: number; from: number } {
  const total = path.steps.length;
  const current = path.current < 0 ? total : path.current;
  const from = total <= max ? 0 : Math.max(0, Math.min(current - 1, total - max));
  const shown = path.steps.slice(from, from + max);
  const dots = shown.map((s, i): Dot => (from + i === current ? 'current' : s.status === 'done' ? 'done' : 'later'));
  return { dots, more: Math.max(0, total - from - shown.length), from };
}

export interface UpNext {
  step: PathStep;
  path: LibraryPath;
  /** The step before it on its path, when that one is not done yet: "after LearnOpenGL". */
  after?: string;
  /** The phase's start, when the plan reaches it. */
  start: string;
}

/**
 * The next steps across every path: steps not started, nearest first (by when the plan reaches them), never the
 * current step of a path that is already in progress twice over.
 */
export function upNext(paths: readonly LibraryPath[], seed: AppSeed, count = 3): UpNext[] {
  const start = new Map(seed.phases.map((p) => [p.id, p.start]));
  const all: UpNext[] = [];
  for (const path of paths) {
    path.steps.forEach((step, i) => {
      if (step.status !== 'todo') return;
      const before = path.steps[i - 1];
      const item: UpNext = { step, path, start: start.get(step.phaseId) ?? '' };
      if (before && before.status !== 'done') item.after = before.title;
      all.push(item);
    });
  }
  const order = (u: UpNext): string => u.start + u.step.block + String(u.path.steps.indexOf(u.step)).padStart(4, '0');
  return all.sort((a, b) => order(a).localeCompare(order(b))).slice(0, count);
}

/** The resources in progress, at most `cap`, the ones started earliest first. */
export function inProgress<R extends { id: string }>(resources: readonly R[], states: ReadonlyMap<string, UserItemState>, cap = 6): R[] {
  return resources
    .filter((r) => states.get(r.id)?.status === 'active')
    .sort((a, b) => (states.get(a.id)?.startedAt ?? '9999').localeCompare(states.get(b.id)?.startedAt ?? '9999'))
    .slice(0, cap);
}

export type ShelfKey = 'course' | 'book' | 'paper' | 'article' | 'blog' | 'tool' | 'project';

/** The shelf a resource sits on: lectures and tutorials are courses; repos, tools and problem sets are tools. */
export function shelfOf(resource: { type: string; blog?: boolean | undefined }): ShelfKey {
  if (resource.blog) return 'blog';
  switch (resource.type) {
    case 'book':
      return 'book';
    case 'paper':
      return 'paper';
    case 'article':
      return 'article';
    case 'repo':
    case 'tool':
    case 'problems':
      return 'tool';
    default:
      return 'course';
  }
}

export const SHELVES: readonly { key: ShelfKey; label: string }[] = [
  { key: 'course', label: 'Courses' },
  { key: 'book', label: 'Books' },
  { key: 'paper', label: 'Papers' },
  { key: 'article', label: 'Articles' },
  { key: 'blog', label: 'Blogs' },
  { key: 'tool', label: 'Tools' },
  { key: 'project', label: 'Projects' },
];

/** How many things each shelf holds: resources by their shelf, the papers queue, and every project. */
export function shelfCounts(seed: Pick<AppSeed, 'resources' | 'papers' | 'projects'>, catalogueSize = 0): Record<ShelfKey, number> {
  const counts: Record<ShelfKey, number> = { course: 0, book: 0, paper: seed.papers.length, article: 0, blog: 0, tool: 0, project: seed.projects.length + catalogueSize };
  for (const r of seed.resources) counts[shelfOf(r)] += 1;
  return counts;
}

/** Search results by shelf, in the shelves' order: the first `top` of each, and how many there are. */
export function groupResults<E extends { shelf: ShelfKey }>(results: readonly E[], top = 3): { shelf: ShelfKey; label: string; items: E[]; total: number }[] {
  return SHELVES.flatMap((s) => {
    const all = results.filter((r) => r.shelf === s.key);
    return all.length === 0 ? [] : [{ shelf: s.key, label: s.label, items: all.slice(0, top), total: all.length }];
  });
}
