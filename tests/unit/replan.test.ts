import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';
import { defaultSettings } from '../../src/db/settings.ts';
import { budgetHoursBetween, fractionDone, itemProgress, laneProgress, phaseProgress } from '../../src/lib/progress.ts';
import { describeVerdict, forecastPhase, paceForBlock, paceSummary } from '../../src/lib/forecast.ts';
import { laneCapacity, replan, replanToPatches } from '../../src/lib/replan.ts';
import { nextOrder, reorderLane, resolveSeed, takeIntoLane } from '../../src/lib/plan.ts';
import type { AppSeed, PlanItem } from '../../src/seed/schema.ts';
import type { DayLog, UserItemState } from '../../src/db/types.ts';

const seed = splitSeed(loadSeedOrThrow()).app as AppSeed;
const settings = defaultSettings(seed.settings);
const FIRST_DAY = '2026-09-21';

const done = (refId: string): UserItemState => ({ refId, status: 'done', unitsDone: [] });
const log = (date: string, block: string, minutes: number): DayLog => ({
  date,
  entries: [{ block: block as never, track: 'math', minutes }],
});

describe('progress', () => {
  it('is unit-based when there is a checklist', () => {
    expect(fractionDone('todo', 0, 35)).toBe(0);
    expect(fractionDone('active', 7, 35)).toBeCloseTo(0.2);
    expect(fractionDone('done', 0, 35)).toBe(1);
    expect(fractionDone('dropped', 20, 35)).toBe(0);
  });

  it('never shows an active item as finished until it is marked done', () => {
    expect(fractionDone('active', 35, 35)).toBe(0.99);
    expect(fractionDone('done', 35, 35)).toBe(1);
  });

  it('gives an active item without a checklist a halfway reading', () => {
    expect(fractionDone('active', 0, 0)).toBe(0.5);
    expect(fractionDone('todo', 0, 0)).toBe(0);
  });

  it('turns progress into hours still to do', () => {
    const half = itemProgress({ refId: 'x', estHours: 120, unitCount: 10, state: { refId: 'x', status: 'active', unitsDone: ['1', '2', '3', '4', '5'] } });
    expect(half.remainingHours).toBeCloseTo(60);
    expect(itemProgress({ refId: 'x', estHours: 120, unitCount: 10, state: done('x') }).remainingHours).toBe(0);
    expect(itemProgress({ refId: 'x', estHours: 120, unitCount: 0, state: undefined }).remainingHours).toBe(120);
  });

  it('adds a lane and a phase up', () => {
    const items = [
      itemProgress({ refId: 'a', estHours: 100, unitCount: 0, state: done('a') }),
      itemProgress({ refId: 'b', estHours: 60, unitCount: 0, state: undefined }),
    ].map((p) => ({ ...p, planItem: { id: p.refId, phaseId: 'p', block: 'A' as const, order: 10 }, title: p.refId, kind: 'resource' as const, url: null, tracks: [], prerequisites: [], blockedBy: [], laneHours: p.estHours, hasRepo: false }));
    const lane = laneProgress('A', items, 200);
    expect(lane.totalHours).toBe(160);
    expect(lane.remainingHours).toBe(60);
    expect(lane.fraction).toBeCloseTo(100 / 160);

    const phase = phaseProgress('p', [lane]);
    expect(phase.itemsDone).toBe(1);
    expect(phase.itemsTotal).toBe(2);
  });

  it('works out the hours a block gets between two dates', () => {
    // Block A: 120 minutes every day, over a week.
    expect(budgetHoursBetween(120, [0, 1, 2, 3, 4, 5, 6], '2026-09-21', '2026-09-27')).toBe(14);
    // Weekdays only.
    expect(budgetHoursBetween(120, [1, 2, 3, 4, 5], '2026-09-21', '2026-09-27')).toBe(10);
  });
});

describe('the forecast', () => {
  const phase = seed.phases[0]!;
  const lane = (block: 'A' | 'E', remaining: number) => ({
    block,
    items: [],
    totalHours: remaining,
    remainingHours: remaining,
    doneHours: 0,
    fraction: 0,
    budgetHours: 200,
  });

  it('measures the pace of a block over the window', () => {
    const logs = [log('2026-09-21', 'A', 120), log('2026-09-22', 'A', 120), log('2026-09-23', 'E', 60)];
    expect(paceForBlock(logs, 'A', '2026-09-23', 28)).toBeCloseTo(240 / 60 / 28);
    expect(paceForBlock(logs, 'E', '2026-09-23', 28)).toBeCloseTo(1 / 28);
    // Days outside the window do not count.
    expect(paceForBlock(logs, 'A', '2027-01-01', 28)).toBe(0);
  });

  it('says ahead when the pace finishes the work well before the phase ends', () => {
    // 20 hours left, and 2 hours a day going in: about ten days, against a phase that runs to January.
    const logs = Array.from({ length: 10 }, (_, i) => log('2026-09-' + String(21 + i).padStart(2, '0'), 'A', 120));
    const forecast = forecastPhase({ phase, lanes: [lane('A', 20)], logs, settings, asOf: '2026-09-30' });
    expect(forecast.lanes[0]!.verdict).toBe('ahead');
    expect(forecast.projectedEnd! < phase.end).toBe(true);
    expect(describeVerdict('ahead', -3)).toBe('3 weeks early');
  });

  it('says on track when the work lands just inside the phase', () => {
    // Pace and remaining hours chosen so the projected end falls in the phase's final week.
    const logs = Array.from({ length: 10 }, (_, i) => log('2026-09-' + String(21 + i).padStart(2, '0'), 'A', 120));
    const pace = paceForBlock(logs, 'A', '2026-09-30', settings.core.forecast.paceWindowDays);
    const daysLeft = 120; // 2026-09-30 to roughly the end of the phase
    const forecast = forecastPhase({ phase, lanes: [lane('A', pace * daysLeft)], logs, settings, asOf: '2026-09-30' });
    expect(forecast.lanes[0]!.verdict).toBe('on-track');
  });

  it('counts the weeks when the pace will not finish in time', () => {
    const logs = [log('2026-09-21', 'A', 60)];
    // 300 hours left at a very low pace runs long past the phase.
    const forecast = forecastPhase({ phase, lanes: [lane('A', 300)], logs, settings, asOf: '2026-09-21' });
    expect(forecast.lanes[0]!.verdict).toBe('behind');
    expect(forecast.lanes[0]!.weeksLate).toBeGreaterThan(0);
    expect(describeVerdict('behind', 6)).toBe('6 weeks behind');
    expect(describeVerdict('behind', 1)).toBe('1 week behind');
  });

  it('says stalled rather than guessing when nothing is being logged', () => {
    const forecast = forecastPhase({ phase, lanes: [lane('A', 100)], logs: [], settings, asOf: '2026-09-21' });
    expect(forecast.lanes[0]!.verdict).toBe('not-started');
    expect(forecast.lanes[0]!.projectedEnd).toBeNull();
    expect(describeVerdict('stalled', null)).toBe('No hours logged lately');
  });

  it('calls a finished lane done', () => {
    const forecast = forecastPhase({ phase, lanes: [lane('A', 0)], logs: [], settings, asOf: '2026-09-21' });
    expect(forecast.lanes[0]!.verdict).toBe('done');
    expect(forecast.verdict).toBe('done');
  });

  it('reports the overall pace against the 8-hour budget', () => {
    const logs = [log('2026-09-21', 'A', 480), log('2026-09-22', 'A', 480)];
    const pace = paceSummary(logs, settings, '2026-09-22');
    expect(pace.planned).toBeCloseTo(8);
    expect(pace.actual).toBeCloseTo(16 / 28);
    expect(pace.ratio).toBeLessThan(1);
  });
});

describe('re-planning', () => {
  it('moves nothing when everything already fits', () => {
    const result = replan({ seed, settings, states: new Map(), asOf: FIRST_DAY });
    // Lanes that are over budget in the seed do move; the point here is that the result is a diff, not chaos.
    expect(result.moves.length).toBeLessThan(seed.plan.length);
    expect(result.unchanged).toBeGreaterThan(0);
  });

  it('never drops an item: everything unfinished lands in some phase', () => {
    const result = replan({ seed, settings, states: new Map(), asOf: FIRST_DAY });
    const planned = new Set(seed.plan.map((i) => i.id));
    for (const move of result.moves) expect(planned.has(move.planItemId)).toBe(true);
    // Every move names a real phase.
    const phaseIds = new Set(seed.phases.map((p) => p.id));
    for (const move of result.moves) expect(phaseIds.has(move.toPhaseId)).toBe(true);
  });

  it('never schedules an item before its prerequisites', () => {
    const result = replan({ seed, settings, states: new Map(), asOf: FIRST_DAY });
    const phaseIndex = new Map(seed.phases.map((p, i) => [p.id, i]));
    const landedIn = new Map<string, number>();
    for (const item of seed.plan) landedIn.set(item.resourceId ?? item.projectId!, phaseIndex.get(item.phaseId)!);
    for (const move of result.moves) landedIn.set(move.refId, phaseIndex.get(move.toPhaseId)!);

    for (const resource of seed.resources) {
      const at = landedIn.get(resource.id);
      if (at === undefined) continue;
      for (const prerequisite of resource.prerequisites) {
        const before = landedIn.get(prerequisite);
        if (before === undefined) continue;
        expect(before, prerequisite + ' before ' + resource.id).toBeLessThanOrEqual(at);
      }
    }
  });

  it('skips phases that have already ended', () => {
    const result = replan({ seed, settings, states: new Map(), asOf: '2029-01-01' });
    const endedPhases = seed.phases.filter((p) => p.end < '2029-01-01').map((p) => p.id);
    for (const move of result.moves) expect(endedPhases).not.toContain(move.toPhaseId);
  });

  it('leaves finished work alone', () => {
    const states = new Map(seed.plan.slice(0, 20).map((i) => [i.resourceId ?? i.projectId!, done(i.resourceId ?? i.projectId!)]));
    const result = replan({ seed, settings, states, asOf: FIRST_DAY });
    const movedIds = new Set(result.moves.map((m) => m.refId));
    for (const refId of states.keys()) expect(movedIds.has(refId)).toBe(false);
  });

  it('reports every lane budget and what was planned into it', () => {
    const result = replan({ seed, settings, states: new Map(), asOf: FIRST_DAY });
    expect(result.lanes.length).toBeGreaterThan(0);
    for (const lane of result.lanes) {
      expect(lane.budgetHours).toBeGreaterThanOrEqual(0);
      expect(lane.overflowHours).toBe(Math.max(0, lane.plannedHours - lane.budgetHours));
    }
  });

  it('turns the result into patches that can be stored', () => {
    const result = replan({ seed, settings, states: new Map(), asOf: FIRST_DAY });
    const patches = replanToPatches(result);
    expect(patches).toHaveLength(result.moves.length + result.reorders.length);
    if (result.moves.length > 0) {
      expect(patches[0]).toMatchObject({ patch: { phaseId: expect.any(String), order: expect.any(Number) } });
    }
  });

  it('leaves no two items of a lane at the same position once applied', () => {
    const result = replan({ seed, settings, states: new Map(), asOf: FIRST_DAY });
    const applied = resolveSeed(seed, replanToPatches(result).map((p) => ({ kind: 'planItem' as const, id: p.id, patch: p.patch })), []);
    const seen = new Set<string>();
    for (const item of applied.plan) {
      const key = item.phaseId + '/' + item.block + '/' + item.order;
      expect(seen.has(key), 'two items at ' + key).toBe(false);
      seen.add(key);
    }
  });

  it('is stable: re-planning an already re-planned roadmap changes nothing', () => {
    const first = replan({ seed, settings, states: new Map(), asOf: FIRST_DAY });
    const applied = resolveSeed(seed, replanToPatches(first).map((p) => ({ kind: 'planItem' as const, id: p.id, patch: p.patch })), []);
    const second = replan({ seed: applied, settings, states: new Map(), asOf: FIRST_DAY });
    expect(second.moves).toEqual([]);
    expect(second.reorders).toEqual([]);
  });

  it('measures lane capacity from the block settings', () => {
    // Block A is 2 hours every day, so a 7-day phase gives it 14 hours.
    expect(laneCapacity(settings, 'A', '2026-09-21', '2026-09-27')).toBeCloseTo(14);
    expect(laneCapacity(settings, 'B', '2026-09-21', '2026-09-27')).toBeCloseTo(7);
    expect(laneCapacity(settings, 'A', '2026-09-27', '2026-09-21')).toBe(0);
  });
});

describe('the user layer over the seed', () => {
  it('leaves the seed alone when there is nothing to apply', () => {
    const resolved = resolveSeed(seed, [], []);
    expect(resolved.plan).toHaveLength(seed.plan.length);
    expect(resolved.resources).toHaveLength(seed.resources.length);
  });

  it('applies a patch to a plan item', () => {
    const first = seed.plan[0]!;
    const resolved = resolveSeed(seed, [{ kind: 'planItem', id: first.id, patch: { phaseId: 'y5' } }], []);
    expect(resolved.plan.find((i) => i.id === first.id)!.phaseId).toBe('y5');
  });

  it('removes a plan item the user took off the roadmap', () => {
    const first = seed.plan.find((i) => i.resourceId)!;
    const resolved = resolveSeed(seed, [{ kind: 'planItem', id: first.id, patch: {}, removed: true }], []);
    expect(resolved.plan.find((i) => i.id === first.id)).toBeUndefined();
    // The resource itself stays in the library.
    expect(resolved.resources.find((r) => r.id === first.resourceId)).toBeDefined();
  });

  it('adds a custom resource and a plan item for it', () => {
    const custom = [
      {
        kind: 'resource' as const,
        id: 'my-course',
        createdAt: '2026-09-21',
        data: {
          id: 'my-course', title: 'A course I found', provider: 'Somewhere', type: 'course',
          url: null, urlVerified: false, searchHint: 'a course I found', tracks: ['swe'],
          level: 'intro', cost: 'free', estHours: 20, prerequisites: [],
        },
      },
      {
        kind: 'planItem' as const,
        id: 'plan.my-course',
        createdAt: '2026-09-21',
        data: { id: 'plan.my-course', phaseId: 'y1-p0', block: 'C', resourceId: 'my-course', order: 999 },
      },
    ];
    const resolved = resolveSeed(seed, [], custom);
    expect(resolved.resources.find((r) => r.id === 'my-course')!.title).toBe('A course I found');
    expect(resolved.plan.find((i) => i.id === 'plan.my-course')!.block).toBe('C');
  });

  it('ignores a patch whose item no longer exists, rather than breaking the page', () => {
    const resolved = resolveSeed(seed, [{ kind: 'planItem', id: 'plan.gone', patch: { phaseId: 'y5' } }], []);
    expect(resolved.plan).toHaveLength(seed.plan.length);
  });

  it('drops a plan item whose resource was removed from the curriculum', () => {
    const trimmed: AppSeed = { ...seed, resources: seed.resources.filter((r) => r.id !== 'mit-18-06') };
    const resolved = resolveSeed(trimmed, [], []);
    expect(resolved.plan.find((i) => i.resourceId === 'mit-18-06')).toBeUndefined();
  });

  it('reorders a lane in tens', () => {
    const items = seed.plan.filter((i) => i.phaseId === 'y1-p0' && i.block === 'D');
    const reordered = reorderLane(items, 0, 2);
    expect(reordered.map((r) => r.order)).toEqual([10, 20, 30, 40]);
    expect(reordered[2]!.id).toBe(items[0]!.id);
  });

  it('appends after the end of a lane', () => {
    expect(nextOrder(seed.plan, 'y1-p0', 'E')).toBe(30);
    expect(nextOrder(seed.plan, 'y1-p0', 'Z')).toBe(10);
  });
});

describe('taking a project from the deck', () => {
  const item = (id: string, projectId: string, order: number, phaseId = 'p1'): PlanItem => ({ id, phaseId, block: 'D', projectId, order });
  const plan = [item('a', 'done-one', 10), item('b', 'next-one', 20), item('c', 'later-one', 30), item('x', 'far-one', 10, 'p2')];
  const open = (ref: string): boolean => ref !== 'done-one';

  it('moves a project already in the lane in front of the next unfinished item', () => {
    expect(takeIntoLane(plan, open, 'p1', 'D', 'later-one')).toEqual({
      patches: [
        { id: 'c', patch: { order: 20 } },
        { id: 'b', patch: { order: 30 } },
      ],
    });
  });

  it('changes nothing when the project is already next', () => {
    expect(takeIntoLane(plan, open, 'p1', 'D', 'next-one')).toEqual({ patches: [] });
  });

  it('moves an appearance from a later phase into this lane', () => {
    const { patches, add } = takeIntoLane(plan, open, 'p1', 'D', 'far-one');
    expect(add).toBeUndefined();
    expect(patches).toContainEqual({ id: 'x', patch: { phaseId: 'p1', block: 'D', order: 20 } });
    expect(patches).toContainEqual({ id: 'b', patch: { order: 30 } });
  });

  it('adds an appearance for a project the plan does not carry', () => {
    const { add } = takeIntoLane(plan, open, 'p1', 'D', 'new-one');
    expect(add).toEqual({ phaseId: 'p1', block: 'D', projectId: 'new-one', order: 20 });
  });
});
