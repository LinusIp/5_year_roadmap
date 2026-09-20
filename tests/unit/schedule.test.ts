import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';
import { defaultSettings } from '../../src/db/settings.ts';
import { activePhase, dailyTargetMinutes, nextInLane, planForDay, suggestWeeklyBuild, weeklyTargetMinutes } from '../../src/lib/schedule.ts';
import type { ScheduleContext } from '../../src/lib/schedule.ts';
import type { AppSeed } from '../../src/seed/index.ts';
import type { UserItemState } from '../../src/db/types.ts';

const full = loadSeedOrThrow();
const split = splitSeed(full);
const seed = split.app as AppSeed;
const settings = defaultSettings(seed.settings);
const FIRST_DAY = '2026-09-21';

function context(states: UserItemState[] = []): ScheduleContext {
  return { seed, states: new Map(states.map((s) => [s.refId, s])), units: split.units };
}

const done = (refId: string): UserItemState => ({ refId, status: 'done', unitsDone: [] });

describe('the schedule', () => {
  it('finds the phase a date belongs to', () => {
    expect(activePhase(FIRST_DAY, seed.phases)!.id).toBe('y1-p0');
    expect(activePhase('2027-02-01', seed.phases)!.id).toBe('y1-p1');
    expect(activePhase('2031-08-31', seed.phases)!.id).toBe('y5');
    expect(activePhase('2026-09-20', seed.phases)).toBeNull(); // the day before the plan starts
    expect(activePhase('2031-09-01', seed.phases)).toBeNull();
  });

  it('shows the acceptance criteria of the brief on day one', () => {
    const plan = planForDay({ date: FIRST_DAY, settings, ctx: context() });
    const byBlock = new Map(plan.blocks.map((b) => [b.id, b]));

    expect(plan.phase!.id).toBe('y1-p0');
    expect(plan.isReviewDay).toBe(false); // 2026-09-21 is a Monday
    expect(plan.targetMinutes).toBe(480); // the 8-hour budget

    expect(byBlock.get('A')!.item!.title).toMatch(/Finish a small game/);
    expect(byBlock.get('B')!.item!.title).toMatch(/30 Days of Python/);
    expect(byBlock.get('B')!.item!.nextUnit).toMatchObject({ position: 1, title: expect.stringContaining('Day 1') });
    expect(byBlock.get('C')!.item!.title).toMatch(/Machine Learning Zoomcamp/);
    expect(byBlock.get('C')!.item!.nextUnit!.title).toMatch(/Module 1/);
    expect(byBlock.get('D')!.weeklyBuild).toBeDefined(); // the first weekly mini-build
    expect(byBlock.get('E')!.item!.title).toMatch(/18\.06 Linear Algebra/);
    expect(byBlock.get('E')!.item!.nextUnit!.title).toBe('Lecture 1: The geometry of linear equations');
  });

  it('gives every block something to act on: a link, a hint, or a brief', () => {
    const plan = planForDay({ date: FIRST_DAY, settings, ctx: context() });
    for (const block of plan.blocks) {
      const items = [block.item, block.weeklyBuild].filter(Boolean);
      for (const item of items) {
        if (item!.kind === 'resource') {
          // Section 7 of the brief: a resource is either linked or tells you how to find it.
          expect(Boolean(item!.url) || Boolean(item!.searchHint), item!.refId).toBe(true);
        } else {
          // A project is your own work: there is nothing to open, so the card shows the brief.
          expect(item!.brief, item!.refId).toBeTruthy();
          expect(item!.acceptance!.length, item!.refId).toBeGreaterThan(0);
        }
      }
    }
  });

  it('moves to the next unit as units are ticked off', () => {
    const state: UserItemState = { refId: 'mit-18-06', status: 'active', unitsDone: ['lecture-1', 'lecture-2'] };
    const plan = planForDay({ date: FIRST_DAY, settings, ctx: context([state]) });
    const blockE = plan.blocks.find((b) => b.id === 'E')!;
    expect(blockE.item!.nextUnit!.position).toBe(3);
    expect(blockE.item!.unitsDone).toBe(2);
    expect(blockE.item!.unitCount).toBe(35);
  });

  it('moves to the next item in the lane when one is finished, and skips dropped ones', () => {
    const ctx = context([done('mit-18-06')]);
    const plan = planForDay({ date: FIRST_DAY, settings, ctx });
    expect(plan.blocks.find((b) => b.id === 'E')!.item!.title).toMatch(/algorithms and data structures/i);

    const dropped = context([done('mit-18-06'), { refId: 'current-dsa-course', status: 'dropped', unitsDone: [] }]);
    const next = nextInLane('y1-p0', 'E', dropped);
    // Nothing left in this phase's lane E, so it reaches into the next phase.
    expect(next!.fromLaterPhase).toBe(true);
    expect(next!.planItem.phaseId).toBe('y1-p1');
  });

  it('pulls the next phase forward instead of leaving a lane idle', () => {
    const everything = seed.plan.filter((i) => i.phaseId === 'y1-p0' && i.block === 'B');
    const ctx = context(everything.map((i) => done(i.resourceId ?? i.projectId!)));
    const block = planForDay({ date: FIRST_DAY, settings, ctx }).blocks.find((b) => b.id === 'B')!;
    expect(block.kind).toBe('item');
    expect(block.item!.note).toMatch(/Pulled forward/);
    expect(block.item!.title).toMatch(/CS50x/); // the first item of the next phase's lane B
  });

  it('replaces the projects block with the review on Sundays', () => {
    const sunday = '2026-09-27';
    const plan = planForDay({ date: sunday, settings, ctx: context() });
    expect(plan.isReviewDay).toBe(true);
    const blockD = plan.blocks.find((b) => b.id === 'D')!;
    expect(blockD.kind).toBe('review');
    expect(blockD.item).toBeUndefined();
    // The other four blocks are untouched.
    for (const id of ['A', 'B', 'C', 'E'] as const) {
      expect(plan.blocks.find((b) => b.id === id)!.kind, id).toBe('item');
    }
  });

  it('marks a block as resting on a day it is not scheduled', () => {
    const custom = structuredClone(settings);
    custom.core.blocks[0]!.days = [1, 2, 3, 4, 5];
    const plan = planForDay({ date: '2026-09-26', settings: custom, ctx: context() }); // a Saturday
    const blockA = plan.blocks.find((b) => b.id === 'A')!;
    expect(blockA.kind).toBe('rest');
    expect(blockA.targetMinutes).toBe(0);
    expect(plan.targetMinutes).toBe(360);
  });

  it('suggests a weekly build that matches the phase, and keeps suggesting while you skip', () => {
    const ctx = context();
    const phase = activePhase(FIRST_DAY, seed.phases)!;
    const first = suggestWeeklyBuild(phase, ctx)!;
    expect(first.cadence).toBe('weekly');
    expect(first.stage).toBe(1);

    const second = suggestWeeklyBuild(phase, ctx, 1)!;
    expect(second.id).not.toBe(first.id);

    // A finished card is never suggested again.
    const after = suggestWeeklyBuild(phase, context([done(first.id)]))!;
    expect(after.id).not.toBe(first.id);
  });

  it('suggests stage 2 cards once the plan reaches year 4', () => {
    const phase = activePhase('2029-10-01', seed.phases)!;
    expect(phase.stage).toBe(2);
    const suggestion = suggestWeeklyBuild(phase, context())!;
    expect(suggestion.stage).toBe(2);
  });

  it('honours the card the user picked for the week', () => {
    const plan = planForDay({ date: FIRST_DAY, settings, weeklyPickId: 'w-c-ring-buffer', ctx: context() });
    expect(plan.blocks.find((b) => b.id === 'D')!.weeklyBuild!.refId).toBe('w-c-ring-buffer');
  });

  it('adds up to the 8-hour day and the 56-hour week', () => {
    expect(dailyTargetMinutes(settings, FIRST_DAY)).toBe(480);
    expect(weeklyTargetMinutes(settings)).toBe(56 * 60);
  });

  it('falls back to the nearest phase outside the plan rather than showing nothing', () => {
    const before = planForDay({ date: '2026-09-01', settings, ctx: context() });
    expect(before.phase!.id).toBe('y1-p0');
    const after = planForDay({ date: '2032-01-01', settings, ctx: context() });
    expect(after.phase!.id).toBe('y5');
  });

  it('says so when a lane has nothing left at all', () => {
    const emptied: AppSeed = { ...seed, plan: seed.plan.filter((i) => i.block !== 'C') };
    const block = planForDay({ date: FIRST_DAY, settings, ctx: { seed: emptied, states: new Map() } })
      .blocks.find((b) => b.id === 'C')!;
    expect(block.kind).toBe('empty');
    expect(block.emptyReason).toMatch(/Add an item on the Roadmap/);
  });
});
