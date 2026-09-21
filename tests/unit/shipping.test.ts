import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { adherence, weeklyStrip } from '../../src/lib/shipping.ts';
import type { UserItemState } from '../../src/db/types.ts';

const seed = loadSeedOrThrow();
const PLAN_START = '2026-09-21';
const shipped = (refId: string, doneAt: string): [string, UserItemState] => [refId, { refId, status: 'done', unitsDone: [], repoUrl: 'https://github.com/me/' + refId, doneAt }];

describe('shipping cadence', () => {
  it('counts weeks with a mini-build, not mini-builds', () => {
    const states = new Map([
      shipped('w-c-ring-buffer', '2026-09-22'),
      shipped('w-bloom-filter', '2026-09-24'), // same week: still one week hit
      shipped('w-lru-cache', '2026-10-01'),
    ]);
    const weekly = adherence(seed.projects, states, 'weekly', PLAN_START, '2026-10-04', 1);
    expect(weekly.shipped).toBe(3);
    expect(weekly.hit).toBe(2);
    expect(weekly.periods).toBe(2);
    expect(weekly.currentHit).toBe(true);
  });

  it('counts months for monthly projects and plan years for capstones', () => {
    const states = new Map([shipped('m01', '2026-10-15'), shipped('cap-y1', '2027-08-20')]);
    const monthly = adherence(seed.projects, states, 'monthly', PLAN_START, '2026-11-02', 1);
    expect(monthly).toMatchObject({ shipped: 1, hit: 1, periods: 3, currentHit: false });

    const capstone = adherence(seed.projects, states, 'capstone', PLAN_START, '2027-09-01', 1);
    // 2027-08-20 falls in plan year 1; 2027-09-01 is already plan year 2.
    expect(capstone).toMatchObject({ shipped: 1, hit: 1, periods: 1 });
  });

  it('ignores work that is not done, and has no periods before the plan starts', () => {
    const states = new Map<string, UserItemState>([['m01', { refId: 'm01', status: 'active', unitsDone: [] }]]);
    expect(adherence(seed.projects, states, 'monthly', PLAN_START, '2026-10-01', 1).shipped).toBe(0);
    expect(adherence(seed.projects, new Map(), 'weekly', PLAN_START, '2026-09-01', 1).periods).toBe(0);
  });

  it('draws the last twelve weeks, oldest first, starting no earlier than the plan', () => {
    const states = new Map([shipped('w-c-ring-buffer', '2026-09-22')]);
    const strip = weeklyStrip(seed.projects, states, PLAN_START, '2026-10-04', 1);
    expect(strip.map((w) => w.weekStart)).toEqual(['2026-09-21', '2026-09-28']);
    expect(strip[0]!.shipped).toEqual(['w-c-ring-buffer']);
    expect(strip[1]!.shipped).toEqual([]);

    const later = weeklyStrip(seed.projects, states, PLAN_START, '2027-06-01', 1);
    expect(later).toHaveLength(12);
  });
});
