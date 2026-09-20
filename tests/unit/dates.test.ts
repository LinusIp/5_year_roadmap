import { describe, expect, it } from 'vitest';
import {
  addDays, daysBetween, eachDay, endOfMonth, endOfWeek, formatHours, formatLong, formatMinutes,
  formatRange, formatShort, formatStopwatch, fromIsoDate, monthKey, parseDuration, startOfMonth,
  startOfWeek, toIsoDate, today, weekday,
} from '../../src/lib/dates.ts';

// vitest.config.ts pins TZ=Asia/Tashkent (UTC+5), the user's zone.
describe('local dates', () => {
  it('runs in UTC+5, which is the point of these tests', () => {
    expect(new Date('2026-09-21T00:00:00').getTimezoneOffset()).toBe(-300);
  });

  it('uses the local calendar day, never the UTC one', () => {
    // 00:30 local on the 21st is 19:30 UTC on the 20th. toISOString() would call this "the 20th".
    const justAfterMidnight = new Date(2026, 8, 21, 0, 30);
    expect(justAfterMidnight.toISOString().slice(0, 10)).toBe('2026-09-20');
    expect(toIsoDate(justAfterMidnight)).toBe('2026-09-21');

    // And 23:30 local on the 21st is already the 21st in UTC too, but late-evening study must stay on the 21st.
    expect(toIsoDate(new Date(2026, 8, 21, 23, 30))).toBe('2026-09-21');
    expect(today(justAfterMidnight)).toBe('2026-09-21');
  });

  it('round-trips a date through local midnight', () => {
    const iso = '2026-09-21';
    const date = fromIsoDate(iso);
    expect(date.getHours()).toBe(0);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(21);
    expect(toIsoDate(date)).toBe(iso);
  });

  it('rejects a malformed date rather than guessing', () => {
    expect(() => fromIsoDate('21/09/2026')).toThrow();
    expect(() => fromIsoDate('2026-9-1')).toThrow();
  });

  it('counts whole days across month, year and leap-day boundaries', () => {
    expect(daysBetween('2026-09-21', '2026-09-22')).toBe(1);
    expect(daysBetween('2026-09-21', '2026-09-21')).toBe(0);
    expect(daysBetween('2026-09-22', '2026-09-21')).toBe(-1);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2); // 2028 is a leap year
    expect(daysBetween('2027-02-28', '2027-03-01')).toBe(1);
    expect(daysBetween('2026-09-21', '2031-08-31')).toBe(1805); // the whole plan
  });

  it('adds days across boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-09-21', 365)).toBe('2027-09-21');
  });

  it('knows the weekday: 2026-09-21, the first day of the plan, is a Monday', () => {
    expect(weekday('2026-09-21')).toBe(1);
    expect(weekday('2026-09-27')).toBe(0);
    expect(formatLong('2026-09-21')).toBe('Monday, 21 September 2026');
  });

  it('starts the week on the configured day', () => {
    expect(startOfWeek('2026-09-24', 1)).toBe('2026-09-21'); // Thursday -> Monday
    expect(startOfWeek('2026-09-27', 1)).toBe('2026-09-21'); // Sunday belongs to the week that began Monday
    expect(endOfWeek('2026-09-21', 1)).toBe('2026-09-27');
    expect(startOfWeek('2026-09-24', 0)).toBe('2026-09-20'); // Sunday-first
    expect(startOfWeek('2026-09-21', 1)).toBe('2026-09-21');
  });

  it('handles months', () => {
    expect(monthKey('2026-09-21')).toBe('2026-09');
    expect(startOfMonth('2026-09-21')).toBe('2026-09-01');
    expect(endOfMonth('2026-09-21')).toBe('2026-09-30');
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29');
    expect(endOfMonth('2027-02-10')).toBe('2027-02-28');
  });

  it('enumerates a range inclusively', () => {
    expect(eachDay('2026-09-21', '2026-09-24')).toEqual(['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24']);
    expect(eachDay('2026-09-21', '2026-09-21')).toEqual(['2026-09-21']);
    expect(eachDay('2026-09-22', '2026-09-21')).toEqual([]);
    expect(eachDay('2026-09-21', '2027-09-20')).toHaveLength(365);
  });

  it('formats durations the way a person reads them', () => {
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(135)).toBe('2h 15m');
    expect(formatMinutes(480)).toBe('8h');
    expect(formatHours(135)).toBe('2.3h');
    expect(formatHours(120)).toBe('2h');
    expect(formatStopwatch(1000)).toBe('0:01');
    expect(formatStopwatch(65_000)).toBe('1:05');
    expect(formatStopwatch(3_725_000)).toBe('1:02:05');
  });

  it('parses the ways a person types a duration', () => {
    expect(parseDuration('90')).toBe(90);
    expect(parseDuration('90m')).toBe(90);
    expect(parseDuration('1h30m')).toBe(90);
    expect(parseDuration('1h 30m')).toBe(90);
    expect(parseDuration('1h30')).toBe(90);
    expect(parseDuration('1.5h')).toBe(90);
    expect(parseDuration('2h')).toBe(120);
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('soon')).toBeNull();
    expect(parseDuration('1h2h')).toBeNull();
  });

  it('formats dates and ranges compactly', () => {
    expect(formatShort('2026-09-21')).toBe('21 Sep 2026');
    expect(formatShort('2026-09-21', 2026)).toBe('21 Sep');
    expect(formatRange('2026-09-21', '2026-09-30')).toBe('21 to 30 Sep 2026');
    expect(formatRange('2026-09-21', '2027-01-31')).toBe('21 Sep 2026 to 31 Jan 2027');
  });
});
