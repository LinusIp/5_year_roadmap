import { describe, expect, it } from 'vitest';
import { breaksOf, clockNow, switchPrompt } from '../../src/lib/clock-plan.ts';

const at = (hh: number, mm = 0): number => hh * 60 + mm;
/** The daily schedule: 06 ML Zoomcamp, 08 GameDevHQ, 10 Hugging Face, break, 18 Coding lessons, 20 Math and physics. */
const DAY = [
  { id: 'C', start: at(6), minutes: 120 },
  { id: 'A', start: at(8), minutes: 120 },
  { id: 'H', start: at(10), minutes: 120 },
  { id: 'B', start: at(18), minutes: 120 },
  { id: 'E', start: at(20), minutes: 120 },
];

describe('Now follows the clock', () => {
  it('is the first block before 06:00, and the block whose window holds the time', () => {
    expect(clockNow(DAY, at(5, 30))).toEqual({ kind: 'block', id: 'C' });
    expect(clockNow(DAY, at(6, 10))).toEqual({ kind: 'block', id: 'C' });
    expect(clockNow(DAY, at(7, 59))).toEqual({ kind: 'block', id: 'C' });
    expect(clockNow(DAY, at(8, 40))).toEqual({ kind: 'block', id: 'A' });
    expect(clockNow(DAY, at(18))).toEqual({ kind: 'block', id: 'B' });
  });

  it('is the break from 12:00 to 18:00, with Coding lessons next', () => {
    expect(clockNow(DAY, at(12, 30))).toEqual({ kind: 'break', from: at(12), until: at(18), next: 'B' });
    expect(clockNow(DAY, at(13))).toMatchObject({ kind: 'break', next: 'B' });
  });

  it('is done after 22:00, and a short gap leads straight to the next block', () => {
    expect(clockNow(DAY, at(22, 30))).toEqual({ kind: 'done', at: at(22) });
    const gappy = [
      { id: 'X', start: at(9), minutes: 60 },
      { id: 'Y', start: at(10, 15), minutes: 60 },
    ];
    expect(clockNow(gappy, at(10, 5))).toEqual({ kind: 'block', id: 'Y' });
    expect(clockNow([], at(9))).toEqual({ kind: 'empty' });
  });

  it('places Later today’s break between the sessions', () => {
    expect(breaksOf(DAY)).toEqual([{ after: 'H', from: at(12), until: at(18) }]);
  });
});

describe('the prompt to move on', () => {
  it('asks at 08:00, 10:00 and 20:00 when the block before is still running', () => {
    expect(switchPrompt(DAY, 'C', at(8))).toEqual({ from: 'C', to: 'A', at: at(8) });
    expect(switchPrompt(DAY, 'A', at(10, 5))).toEqual({ from: 'A', to: 'H', at: at(10) });
    expect(switchPrompt(DAY, 'B', at(20))).toEqual({ from: 'B', to: 'E', at: at(20) });
  });

  it('asks at 22:00 with nothing to move on to, and not at the break or before a block ends', () => {
    expect(switchPrompt(DAY, 'E', at(22))).toEqual({ from: 'E', to: null, at: at(22) });
    expect(switchPrompt(DAY, 'H', at(12, 5))).toBeNull();
    expect(switchPrompt(DAY, 'C', at(7, 59))).toBeNull();
    expect(switchPrompt(DAY, null, at(8))).toBeNull();
  });

  it('stays quiet once Keep going was chosen for that end', () => {
    expect(switchPrompt(DAY, 'C', at(8, 30), new Set(['C@' + at(8)]))).toBeNull();
  });
});
