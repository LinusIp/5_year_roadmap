import { describe, expect, it } from 'vitest';
import { restoreNight, saveNight } from '../../src/db/sleep.ts';
import { AtlasDB } from '../../src/db/db.ts';
import { parseSleep, renderSleep } from '../../src/sync/files.ts';
import { dateOfSleepPath, sleepPath } from '../../src/sync/paths.ts';
import {
  averageMinutes, barHours, bedtimeFor, recentBars, checkNight, defaultTimes, lengthText, medianClock, nightMinutes, nightOf, stepClock, usualBedtime, wakeDateOf, weekBars,
} from '../../src/lib/sleep.ts';
import type { Night } from '../../src/lib/sleep.ts';

/** The sleep log (SLEEP-LOG): the length of a night, the date it belongs to, the usual bedtime and the goal's bedtime. */
const n = (date: string, bed: string, wake: string): Night => nightOf(date, bed, wake);

describe('a night', () => {
  it('counts the minutes across midnight, and a bedtime after midnight on the same date', () => {
    expect(nightMinutes('2026-10-17T23:00', '2026-10-18T05:40')).toBe(400);
    expect(n('2026-10-18', '23:00', '05:40')).toEqual({ date: '2026-10-18', bed: '2026-10-17T23:00', wake: '2026-10-18T05:40', minutes: 400 });
    expect(n('2026-10-18', '00:30', '06:00')).toEqual({ date: '2026-10-18', bed: '2026-10-18T00:30', wake: '2026-10-18T06:00', minutes: 330 });
    // Across a month and a year.
    expect(n('2026-11-01', '22:45', '06:15').bed).toBe('2026-10-31T22:45');
    expect(n('2027-01-01', '23:30', '07:00').minutes).toBe(450);
    expect(lengthText(400)).toBe('6 h 40 m');
    expect(lengthText(485)).toBe('8 h 05 m');
    expect(lengthText(480)).toBe('8 h');
  });

  it('belongs to the date it was woken up on', () => {
    expect(wakeDateOf('2026-10-18T05:40')).toBe('2026-10-18');
    expect(n('2026-10-18', '23:00', '05:40').date).toBe('2026-10-18');
  });

  it('wants wake after bed, and asks before keeping one under an hour or over 16', () => {
    expect(checkNight({ bed: '2026-10-18T06:00', wake: '2026-10-18T05:40' })).toEqual({ ok: false, error: 'Woke up has to be after bedtime.' });
    expect(checkNight({ bed: '2026-10-18T05:40', wake: '2026-10-18T05:40' }).ok).toBe(false);
    expect(checkNight({ bed: '2026-10-17T13:00', wake: '2026-10-18T06:00' })).toEqual({ ok: true, confirm: 'Are you sure? That is 17 h.' });
    expect(checkNight({ bed: '2026-10-18T05:00', wake: '2026-10-18T05:40' })).toEqual({ ok: true, confirm: 'Are you sure? That is 40 m.' });
    expect(checkNight({ bed: '2026-10-17T23:00', wake: '2026-10-18T05:40' })).toEqual({ ok: true });
  });

  it('steps 15 minutes around midnight', () => {
    expect(stepClock('23:00', 15)).toBe('23:15');
    expect(stepClock('23:50', 15)).toBe('00:05');
    expect(stepClock('00:05', -15)).toBe('23:50');
  });
});

describe('the usual times', () => {
  it('takes the median bedtime of the last 7 nights, across midnight', () => {
    expect(medianClock(['23:00', '23:30', '22:45'])).toBe('23:00');
    expect(medianClock(['23:30', '00:30'])).toBe('00:00');
    expect(medianClock(['23:00', '00:10', '23:10'])).toBe('23:10');
    const nights = ['23:00', '23:15', '22:45', '23:30', '23:00', '22:50', '23:10', '01:00'].map((bed, i) => n('2026-10-' + String(18 - i).padStart(2, '0'), bed, '06:00'));
    // The eighth night back (01:00) is not among the last 7.
    expect(usualBedtime(nights, '2026-10-18')).toBe('23:00');
    expect(usualBedtime([], '2026-10-18')).toBeNull();
  });

  it('starts the screen from the usual bedtime and now, rounded to 5 minutes, in the morning', () => {
    const nights = [n('2026-10-17', '23:20', '06:00'), n('2026-10-16', '23:10', '06:10')];
    expect(defaultTimes(nights, '2026-10-18', new Date(2026, 9, 18, 5, 43))).toEqual({ bed: '23:15', wake: '05:45' });
    // After noon, the usual wake time; with no nights, 23:00 and 06:00.
    expect(defaultTimes(nights, '2026-10-18', new Date(2026, 9, 18, 13, 0))).toEqual({ bed: '23:15', wake: '06:05' });
    expect(defaultTimes([], '2026-10-18', new Date(2026, 9, 18, 13, 0))).toEqual({ bed: '23:00', wake: '06:00' });
  });

  it('gives the bedtime for the goal before the first block', () => {
    expect(bedtimeFor(480, '06:00')).toBe('22:00');
    expect(bedtimeFor(450, '06:00')).toBe('22:30');
    expect(bedtimeFor(480, '07:30')).toBe('23:30');
    expect(bedtimeFor(600, '05:00')).toBe('19:00');
  });

  it('lays the week out Monday to Sunday with its average', () => {
    const nights = [n('2026-10-12', '23:00', '06:00'), n('2026-10-14', '23:00', '05:00'), n('2026-10-18', '23:00', '05:40')];
    const bars = weekBars(nights, '2026-10-18', 1);
    expect(bars.map((b) => b.date)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
    expect(bars.map((b) => b.minutes)).toEqual([420, null, 360, null, null, null, 400]);
    expect(averageMinutes(bars)).toBe(393);
    expect(averageMinutes(weekBars([], '2026-10-18'))).toBeNull();
  });
});

describe("Activity's strip", () => {
  it('gives the last 30 days oldest first, a gap where no night was logged, and the 7-night average', () => {
    const nights = [n('2026-10-18', '23:00', '05:40'), n('2026-10-16', '23:00', '07:00'), n('2026-09-18', '23:00', '06:00')];
    const strip = recentBars(nights, '2026-10-18', 30);
    expect(strip).toHaveLength(30);
    expect(strip[0]).toEqual({ date: '2026-09-19', minutes: null });
    expect(strip.at(-1)).toEqual({ date: '2026-10-18', minutes: 400 });
    // The night of 18 September is the 31st day back: not in the strip.
    expect(strip.filter((b) => b.minutes !== null).map((b) => b.date)).toEqual(['2026-10-16', '2026-10-18']);
    expect(averageMinutes(recentBars(nights, '2026-10-18', 7))).toBe(440);
    expect(barHours(400)).toBe('6.7');
    expect(barHours(420)).toBe('7.0');
  });
});

describe('the record', () => {
  it('is one file per wake-up date, and an edit replaces it', async () => {
    expect(sleepPath('2026-10-18')).toBe('sleep/2026-10-18.json');
    expect(dateOfSleepPath('sleep/2026-10-18.json')).toBe('2026-10-18');
    const night = { date: '2026-10-18', bed: '2026-10-17T23:00', wake: '2026-10-18T05:40', minutes: 400 };
    expect(JSON.parse(renderSleep(night))).toEqual({ bed: '2026-10-17T23:00', wake: '2026-10-18T05:40', minutes: 400 });
    expect(parseSleep(renderSleep(night), '2026-10-18')).toEqual({ ok: true, value: night });
    expect(parseSleep('{"bed":"23:00","wake":"05:40","minutes":400}', '2026-10-18').ok).toBe(false);

    const database = new AtlasDB('sleep-record');
    await database.open();
    expect(await saveNight(night, database)).toBeUndefined();
    const before = await saveNight({ date: '2026-10-18', bed: '2026-10-17T22:30', wake: '2026-10-18T05:40' }, database);
    expect(before).toMatchObject({ minutes: 400 });
    expect(await database.sleep.count()).toBe(1);
    expect(await database.sleep.get('2026-10-18')).toMatchObject({ minutes: 430 });
    // Undo puts back the night as it was.
    await restoreNight('2026-10-18', before, database);
    expect(await database.sleep.get('2026-10-18')).toMatchObject({ minutes: 400 });
    await restoreNight('2026-10-18', undefined, database);
    expect(await database.sleep.count()).toBe(0);
    database.close();
    await database.delete();
  });
});
