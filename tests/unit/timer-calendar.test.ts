import { describe, expect, it } from 'vitest';
import { busyConflict, busyOccursOn, busyOn, defaultStarts, hm, layoutDay, parseHm, snap } from '../../src/lib/calendar-layout.ts';
import type { BusyEvent } from '../../src/lib/calendar-layout.ts';
import { FORGOTTEN_AFTER_MS, forgottenTimer, startPlan, timerEntries } from '../../src/lib/timer.ts';

/** Local time in Asia/Tashkent (the test zone): 2026-10-20 at hh:mm. */
const at = (date: string, time: string): number => new Date(date + 'T' + time + ':00+05:00').getTime();

describe('the timer', () => {
  const timer = { block: 'C', track: 'ai', startedAt: at('2026-10-20', '14:10') };

  it('counts from its start, so a reload changes nothing', () => {
    expect(timerEntries(timer, at('2026-10-20', '15:40'))).toEqual([{ date: '2026-10-20', minutes: 90 }]);
  });

  it('logs each side of midnight on its own day', () => {
    const late = { ...timer, startedAt: at('2026-10-20', '23:30') };
    expect(timerEntries(late, at('2026-10-21', '00:45'))).toEqual([
      { date: '2026-10-20', minutes: 30 },
      { date: '2026-10-21', minutes: 45 },
    ]);
  });

  it('logs nothing for a stop before the start or under half a minute', () => {
    expect(timerEntries(timer, timer.startedAt - 1000)).toEqual([]);
    expect(timerEntries(timer, timer.startedAt + 20_000)).toEqual([]);
  });

  it('asks after three hours, offering the last time the app was used', () => {
    expect(forgottenTimer(timer, timer.startedAt + FORGOTTEN_AFTER_MS - 60_000)).toBeNull();
    const asked = forgottenTimer(timer, timer.startedAt + FORGOTTEN_AFTER_MS, at('2026-10-20', '16:40'));
    expect(asked).toEqual({ reason: 'long', startedAt: timer.startedAt, lastUsedAt: at('2026-10-20', '16:40') });
  });

  it('asks once the day it started on is over, even before three hours', () => {
    const late = { ...timer, startedAt: at('2026-10-20', '23:00') };
    expect(forgottenTimer(late, at('2026-10-20', '23:59'))).toBeNull();
    expect(forgottenTimer(late, at('2026-10-21', '00:10'))?.reason).toBe('midnight');
  });

  it('after Keep, asks again three hours later', () => {
    const kept = { ...timer, keptAt: at('2026-10-20', '17:15') };
    expect(forgottenTimer(kept, at('2026-10-20', '19:00'))).toBeNull();
    expect(forgottenTimer(kept, at('2026-10-20', '20:15'))?.reason).toBe('long');
  });

  it('ignores a last-used time before the start', () => {
    expect(forgottenTimer(timer, at('2026-10-20', '18:00'), at('2026-10-20', '13:00'))).toEqual({ reason: 'long', startedAt: timer.startedAt });
  });

  it('runs one at a time: another block switches', () => {
    expect(startPlan(null, 'C', undefined)).toBe('start');
    expect(startPlan(timer, 'C', undefined)).toBe('same');
    expect(startPlan(timer, 'A', 'x')).toBe('switch');
  });
});

describe('clock times', () => {
  it('reads and writes HH:MM, and snaps to 15 minutes', () => {
    expect(parseHm('09:30')).toBe(570);
    expect(hm(570)).toBe('09:30');
    expect(hm(1440)).toBe('24:00');
    expect(snap(578)).toBe(585);
    expect(snap(1142)).toBe(1140);
  });

  it('defaults a template to a sequence from 08:00 with 15-minute breaks', () => {
    const starts = defaultStarts([
      { id: 'A', minutes: 120 },
      { id: 'B', minutes: 60 },
      { id: 'X', minutes: 0 },
      { id: 'C', minutes: 120 },
    ]);
    expect([...starts].map(([id, m]) => id + ' ' + hm(m))).toEqual(['A 08:00', 'B 10:15', 'C 11:30']);
  });
});

describe('busy events', () => {
  const uni: BusyEvent = { id: 'uni', title: 'Lectures', start: '09:00', minutes: 240, weekday: 2, from: '2026-10-01' };
  const dentist: BusyEvent = { id: 'd', title: 'Dentist', start: '16:00', minutes: 60, date: '2026-10-21' };

  it('repeats weekly from its start, until its end', () => {
    expect(busyOccursOn(uni, '2026-10-20')).toBe(true); // a Tuesday
    expect(busyOccursOn(uni, '2026-10-27')).toBe(true);
    expect(busyOccursOn(uni, '2026-10-21')).toBe(false);
    expect(busyOccursOn(uni, '2026-09-29')).toBe(false);
    expect(busyOccursOn({ ...uni, until: '2026-10-25' }, '2026-10-27')).toBe(false);
  });

  it('happens once on its date', () => {
    expect(busyOn([uni, dentist], '2026-10-21').map((e) => e.id)).toEqual(['d']);
    expect(busyOn([uni, dentist], '2026-10-28')).toEqual([]);
  });

  it('finds the conflict of a block dropped on it', () => {
    expect(busyConflict([uni], '2026-10-20', parseHm('12:00'), 90)?.id).toBe('uni');
    expect(busyConflict([uni], '2026-10-20', parseHm('13:00'), 90)).toBeUndefined();
  });
});

describe('the day layout', () => {
  const day = [
    { id: 'A', minutes: 120 },
    { id: 'B', minutes: 60 },
    { id: 'C', minutes: 120 },
  ];
  const show = (blocks: ReturnType<typeof layoutDay>) => blocks.map((b) => b.id + ' ' + hm(b.start) + (b.shifted ? '*' : ''));

  it('follows the template order from 08:00', () => {
    expect(show(layoutDay(day, []))).toEqual(['A 08:00', 'B 10:15', 'C 11:30']);
  });

  it('shifts blocks past a busy morning, and the ones after them along', () => {
    expect(show(layoutDay(day, [{ start: parseHm('09:00'), end: parseHm('13:00') }]))).toEqual(['A 13:15*', 'B 15:30', 'C 16:45']);
  });

  it('keeps a block moved to 19:00 there, and fills the rest around it', () => {
    const moved = [{ id: 'A', minutes: 120 }, { id: 'B', minutes: 60, start: parseHm('19:00') }, { id: 'C', minutes: 120 }];
    expect(show(layoutDay(moved, []))).toEqual(['A 08:00', 'C 10:15', 'B 19:00']);
  });

  it('never overlaps: a timed block on busy time moves to after it', () => {
    const moved = [{ id: 'A', minutes: 90, start: parseHm('12:00') }];
    expect(show(layoutDay(moved, [{ start: parseHm('09:00'), end: parseHm('13:00') }]))).toEqual(['A 13:15*']);
  });

  it('leaves out a block with no minutes', () => {
    expect(show(layoutDay([{ id: 'A', minutes: 0 }, { id: 'B', minutes: 30 }], []))).toEqual(['B 08:00']);
  });
});
