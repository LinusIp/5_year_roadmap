import { describe, expect, it } from 'vitest';
import { carriedMs, carryKey, runningMsOn, settleTimer } from '../../src/lib/timer.ts';

const at = (iso: string): number => new Date(iso).getTime();
const min = 60_000;

describe('a stop logs whole minutes and carries the seconds', () => {
  it('logs nothing for 20 s, but four of them make a minute with 20 s left', () => {
    let carry = {};
    let logged = 0;
    for (let i = 0; i < 4; i++) {
      const start = at('2026-10-18T08:00:00') + i * min;
      const r = settleTimer({ startedAt: start, block: 'A' }, start + 20_000, carry);
      logged += r.entries.reduce((s, e) => s + e.minutes, 0);
      carry = r.carry;
    }
    expect(logged).toBe(1);
    expect(carriedMs(carry, '2026-10-18', 'A')).toBe(20_000);
  });

  it('keeps carries apart by block and item, and a later session of the same one picks its carry up', () => {
    const start = at('2026-10-18T08:00:00');
    let { carry } = settleTimer({ startedAt: start, block: 'A', refId: 'x' }, start + 50_000, {});
    ({ carry } = settleTimer({ startedAt: start, block: 'B' }, start + 30_000, carry));
    expect(carry).toEqual({ [carryKey('2026-10-18', 'A', 'x')]: 50_000, [carryKey('2026-10-18', 'B')]: 30_000 });
    const again = settleTimer({ startedAt: start + min, block: 'A', refId: 'x' }, start + min + 10_000, carry);
    expect(again.entries).toEqual([{ date: '2026-10-18', minutes: 1 }]);
    expect(again.carry[carryKey('2026-10-18', 'A', 'x')]).toBeUndefined();
    expect(again.carry[carryKey('2026-10-18', 'B')]).toBe(30_000);
  });

  it('splits a session across midnight between the two days', () => {
    const r = settleTimer({ startedAt: at('2026-10-18T23:30:00'), block: 'E' }, at('2026-10-19T00:45:30'), {});
    expect(r.entries).toEqual([
      { date: '2026-10-18', minutes: 30 },
      { date: '2026-10-19', minutes: 45 },
    ]);
    expect(carriedMs(r.carry, '2026-10-19', 'E')).toBe(30_000);
  });

  it('drops carries older than two days', () => {
    const r = settleTimer({ startedAt: at('2026-10-18T08:00:00'), block: 'A' }, at('2026-10-18T08:10:00'), { [carryKey('2026-10-10', 'A')]: 40_000 });
    expect(r.carry).toEqual({});
  });
});

describe('the running time on a date', () => {
  it('is all of it on its day, and only the part after midnight on the next', () => {
    const timer = { startedAt: at('2026-10-18T23:50:00') };
    const now = at('2026-10-19T00:20:00');
    expect(runningMsOn(timer, '2026-10-18', now)).toBe(10 * min);
    expect(runningMsOn(timer, '2026-10-19', now)).toBe(20 * min);
    expect(runningMsOn(timer, '2026-10-17', now)).toBe(0);
    expect(runningMsOn(null, '2026-10-19', now)).toBe(0);
  });
});
