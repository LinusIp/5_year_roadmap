import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';
import { ResourceSchema } from '../../src/seed/schema.ts';
import type { AppSeed } from '../../src/seed/schema.ts';
import { buildPaths, byFit, fitOf, isCanon, isLesser, pathExtras, researchAreas, UNGRADED, upNext } from '../../src/lib/library-home.ts';

/** The quality pass (ATLAS-QUALITY-AUDIT, 16,448 rows): grades, removals, the Canon rows and the order. */
const raw = loadSeedOrThrow();
const seed = splitSeed(raw).app as AppSeed;

describe('the grades', () => {
  it('order a list by priority, then quality (canon first, an ungraded row as 4), then year and level', () => {
    const items = [
      { id: 'p2-q5', priority: 2, quality: 5, year: 1 },
      { id: 'p1-q3', priority: 1, quality: 3, year: 1 },
      { id: 'p1-none', priority: 1, year: 3 },
      { id: 'p1-q5-y2', priority: 1, quality: 5, year: 2 },
      { id: 'p1-q5-y1', priority: 1, quality: 5, year: 1 },
      { id: 'p1-q4', priority: 1, quality: 4, year: 1 },
    ];
    expect([...items].sort(byFit).map((i) => i.id)).toEqual(['p1-q5-y1', 'p1-q5-y2', 'p1-q4', 'p1-none', 'p1-q3', 'p2-q5']);
    expect(UNGRADED).toBe(4);
    expect(isCanon(5)).toBe(true);
    expect(isCanon(4)).toBe(false);
    expect(isLesser(3)).toBe(true);
    expect(isLesser(2)).toBe(true);
    expect(isLesser(undefined)).toBe(false);
    expect(fitOf({ tracks: ['ai'], priority: 1, quality: 5 }).quality).toBe(5);
  });

  it('are an integer from 1 to 5 when present', () => {
    const base = raw.resources.find((r) => r.id === 'stanford-cs229')!;
    expect(ResourceSchema.safeParse({ ...base, quality: 5 }).success).toBe(true);
    expect(ResourceSchema.safeParse({ ...base, quality: 6 }).success).toBe(false);
    expect(ResourceSchema.safeParse({ ...base, quality: 3.5 }).success).toBe(false);
    expect(ResourceSchema.safeParse({ ...base, quality: undefined }).success).toBe(true);
  });

  it('come from the file: the canon rows at priority 1, and the grade-3 rows at priority 3 or lower but for the few the file keeps higher', () => {
    const graded = [...raw.resources, ...raw.papers].filter((r) => r.quality !== undefined);
    const canon = graded.filter((r) => r.quality === 5);
    expect(canon.length).toBeGreaterThan(900);
    expect(canon.every((r) => r.priority === 1)).toBe(true);
    const three = graded.filter((r) => r.quality === 3);
    // The file keeps 62 of its 7,162 grade-3 rows at priority 1 or 2 (a topic asked for, such as LeetGPU).
    expect(three.filter((r) => (r.priority ?? 4) < 3).length).toBeLessThan(three.length * 0.02);
    expect(raw.resources.find((r) => r.id === 'stanford-cs229')?.quality).toBe(5);
  });
});

describe('the rows the pass dropped', () => {
  it('are gone, except the one on the plan, and nothing comes after one', () => {
    const ids = new Set([...raw.resources, ...raw.papers].map((r) => r.id));
    expect(raw.resources.length).toBeLessThan(16_500);
    expect(raw.resources.length).toBeGreaterThan(16_300);
    // 30 Days of Python was graded 1 or 2, but it is on the plan (phase y1-p0, lane B) with its units and its certificate.
    expect(ids.has('30-days-of-python')).toBe(true);
    for (const id of ['article-kdnuggets-winning-entry', 'repo-competitive-companion']) expect(ids.has(id), id).toBe(false);
    for (const r of raw.resources) for (const after of r.after ?? []) expect(ids.has(after), r.id + ' after ' + after).toBe(true);
  });
});

describe('Up next, the paths and Research', () => {
  it('suggest no row graded 3 or lower, and a path keeps them for "More resources"', () => {
    const next = upNext(buildPaths(seed, new Map()), seed, 200, new Map());
    expect(next.length).toBeGreaterThan(5);
    expect(next.every((u) => !isLesser(u.step.fit.quality))).toBe(true);
    expect(next.some((u) => u.step.refId === 'ml-zoomcamp' || u.step.refId === 'roadmap-ai-engineer')).toBe(false);
    const extras = pathExtras(seed, new Map(), 'devops');
    expect(extras.some((r) => isLesser(r.quality))).toBe(true);
    expect(extras.some((r) => !isLesser(r.quality))).toBe(true);
    const areas = researchAreas(seed, new Map());
    expect(areas.every((a) => a.items.some((i) => !isLesser(i.fit.quality)))).toBe(true);
  });
});
