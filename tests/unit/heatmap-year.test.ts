import { describe, expect, it } from 'vitest';
import { cellPhase, layoutGrid, monthlyTotals } from '../../src/lib/heatmap.ts';
import type { DayLog } from '../../src/db/types.ts';

/** The heatmaps draw the whole calendar year (HEATMAP-FULL-YEAR). */
describe('the grid of a year', () => {
  it('lays 2026 out in 53 Monday-first weeks, 1 January to 31 December', () => {
    const grid = layoutGrid('2026-01-01', '2026-12-31', 1);
    expect(grid.columns).toBe(53);
    expect(grid.start).toBe('2025-12-29');
    const days = grid.slots.filter((s) => !s.outside);
    expect(days).toHaveLength(365);
    // 1 January 2026 is a Thursday: the fourth row of the first week.
    expect(days[0]).toMatchObject({ date: '2026-01-01', column: 0, row: 3 });
    expect(days.at(-1)).toMatchObject({ date: '2026-12-31', column: 52, row: 3 });
    expect(grid.months.map((m) => m.label)).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
  });

  it('starts on Sunday when the week does', () => {
    const grid = layoutGrid('2026-01-01', '2026-12-31', 0);
    expect(grid.start).toBe('2025-12-28');
    expect(grid.slots.find((s) => s.date === '2026-01-01')!.row).toBe(4);
  });
});

describe('each day of the grid', () => {
  it('is before the plan, a day gone, today, or still ahead', () => {
    const today = '2026-10-18';
    const start = '2026-09-21';
    expect(cellPhase('2026-04-02', today, start)).toBe('before-plan');
    expect(cellPhase('2026-09-21', today, start)).toBe('past');
    expect(cellPhase('2026-10-17', today, start)).toBe('past');
    expect(cellPhase('2026-10-18', today, start)).toBe('today');
    expect(cellPhase('2026-10-19', today, start)).toBe('future');
    expect(cellPhase('2027-03-01', today, start)).toBe('future');
    // The GitHub calendar has no plan start: every day gone is a day gone.
    expect(cellPhase('2026-04-02', today)).toBe('past');
  });
});

describe('All years', () => {
  it('adds up each month of a year, January first', () => {
    const log = (date: string, ...minutes: number[]): DayLog => ({ date, entries: minutes.map((m) => ({ block: 'A', track: 'gamedev', minutes: m })) }) as unknown as DayLog;
    const logs = [log('2026-09-21', 60, 30), log('2026-09-30', 45), log('2026-10-01', 120), log('2027-01-05', 10)];
    const months = monthlyTotals(logs, 2026);
    expect(months).toHaveLength(12);
    expect(months[8]).toBe(135);
    expect(months[9]).toBe(120);
    expect(months.reduce((a, b) => a + b, 0)).toBe(255);
    expect(monthlyTotals(logs, 2027)[0]).toBe(10);
    expect(monthlyTotals(logs, 2028).every((m) => m === 0)).toBe(true);
  });
});
