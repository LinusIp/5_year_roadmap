/**
 * What a date plans: which blocks run and for how many minutes. Everything that depends on the schedule (Today's
 * "X of Y h", the weekly target, the streak, the heatmap's relative levels, the forecast, lane budgets) reads it
 * from here.
 *
 * Resolution, later steps winning:
 *   1. the weekly pattern names a template for the weekday;
 *   2. a date override ("Exam week 12–19 Dec") names another;
 *   3. the day's own change (Change today) names another, or makes it a rest day;
 *   4. lane pace (relaxed, intense, custom minutes) and paused lanes adjust the minutes;
 *   5. the day's change sets single blocks' minutes, skips blocks and moves blocks to tomorrow; blocks moved from
 *      yesterday arrive.
 *
 * Days keep the plan they had: templates, the pattern and block minutes are read from the schedule version that
 * was current on the date (settings.schedule.history), and pace and pauses apply from the day they were set.
 *
 * Pure; memoised per settings object, which is replaced on every change.
 */
import type { DayChange, LanePace, ScheduleVersion, StoredSettings } from '../db/types.ts';
import type { BlockDef, BlockId, DayTemplate } from '../seed/schema.ts';
import { addDays, eachDay, weekday } from './dates.ts';

export interface PlannedBlock {
  id: BlockId;
  def: BlockDef;
  minutes: number;
  /** Set when the block came from yesterday ("moved to tomorrow"). */
  movedFrom?: string;
  /** Minutes this block took over from a paused lane. */
  fromPause?: number;
}

export interface ResolvedDay {
  date: string;
  templateId: string;
  templateName: string;
  /** Where the template came from. */
  source: 'pattern' | 'override' | 'change' | 'rest';
  /** The override's label, when one applies. */
  overrideLabel?: string;
  rest: boolean;
  /** In the order of the blocks in Settings. */
  blocks: PlannedBlock[];
  skipped: BlockId[];
  movedOut: BlockId[];
  swaps: [BlockId, BlockId][];
  /** Lanes paused on this date. */
  paused: BlockId[];
  planned: number;
}

interface Config {
  templates: DayTemplate[];
  pattern: string[];
  minutes: Map<string, number>;
  days: Map<string, number[]>;
}

/** The templates, pattern and block minutes in force on a date. */
export function configOn(date: string, settings: StoredSettings): Config {
  const history = [...settings.schedule.history].sort((a, b) => a.until.localeCompare(b.until));
  const version: ScheduleVersion | undefined = history.find((v) => date <= v.until);
  if (version) {
    return {
      templates: version.templates,
      pattern: version.pattern,
      minutes: new Map(version.blocks.map((b) => [b.id, b.minutes])),
      days: new Map(version.blocks.map((b) => [b.id, b.days])),
    };
  }
  const core = settings.core;
  return {
    templates: core.templates,
    pattern: core.pattern,
    minutes: new Map(core.blocks.map((b) => [b.id, b.minutes])),
    days: new Map(core.blocks.map((b) => [b.id, b.days])),
  };
}

/** A copy of the current schedule, to keep in history before an edit that would otherwise change past days. */
export function snapshotSchedule(settings: StoredSettings, until: string): ScheduleVersion {
  return {
    until,
    templates: structuredClone(settings.core.templates),
    pattern: [...settings.core.pattern],
    blocks: settings.core.blocks.map((b) => ({ id: b.id, minutes: b.minutes, days: [...b.days] })),
  };
}

/**
 * Applies an edit to the templates, the weekly pattern or the blocks' minutes or days, from `today` on. The
 * schedule as it was is kept for the days before, once per day.
 */
export function withScheduleEdit(settings: StoredSettings, today: string, change: (s: StoredSettings) => StoredSettings): StoredSettings {
  const yesterday = addDays(today, -1);
  const history = settings.schedule.history.some((v) => v.until === yesterday)
    ? settings.schedule.history
    : [...settings.schedule.history.filter((v) => v.until < yesterday), snapshotSchedule(settings, yesterday)];
  const next = change(settings);
  return { ...next, schedule: { ...next.schedule, history } };
}

export function paceMinutes(minutes: number, pace: LanePace | undefined): number {
  if (!pace) return minutes;
  switch (pace.mode) {
    case 'normal':
      return minutes;
    case 'relaxed':
      return Math.round(minutes * 0.75);
    case 'intense':
      return Math.round(minutes * 1.25);
    case 'custom':
      return pace.minutes ?? minutes;
  }
}

/** The pause of a lane on a date, if any. */
export function pauseOn(settings: StoredSettings, block: BlockId, date: string): StoredSettings['pauses'][number] | undefined {
  return settings.pauses.find((p) => p.block === block && p.from <= date && (p.until === null || date <= p.until));
}

const memo = new WeakMap<StoredSettings, Map<string, ResolvedDay>>();

function defFor(settings: StoredSettings, id: BlockId): BlockDef {
  return settings.core.blocks.find((b) => b.id === id) ?? { id, name: 'Block ' + id, minutes: 0, days: [0, 1, 2, 3, 4, 5, 6], summary: '' };
}

/** The blocks of a date before its own skips and moves: template, pace and pauses. */
function baseBlocks(date: string, settings: StoredSettings, change: DayChange | undefined): Omit<ResolvedDay, 'skipped' | 'movedOut' | 'swaps' | 'planned'> {
  const config = configOn(date, settings);
  const day = weekday(date);
  const override = [...settings.schedule.overrides].reverse().find((o) => o.from <= date && date <= o.to);
  let source: ResolvedDay['source'] = 'pattern';
  let templateId = config.pattern[day] ?? config.templates[0]?.id ?? 'full';
  if (override) {
    templateId = override.template;
    source = 'override';
  }
  if (change?.template) {
    templateId = change.template;
    source = 'change';
  }
  const rest = Boolean(change?.rest);
  const template = rest ? undefined : (config.templates.find((t) => t.id === templateId) ?? config.templates[0]);
  if (rest) source = 'rest';

  const order = settings.core.blocks.map((b) => b.id);
  let blocks: PlannedBlock[] = [];
  for (const entry of template?.blocks ?? []) {
    const runsOn = config.days.get(entry.block) ?? [0, 1, 2, 3, 4, 5, 6];
    if (!runsOn.includes(day)) continue;
    const base = entry.minutes ?? config.minutes.get(entry.block) ?? defFor(settings, entry.block).minutes;
    const pace = settings.pace[entry.block];
    const applies = pace && (!pace.from || pace.from <= date);
    blocks.push({ id: entry.block, def: defFor(settings, entry.block), minutes: applies ? paceMinutes(base, pace) : base });
  }

  const paused: BlockId[] = [];
  for (const block of [...blocks]) {
    const pause = pauseOn(settings, block.id, date);
    if (!pause) continue;
    paused.push(block.id);
    blocks = blocks.filter((b) => b !== block);
    if (pause.to === 'free') continue;
    const target = blocks.find((b) => b.id === pause.to);
    if (target) {
      target.minutes += block.minutes;
      target.fromPause = (target.fromPause ?? 0) + block.minutes;
    } else if (!pauseOn(settings, pause.to, date)) {
      blocks.push({ id: pause.to, def: defFor(settings, pause.to), minutes: block.minutes, fromPause: block.minutes });
    }
  }
  blocks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const result: Omit<ResolvedDay, 'skipped' | 'movedOut' | 'swaps' | 'planned'> = {
    date,
    templateId: rest ? 'rest' : (template?.id ?? templateId),
    templateName: rest ? 'Rest day' : (template?.name ?? templateId),
    source,
    rest: rest || blocks.length === 0,
    blocks,
    paused,
  };
  if (override?.label) result.overrideLabel = override.label;
  return result;
}

export function resolveDay(date: string, settings: StoredSettings): ResolvedDay {
  let cache = memo.get(settings);
  if (!cache) {
    cache = new Map();
    memo.set(settings, cache);
  }
  const hit = cache.get(date);
  if (hit) return hit;

  const change = settings.schedule.days[date];
  const base = baseBlocks(date, settings, change);
  let blocks = base.blocks.map((b) => ({ ...b }));
  const order = settings.core.blocks.map((b) => b.id);

  for (const [id, minutes] of Object.entries(change?.minutes ?? {})) {
    const block = blocks.find((b) => b.id === id);
    if (block) block.minutes = minutes;
  }

  // Blocks yesterday sent here, with the minutes they had yesterday.
  const yesterday = addDays(date, -1);
  const incoming = settings.schedule.days[yesterday]?.toTomorrow ?? [];
  if (incoming.length > 0) {
    const before = baseBlocks(yesterday, settings, settings.schedule.days[yesterday]);
    const yesterdayMinutes = settings.schedule.days[yesterday]?.minutes ?? {};
    for (const id of incoming) {
      const was = before.blocks.find((b) => b.id === id);
      if (!was) continue;
      const minutes = yesterdayMinutes[id] ?? was.minutes;
      const here = blocks.find((b) => b.id === id);
      if (here) {
        here.minutes += minutes;
        here.movedFrom = yesterday;
      } else {
        blocks.push({ id, def: was.def, minutes, movedFrom: yesterday });
      }
    }
  }

  const skipped = (change?.skip ?? []).filter((id) => blocks.some((b) => b.id === id));
  const movedOut = (change?.toTomorrow ?? []).filter((id) => blocks.some((b) => b.id === id));
  blocks = blocks.filter((b) => !skipped.includes(b.id) && !movedOut.includes(b.id));
  blocks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  const resolved: ResolvedDay = {
    ...base,
    rest: base.rest && blocks.length === 0,
    blocks,
    skipped,
    movedOut,
    swaps: (change?.swaps ?? []).filter(([a, b]) => blocks.some((x) => x.id === a) && blocks.some((x) => x.id === b)),
    planned: blocks.reduce((sum, b) => sum + b.minutes, 0),
  };
  cache.set(date, resolved);
  return resolved;
}

export function plannedMinutes(date: string, settings: StoredSettings): number {
  return resolveDay(date, settings).planned;
}

/** `plannedMinutes` bound to settings, for the streak and the heatmap. */
export function plannedFor(settings: StoredSettings): (date: string) => number {
  return (date) => plannedMinutes(date, settings);
}

export function plannedForBlock(date: string, settings: StoredSettings, block: BlockId): number {
  return resolveDay(date, settings).blocks.find((b) => b.id === block)?.minutes ?? 0;
}

/** Planned minutes of one block (or all blocks) summed over a range of days. */
export function plannedOver(settings: StoredSettings, from: string, to: string, block?: BlockId): number {
  if (to < from) return 0;
  let sum = 0;
  for (const date of eachDay(from, to)) sum += block ? plannedForBlock(date, settings, block) : plannedMinutes(date, settings);
  return sum;
}

/** The week's target: the planned minutes of its seven days. */
export function weekTarget(settings: StoredSettings, weekStart: string): number {
  return plannedOver(settings, weekStart, addDays(weekStart, 6));
}

/** A template by id, from the current settings. */
export function templateById(settings: StoredSettings, id: string): DayTemplate | undefined {
  return settings.core.templates.find((t) => t.id === id);
}

/* ------------------------------------------------------------------ editing a day (pure) */

/** Applies a change to one date's entry, removing the entry when nothing is left in it. */
export function withDayChange(settings: StoredSettings, date: string, change: (c: DayChange) => DayChange): StoredSettings {
  const next = change({ ...(settings.schedule.days[date] ?? {}) });
  const clean: DayChange = {};
  if (next.template) clean.template = next.template;
  if (next.rest) clean.rest = true;
  if (next.minutes && Object.keys(next.minutes).length > 0) clean.minutes = next.minutes;
  if (next.skip && next.skip.length > 0) clean.skip = next.skip;
  if (next.toTomorrow && next.toTomorrow.length > 0) clean.toTomorrow = next.toTomorrow;
  if (next.swaps && next.swaps.length > 0) clean.swaps = next.swaps;
  const days = { ...settings.schedule.days };
  if (Object.keys(clean).length > 0) days[date] = clean;
  else delete days[date];
  return { ...settings, schedule: { ...settings.schedule, days } };
}
