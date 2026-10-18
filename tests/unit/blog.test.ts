import { describe, expect, it } from 'vitest';
import type { BlogPost, DayLog } from '../../src/db/types.ts';
import { blogDayNumber, blogFacts, blogOutline, blogReminderDue, writingStreak } from '../../src/lib/blog.ts';
import { span } from '../../src/screens/parts/text.ts';

const BLOCKS = [
  { id: 'C', name: 'ML Zoomcamp' },
  { id: 'A', name: 'GameDevHQ' },
  { id: 'H', name: 'Hugging Face' },
  { id: 'B', name: 'Coding lessons' },
  { id: 'E', name: 'Math and physics' },
];
const at = (hh: number, mm = 0): number => hh * 60 + mm;
const DAY = [
  { id: 'C', start: at(6), minutes: 120 },
  { id: 'A', start: at(8), minutes: 120 },
  { id: 'H', start: at(10), minutes: 120 },
  { id: 'B', start: at(18), minutes: 120 },
  { id: 'E', start: at(20), minutes: 120 },
];

describe('the day counter', () => {
  it('counts from the plan start, 21 September 2026 being day 1', () => {
    expect(blogDayNumber('2026-09-21')).toBe(1);
    expect(blogDayNumber('2026-09-22')).toBe(2);
    expect(blogDayNumber('2026-10-18')).toBe(28);
    // Across the end of October, when the clocks change in some places: still whole days.
    expect(blogDayNumber('2026-11-01')).toBe(42);
  });
});

describe('the outline', () => {
  const log: DayLog = {
    date: '2026-10-18',
    entries: [
      { block: 'A', track: 'gamedev', refId: 'gamedevhq', minutes: 100 },
      { block: 'C', track: 'ai', refId: 'ml-zoomcamp', minutes: 120 },
      { block: 'E', track: 'math', refId: 'mit-18-06', minutes: 0 },
      { block: 'A', track: 'gamedev', refId: 'gamedevhq', minutes: 5 },
    ],
  };
  const ticks = [
    { refId: 'ml-zoomcamp', label: 'Module 3: deployment', block: 'C' },
    { refId: 'gamedevhq', label: 'Section 5: loading scenes', block: 'A' },
    { refId: 'gamedevhq', label: 'Section 6: UI', block: 'A' },
    // Ticked in a block with no time today: not part of the day's study.
    { refId: 'mit-18-06', label: 'Lecture 4', block: 'E' },
  ];

  it('lists only the blocks with time logged, in the day’s order, with their ticks and total', () => {
    const facts = blogFacts(log, BLOCKS, ticks);
    expect(facts.blocks.map((b) => [b.id, b.minutes, b.ticked])).toEqual([
      ['C', 120, ['Module 3: deployment']],
      ['A', 105, ['Section 5: loading scenes', 'Section 6: UI']],
    ]);
    expect(facts.totalMinutes).toBe(225);
  });

  it('puts a tick under the block whose time was logged on its item', () => {
    const facts = blogFacts(log, BLOCKS, [{ refId: 'ml-zoomcamp', label: 'Homework 3', block: 'H' }]);
    expect(facts.blocks.find((b) => b.id === 'C')!.ticked).toEqual(['Homework 3']);
  });

  it('writes one ## heading per block with its time, the ticks as bullets, and the two lines to fill in', () => {
    const text = blogOutline(blogFacts(log, BLOCKS, ticks), 'Sun 18 Oct · day 28', span);
    expect(text).toBe(
      [
        '# Sun 18 Oct · day 28',
        '',
        '## ML Zoomcamp · 2 h',
        '',
        '- Module 3: deployment',
        '',
        'What I learned:',
        '',
        'Stuck on:',
        '',
        '## GameDevHQ · 1 h 45 m',
        '',
        '- Section 5: loading scenes',
        '- Section 6: UI',
        '',
        'What I learned:',
        '',
        'Stuck on:',
        '',
      ].join('\n'),
    );
    expect(text).not.toContain('Math and physics');
  });

  it('still gives the two lines on a day with nothing logged', () => {
    expect(blogOutline(blogFacts(undefined, BLOCKS, []), 'Mon 19 Oct · day 29', span)).toBe('# Mon 19 Oct · day 29\n\nWhat I learned:\n\nStuck on:\n');
  });
});

describe('the writing streak', () => {
  const post = (date: string, posted = true): BlogPost => ({ date, posted, at: date + 'T18:00:00.000Z' });
  const studiedEvery = (): boolean => true;

  it('counts the days in a row with a post, up to today or, before today’s is written, yesterday', () => {
    const posts = [post('2026-10-15'), post('2026-10-16'), post('2026-10-17')];
    expect(writingStreak(posts, studiedEvery, '2026-10-18')).toBe(3);
    expect(writingStreak([...posts, post('2026-10-18')], studiedEvery, '2026-10-18')).toBe(4);
    // A day missed before them ends it.
    expect(writingStreak([post('2026-10-13'), ...posts], studiedEvery, '2026-10-18')).toBe(3);
  });

  it('drops a day whose post was undone', () => {
    const posts = [post('2026-10-16'), post('2026-10-17', false)];
    expect(writingStreak(posts, studiedEvery, '2026-10-18')).toBe(0);
    expect(writingStreak([post('2026-10-16'), post('2026-10-17'), post('2026-10-18', false)], studiedEvery, '2026-10-18')).toBe(2);
  });

  it('is not broken by a day with no study and no post, which does not count either', () => {
    const posts = [post('2026-10-14'), post('2026-10-15'), post('2026-10-17')];
    const studied = (date: string): boolean => date !== '2026-10-16';
    expect(writingStreak(posts, studied, '2026-10-18')).toBe(3);
    expect(writingStreak(posts, studiedEvery, '2026-10-18')).toBe(1);
  });

  it('starts at zero, and never counts before the plan started', () => {
    expect(writingStreak([], studiedEvery, '2026-10-18')).toBe(0);
    expect(writingStreak([post('2026-09-21')], () => false, '2026-09-25')).toBe(1);
  });
});

describe('the reminder on Today', () => {
  const base = { slots: DAY, log: undefined as DayLog | undefined, runningBlock: null as string | null, posted: false };

  it('comes at 22:00, when the last block ends', () => {
    expect(blogReminderDue({ ...base, minute: at(21, 59) })).toBe(false);
    expect(blogReminderDue({ ...base, minute: at(22) })).toBe(true);
  });

  it('comes earlier once the last block is marked done or its timer stopped', () => {
    const done: DayLog = { date: '2026-10-18', entries: [], doneBlocks: ['E'] };
    expect(blogReminderDue({ ...base, minute: at(21), log: done })).toBe(true);
    const logged: DayLog = { date: '2026-10-18', entries: [{ block: 'E', track: 'math', minutes: 40 }] };
    expect(blogReminderDue({ ...base, minute: at(20, 40), log: logged })).toBe(true);
    expect(blogReminderDue({ ...base, minute: at(20, 40), log: logged, runningBlock: 'E' })).toBe(false);
    // An earlier block's time does not bring it.
    const morning: DayLog = { date: '2026-10-18', entries: [{ block: 'C', track: 'ai', minutes: 120 }], doneBlocks: ['C'] };
    expect(blogReminderDue({ ...base, minute: at(9), log: morning })).toBe(false);
  });

  it('goes once the post is marked, and never comes on a day with no blocks', () => {
    expect(blogReminderDue({ ...base, minute: at(22, 30), posted: true })).toBe(false);
    expect(blogReminderDue({ ...base, slots: [], minute: at(23) })).toBe(false);
  });
});
