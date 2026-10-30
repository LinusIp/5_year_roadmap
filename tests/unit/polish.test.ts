/**
 * ATLAS-UI-POLISH: the numbers that used to disagree. Hours never read "43 of 40 h", the blocks counter knows a
 * block under way, and counts past a thousand carry their separator.
 */
import { describe, expect, it } from 'vitest';
import { blockTally } from '../../src/lib/blocks-today.ts';
import { progressFor } from '../../src/screens/library/Home.tsx';
import { count } from '../../src/screens/parts/text.ts';

describe('the hours on an in-progress card', () => {
  it('never says more of less', () => {
    expect(progressFor('r', undefined, [], 43 * 60, 40)).toEqual({ meta: '43 h logged · over estimate', fraction: 1 });
    expect(progressFor('r', undefined, [], 40 * 60, 40)).toEqual({ meta: '40 h logged · over estimate', fraction: 1 });
    expect(progressFor('r', undefined, [], 12 * 60, 40)).toEqual({ meta: '12 of 40 h', fraction: 0.3 });
    expect(progressFor('r', undefined, [], 20, 40).meta).toBe('Started');
  });

  it('reads units before hours when the resource has them', () => {
    const units = { r: [{ id: 'u1', title: 'Day 1: Hello' }, { id: 'u2', title: 'Day 2: Types' }] } as never;
    expect(progressFor('r', units, ['u1'], 43 * 60, 40)).toEqual({ meta: 'Day 2 of 2', fraction: 0.5 });
  });
});

describe('blocks today', () => {
  const blocks = ['C', 'A', 'H', 'B', 'E'].map((id) => ({ id, targetMinutes: 120 }));

  it('counts a block done at its target or when marked, and under way with minutes or a running timer', () => {
    // A demo day: 3 h 40 m logged over the morning's three blocks, the third one running.
    const minutes: Record<string, number> = { C: 90, A: 75, H: 55 };
    const tally = blockTally(blocks, (id) => minutes[id] ?? 0, () => false, 'H');
    expect(tally.done).toBe(0);
    expect(tally.inProgress).toBe(3);
    expect(tally.label).toBe('0/5 · 3 in progress');
    expect([...tally.states.values()]).toEqual(['in-progress', 'in-progress', 'in-progress', 'todo', 'todo']);
  });

  it('counts the running block as under way before its first minute', () => {
    const tally = blockTally(blocks, () => 0, () => false, 'C');
    expect(tally.label).toBe('0/5 · 1 in progress');
  });

  it('counts a block done at its target or when marked done', () => {
    const tally = blockTally(blocks, (id) => (id === 'C' ? 120 : id === 'A' ? 30 : 0), (id) => id === 'E');
    expect(tally.done).toBe(2);
    expect(tally.label).toBe('2/5 · 1 in progress');
    expect(blockTally(blocks, () => 0, () => false).label).toBe('0/5');
  });
});

describe('counts', () => {
  it('carry a thousands separator', () => {
    expect(count(15938)).toBe('15,938');
    expect(count(1023)).toBe('1,023');
    expect(count(394)).toBe('394');
    expect(count(0)).toBe('0');
  });
});
