/**
 * The Library's home, organised: what is in progress, the plan's paths (one per group of tracks, its items in plan
 * order), the next few steps across all of them, and the shelves to browse when something else is needed. Built
 * from the resolved plan, so the user's edits (moves, drops, additions) show; dropped items stay off the home.
 *
 * Pure.
 */
import type { ItemStatus, UserItemState } from '../db/types.ts';
import type { AppSeed } from '../seed/index.ts';
import type { BlockId, ResearchArea, RoadmapId } from '../seed/schema.ts';

/** A path: a group of tracks as the plan teaches it. Career and review is not a path. */
export interface PathDef {
  id: string;
  name: string;
  /** The tracks it gathers; a track of the user's joins the path of a track of its family. */
  tracks: readonly string[];
  /** A tag that claims a resource for this path before its track does: `inference` for Inference engineering. */
  tag?: string;
  /** The roadmap.sh roadmaps it follows (ATLAS-LIBRARY): their official pages head its view, their items join it. */
  roadmaps?: readonly RoadmapId[];
}

/**
 * In the board's order: the lanes of the first year first, then the second stage. Inference engineering, Software
 * architecture, DevOps, Simulation and Robotics are paths of their own (MORE-RESOURCES, ATLAS-LIBRARY); a path with
 * nothing on the plan is the Library's to browse.
 */
export const PATHS: readonly PathDef[] = [
  { id: 'ai', name: 'AI engineering', tracks: ['ai'], roadmaps: ['ai-engineer', 'ai-agents'] },
  { id: 'inference', name: 'Inference engineering', tracks: [], tag: 'inference', roadmaps: ['inference-engineering'] },
  { id: 'languages', name: 'Languages', tracks: ['languages'] },
  { id: 'graphics', name: 'Graphics', tracks: ['graphics', 'gamedev'], roadmaps: ['game-developer'] },
  { id: 'simulation', name: 'Simulation', tracks: ['simulation'] },
  { id: 'math', name: 'Math and physics', tracks: ['math', 'physics', 'chem'] },
  { id: 'systems', name: 'Systems', tracks: ['swe', 'systems'] },
  { id: 'architecture', name: 'Software architecture', tracks: ['architecture'], roadmaps: ['software-architect'] },
  { id: 'devops', name: 'DevOps', tracks: ['devops'] },
  { id: 'ee', name: 'Electrical and embedded', tracks: ['ee', 'embedded', 'controls'] },
  { id: 'me', name: 'Mechanical', tracks: ['mech'] },
  { id: 'robotics', name: 'Robotics', tracks: ['robotics'] },
];

/** The path a track belongs to: its own, or for a track of the user's, the path of a track of the same family. */
export function pathOfTrack(seed: Pick<AppSeed, 'tracks'>, track: string): PathDef | undefined {
  const own = PATHS.find((p) => p.tracks.includes(track));
  if (own) return own;
  const family = seed.tracks.find((t) => t.id === track)?.family;
  return PATHS.find((p) => p.tracks.some((t) => seed.tracks.find((x) => x.id === t)?.family === family));
}

/** The path a resource belongs to: the path its tag names (inference), else the path of its first track. */
export function pathOf(seed: Pick<AppSeed, 'tracks'>, resource: { tracks: readonly string[]; tags?: readonly string[] | undefined }): PathDef | undefined {
  return PATHS.find((p) => p.tag !== undefined && (resource.tags ?? []).includes(p.tag)) ?? pathOfTrack(seed, resource.tracks[0]!);
}

/**
 * Priority for years 1 to 3 (ATLAS-LIBRARY): 1 inference and the AI feeding it, 2 architecture, systems, languages and
 * DevOps, 3 graphics, simulation and robotics, 4 game development. An item the import gave none takes its track's.
 */
const PRIORITY_OF_TRACK: Readonly<Record<string, number>> = { ai: 1, swe: 2, systems: 2, architecture: 2, devops: 2, languages: 2, graphics: 3, simulation: 3, robotics: 3, gamedev: 4 };
export function priorityOf(item: { priority?: number | undefined; tracks: readonly string[] }): number {
  return item.priority ?? PRIORITY_OF_TRACK[item.tracks[0] ?? ''] ?? 3;
}

const LEVEL_RANK: Readonly<Record<string, number>> = { intro: 0, intermediate: 1, advanced: 2 };

/** What the Library sorts by: priority, then the plan year it fits, then level (beginner first). */
export interface Fit {
  priority: number;
  year?: number | undefined;
  level?: string | undefined;
}

/** Priority, then year (none last), then level (none between beginner and advanced). */
export function byFit(a: Fit, b: Fit): number {
  return a.priority - b.priority || (a.year ?? 9) - (b.year ?? 9) || (LEVEL_RANK[a.level ?? ''] ?? 1) - (LEVEL_RANK[b.level ?? ''] ?? 1);
}

/** A resource's fit: its own priority (or its track's), the year it fits from, its level. */
export function fitOf(r: { priority?: number | undefined; tracks: readonly string[]; fromYear?: number | undefined; level?: string | undefined }): Fit {
  return { priority: priorityOf(r), year: r.fromYear, level: r.level };
}

/** The resource rows of a roadmap.sh roadmap's official page, by the roadmap's id. */
export function roadmapPage(seed: Pick<AppSeed, 'resources'>, roadmap: RoadmapId): AppSeed['resources'][number] | undefined {
  return seed.resources.find((r) => r.url === 'https://roadmap.sh/' + roadmap);
}

/**
 * The Library's resources a path offers beyond its steps: not on the plan and not dropped, either its own (its tag or
 * first track) or serving one of its roadmaps; never a roadmap's own page, which heads the view instead. By fit, then
 * name.
 */
export function pathExtras(seed: AppSeed, states: ReadonlyMap<string, UserItemState>, pathId: string): AppSeed['resources'] {
  const def = PATHS.find((p) => p.id === pathId);
  const onPlan = new Set(seed.plan.map((i) => i.resourceId ?? i.projectId));
  const pages = new Set((def?.roadmaps ?? []).map((id) => 'https://roadmap.sh/' + id));
  return seed.resources
    .filter((r) => !onPlan.has(r.id) && states.get(r.id)?.status !== 'dropped' && !pages.has(r.url ?? ''))
    .filter((r) => pathOf(seed, r)?.id === pathId || (r.roadmap !== undefined && (def?.roadmaps ?? []).includes(r.roadmap)))
    .sort((a, b) => byFit(fitOf(a), fitOf(b)) || (a.short ?? a.title).localeCompare(b.short ?? b.title));
}

/** The year 3 research areas (ATLAS-LIBRARY), in the order the Research view shows them. */
export const RESEARCH: readonly { id: ResearchArea; name: string }[] = [
  { id: 'inference', name: 'Inference' },
  { id: 'world-models', name: 'World models' },
  { id: 'diffusion', name: 'Diffusion' },
  { id: 'genai', name: 'Generative AI' },
];

/**
 * The Research view: every resource with a research area, by area, papers first, the foundations (years 1 and 2)
 * before the frontier (year 3), then by fit and name. Dropped ones stay out.
 */
export function researchAreas(seed: AppSeed, states: ReadonlyMap<string, UserItemState>): { id: ResearchArea; name: string; items: AppSeed['resources'] }[] {
  const frontier = (r: { fromYear?: number | undefined }): number => ((r.fromYear ?? 3) >= 3 ? 1 : 0);
  return RESEARCH.map((area) => ({
    ...area,
    items: seed.resources
      .filter((r) => r.research === area.id && states.get(r.id)?.status !== 'dropped')
      .sort((a, b) => Number(b.type === 'paper') - Number(a.type === 'paper') || frontier(a) - frontier(b) || byFit(fitOf(a), fitOf(b)) || (a.short ?? a.title).localeCompare(b.short ?? b.title)),
  }));
}

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
  /** Its fit (ATLAS-LIBRARY): priority, the year of its phase, its level. */
  fit: Fit;
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

/**
 * Every path that has plan items, each with its steps in plan order: the plan's courses, books and tutorials (its
 * projects are the Projects shelf's and Block D's). Dropped items are left out.
 */
export function buildPaths(seed: AppSeed, states: ReadonlyMap<string, UserItemState>): LibraryPath[] {
  const byPath = new Map<string, PathStep[]>(PATHS.map((p) => [p.id, []]));
  for (const item of planInOrder(seed)) {
    if (!item.resourceId) continue;
    const kind = item.resourceId ? 'resource' : 'project';
    const refId = (item.resourceId ?? item.projectId)!;
    const status = states.get(refId)?.status ?? 'todo';
    if (status === 'dropped') continue;
    const source = kind === 'resource' ? seed.resources.find((r) => r.id === refId) : seed.projects.find((p) => p.id === refId);
    if (!source) continue;
    const path = kind === 'resource' ? pathOf(seed, source as AppSeed['resources'][number]) : pathOfTrack(seed, source.tracks[0]!);
    if (!path) continue;
    const hours = item.hours ?? source.estHours;
    const type = kind === 'resource' ? (seed.resources.find((r) => r.id === refId)?.type ?? 'course') : 'project';
    const phaseYear = seed.phases.find((ph) => ph.id === item.phaseId)?.year;
    const fit: Fit = kind === 'resource' ? { ...fitOf(source as AppSeed['resources'][number]), year: phaseYear } : { priority: priorityOf(source), year: phaseYear };
    byPath.get(path.id)!.push({ refId, kind, title: titleOf(seed, kind, refId), status, phaseId: item.phaseId, block: item.block, hours, type, fit });
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
 * The next steps across every path: steps not started, nearest first (by when the plan reaches them, then by fit), never the
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
  // When the plan reaches it first; among steps of one start, by fit (priority, year, level), then lane and place.
  const order = (u: UpNext): string => u.step.block + String(u.path.steps.indexOf(u.step)).padStart(4, '0');
  return all.sort((a, b) => a.start.localeCompare(b.start) || byFit(a.step.fit, b.step.fit) || order(a).localeCompare(order(b))).slice(0, count);
}

/** The resources in progress, at most `cap`, the ones started earliest first. */
export function inProgress<R extends { id: string }>(resources: readonly R[], states: ReadonlyMap<string, UserItemState>, cap = 6): R[] {
  return resources
    .filter((r) => states.get(r.id)?.status === 'active')
    .sort((a, b) => (states.get(a.id)?.startedAt ?? '9999').localeCompare(states.get(b.id)?.startedAt ?? '9999'))
    .slice(0, cap);
}

export type ShelfKey = 'course' | 'book' | 'paper' | 'article' | 'blog' | 'tool' | 'practice' | 'project';

/**
 * The shelf a resource sits on: lectures and tutorials are courses; repos and tools are tools; things to do by hand,
 * practice and problem sets, are Practice (RESOURCES-ADD).
 */
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
      return 'tool';
    case 'practice':
    case 'problems':
      return 'practice';
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
  { key: 'practice', label: 'Practice' },
  { key: 'project', label: 'Projects' },
];

/** How many things each shelf holds: resources by their shelf, the papers queue, and every project. */
export function shelfCounts(seed: Pick<AppSeed, 'resources' | 'papers' | 'projects'>, catalogueSize = 0): Record<ShelfKey, number> {
  const counts: Record<ShelfKey, number> = { course: 0, book: 0, paper: seed.papers.length, article: 0, blog: 0, tool: 0, practice: 0, project: seed.projects.length + catalogueSize };
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

/** Whether a path starts more than a year after `today`: the home folds those into one "Later in the plan" row. */
export function startsMuchLater(path: LibraryPath, seed: AppSeed, today: string): boolean {
  const first = path.steps[0];
  const start = first ? seed.phases.find((p) => p.id === first.phaseId)?.start : undefined;
  if (!start || path.done > 0) return false;
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  return start > String(y + 1) + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}
