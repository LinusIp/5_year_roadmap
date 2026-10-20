import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';
import type { AppSeed } from '../../src/seed/schema.ts';
import type { UserItemState } from '../../src/db/types.ts';
import { buildPaths, byFit, fitOf, groupResults, inProgress, pathDots, pathExtras, pathOf, pathOfTrack, planInOrder, priorityOf, researchAreas, roadmapPage, shelfCounts, shelfOf, startsMuchLater, upNext } from '../../src/lib/library-home.ts';
import type { PathStep } from '../../src/lib/library-home.ts';

const seed = splitSeed(loadSeedOrThrow()).app as AppSeed;
const state = (refId: string, status: UserItemState['status'], startedAt?: string): [string, UserItemState] => [refId, { refId, status, unitsDone: [], ...(startedAt ? { startedAt } : {}) } as UserItemState];
const steps = (n: number, done: number): PathStep[] =>
  Array.from({ length: n }, (_, i) => ({ refId: 'r' + i, kind: 'resource', title: 'R' + i, status: i < done ? 'done' : 'todo', phaseId: 'p', block: 'A', hours: 1, type: 'course', fit: { priority: 1 } }));

describe('the paths', () => {
  it('gather the plan’s resources by their tracks, in plan order, without projects', () => {
    const paths = buildPaths(seed, new Map());
    expect(paths.map((p) => p.id).slice(0, 5)).toEqual(['ai', 'inference', 'languages', 'graphics', 'simulation']);
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
    expect(later).toEqual(expect.arrayContaining(['engineering']));
    expect(later).not.toContain('ai');
  });
});

describe('Software architecture and Robotics (MORE-RESOURCES)', () => {
  it('are paths of their own: robotics apart from mechanical, architecture apart from systems', () => {
    expect(pathOfTrack(seed, 'robotics')?.id).toBe('robotics');
    expect(pathOfTrack(seed, 'mech')?.id).toBe('engineering');
    expect(pathOfTrack(seed, 'architecture')?.id).toBe('architecture');
    expect(pathOfTrack(seed, 'swe')?.id).toBe('systems');
    expect(pathOfTrack(seed, 'gamedev')?.id).toBe('graphics');
    // A track of the user's joins the path of a track of its family.
    expect(pathOfTrack({ tracks: [...seed.tracks, { id: 'my-llm', name: 'Mine', family: 'AI & ML', slot: 1, summary: 'x' }] }, 'my-llm')?.id).toBe('ai');
  });

  it('offer the Library’s resources of their tracks or roadmaps, off the plan', () => {
    for (const id of ['architecture', 'robotics']) {
      const extras = pathExtras(seed, new Map(), id);
      expect(extras.length, id).toBeGreaterThan(20);
      expect(extras.every((r) => pathOfTrack(seed, r.tracks[0]!)?.id === id || r.roadmap === 'software-architect')).toBe(true);
    }
    const onPlan = new Set(seed.plan.map((i) => i.resourceId));
    expect(pathExtras(seed, new Map(), 'ai').some((r) => onPlan.has(r.id))).toBe(false);
    const first = pathExtras(seed, new Map(), 'robotics')[0]!;
    expect(pathExtras(seed, new Map([state(first.id, 'dropped')]), 'robotics').some((r) => r.id === first.id)).toBe(false);
  });

  it('architecture has nothing on the plan yet, so it is not among the plan’s paths', () => {
    expect(buildPaths(seed, new Map()).some((p) => p.id === 'architecture')).toBe(false);
  });
});

describe('the plan\'s order (ATLAS-LIBRARY)', () => {
  it('sorts by priority, then year (none last), then level (beginner first)', () => {
    const items = [
      { id: 'p2', priority: 2, year: 1, level: 'intro' },
      { id: 'p1-y3', priority: 1, year: 3, level: 'intro' },
      { id: 'p1-y1-adv', priority: 1, year: 1, level: 'advanced' },
      { id: 'p1-y1-beg', priority: 1, year: 1, level: 'intro' },
      { id: 'p1-none', priority: 1 },
      { id: 'p1-y1-mid', priority: 1, year: 1, level: 'intermediate' },
    ];
    expect([...items].sort(byFit).map((i) => i.id)).toEqual(['p1-y1-beg', 'p1-y1-mid', 'p1-y1-adv', 'p1-y3', 'p1-none', 'p2']);
  });

  it('gives an item without a priority its track\'s: AI 1, systems, architecture and math 2, graphics 3, game development and engineering 4', () => {
    expect(priorityOf({ tracks: ['math'] })).toBe(2);
    expect(priorityOf({ tracks: ['physics'] })).toBe(2);
    expect(priorityOf({ tracks: ['ee'] })).toBe(4);
    expect(priorityOf({ tracks: ['engineering'] })).toBe(4);
    expect(priorityOf({ tracks: ['ai'] })).toBe(1);
    expect(priorityOf({ tracks: ['architecture'] })).toBe(2);
    expect(priorityOf({ tracks: ['devops'] })).toBe(2);
    expect(priorityOf({ tracks: ['graphics'] })).toBe(3);
    expect(priorityOf({ tracks: ['gamedev'] })).toBe(4);
    expect(priorityOf({ tracks: ['hardware'] })).toBe(3);
    expect(priorityOf({ tracks: ['quantum'] })).toBe(4);
    expect(priorityOf({ priority: 1, tracks: ['gamedev'] })).toBe(1);
  });

  it('orders every path\'s optional list by fit', () => {
    for (const id of ['ai', 'inference', 'architecture', 'devops', 'simulation', 'robotics', 'graphics', 'math', 'engineering', 'hardware', 'quantum']) {
      const extras = pathExtras(seed, new Map(), id).map(fitOf);
      expect(extras.length, id).toBeGreaterThan(10);
      for (let i = 1; i < extras.length; i++) expect(byFit(extras[i - 1]!, extras[i]!), id + ' at ' + i).toBeLessThanOrEqual(0);
    }
  });

  it('orders Up next by when the plan reaches it, then by fit', () => {
    const next = upNext(buildPaths(seed, new Map()), seed, 10);
    const start = new Map(seed.phases.map((p) => [p.id, p.start]));
    for (let i = 1; i < next.length; i++) {
      const [a, b] = [next[i - 1]!, next[i]!];
      expect((start.get(a.step.phaseId) ?? '') <= (start.get(b.step.phaseId) ?? '')).toBe(true);
      if (a.start === b.start) expect(byFit(a.step.fit, b.step.fit)).toBeLessThanOrEqual(0);
    }
  });
});

describe('Inference engineering, DevOps, Simulation and Research (ATLAS-LIBRARY)', () => {
  it('files an inference-tagged resource under Inference engineering, DevOps and Simulation under their own', () => {
    expect(pathOf(seed, { tracks: ['ai'], tags: ['inference'] })?.id).toBe('inference');
    expect(pathOf(seed, { tracks: ['ai'] })?.id).toBe('ai');
    expect(pathOfTrack(seed, 'devops')?.id).toBe('devops');
    expect(pathOfTrack(seed, 'simulation')?.id).toBe('simulation');
    expect(pathOfTrack(seed, 'gamedev')?.id).toBe('graphics');
    // Engineering gathers electrical, embedded, controls and mechanical, and the file's engineering track.
    for (const track of ['engineering', 'ee', 'embedded', 'controls', 'mech']) expect(pathOfTrack(seed, track)?.id, track).toBe('engineering');
    expect(pathOfTrack(seed, 'math')?.id).toBe('math');
    expect(pathOfTrack(seed, 'physics')?.id).toBe('math');
    // Hardware and chip design, and Quantum computing, are paths of their own, not Engineering's or Math and physics'.
    expect(pathOfTrack(seed, 'hardware')?.id).toBe('hardware');
    expect(pathOfTrack(seed, 'quantum')?.id).toBe('quantum');
  });

  it('heads the roadmap paths with roadmap.sh\'s official pages, and keeps them out of the optional list', () => {
    for (const id of ['inference-engineering', 'ai-engineer', 'ai-agents', 'software-architect', 'game-developer'] as const) {
      expect(roadmapPage(seed, id)?.url, id).toBe('https://roadmap.sh/' + id);
    }
    expect(pathExtras(seed, new Map(), 'inference').some((r) => r.url === 'https://roadmap.sh/inference-engineering')).toBe(false);
    // An item serving the path's roadmap joins it, whatever its track.
    expect(pathExtras(seed, new Map(), 'architecture').every((r) => pathOf(seed, r)?.id === 'architecture' || r.roadmap === 'software-architect')).toBe(true);
  });

  it('groups the research areas in order, papers first, the foundations before the frontier', () => {
    const areas = researchAreas(seed, new Map());
    expect(areas.map((a) => a.name)).toEqual(['Inference', 'World models', 'Diffusion', 'Generative AI']);
    for (const area of areas) {
      expect(area.items.length, area.name).toBeGreaterThan(10);
      const papers = area.items.filter((r) => r.type === 'paper');
      expect(area.items.slice(0, papers.length).every((r) => r.type === 'paper'), area.name).toBe(true);
      const frontier = papers.findIndex((r) => (r.fromYear ?? 3) >= 3);
      if (frontier >= 0) expect(papers.slice(frontier).every((r) => (r.fromYear ?? 3) >= 3), area.name).toBe(true);
    }
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
