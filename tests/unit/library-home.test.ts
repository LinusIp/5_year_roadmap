import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';
import type { AppSeed } from '../../src/seed/schema.ts';
import type { UserItemState } from '../../src/db/types.ts';
import { buildPaths, groupResults, inProgress, pathDots, planInOrder, shelfCounts, shelfOf, startsMuchLater, upNext } from '../../src/lib/library-home.ts';
import type { PathStep } from '../../src/lib/library-home.ts';

const seed = splitSeed(loadSeedOrThrow()).app as AppSeed;
const state = (refId: string, status: UserItemState['status'], startedAt?: string): [string, UserItemState] => [refId, { refId, status, unitsDone: [], ...(startedAt ? { startedAt } : {}) } as UserItemState];
const steps = (n: number, done: number): PathStep[] =>
  Array.from({ length: n }, (_, i) => ({ refId: 'r' + i, kind: 'resource', title: 'R' + i, status: i < done ? 'done' : 'todo', phaseId: 'p', block: 'A', hours: 1, type: 'course' }));

describe('the paths', () => {
  it('gather the plan’s resources by track family, in plan order, without projects', () => {
    const paths = buildPaths(seed, new Map());
    expect(paths.map((p) => p.id).slice(0, 5)).toEqual(['ai', 'languages', 'graphics', 'math', 'systems']);
    expect(paths.every((p) => p.steps.every((s) => s.kind === 'resource'))).toBe(true);
    const ai = paths.find((p) => p.id === 'ai')!;
    expect(ai.steps[0]!.refId).toBe('ml-zoomcamp');
    // An item planned twice (LearnOpenGL over two phases) is one step.
    const graphics = paths.find((p) => p.id === 'graphics')!;
    expect(graphics.steps.filter((s) => s.refId === 'learnopengl')).toHaveLength(1);
    expect(planInOrder(seed).length).toBeLessThan(seed.plan.length);
  });

  it('leave dropped items out, and count done ones', () => {
    const paths = buildPaths(seed, new Map([state('ml-zoomcamp', 'done'), state('hf-llm-course', 'dropped')]));
    const ai = paths.find((p) => p.id === 'ai')!;
    expect(ai.done).toBe(1);
    expect(ai.steps.some((s) => s.refId === 'hf-llm-course')).toBe(false);
    expect(ai.steps[ai.current]!.refId).not.toBe('ml-zoomcamp');
  });

  it('fold the ones that start more than a year away', () => {
    const paths = buildPaths(seed, new Map());
    const later = paths.filter((p) => startsMuchLater(p, seed, '2026-10-16')).map((p) => p.id);
    expect(later).toEqual(expect.arrayContaining(['ee', 'me']));
    expect(later).not.toContain('ai');
  });
});

describe('the subway line', () => {
  it('shows every step when there are 8 or fewer', () => {
    expect(pathDots({ steps: steps(5, 2), current: 2 })).toEqual({ dots: ['done', 'done', 'current', 'later', 'later'], more: 0, from: 0 });
  });

  it('shows 8 from just before the current step, and +N for the far end', () => {
    const line = pathDots({ steps: steps(30, 10), current: 10 });
    expect(line.dots).toHaveLength(8);
    expect(line.dots[1]).toBe('current');
    expect(line.from).toBe(9);
    expect(line.more).toBe(13);
  });

  it('ends on the last 8 when the current step is near the end, and all done has no current', () => {
    expect(pathDots({ steps: steps(30, 28), current: 28 }).more).toBe(0);
    expect(pathDots({ steps: steps(12, 12), current: -1 }).dots.every((d) => d === 'done')).toBe(true);
  });
});

describe('up next and in progress', () => {
  it('are the three nearest steps not started, across every path', () => {
    const next = upNext(buildPaths(seed, new Map()), seed);
    expect(next).toHaveLength(3);
    const starts = next.map((n) => n.start);
    expect([...starts].sort()).toEqual(starts);
    expect(next.every((n) => n.step.status === 'todo')).toBe(true);
  });

  it('name the step before when it is not done yet', () => {
    const next = upNext(buildPaths(seed, new Map()), seed, 50);
    const second = next.find((n) => n.path.steps.indexOf(n.step) > 0)!;
    expect(second.after).toBe(second.path.steps[second.path.steps.indexOf(second.step) - 1]!.title);
  });

  it('caps the resources in progress at 6, the earliest started first', () => {
    const states = new Map(seed.resources.slice(0, 8).map((r, i) => state(r.id, 'active', '2026-10-' + String(10 - i).padStart(2, '0'))));
    const active = inProgress(seed.resources, states);
    expect(active).toHaveLength(6);
    expect(active[0]!.id).toBe(seed.resources[7]!.id);
  });
});

describe('the shelves', () => {
  it('put lectures and tutorials with courses, repos with tools, practice and problem sets on Practice, and blogs on their own', () => {
    expect(shelfOf({ type: 'lectures' })).toBe('course');
    expect(shelfOf({ type: 'tutorial' })).toBe('course');
    expect(shelfOf({ type: 'repo' })).toBe('tool');
    expect(shelfOf({ type: 'practice' })).toBe('practice');
    expect(shelfOf({ type: 'problems' })).toBe('practice');
    expect(shelfOf({ type: 'article', blog: true })).toBe('blog');
  });

  it('count every resource once, papers and projects too', () => {
    const counts = shelfCounts(seed, 10);
    const resources = counts.course + counts.book + counts.article + counts.blog + counts.tool + counts.practice + seed.resources.filter((r) => r.type === 'paper').length;
    expect(resources).toBe(seed.resources.length);
    expect(counts.paper).toBe(seed.papers.length + seed.resources.filter((r) => r.type === 'paper').length);
    expect(counts.project).toBe(seed.projects.length + 10);
    expect(counts.blog).toBeGreaterThan(0);
    expect(counts.practice).toBeGreaterThan(30);
  });

  it('group search results by shelf, three of each, with the total', () => {
    const results = [
      { id: 'a', shelf: 'book' as const },
      { id: 'b', shelf: 'course' as const },
      { id: 'c', shelf: 'course' as const },
      { id: 'd', shelf: 'course' as const },
      { id: 'e', shelf: 'course' as const },
    ];
    const groups = groupResults(results);
    expect(groups.map((g) => g.shelf)).toEqual(['course', 'book']);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(['b', 'c', 'd']);
    expect(groups[0]!.total).toBe(4);
  });
});
