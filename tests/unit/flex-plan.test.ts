/**
 * Plan editing and pace (flexibility brief, sections 2 and 3): patches over the seed, undo, prerequisite
 * conflicts, the three re-plan strategies, catch-up, pauses, and the sync files that carry all of it.
 */
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';
import { AtlasDB } from '../../src/db/db.ts';
import { addPlanEdit, undoLastPlanEdit, undoPlanEdit } from '../../src/db/edits.ts';
import { defaultSettings } from '../../src/lib/settings.ts';
import type { NewPlanPatch, Override, PlanPatch, StoredSettings, UserItemState } from '../../src/db/types.ts';
import { resolveDay } from '../../src/lib/day-plan.ts';
import { goalStatus } from '../../src/lib/goals.ts';
import { catchUpMinutes, defaultPauseTarget, laneBalance, lanePriority, paceSuggestion } from '../../src/lib/pace.ts';
import { applyPlanPatches, legacyPlanPatches, resolveSeed, stampPatches, undoableGroups } from '../../src/lib/plan.ts';
import { insertPhase, movePrerequisites, placeInLane, prerequisiteConflicts, shiftPhaseEnd, splitPhase, swapCandidates } from '../../src/lib/plan-edit.ts';
import { dropOrDefer, pushDatesBack, redistribute } from '../../src/lib/replan-strategies.ts';
import type { AppSeed } from '../../src/seed/schema.ts';
import { parsePlan, parseSettings, renderPlan, renderSettings } from '../../src/sync/files.ts';

const seed = splitSeed(loadSeedOrThrow()).app as AppSeed;
const settings = defaultSettings(seed.settings);
const DAY = '2026-09-21';

function apply(patches: NewPlanPatch[], base: AppSeed = seed): AppSeed {
  return resolveSeed(base, [], [], stampPatches(patches, 'test'));
}

const lane = (s: AppSeed, phaseId: string, block: string) => s.plan.filter((i) => i.phaseId === phaseId && i.block === block).sort((a, b) => a.order - b.order);
const refOf = (i: { resourceId?: string; projectId?: string }) => i.resourceId ?? i.projectId;

describe('plan patches over the seed', () => {
  it('adds an item at a position, renumbering the lane', () => {
    const before = lane(seed, 'y1-p0', 'E');
    const s = apply(placeInLane(seed, 'harvard-stat-110', 'y1-p0', 'E', 0));
    const after = lane(s, 'y1-p0', 'E');
    expect(after).toHaveLength(before.length + 1);
    expect(refOf(after[0]!)).toBe('harvard-stat-110');
    expect(after.map((i) => i.order)).toEqual(after.map((_, n) => (n + 1) * 10));
  });

  it('drops an item into the Dropped list and restores it', () => {
    const target = lane(seed, 'y1-p0', 'B')[0]!;
    const dropped = apply([{ op: 'drop', planItemId: target.id }]);
    expect(dropped.plan.some((i) => i.id === target.id)).toBe(false);
    expect(dropped.dropped!.map((i) => i.id)).toContain(target.id);
    const restored = resolveSeed(seed, [], [], [...stampPatches([{ op: 'drop', planItemId: target.id }], 'a', new Date('2026-01-01')), ...stampPatches([{ op: 'restore', planItemId: target.id }], 'b', new Date('2026-01-02'))]);
    expect(restored.plan.some((i) => i.id === target.id)).toBe(true);
    expect(restored.dropped).toEqual([]);
  });

  it('moves an item to another phase and lane', () => {
    const item = lane(seed, 'y1-p0', 'C')[0]!;
    const s = apply([{ op: 'move', planItemId: item.id, phaseId: 'y1-p1', block: 'A', order: 5 }]);
    expect(s.plan.find((i) => i.id === item.id)).toMatchObject({ phaseId: 'y1-p1', block: 'A', order: 5 });
  });

  it('swaps an item for an alternative, in the same place', () => {
    const planned = seed.plan.find((i) => i.resourceId === 'harvard-stat-110' || i.resourceId === 'mit-6-041')!;
    const other = planned.resourceId === 'harvard-stat-110' ? 'mit-6-041' : 'harvard-stat-110';
    expect(swapCandidates(seed, planned.resourceId!).named).toContain(other);
    const s = apply([{ op: 'swap', planItemId: planned.id, resourceId: other }]);
    const swapped = s.plan.find((i) => i.id === planned.id)!;
    expect(swapped.resourceId).toBe(other);
    expect(swapped.phaseId).toBe(planned.phaseId);
    expect(swapped.hours).toBeUndefined();
  });

  it('edits phases: rename, re-date with later phases shifting, add and split', () => {
    const { shifts, patches } = shiftPhaseEnd(seed.phases, 'y1-p0', '2027-02-07');
    expect(shifts.map((s) => s.phaseId)).toEqual(seed.phases.map((p) => p.id));
    const s = apply([...patches, { op: 'editPhase', phaseId: 'y1-p0', title: 'In flight' }]);
    expect(s.phases[0]).toMatchObject({ title: 'In flight', end: '2027-02-07' });
    expect(s.phases[1]!.start).toBe('2027-02-08');
    expect(s.phases.at(-1)!.end).toBe('2031-09-07');

    const added = apply(insertPhase(seed.phases, 'y1-p0', 'Exams', 14, 'my-phase-1'));
    expect(added.phases.map((p) => p.id).slice(0, 3)).toEqual(['y1-p0', 'my-phase-1', 'y1-p1']);
    expect(added.phases[1]).toMatchObject({ start: '2027-02-01', end: '2027-02-14' });
    expect(added.phases[2]!.start).toBe('2027-02-15');

    const split = apply(splitPhase(seed.phases, 'y1-p0', '2026-12-01', 'my-phase-1'));
    expect(split.phases[0]!.end).toBe('2026-11-30');
    expect(split.phases[1]).toMatchObject({ id: 'my-phase-1', start: '2026-12-01', end: '2027-01-31' });
  });

  it('keeps custom tracks and goals', () => {
    const s = apply([
      { op: 'custom', kind: 'track', data: { id: 'my-music', name: 'Music', family: 'Arts', slot: 3, summary: 'Piano.' } },
      { op: 'goal', goal: { id: 'g1', title: 'Ship the server', date: '2028-06-30', links: ['m-inference-server'] } },
    ]);
    expect(s.tracks.find((t) => t.id === 'my-music')).toMatchObject({ name: 'Music', source: 'user' });
    expect(s.goals).toEqual([{ id: 'g1', title: 'Ship the server', date: '2028-06-30', links: ['m-inference-server'] }]);
  });

  it('applies patches in order of time, then id, on every device alike', () => {
    const item = lane(seed, 'y1-p0', 'C')[0]!;
    const late = stampPatches([{ op: 'move', planItemId: item.id, order: 99 }], 'late', new Date('2026-02-01'));
    const early = stampPatches([{ op: 'move', planItemId: item.id, order: 1 }], 'early', new Date('2026-01-01'));
    expect(resolveSeed(seed, [], [], [...late, ...early]).plan.find((i) => i.id === item.id)!.order).toBe(99);
    expect(resolveSeed(seed, [], [], [...early, ...late]).plan.find((i) => i.id === item.id)!.order).toBe(99);
  });

  it('reports patches naming what no longer exists, once, without failing', () => {
    const s = apply([
      { op: 'drop', planItemId: 'plan.gone' },
      { op: 'drop', planItemId: 'plan.gone' },
      { op: 'editPhase', phaseId: 'nowhere', title: 'x' },
      { op: 'swap', planItemId: seed.plan[0]!.id, resourceId: 'no-such-resource' },
    ]);
    expect(s.patchProblems).toHaveLength(3);
    expect(s.plan).toHaveLength(seed.plan.length);
  });

  it('turns plan-item edits stored the old way into patches', () => {
    const item = lane(seed, 'y1-p0', 'C')[0]!;
    const overrides: Override[] = [
      { kind: 'planItem', id: item.id, patch: { order: 55, phaseId: 'y1-p1' } },
      { kind: 'planItem', id: lane(seed, 'y1-p0', 'B')[0]!.id, patch: {}, removed: true },
      { kind: 'resource', id: 'mit-18-06', patch: { estHours: 99 } },
    ];
    const patches = legacyPlanPatches(overrides, [{ kind: 'planItem', id: 'plan.x', data: { id: 'plan.x', phaseId: 'y1-p0', block: 'E', order: 999, resourceId: 'harvard-stat-110' }, createdAt: DAY }], 'now');
    expect(patches.map((p) => p.op).sort()).toEqual(['add', 'drop', 'move']);
    const viaOld = resolveSeed(seed, overrides, [{ kind: 'planItem', id: 'plan.x', data: { id: 'plan.x', phaseId: 'y1-p0', block: 'E', order: 999, resourceId: 'harvard-stat-110' }, createdAt: DAY }]);
    const viaNew = resolveSeed(seed, overrides.filter((o) => o.kind !== 'planItem'), [], patches);
    expect(viaNew.plan).toEqual(viaOld.plan);
    expect(viaNew.dropped).toEqual(viaOld.dropped);
  });
});

describe('undo', () => {
  it('undoes the last edit, or any of the last 50, as a whole', async () => {
    const db = new AtlasDB('undo-' + Math.random());
    const item = lane(seed, 'y1-p0', 'C')[0]!;
    const g1 = (await addPlanEdit([{ op: 'drop', planItemId: item.id }], 'Dropped it', db))!;
    await addPlanEdit([{ op: 'move', planItemId: lane(seed, 'y1-p0', 'B')[0]!.id, order: 1 }, { op: 'move', planItemId: lane(seed, 'y1-p0', 'B')[1]!.id, order: 2 }], 'Reordered B', db);
    expect(await db.planPatches.count()).toBe(3);
    expect(await undoLastPlanEdit(db)).toBe('Reordered B');
    expect(await db.planPatches.count()).toBe(1);
    expect(await undoPlanEdit(g1, db)).toBe(true);
    expect(await db.planPatches.count()).toBe(0);
    await db.delete();
  });

  it('keeps only the last 50 groups undoable', () => {
    const patches: PlanPatch[] = [];
    for (let n = 0; n < 60; n++) patches.push(...stampPatches([{ op: 'restore', planItemId: 'x' }], 'edit ' + n, new Date(Date.UTC(2026, 0, 1, 0, n))));
    const groups = undoableGroups(patches);
    expect(groups).toHaveLength(50);
    expect(groups[0]!.label).toBe('edit 59');
  });
});

describe('prerequisites', () => {
  it('finds a prerequisite planned later, and offers to move it too', () => {
    const withPrereq = seed.resources.find((r) => r.prerequisites.length > 0 && seed.plan.some((i) => i.resourceId === r.prerequisites[0] && i.phaseId !== 'y1-p0'))!;
    const conflicts = prerequisiteConflicts(seed, withPrereq.id, 'y1-p0', () => false);
    expect(conflicts.length).toBeGreaterThan(0);
    const fixed = apply([...placeInLane(seed, withPrereq.id, 'y1-p0', 'C', 99), ...movePrerequisites(seed, conflicts, 'y1-p0')]);
    expect(prerequisiteConflicts(fixed, withPrereq.id, 'y1-p0', () => false)).toEqual([]);
    expect(prerequisiteConflicts(seed, withPrereq.id, 'y1-p0', () => true)).toEqual([]);
  });
});

describe('pace', () => {
  const logs = [{ date: '2026-09-21', entries: [{ block: 'E', track: 'math' as const, minutes: 30 }] }];

  it('keeps "behind by" per lane instead of piling minutes onto tomorrow', () => {
    const b = laneBalance(settings, logs, 'E', '2026-09-21', '2026-09-23');
    // Math and physics plans two hours a day: 240 minutes over the two days, 30 logged.
    expect(b).toMatchObject({ planned: 240, logged: 30, behind: 210 });
    expect(b.behindDays).toBeCloseTo(1.75);
    expect(resolveDay('2026-09-23', settings).planned).toBe(600); // tomorrow is not longer
  });

  it('adds catch-up minutes only when opted in, and never more than the cap', () => {
    const b = laneBalance(settings, logs, 'E', '2026-09-21', '2026-09-23');
    expect(catchUpMinutes(settings, b)).toBe(0);
    const opted: StoredSettings = { ...settings, catchUp: { E: { capMinutes: 30 } } };
    expect(catchUpMinutes(opted, b)).toBe(30);
    expect(catchUpMinutes({ ...settings, catchUp: { E: { capMinutes: 240 } } }, b)).toBe(210);
    expect(catchUpMinutes(opted, { ...b, behind: -20 })).toBe(0);
  });

  it('sends a paused lane’s time to the highest-priority lane by default', () => {
    // Core (block C) carries inference and AI engineering: priority 1.
    expect(lanePriority(seed, 'y1-p1', 'C')).toBe(1);
    const target = defaultPauseTarget(seed, settings, 'y1-p1', 'E', '2027-03-01');
    expect(lanePriority(seed, 'y1-p1', target)).toBe(1);
    const best = Math.min(...['A', 'B', 'C', 'D'].map((b) => lanePriority(seed, 'y1-p1', b)));
    expect(lanePriority(seed, 'y1-p1', target)).toBe(best);
    const paused: StoredSettings = { ...settings, pauses: [{ id: 'p', block: target, from: '2027-01-01', until: null, to: 'free' }] };
    expect(defaultPauseTarget(seed, paused, 'y1-p1', 'E', '2027-03-01')).not.toBe(target);
  });

  it('suggests one pace change on Sunday when a lane is a week behind', () => {
    const phase = seed.phases[0]!;
    expect(paceSuggestion(settings, [], phase, '2026-09-25')).toBeNull();
    const s = paceSuggestion(settings, [], phase, '2026-10-05');
    expect(s).toMatchObject({ days: 14, weeks: 2 });
  });
});

describe('the three re-plan strategies', () => {
  const states = new Map<string, UserItemState>();
  const input = { seed, settings, states, asOf: DAY };

  it('1. pushes dates back until every lane fits, and is then a no-op', () => {
    const push = pushDatesBack(input);
    expect(push.shifts.length).toBeGreaterThan(0);
    expect(push.days).toBeGreaterThan(0);
    const after = apply(push.patches);
    for (let i = 1; i < after.phases.length; i++) expect(after.phases[i]!.start > after.phases[i - 1]!.end).toBe(true);
    expect(pushDatesBack({ ...input, seed: after }).shifts).toEqual([]);
  });

  it('2. redistributes minutes between lanes without changing the day’s length', () => {
    const spread = redistribute(input);
    expect(spread.changes.length).toBeGreaterThan(0);
    const before = spread.changes.reduce((s, c) => s + c.before, 0);
    const after = spread.changes.reduce((s, c) => s + c.after, 0);
    expect(Math.abs(after - before)).toBeLessThanOrEqual(5 * spread.changes.length);
    for (const c of spread.changes) expect(spread.pace[c.block]).toMatchObject({ mode: 'custom', minutes: c.after, from: DAY });
  });

  it('3. defers the lowest-priority items first, never ahead of what needs them, and then fits', () => {
    const { deferrals, patches } = dropOrDefer(input);
    expect(deferrals.length).toBeGreaterThan(0);
    const order = { stretch: 0, 'lower priority': 1, 'last in the lane': 2 };
    const firstPhase = deferrals.filter((d) => d.fromPhaseId === 'y1-p0' && d.block === deferrals[0]!.block);
    for (let i = 1; i < firstPhase.length; i++) expect(order[firstPhase[i]!.why] >= order[firstPhase[i - 1]!.why]).toBe(true);
    const after = apply(patches);
    expect(dropOrDefer({ ...input, seed: after }).deferrals).toEqual([]);
    // No resource sits in an earlier phase than a prerequisite that is still planned.
    const index = (id: string) => after.phases.findIndex((p) => p.id === id);
    for (const item of after.plan) {
      const r = after.resources.find((x) => x.id === item.resourceId);
      for (const pre of r?.prerequisites ?? []) {
        const p = after.plan.find((i) => i.resourceId === pre);
        if (p) expect(index(p.phaseId) <= index(item.phaseId), pre + ' before ' + item.resourceId).toBe(true);
      }
    }
  });
});

describe('goals', () => {
  it('is on track when the forecast finishes its items before the date, at risk otherwise', () => {
    const goal = { id: 'g', title: 'Linear algebra', date: '2031-01-01', links: ['mit-18-06'] };
    expect(goalStatus(goal, seed, settings, new Map(), [], DAY).verdict).toBe('on-track');
    expect(goalStatus({ ...goal, date: '2026-09-25' }, seed, settings, new Map(), [], DAY).verdict).toBe('at-risk');
    expect(goalStatus(goal, seed, settings, new Map([['mit-18-06', { refId: 'mit-18-06', status: 'done', unitsDone: [] }]]), [], DAY).verdict).toBe('done');
    expect(goalStatus({ ...goal, links: ['nielsen-chuang'] }, seed, settings, new Map(), [], DAY)).toMatchObject({ verdict: 'at-risk', unplanned: ['nielsen-chuang'] });
  });
});

describe('sync files', () => {
  it('writes plan.json version 2 with the patches, and reads it back', () => {
    const patches = stampPatches([{ op: 'drop', planItemId: seed.plan[0]!.id }], 'x');
    const text = renderPlan({ overrides: [], customEntities: [], replans: [], weekPicks: [], patches });
    expect(JSON.parse(text).version).toBe(2);
    const back = parsePlan(text);
    expect(back.ok && back.value.patches).toEqual(patches);
  });

  it('reads plan.json version 1 from a device on an older build, as patches', () => {
    const v1 = {
      format: 'atlas-plan',
      version: 1,
      overrides: [{ kind: 'planItem', id: seed.plan[0]!.id, patch: {}, removed: true, updatedAt: '2026-10-01T00:00:00.000Z' }],
      customEntities: [],
      replans: [],
      weekPicks: [],
    };
    const parsed = parsePlan(JSON.stringify(v1));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.overrides).toEqual([]);
    expect(parsed.value.patches).toMatchObject([{ op: 'drop', planItemId: seed.plan[0]!.id }]);
    expect(applyPlanPatches(seed, parsed.value.patches, () => true).dropped.map((i) => i.id)).toEqual([seed.plan[0]!.id]);
  });

  it('round-trips version 2 settings, and still reads version 1', () => {
    const s: StoredSettings = { ...settings, pace: { A: { mode: 'relaxed', from: DAY } }, schedule: { ...settings.schedule, days: { [DAY]: { rest: true } } } };
    const back = parseSettings(renderSettings(s));
    expect(back.ok && back.value).toEqual(JSON.parse(renderSettings(s)));
    const { version: _v, schedule: _s, pace: _p, pauses: _pa, catchUp: _c, layout: _l, ...v1 } = s;
    const { templates: _t, pattern: _pt, heatmapMode: _h, ...core } = v1.core;
    expect(parseSettings(JSON.stringify({ ...v1, core })).ok).toBe(true);
  });
});
