/**
 * The flexible schedule (flexibility brief, section 1): template resolution, planned minutes and targets, the
 * streak rule on planned minutes, relative heatmap levels, and the settings v1 → v2 migration.
 */
import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { defaultSettings, upgradeSettings } from '../../src/lib/settings.ts';
import { StoredSettingsSchema } from '../../src/db/types.ts';
import type { DayLog, StoredSettings, StoredSettingsInput } from '../../src/db/types.ts';
import { plannedFor, plannedMinutes, plannedOver, resolveDay, withDayChange, withScheduleEdit } from '../../src/lib/day-plan.ts';
import { forecastPhase, projectEnd } from '../../src/lib/forecast.ts';
import { buildGrid } from '../../src/lib/heatmap.ts';
import { dailyTargetMinutes, weeklyTargetMinutes } from '../../src/lib/schedule.ts';
import { freezesSpentInMonth, minutesToCount, relativeLevel, streak } from '../../src/lib/streaks.ts';

const seed = loadSeedOrThrow();
const base = defaultSettings(seed.settings);
const MONDAY = '2026-10-19';
const SATURDAY = '2026-10-24';

function edit(change: (s: StoredSettings) => void): StoredSettings {
  const s = structuredClone(base);
  change(s);
  return s;
}

function log(date: string, minutes: number, extra: Partial<DayLog> = {}): DayLog {
  return { date, entries: minutes > 0 ? [{ block: 'A', track: 'graphics', minutes }] : [], ...extra };
}

describe('template resolution', () => {
  it('ships the five templates of the brief, with Full day on every weekday', () => {
    expect(base.core.templates.map((t) => t.name)).toEqual(['Full day', 'University day', 'Weekend', 'Exam week', 'Rest day']);
    expect(base.core.pattern).toEqual(Array(7).fill('full'));
    const day = resolveDay(MONDAY, base);
    expect(day.templateName).toBe('Full day');
    expect(day.blocks.map((b) => [b.id, b.minutes])).toEqual([['A', 120], ['B', 60], ['C', 120], ['D', 120], ['E', 60]]);
    expect(day.planned).toBe(480);
  });

  it('uses the weekly pattern, then a date override, then the day’s own change', () => {
    const s = edit((x) => {
      x.core.pattern[6] = 'weekend';
      x.schedule.overrides.push({ id: 'o1', from: '2026-10-22', to: '2026-10-25', template: 'exam', label: 'Exam week' });
    });
    expect(resolveDay('2026-10-17', s).templateId).toBe('weekend'); // a Saturday, from the pattern
    expect(resolveDay(SATURDAY, s).templateId).toBe('exam'); // the override beats the pattern
    expect(resolveDay(SATURDAY, s).source).toBe('override');
    expect(resolveDay(SATURDAY, s).overrideLabel).toBe('Exam week');
    const changed = withDayChange(s, SATURDAY, (c) => ({ ...c, template: 'university' }));
    expect(resolveDay(SATURDAY, changed).templateId).toBe('university'); // today's change beats the override
    expect(resolveDay(SATURDAY, changed).planned).toBe(60 + 30 + 60 + 30);
  });

  it('makes a rest day plan nothing', () => {
    const s = withDayChange(base, MONDAY, (c) => ({ ...c, rest: true }));
    const day = resolveDay(MONDAY, s);
    expect(day.rest).toBe(true);
    expect(day.blocks).toEqual([]);
    expect(day.planned).toBe(0);
  });

  it('changes one block’s minutes, skips a block, and moves a block to tomorrow', () => {
    let s = withDayChange(base, MONDAY, (c) => ({ ...c, minutes: { A: 90 }, skip: ['E'], toTomorrow: ['C'] }));
    const monday = resolveDay(MONDAY, s);
    expect(monday.blocks.map((b) => [b.id, b.minutes])).toEqual([['A', 90], ['B', 60], ['D', 120]]);
    expect(monday.skipped).toEqual(['E']);
    expect(monday.movedOut).toEqual(['C']);
    const tuesday = resolveDay('2026-10-20', s);
    expect(tuesday.blocks.find((b) => b.id === 'C')).toMatchObject({ minutes: 240, movedFrom: MONDAY });
    // Moving to a day whose template lacks the block adds it.
    s = edit((x) => (x.core.pattern[2] = 'exam'));
    s = withDayChange(s, MONDAY, (c) => ({ ...c, toTomorrow: ['A'] }));
    expect(resolveDay('2026-10-20', s).blocks.map((b) => [b.id, b.minutes])).toEqual([['A', 120], ['B', 30], ['E', 60]]);
  });

  it('records swaps between blocks present on the day', () => {
    const s = withDayChange(base, MONDAY, (c) => ({ ...c, swaps: [['A', 'C']] }));
    expect(resolveDay(MONDAY, s).swaps).toEqual([['A', 'C']]);
    expect(resolveDay(MONDAY, s).planned).toBe(480);
  });

  it('removes an empty day change instead of storing it', () => {
    const s = withDayChange(base, MONDAY, () => ({ skip: [] }));
    expect(s.schedule.days[MONDAY]).toBeUndefined();
  });

  it('applies lane pace from the day it was set', () => {
    const s = edit((x) => {
      x.pace.A = { mode: 'relaxed', from: MONDAY };
      x.pace.C = { mode: 'intense', from: MONDAY };
      x.pace.E = { mode: 'custom', minutes: 15, from: MONDAY };
    });
    expect(resolveDay(MONDAY, s).blocks.map((b) => [b.id, b.minutes])).toEqual([['A', 90], ['B', 60], ['C', 150], ['D', 120], ['E', 15]]);
    expect(resolveDay('2026-10-18', s).planned).toBe(480); // the day before keeps its plan
  });

  it('gives a paused lane’s minutes to another lane, or to free time, and resumes', () => {
    const s = edit((x) => {
      x.pauses.push({ id: 'p1', block: 'A', from: MONDAY, until: '2026-10-20', to: 'C' });
      x.pauses.push({ id: 'p2', block: 'E', from: MONDAY, until: null, to: 'free' });
    });
    const monday = resolveDay(MONDAY, s);
    expect(monday.paused).toEqual(['A', 'E']);
    expect(monday.blocks.map((b) => [b.id, b.minutes])).toEqual([['B', 60], ['C', 240], ['D', 120]]);
    expect(resolveDay('2026-10-21', s).blocks.map((b) => b.id)).toEqual(['A', 'B', 'C', 'D']); // A resumed, E still paused
  });

  it('keeps past days’ plans when the schedule changes', () => {
    const today = '2026-10-22';
    const s = withScheduleEdit(base, today, (x) => ({ ...x, core: { ...x.core, pattern: Array(7).fill('exam') } }));
    expect(plannedMinutes('2026-10-21', s)).toBe(480); // yesterday keeps the Full day
    expect(plannedMinutes(today, s)).toBe(90); // from today on, Exam week
    // A second edit the same day keeps the one snapshot.
    const again = withScheduleEdit(s, today, (x) => ({ ...x, core: { ...x.core, pattern: Array(7).fill('rest') } }));
    expect(again.schedule.history).toHaveLength(1);
    expect(plannedMinutes('2026-10-21', again)).toBe(480);
    expect(plannedMinutes(today, again)).toBe(0);
  });
});

describe('planned minutes and targets', () => {
  it('derives Today’s and the week’s targets from the templates', () => {
    expect(dailyTargetMinutes(base, MONDAY)).toBe(480);
    expect(weeklyTargetMinutes(base, MONDAY)).toBe(56 * 60);
    const s = edit((x) => {
      x.core.pattern[0] = 'rest';
      x.core.pattern[6] = 'weekend';
    });
    expect(weeklyTargetMinutes(s, MONDAY)).toBe(5 * 480 + 420);
    expect(plannedOver(s, MONDAY, '2026-10-25', 'D')).toBe(5 * 120 + 180);
  });

  it('pushes a lane’s projected finish back by an exam week', () => {
    const plain = projectEnd(base, 'A', MONDAY, 20, 1);
    expect(plain).toBe('2026-10-28'); // 20 h at 2 h a day: ten days
    const exam = edit((x) => x.schedule.overrides.push({ id: 'e', from: MONDAY, to: '2026-10-25', template: 'exam' }));
    expect(projectEnd(exam, 'A', MONDAY, 20, 1)).toBe('2026-11-04'); // a week later
    expect(projectEnd(base, 'A', MONDAY, 20, 0)).toBeNull();
  });

  it('feeds the schedule into the phase forecast', () => {
    const phase = seed.phases.find((p) => p.id === 'y1-p0')!;
    const lanes = [{ block: 'A', remainingHours: 50, doneHours: 10 }] as Parameters<typeof forecastPhase>[0]['lanes'];
    const logs = Array.from({ length: 28 }, (_, i) => log(addDaysLocal('2026-09-22', i), 120));
    const asOf = '2026-10-19';
    const normal = forecastPhase({ phase, lanes, logs, settings: base, asOf });
    const exam = forecastPhase({ phase, lanes, logs, settings: edit((x) => x.schedule.overrides.push({ id: 'e', from: '2026-10-20', to: '2026-11-02', template: 'exam' })), asOf });
    expect(normal.lanes[0]!.projectedEnd! < exam.lanes[0]!.projectedEnd!).toBe(true);
  });
});

function addDaysLocal(date: string, n: number): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

describe('the streak rule', () => {
  const rules = base.core.streak;

  it('counts a day at 60 minutes or half its plan, whichever is lower', () => {
    expect(minutesToCount(480, rules)).toBe(60);
    expect(minutesToCount(90, rules)).toBe(45); // an exam-week day
    expect(minutesToCount(undefined, rules)).toBe(60);
    const exam = edit((x) => x.schedule.overrides.push({ id: 'e', from: MONDAY, to: '2026-10-25', template: 'exam' }));
    const logs = [log(MONDAY, 45), log('2026-10-20', 45)];
    expect(streak(logs, { ...rules, freezesPerMonth: 0, autoFreeze: false }, '2026-10-20', plannedFor(exam)).current).toBe(2);
    expect(streak(logs, { ...rules, freezesPerMonth: 0, autoFreeze: false }, '2026-10-20', plannedFor(base)).current).toBe(0);
  });

  it('never breaks on a rest day, and spends no freeze on it', () => {
    const s = withDayChange(base, '2026-10-20', (c) => ({ ...c, rest: true }));
    const logs = [log(MONDAY, 120), log('2026-10-21', 120)];
    const strict = { ...rules, freezesPerMonth: 0, autoFreeze: false };
    expect(streak(logs, strict, '2026-10-21', plannedFor(s)).current).toBe(2);
    expect(streak(logs, strict, '2026-10-21', plannedFor(base)).current).toBe(1);
    expect(freezesSpentInMonth(logs, rules, '2026-10-21', plannedFor(s))).toBe(0);
    expect(freezesSpentInMonth(logs, rules, '2026-10-21', plannedFor(base))).toBe(1);
  });

  it('is not at risk on a rest day', () => {
    const s = withDayChange(base, '2026-10-20', (c) => ({ ...c, rest: true }));
    const state = streak([log(MONDAY, 120)], rules, '2026-10-20', plannedFor(s));
    expect(state.current).toBe(1);
    expect(state.atRisk).toBe(false);
  });

  it('still counts a rest day that reaches the minimum', () => {
    const s = withDayChange(base, '2026-10-20', (c) => ({ ...c, rest: true }));
    expect(streak([log(MONDAY, 120), log('2026-10-20', 60)], rules, '2026-10-20', plannedFor(s)).current).toBe(2);
  });
});

describe('relative heatmap levels', () => {
  const t = base.core.heatmapThresholds;
  it('steps at 25, 60 and 100 % of the day’s plan', () => {
    expect(relativeLevel(0, 480, t)).toBe(0);
    expect(relativeLevel(119, 480, t)).toBe(1);
    expect(relativeLevel(120, 480, t)).toBe(2);
    expect(relativeLevel(288, 480, t)).toBe(3);
    expect(relativeLevel(480, 480, t)).toBe(4);
    expect(relativeLevel(90, 90, t)).toBe(4); // a full exam-week day is a full day
  });

  it('falls back to absolute minutes on a day that planned nothing', () => {
    expect(relativeLevel(130, 0, t)).toBe(2);
  });

  it('can be switched back to absolute minutes', () => {
    const exam = edit((x) => x.schedule.overrides.push({ id: 'e', from: MONDAY, to: MONDAY, template: 'exam' }));
    const logs = [log(MONDAY, 90)];
    const relative = buildGrid({ from: MONDAY, to: MONDAY, logs, thresholds: t, mode: 'relative', planned: plannedFor(exam) });
    const absolute = buildGrid({ from: MONDAY, to: MONDAY, logs, thresholds: t, mode: 'absolute', planned: plannedFor(exam) });
    expect(relative.cells.find((c) => c.date === MONDAY)!.level).toBe(4);
    expect(absolute.cells.find((c) => c.date === MONDAY)!.level).toBe(1);
  });
});

describe('settings v1 → v2', () => {
  /** Settings as a version 1 install stored them: no version, templates, pattern, mode or percent. */
  function v1(): StoredSettingsInput {
    const { templates: _t, pattern: _p, heatmapMode: _h, ...core } = structuredClone(seed.settings);
    const { percent: _percent, ...streakRules } = core.streak;
    return {
      id: 'app',
      core: { ...core, streak: streakRules, blocks: core.blocks.map((b) => (b.id === 'D' ? { ...b, minutes: 150 } : b)) },
      theme: 'dark',
      github: { username: 'me', showCalendar: true },
      backup: { lastBackupAt: '2026-10-01' },
      updatedAt: '2026-10-01T10:00:00.000Z',
      deviceId: 'dev-1',
    };
  }

  it('parses version 1 as stored, from a backup or a sync', () => {
    expect(StoredSettingsSchema.safeParse(v1()).success).toBe(true);
  });

  it('upgrades to version 2 keeping the user’s own block minutes and every other setting', () => {
    const upgraded = upgradeSettings(v1(), seed.settings);
    expect(upgraded.version).toBe(2);
    expect(upgraded.theme).toBe('dark');
    expect(upgraded.github).toEqual({ username: 'me', showCalendar: true });
    expect(upgraded.backup.lastBackupAt).toBe('2026-10-01');
    expect(upgraded.core.templates).toEqual(seed.settings.templates);
    expect(upgraded.core.pattern).toEqual(seed.settings.pattern);
    expect(upgraded.core.streak.percent).toBe(50);
    expect(upgraded.core.heatmapMode).toBe('relative');
    expect(upgraded.schedule).toEqual({ overrides: [], days: {}, history: [] });
    expect(upgraded.layout.tabs).toEqual(['today', 'plan', 'library', 'activity']);
    // The Full day follows the blocks' own minutes, so the user's 150 minutes of D survive.
    expect(resolveDay(MONDAY, upgraded).blocks.find((b) => b.id === 'D')!.minutes).toBe(150);
    expect(resolveDay(MONDAY, upgraded).planned).toBe(510);
    expect(StoredSettingsSchema.safeParse(upgraded).success).toBe(true);
  });

  it('is idempotent', () => {
    const once = upgradeSettings(v1(), seed.settings);
    expect(upgradeSettings(once, seed.settings)).toBe(once);
  });

  it('upgrades a v1 file that lacks blocks the curriculum has since added', () => {
    const old = v1();
    const extra = { ...seed.settings, blocks: [...seed.settings.blocks, { id: 'P', name: 'Practice', minutes: 45, days: [0, 1, 2, 3, 4, 5, 6], summary: 's' }] };
    extra.templates = extra.templates.map((t) => (t.id === 'full' ? { ...t, blocks: [...t.blocks, { block: 'P' }] } : t));
    const upgraded = upgradeSettings(old, extra);
    expect(upgraded.core.blocks.map((b) => b.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'P']);
  });
});
