import { describe, expect, it } from 'vitest';
import { buildGrid, dayDetail, minutesPerBlock, minutesPerTrack, planYears, yearRange } from '../../src/lib/heatmap.ts';
import type { DayLog } from '../../src/db/types.ts';
import type { SettingsDefaults } from '../../src/seed/schema.ts';

const THRESHOLDS: SettingsDefaults['heatmapThresholds'] = [1, 120, 300, 420];

function log(date: string, entries: [string, string, number][], extra: Partial<DayLog> = {}): DayLog {
  return {
    date,
    entries: entries.map(([block, track, minutes]) => ({ block: block as never, track: track as never, minutes })),
    ...extra,
  };
}

describe('the contribution grid', () => {
  it('lays a year out as 53 columns of 7 days', () => {
    const grid = buildGrid({ from: '2027-01-01', to: '2027-12-31', logs: [], thresholds: THRESHOLDS });
    expect(grid.columns).toBeGreaterThanOrEqual(52);
    expect(grid.columns).toBeLessThanOrEqual(54);
    expect(grid.cells.length).toBe(grid.columns * 7);
    // Every day of the year is present exactly once.
    const inside = grid.cells.filter((c) => !c.outside);
    expect(inside).toHaveLength(365);
    expect(new Set(inside.map((c) => c.date)).size).toBe(365);
  });

  it('pads to whole weeks and marks the padding as outside the range', () => {
    // 2026-09-21 is a Monday, so with a Monday-start week there is no padding at the front.
    const grid = buildGrid({ from: '2026-09-21', to: '2026-09-27', logs: [], thresholds: THRESHOLDS, weekStartsOn: 1 });
    expect(grid.columns).toBe(1);
    expect(grid.cells.every((c) => !c.outside)).toBe(true);

    // Starting mid-week pads the days before it.
    const padded = buildGrid({ from: '2026-09-23', to: '2026-09-27', logs: [], thresholds: THRESHOLDS, weekStartsOn: 1 });
    expect(padded.cells.filter((c) => c.outside).map((c) => c.date)).toEqual(['2026-09-21', '2026-09-22']);
  });

  it('puts each day in the right row for the configured first day of the week', () => {
    const monday = buildGrid({ from: '2026-09-21', to: '2026-09-27', logs: [], thresholds: THRESHOLDS, weekStartsOn: 1 });
    expect(monday.cells.find((c) => c.date === '2026-09-21')!.row).toBe(0); // Monday
    expect(monday.cells.find((c) => c.date === '2026-09-27')!.row).toBe(6); // Sunday

    const sunday = buildGrid({ from: '2026-09-21', to: '2026-09-27', logs: [], thresholds: THRESHOLDS, weekStartsOn: 0 });
    expect(sunday.cells.find((c) => c.date === '2026-09-27')!.row).toBe(0);
  });

  it('turns minutes into the five intensity levels', () => {
    const logs = [
      log('2026-09-21', [['A', 'gamedev', 480]]),
      log('2026-09-22', [['A', 'gamedev', 300]]),
      log('2026-09-23', [['A', 'gamedev', 120]]),
      log('2026-09-24', [['A', 'gamedev', 30]]),
      log('2026-09-25', []),
    ];
    const grid = buildGrid({ from: '2026-09-21', to: '2026-09-27', logs, thresholds: THRESHOLDS });
    const level = (date: string): number => grid.cells.find((c) => c.date === date)!.level;
    expect(level('2026-09-21')).toBe(4);
    expect(level('2026-09-22')).toBe(3);
    expect(level('2026-09-23')).toBe(2);
    expect(level('2026-09-24')).toBe(1);
    expect(level('2026-09-25')).toBe(0);
    expect(level('2026-09-26')).toBe(0);
  });

  it('counts only the filtered track, but remembers the day total', () => {
    const logs = [log('2026-09-21', [['A', 'gamedev', 120], ['E', 'math', 60]])];
    const all = buildGrid({ from: '2026-09-21', to: '2026-09-21', logs, thresholds: THRESHOLDS });
    expect(all.cells[0]!.minutes).toBe(180);
    expect(all.totalMinutes).toBe(180);

    const mathOnly = buildGrid({ from: '2026-09-21', to: '2026-09-21', logs, thresholds: THRESHOLDS, tracks: ['math'] });
    expect(mathOnly.cells[0]!.minutes).toBe(60);
    expect(mathOnly.cells[0]!.totalMinutes).toBe(180);
    expect(mathOnly.cells[0]!.level).toBe(1); // 60 minutes is level 1, not the 180 of the whole day
  });

  it('marks freeze days so the grid can draw them differently', () => {
    const logs = [log('2026-09-22', [], { frozen: true })];
    const grid = buildGrid({ from: '2026-09-21', to: '2026-09-27', logs, thresholds: THRESHOLDS });
    expect(grid.cells.find((c) => c.date === '2026-09-22')!.frozen).toBe(true);
    expect(grid.cells.find((c) => c.date === '2026-09-21')!.frozen).toBe(false);
  });

  it('labels the months across the top', () => {
    const grid = buildGrid({ from: '2027-01-01', to: '2027-12-31', logs: [], thresholds: THRESHOLDS });
    expect(grid.months.map((m) => m.label)).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
    expect(grid.months[0]!.column).toBeLessThan(grid.months[11]!.column);
  });

  it('reports totals for the range', () => {
    const logs = [log('2026-09-21', [['A', 'gamedev', 480]]), log('2026-09-23', [['A', 'gamedev', 60]])];
    const grid = buildGrid({ from: '2026-09-21', to: '2026-09-27', logs, thresholds: THRESHOLDS });
    expect(grid.totalMinutes).toBe(540);
    expect(grid.daysWithActivity).toBe(2);
    expect(grid.maxMinutes).toBe(480);
  });

  it('handles the whole five-year plan in one grid', () => {
    const grid = buildGrid({ from: '2026-09-21', to: '2031-08-31', logs: [], thresholds: THRESHOLDS });
    expect(grid.cells.filter((c) => !c.outside)).toHaveLength(1806);
    expect(grid.columns).toBeGreaterThan(255);
  });
});

describe('totals', () => {
  const logs = [
    log('2026-09-21', [['A', 'gamedev', 120], ['E', 'math', 60], ['C', 'ai', 120]]),
    log('2026-09-22', [['E', 'math', 60]]),
  ];

  it('adds minutes per track, with each track share', () => {
    const totals = minutesPerTrack(logs);
    expect(totals[0]).toMatchObject({ track: 'gamedev', minutes: 120 });
    expect(totals.find((t) => t.track === 'math')!.minutes).toBe(120);
    expect(totals.reduce((sum, t) => sum + t.share, 0)).toBeCloseTo(1);
  });

  it('adds minutes per block', () => {
    expect(minutesPerBlock(logs)).toEqual({ A: 120, B: 0, C: 120, D: 0, E: 120 });
  });

  it('restricts totals to a range', () => {
    expect(minutesPerBlock(logs, '2026-09-22', '2026-09-22')).toEqual({ A: 0, B: 0, C: 0, D: 0, E: 60 });
  });
});

describe('a day in detail', () => {
  it('breaks the day down by block and lists what was touched', () => {
    const day = log(
      '2026-09-21',
      [['A', 'gamedev', 120], ['E', 'math', 60]],
      { reflection: 'Good day', energy: 4, frozen: false },
    );
    day.entries[0]!.refId = 'a-small-game-1';
    day.entries[1]!.refId = 'mit-18-06';
    day.entries.push({ block: 'D', track: 'swe', minutes: 30, note: 'Fixed the build' });

    const detail = dayDetail(day, '2026-09-21');
    expect(detail.totalMinutes).toBe(210);
    expect(detail.byBlock).toEqual([
      { block: 'A', minutes: 120 },
      { block: 'D', minutes: 30 },
      { block: 'E', minutes: 60 },
    ]);
    expect(detail.refIds).toEqual(['a-small-game-1', 'mit-18-06']);
    expect(detail.notes).toEqual(['Fixed the build']);
    expect(detail.energy).toBe(4);
    expect(detail.reflection).toBe('Good day');
  });

  it('describes a day with no log at all', () => {
    expect(dayDetail(undefined, '2026-09-21')).toEqual({
      date: '2026-09-21',
      totalMinutes: 0,
      byBlock: [],
      refIds: [],
      notes: [],
      frozen: false,
    });
  });
});

describe('the year switcher', () => {
  it('lists every year the plan touches', () => {
    expect(planYears('2026-09-21', '2031-08-31')).toEqual([2026, 2027, 2028, 2029, 2030, 2031]);
  });

  it('clips the first and last years to the plan', () => {
    expect(yearRange(2026, '2026-09-21', '2031-08-31')).toEqual({ from: '2026-09-21', to: '2026-12-31' });
    expect(yearRange(2028, '2026-09-21', '2031-08-31')).toEqual({ from: '2028-01-01', to: '2028-12-31' });
    expect(yearRange(2031, '2026-09-21', '2031-08-31')).toEqual({ from: '2031-01-01', to: '2031-08-31' });
  });
});
