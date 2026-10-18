import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';
import { dayLayout } from '../../src/lib/calendar.ts';
import { resolveDay } from '../../src/lib/day-plan.ts';
import { dailyTargetMinutes, planForDay } from '../../src/lib/schedule.ts';
import { currentSettings, defaultSettings, resetToDailySchedule, withDailySchedule } from '../../src/lib/settings.ts';
import type { AppSeed } from '../../src/seed/index.ts';
import { parseSettings } from '../../src/sync/files.ts';

/**
 * The fixed daily schedule (DAILY-SCHEDULE): its template, and the switch of settings saved by the build live before
 * it (tests/fixtures/live-2026-10-18/, made by that build's own code: see its README).
 */
const seed = loadSeedOrThrow();
const defaults = seed.settings;
const LIVE = join(import.meta.dirname, '..', 'fixtures', 'live-2026-10-18');
const liveSettings = () => {
  const parsed = parseSettings(readFileSync(join(LIVE, 'atlas-data', 'state', 'settings.json'), 'utf8'));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
};
const TODAY = '2026-10-18';

describe('the daily schedule', () => {
  it('is five two-hour courses at fixed times: 10 hours, in 06–12 and 18–22', () => {
    const settings = defaultSettings(defaults);
    const placed = dayLayout(TODAY, settings).map((b) => [b.id, b.start / 60, b.minutes]);
    expect(placed).toEqual([
      ['C', 6, 120],
      ['A', 8, 120],
      ['H', 10, 120],
      ['B', 18, 120],
      ['E', 20, 120],
    ]);
    expect(dailyTargetMinutes(settings, TODAY)).toBe(600);
    expect(settings.core.blocks.find((b) => b.id === 'H')?.name).toBe('Hugging Face');
    expect(resolveDay(TODAY, settings).blocks.some((b) => b.id === 'D')).toBe(false);
  });
});

describe('settings from the build live before it', () => {
  it('switch to it once: H joins, the old names and minutes give way, Projects leaves the day', () => {
    const settings = currentSettings(liveSettings(), defaults, TODAY);
    const names = Object.fromEntries(settings.core.blocks.map((b) => [b.id, b.name]));
    expect(names).toMatchObject({ C: 'ML Zoomcamp', A: 'GameDevHQ', H: 'Hugging Face', B: 'Coding lessons', E: 'Math and physics' });
    expect(settings.core.blocks.filter((b) => b.id !== 'D').every((b) => b.minutes === 120)).toBe(true);
    expect(dailyTargetMinutes(settings, TODAY)).toBe(600);
    expect(dayLayout(TODAY, settings).map((b) => b.id)).toEqual(['C', 'A', 'H', 'B', 'E']);
    expect(settings.layout.today.order.slice(0, 5)).toEqual(['C', 'A', 'H', 'B', 'E']);
  });

  it('keep the days before today on the plan they had, and the user’s day changes and busy events', () => {
    const settings = currentSettings(liveSettings(), defaults, TODAY);
    // Yesterday was the live 8 h day, with Core at 90 minutes: 7 h 30 m, Projects included.
    expect(dailyTargetMinutes(settings, '2026-10-17')).toBe(450);
    expect(resolveDay('2026-10-17', settings).blocks.some((b) => b.id === 'D')).toBe(true);
    expect(settings.schedule.days['2026-10-20']).toEqual({ times: { A: '19:00' } });
    expect(settings.schedule.busy).toHaveLength(1);
    expect(settings.theme).toBe('dark');
  });

  it('switch only once: settings with block H come back as they are, edits made since included', () => {
    const once = currentSettings(liveSettings(), defaults, TODAY);
    expect(withDailySchedule(once, defaults, '2026-10-25')).toBe(once);
    const edited = { ...once, core: { ...once.core, blocks: once.core.blocks.map((b) => (b.id === 'E' ? { ...b, minutes: 90 } : b)) } };
    expect(currentSettings(edited, defaults, '2026-10-25').core.blocks.find((b) => b.id === 'E')?.minutes).toBe(90);
  });

  it('Reset to the daily schedule switches again from today, keeping the edited days before it', () => {
    const once = currentSettings(liveSettings(), defaults, TODAY);
    const edited = { ...once, core: { ...once.core, blocks: once.core.blocks.map((b) => (b.id === 'E' ? { ...b, minutes: 60 } : b)) } };
    const reset = resetToDailySchedule(edited, defaults, '2026-10-25');
    expect(dailyTargetMinutes(reset, '2026-10-25')).toBe(600);
    expect(dailyTargetMinutes(reset, '2026-10-24')).toBe(540);
    expect(dailyTargetMinutes(reset, '2026-10-17')).toBe(450);
  });
});

describe('the pinned courses and their lanes', () => {
  const split = splitSeed(seed);
  const app = split.app as AppSeed;
  const settings = defaultSettings(app.settings);
  const ctx = (done: string[] = []) => ({ seed: app, states: new Map(done.map((refId) => [refId, { refId, status: 'done' as const, unitsDone: [] }])), units: split.units });
  const titleIn = (block: string, done: string[] = []) => planForDay({ date: '2026-10-19', settings, ctx: ctx(done) }).blocks.find((b) => b.id === block)!.item!.title;

  it('start each block on its course: GameDevHQ, ML Zoomcamp, the Hugging Face LLM course', () => {
    expect(titleIn('A')).toMatch(/GameDevHQ/);
    expect(titleIn('C')).toMatch(/Machine Learning Zoomcamp/);
    expect(titleIn('H')).toMatch(/Hugging Face LLM Course/);
  });

  it('move a lane on to its next item once its course is done', () => {
    expect(titleIn('A', ['gamedevhq'])).toMatch(/One finished small game/);
    expect(titleIn('H', ['hf-llm-course'])).toMatch(/Agents/i);
    // ML Zoomcamp is the only item of this phase's lane C: the lane reaches into the next phase.
    const next = planForDay({ date: '2026-10-19', settings, ctx: ctx(['ml-zoomcamp']) }).blocks.find((b) => b.id === 'C')!;
    expect(next.kind).toBe('item');
    expect(next.item!.title).not.toMatch(/Machine Learning Zoomcamp/);
    expect(next.item!.note).toMatch(/Pulled forward/);
  });
});
