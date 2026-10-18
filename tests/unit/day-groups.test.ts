import { describe, expect, it } from 'vitest';
import { clockNow, formatWindow, groupDay } from '../../src/lib/clock-plan.ts';
import type { Slot } from '../../src/lib/clock-plan.ts';

/** From-to times and Today's groups (SCHEDULE-TIMES), on the daily schedule: 06–12 and 18–22. */
const SLOTS: Slot[] = [
  { id: 'C', start: 6 * 60, minutes: 120 },
  { id: 'A', start: 8 * 60, minutes: 120 },
  { id: 'H', start: 10 * 60, minutes: 120 },
  { id: 'B', start: 18 * 60, minutes: 120 },
  { id: 'E', start: 20 * 60, minutes: 120 },
];
const at = (time: string): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
/** Now as Today reads it from the clock: the block of the hour, nothing in the break or after the day. */
const nowAt = (minute: number): string | null => {
  const clock = clockNow(SLOTS, minute);
  return clock.kind === 'block' ? clock.id : null;
};
const groups = (time: string, done: string[] = []) => groupDay(SLOTS, at(time), nowAt(at(time)), (id) => done.includes(id));

describe('a window', () => {
  it('reads "06:00–08:00", with an en dash and no spaces', () => {
    expect(formatWindow(360, 120)).toBe('06:00–08:00');
    expect(formatWindow(1200, 120)).toBe('20:00–22:00');
    expect(formatWindow(720, 360)).toBe('12:00–18:00');
    expect(formatWindow(23 * 60, 90)).toBe('23:00–00:30');
  });
});

describe("Today's groups", () => {
  it('at 05:30: ML Zoomcamp is Now, the rest of both sessions to come, the break ahead', () => {
    const g = groups('05:30');
    expect(g.sessions).toEqual([
      { number: 1, from: 360, until: 720, upcoming: ['A', 'H'] },
      { number: 2, from: 1080, until: 1320, upcoming: ['B', 'E'] },
    ]);
    expect(g.breaks).toEqual([{ before: 2, from: 720, until: 1080 }]);
    expect(g.earlier).toEqual([]);
    expect(g.done).toEqual([]);
  });

  it('at 09:00: GameDevHQ is Now, ML Zoomcamp passed unfinished, Hugging Face still to come', () => {
    const g = groups('09:00');
    expect(g.sessions.map((s) => s.upcoming)).toEqual([['H'], ['B', 'E']]);
    expect(g.earlier).toEqual(['C']);
    expect(g.breaks).toHaveLength(1);
  });

  it('at 13:00, in the break: the morning is earlier or done, the evening to come, no break line', () => {
    const g = groups('13:00', ['A']);
    expect(g.sessions.map((s) => s.upcoming)).toEqual([[], ['B', 'E']]);
    expect(g.earlier).toEqual(['C', 'H']);
    expect(g.done).toEqual(['A']);
    expect(g.breaks).toEqual([]);
  });

  it('at 19:00: Coding lessons is Now, Math and physics to come', () => {
    const g = groups('19:00', ['C', 'A']);
    expect(g.sessions.map((s) => s.upcoming)).toEqual([[], ['E']]);
    expect(g.earlier).toEqual(['H']);
    expect(g.done).toEqual(['C', 'A']);
  });

  it('at 22:30, the day over: nothing to come, the unfinished blocks earlier, the done ones done', () => {
    const g = groups('22:30', ['A', 'B', 'E']);
    expect(g.sessions.flatMap((s) => s.upcoming)).toEqual([]);
    expect(g.earlier).toEqual(['C', 'H']);
    expect(g.done).toEqual(['A', 'B', 'E']);
  });

  it('keeps a done block out of the other groups, even when it is Now', () => {
    const g = groupDay(SLOTS, at('09:00'), 'A', (id) => id === 'A');
    expect(g.done).toEqual(['A']);
    expect(g.sessions[0]!.upcoming).toEqual(['H']);
  });
});
