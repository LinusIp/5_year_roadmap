/**
 * Calendar over the schedule: a drag or a resize is the date's own change, "every Monday" is the template's, busy
 * events move blocks, Today follows the times, and settings from before Calendar (version 2) upgrade and merge.
 */
import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import type { StoredSettings, StoredSettingsInput } from '../../src/db/types.ts';
import {
  blockOrderByTime,
  dayLayout,
  withAddedBlock,
  withBlockItem,
  withBlockLength,
  withBlockTime,
  withBusy,
  withEveryDay,
  withEveryWeekday,
  withMovedToDate,
  withoutBusy,
  withRestDay,
  withSkip,
} from '../../src/lib/calendar.ts';
import { hm, parseHm } from '../../src/lib/calendar-layout.ts';
import { resolveDay } from '../../src/lib/day-plan.ts';
import { buildIcs } from '../../src/lib/ics.ts';
import { defaultSettings, upgradeSettings } from '../../src/lib/settings.ts';
import { mergePreCalendarSettings } from '../../src/sync/downgrade.ts';

const seed = loadSeedOrThrow();
const base = defaultSettings(seed.settings);
const MONDAY = '2026-10-19';
const TUESDAY = '2026-10-20';
const at = (s: StoredSettings, date: string): string[] => dayLayout(date, s).map((b) => b.id + ' ' + hm(b.start) + '+' + b.minutes);

describe('a date in Calendar', () => {
  it('lays the daily schedule out at its fixed times: 06–12 and 18–22', () => {
    expect(at(base, MONDAY)).toEqual(['C 06:00+120', 'A 08:00+120', 'H 10:00+120', 'B 18:00+120', 'E 20:00+120']);
  });

  it('a drag is a time on that date only, written as the date’s change', () => {
    const moved = withBlockTime(base, MONDAY, 'B', parseHm('19:00'));
    expect(moved.schedule.days[MONDAY]).toEqual({ times: { B: '19:00' } });
    // E, fixed at 20:00, moves on past the later B with the usual 15 minutes between.
    expect(at(moved, MONDAY)).toEqual(['C 06:00+120', 'A 08:00+120', 'H 10:00+120', 'B 19:00+120', 'E 21:15+120']);
    expect(at(moved, TUESDAY)[3]).toBe('B 18:00+120');
  });

  it('a resize is the date’s minutes, and nothing is logged', () => {
    const longer = withBlockLength(base, MONDAY, 'B', 150);
    expect(longer.schedule.days[MONDAY]).toEqual({ minutes: { B: 150 } });
    expect(resolveDay(MONDAY, longer).planned).toBe(resolveDay(MONDAY, base).planned + 30);
  });

  it('Today orders its blocks by the day’s times', () => {
    expect(blockOrderByTime(MONDAY, withBlockTime(base, MONDAY, 'A', parseHm('13:00')))).toEqual(['C', 'H', 'A', 'B', 'E']);
  });

  it('an item chosen for one date is kept with the date, and cleared again', () => {
    const chosen = withBlockItem(base, MONDAY, 'C', 'mit-6-s191');
    expect(chosen.schedule.days[MONDAY]).toEqual({ items: { C: 'mit-6-s191' } });
    expect(withBlockItem(chosen, MONDAY, 'C', null).schedule.days[MONDAY]).toBeUndefined();
  });

  it('skip, add at a time, move to another date, and a rest day', () => {
    const skipped = withSkip(base, MONDAY, 'H');
    expect(at(skipped, MONDAY).map((b) => b[0])).toEqual(['C', 'A', 'B', 'E']);
    const back = withAddedBlock(skipped, MONDAY, 'H', 60, parseHm('13:00'));
    expect(at(back, MONDAY)[2]).toBe('H 13:00+60');

    const moved = withMovedToDate(base, MONDAY, 'E', TUESDAY);
    expect(at(moved, MONDAY).map((b) => b[0])).not.toContain('E');
    expect(resolveDay(TUESDAY, moved).blocks.filter((b) => b.id === 'E').map((b) => b.minutes)).toEqual([120]);

    const rest = withRestDay(back, MONDAY);
    expect(resolveDay(MONDAY, rest).planned).toBe(0);
  });
});

describe('every Monday', () => {
  it('writes the template Monday uses, and gives Monday its own copy when other days share it', () => {
    const next = withEveryWeekday(base, MONDAY, MONDAY, 'E', { start: parseHm('21:00'), minutes: 60 });
    expect(next.core.pattern[1]).toBe('full-mon');
    expect(next.core.templates.find((t) => t.id === 'full-mon')?.blocks.find((b) => b.block === 'E')).toEqual({ block: 'E', minutes: 60, start: '21:00' });
    expect(at(next, '2026-10-26').at(-1)).toBe('E 21:00+60');
    // Tuesday still uses the shared daily schedule, unchanged.
    expect(at(next, TUESDAY).at(-1)).toBe('E 20:00+120');
    // Days already past keep their plan.
    expect(at(next, '2026-10-12').at(-1)).toBe('E 20:00+120');
  });

  it('every day: with one template on every weekday, writes that template with no copy', () => {
    const next = withEveryDay(base, MONDAY, MONDAY, 'E', { start: parseHm('21:00'), minutes: 60 });
    expect(next.core.pattern).toEqual(base.core.pattern);
    expect(next.core.templates.map((t) => t.id)).toEqual(base.core.templates.map((t) => t.id));
    expect(at(next, TUESDAY).at(-1)).toBe('E 21:00+60');
    expect(at(next, '2026-10-24').at(-1)).toBe('E 21:00+60');
    expect(at(next, '2026-10-12').at(-1)).toBe('E 20:00+120');
  });

  it('clears the date’s own time and length for that block, so the template applies', () => {
    const own = withBlockTime(withBlockLength(base, MONDAY, 'E', 30), MONDAY, 'E', parseHm('21:00'));
    const next = withEveryWeekday(own, MONDAY, MONDAY, 'E', { start: parseHm('07:00') });
    expect(next.schedule.days[MONDAY]).toBeUndefined();
  });
});

describe('busy events', () => {
  const lectures = { id: 'uni', title: 'Lectures', start: '09:00', minutes: 240, weekday: 2, from: '2026-10-01' };

  it('move the blocks out of their way, every week', () => {
    const busy = withBusy(base, lectures);
    // 09:00–13:00: ML Zoomcamp (06–08) stays; GameDevHQ and Hugging Face move after the lectures.
    expect(at(busy, TUESDAY).slice(0, 3)).toEqual(['C 06:00+120', 'A 13:15+120', 'H 15:30+120']);
    expect(at(busy, '2026-10-27')[1]).toBe('A 13:15+120');
    expect(at(busy, MONDAY)[1]).toBe('A 08:00+120');
  });

  it('removed from a week on, keep the weeks before', () => {
    const ended = withoutBusy(withBusy(base, lectures), 'uni', '2026-10-27');
    expect(ended.schedule.busy[0]?.until).toBe('2026-10-26');
    expect(at(ended, TUESDAY)[1]).toBe('A 13:15+120');
    expect(at(ended, '2026-10-27')[1]).toBe('A 08:00+120');
    expect(withoutBusy(withBusy(base, lectures), 'uni').schedule.busy).toEqual([]);
  });
});

describe('settings from before Calendar', () => {
  const v2 = (): StoredSettingsInput => {
    const s = structuredClone(base) as unknown as StoredSettingsInput & { schedule: Record<string, unknown> };
    s.version = 2;
    delete s.schedule.busy;
    s.layout = { ...base.layout, tabs: ['today', 'plan', 'library', 'activity'] };
    return s;
  };

  it('upgrade to version 3: no busy events yet, and Calendar joins the old default tabs', () => {
    const up = upgradeSettings(v2(), seed.settings);
    expect(up.version).toBe(3);
    expect(up.schedule.busy).toEqual([]);
    expect(up.layout.tabs).toEqual(['today', 'plan', 'calendar', 'library', 'activity']);
  });

  it('keep tabs the user chose', () => {
    const chosen = { ...v2(), layout: { ...base.layout, tabs: ['today', 'activity', 'reviews'] } } as StoredSettingsInput;
    expect(upgradeSettings(chosen, seed.settings).layout.tabs).toEqual(['today', 'activity', 'reviews']);
  });

  it('a copy written by a device before Calendar keeps its changes and gets the calendar’s back', () => {
    let mine = withBusy(base, { id: 'uni', title: 'Lectures', start: '09:00', minutes: 240, weekday: 2 });
    mine = withBlockTime(mine, MONDAY, 'B', parseHm('19:00'));
    mine = withEveryWeekday(mine, MONDAY, MONDAY, 'E', { start: parseHm('07:00') });
    // The other device made Monday a University day and knows nothing of the rest.
    const theirs = upgradeSettings({ ...v2(), schedule: { overrides: [], days: { [MONDAY]: { template: 'university' } }, history: [] } } as StoredSettingsInput, seed.settings);
    const merged = mergePreCalendarSettings(mine, theirs);
    expect(merged.version).toBe(3);
    expect(merged.schedule.days[MONDAY]).toEqual({ template: 'university', times: { B: '19:00' } });
    expect(merged.schedule.busy.map((b) => b.id)).toEqual(['uni']);
    expect(merged.core.templates.some((t) => t.id === 'full-mon')).toBe(true);
    expect(merged.core.pattern[1]).toBe('full-mon');
  });
});

describe('the .ics export', () => {
  it('writes floating local times, escapes text and ends lines with CRLF', () => {
    const text = buildIcs([{ date: MONDAY, start: parseHm('23:30'), minutes: 60, title: 'Core: ML, the course; part 2', uid: 'atlas-x' }], new Date('2026-10-19T00:00:00Z'));
    expect(text).toContain('DTSTART:20261019T233000\r\n');
    expect(text).toContain('DTEND:20261020T003000\r\n');
    expect(text).toContain('SUMMARY:Core: ML\\, the course\\; part 2\r\n');
    expect(text.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  });
});
