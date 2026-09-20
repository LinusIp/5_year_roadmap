import { describe, expect, it } from 'vitest';
import { averageMinutes, dailyTotals, freezesSpentInMonth, heatLabel, heatLevel, streak } from '../../src/lib/streaks.ts';
import type { StreakRules } from '../../src/lib/streaks.ts';
import type { DayLog } from '../../src/db/types.ts';

const RULES: StreakRules = { minMinutes: 60, freezesPerMonth: 2, autoFreeze: true };
const STRICT: StreakRules = { ...RULES, autoFreeze: false, freezesPerMonth: 0 };

function log(date: string, minutes: number, extra: Partial<DayLog> = {}): DayLog {
  return { date, entries: minutes > 0 ? [{ block: 'A', track: 'gamedev', minutes }] : [], ...extra };
}

describe('daily totals', () => {
  it('fills in the days with nothing logged', () => {
    const totals = dailyTotals([log('2026-09-21', 120), log('2026-09-24', 60)]);
    expect(totals.map((t) => [t.date, t.minutes])).toEqual([
      ['2026-09-21', 120],
      ['2026-09-22', 0],
      ['2026-09-23', 0],
      ['2026-09-24', 60],
    ]);
  });
});

describe('streaks', () => {
  it('counts consecutive days that meet the minimum', () => {
    const logs = [log('2026-09-21', 480), log('2026-09-22', 120), log('2026-09-23', 60)];
    expect(streak(logs, STRICT, '2026-09-23').current).toBe(3);
  });

  it('does not count a day below the minimum', () => {
    const logs = [log('2026-09-21', 480), log('2026-09-22', 30), log('2026-09-23', 480)];
    const state = streak(logs, STRICT, '2026-09-23');
    expect(state.current).toBe(1);
    expect(state.longest).toBe(1);
  });

  it('keeps today from breaking the streak before the day is over', () => {
    const logs = [log('2026-09-21', 480), log('2026-09-22', 480), log('2026-09-23', 0)];
    const state = streak(logs, STRICT, '2026-09-23');
    expect(state.current).toBe(2);
    expect(state.atRisk).toBe(true);
    expect(state.lastCountedOn).toBe('2026-09-22');
  });

  it('is not at risk once today counts', () => {
    const logs = [log('2026-09-21', 480), log('2026-09-22', 480), log('2026-09-23', 90)];
    const state = streak(logs, STRICT, '2026-09-23');
    expect(state.current).toBe(3);
    expect(state.atRisk).toBe(false);
  });

  it('spends a freeze to hold the streak, and reports how many are in use', () => {
    const logs = [log('2026-09-21', 480), log('2026-09-22', 0), log('2026-09-23', 480), log('2026-09-24', 480)];
    const state = streak(logs, RULES, '2026-09-24');
    expect(state.current).toBe(3); // the frozen day holds the run without adding to it
    expect(state.freezesInUse).toBe(1);
    expect(state.startedOn).toBe('2026-09-21');
  });

  it('runs out of freezes after the monthly allowance and breaks the streak', () => {
    const logs = [
      log('2026-09-21', 480), log('2026-09-22', 0), log('2026-09-23', 480),
      log('2026-09-24', 0), log('2026-09-25', 480), log('2026-09-26', 0), log('2026-09-27', 480),
    ];
    const state = streak(logs, RULES, '2026-09-27');
    expect(state.current).toBe(1); // the third missed day is not covered
    expect(state.longest).toBe(3);
  });

  it('gives the allowance back at the start of the next month', () => {
    const logs = [
      log('2026-09-29', 480), log('2026-09-30', 0),
      log('2026-10-01', 480), log('2026-10-02', 0), log('2026-10-03', 0), log('2026-10-04', 480),
    ];
    const state = streak(logs, RULES, '2026-10-04');
    // One freeze in September, two in October: all covered, so every logged day is still in the run.
    expect(state.current).toBe(3);
    expect(state.freezesInUse).toBe(3);
  });

  it('honours a day the user froze explicitly even with auto-freeze off', () => {
    const rules: StreakRules = { minMinutes: 60, freezesPerMonth: 2, autoFreeze: false };
    const logs = [log('2026-09-21', 480), log('2026-09-22', 0, { frozen: true }), log('2026-09-23', 480)];
    expect(streak(logs, rules, '2026-09-23').current).toBe(2);
  });

  it('reports the longest streak even after the current one breaks', () => {
    const logs = [
      log('2026-09-01', 480), log('2026-09-02', 480), log('2026-09-03', 480), log('2026-09-04', 480),
      log('2026-09-05', 0), log('2026-09-06', 0), log('2026-09-07', 0), log('2026-09-08', 0),
      log('2026-09-09', 480),
    ];
    const state = streak(logs, STRICT, '2026-09-09');
    expect(state.longest).toBe(4);
    expect(state.current).toBe(1);
  });

  it('has no streak before anything is logged', () => {
    const state = streak([], RULES, '2026-09-21');
    expect(state).toMatchObject({ current: 0, longest: 0, startedOn: null, atRisk: false });
  });

  it('counts the freezes spent so far this month', () => {
    const logs = [log('2026-09-21', 480), log('2026-09-22', 0), log('2026-09-23', 480)];
    expect(freezesSpentInMonth(logs, RULES, '2026-09-23')).toBe(1);
    expect(freezesSpentInMonth(logs, RULES, '2026-10-01')).toBe(0);
  });
});

describe('heatmap levels', () => {
  const thresholds = [1, 120, 300, 420] as [number, number, number, number];

  it('maps minutes to the five steps of the brief', () => {
    expect(heatLevel(0, thresholds)).toBe(0);
    expect(heatLevel(1, thresholds)).toBe(1);
    expect(heatLevel(119, thresholds)).toBe(1);
    expect(heatLevel(120, thresholds)).toBe(2);
    expect(heatLevel(299, thresholds)).toBe(2);
    expect(heatLevel(300, thresholds)).toBe(3);
    expect(heatLevel(419, thresholds)).toBe(3);
    expect(heatLevel(420, thresholds)).toBe(4);
    expect(heatLevel(480, thresholds)).toBe(4); // a full 8-hour day is the top step
  });

  it('follows thresholds the user changed', () => {
    const custom = [1, 60, 180, 240] as [number, number, number, number];
    expect(heatLevel(120, custom)).toBe(2);
    expect(heatLevel(240, custom)).toBe(4);
  });

  it('describes each band', () => {
    expect(heatLabel(0, thresholds)).toBe('Nothing logged');
    expect(heatLabel(2, thresholds)).toBe('120 to 299 minutes');
    expect(heatLabel(4, thresholds)).toBe('7 h or more');
  });
});

describe('rolling averages', () => {
  it('averages over the window, counting empty days', () => {
    const logs = [log('2026-09-21', 480), log('2026-09-22', 240)];
    expect(averageMinutes(logs, 2, '2026-09-22')).toBe(360);
    expect(averageMinutes(logs, 4, '2026-09-24')).toBe(180); // two empty days pull it down
    expect(averageMinutes([], 7, '2026-09-24')).toBe(0);
  });
});
