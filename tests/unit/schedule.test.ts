import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';
import { defaultSettings } from '../../src/db/settings.ts';
import { withAddedBlock } from '../../src/lib/calendar.ts';
import { parseHm } from '../../src/lib/calendar-layout.ts';
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
    expect(plan.targetMinutes).toBe(600); // the 10-hour daily schedule
    expect(plan.blocks.map((b) => b.id)).toEqual(['C', 'A', 'H', 'B', 'E']);

    // The pinned courses: GameDevHQ first in lane A, the Hugging Face course in the new lane H.
    expect(byBlock.get('A')!.item!.title).toMatch(/GameDevHQ/);
    expect(byBlock.get('H')!.item!.title).toMatch(/Hugging Face LLM Course/);
    expect(byBlock.get('B')!.item!.title).toMatch(/30 Days of Python/);
    expect(byBlock.get('B')!.item!.nextUnit).toMatchObject({ position: 1, title: expect.stringContaining('Day 1') });
    expect(byBlock.get('C')!.item!.title).toMatch(/Machine Learning Zoomcamp/);
    // The lesson checklist (ZOOMCAMP-CHECKLIST): a fresh install starts at lesson 1.1.
    expect(byBlock.get('C')!.item!.nextUnit).toMatchObject({ id: '1.1', title: 'Introduction to Machine Learning', section: 'Introduction to Machine Learning' });
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

    const dropped = context([done('mit-18-06'), { refId: 'current-dsa-course', status: 'dropped', unitsDone: [] }, done('3b1b-linear-algebra'), done('3b1b-calculus')]);
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
    expect(block.item!.title).toMatch(/Beej/); // the first item of the next phase's lane B
  });

  it('keeps the five courses on Sundays: the review replaced the projects block, which the daily schedule leaves out', () => {
    const sunday = '2026-09-27';
    const plan = planForDay({ date: sunday, settings, ctx: context() });
    expect(plan.isReviewDay).toBe(true);
    expect(plan.blocks.map((b) => [b.id, b.kind])).toEqual([['C', 'item'], ['A', 'item'], ['H', 'item'], ['B', 'item'], ['E', 'item']]);
    // Projects added to a Sunday by hand is still the review.
    const withD = withAddedBlock(settings, sunday, 'D', 60, parseHm('13:00'));
    const blockD = planForDay({ date: sunday, settings: withD, ctx: context() }).blocks.find((b) => b.id === 'D')!;
    expect(blockD.kind).toBe('review');
    expect(blockD.item).toBeUndefined();
  });

  it('leaves a block out on a weekday it does not run', () => {
    const custom = structuredClone(settings);
    custom.core.blocks.find((b) => b.id === 'A')!.days = [1, 2, 3, 4, 5];
    const plan = planForDay({ date: '2026-09-26', settings: custom, ctx: context() }); // a Saturday
    expect(plan.blocks.find((b) => b.id === 'A')).toBeUndefined();
    expect(plan.targetMinutes).toBe(480);
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
    // Projects is no longer in the daily schedule; added to a day, it carries the week's pick.
    const withD = withAddedBlock(settings, FIRST_DAY, 'D', 60, parseHm('13:00'));
    const plan = planForDay({ date: FIRST_DAY, settings: withD, weeklyPickId: 'w-c-ring-buffer', ctx: context() });
    expect(plan.blocks.find((b) => b.id === 'D')!.weeklyBuild!.refId).toBe('w-c-ring-buffer');
  });

  it('adds up to the 10-hour day and the 70-hour week', () => {
    expect(dailyTargetMinutes(settings, FIRST_DAY)).toBe(600);
    expect(weeklyTargetMinutes(settings, FIRST_DAY)).toBe(70 * 60);
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
