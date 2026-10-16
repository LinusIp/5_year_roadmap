/**
 * Settings as the app uses them: defaults for a fresh install, and the upgrade of older stored settings.
 * Pure, so the Node scripts (learning log, sync test) use it too; src/db/settings.ts does the reading and writing.
 */
import { SETTINGS_VERSION } from '../db/types.ts';
import type { DayChange, Layout, StoredSettings, StoredSettingsInput } from '../db/types.ts';
import type { BlockId, SettingsDefaults, StoredCore } from '../seed/schema.ts';

/** Layout as a fresh install has it: exactly the mockups. */
export function defaultLayout(core: Pick<SettingsDefaults, 'blocks'>): Layout {
  return {
    today: { stats: true, later: true, review: true, footer: true, view: 'detailed', now: 'first', order: core.blocks.map((b) => b.id) },
    tabs: ['today', 'plan', 'calendar', 'library', 'activity'],
    plan: { segment: 'timeline', showDropped: true },
    general: { clock: '24', density: 'comfortable' },
  };
}

/** A fresh install starts from data/settings.yaml; nothing about blocks or thresholds is hard-coded. */
export function defaultSettings(core: SettingsDefaults): StoredSettings {
  return {
    id: 'app',
    version: SETTINGS_VERSION,
    core: structuredClone(core),
    theme: 'light',
    github: { username: '', showCalendar: false },
    backup: {},
    schedule: { overrides: [], days: {}, history: [], busy: [] },
    pace: {},
    pauses: [],
    catchUp: {},
    layout: defaultLayout(core),
  };
}

/**
 * Brings stored settings of any version to version 3 (Calendar), filling what is missing from the
 * curriculum's defaults. Version 1 had five fixed blocks, each with its minutes and weekdays; the Full day
 * template lists the blocks without minutes, so it keeps whatever minutes the user had set, and the weekly
 * pattern starts as Full day on every day. Days already logged keep their plan.
 *
 * Settings saved while Practice existed lose it first (withoutPractice).
 *
 * Version 2 gains an empty list of busy events, and Calendar in the tab bar if the tabs were the old default.
 *
 * Pure and idempotent: version 3 settings come back unchanged (as the same object when nothing was missing).
 */
export function upgradeSettings(saved: StoredSettingsInput | StoredSettings, defaults: SettingsDefaults): StoredSettings {
  const stored = withoutPractice(saved);
  const core = stored.core;
  const complete =
    stored.version === SETTINGS_VERSION && core.templates && core.pattern && core.heatmapMode && core.streak.percent !== undefined && core.catalogue &&
    stored.schedule?.busy && stored.pace && stored.pauses && stored.catchUp && stored.layout;
  if (complete) return stored as StoredSettings;

  const blocks = [...core.blocks];
  const templates = core.templates ?? structuredClone(defaults.templates);
  if (!core.templates) {
    // Blocks the curriculum's templates use that these settings predate.
    for (const def of defaults.blocks) if (!blocks.some((b) => b.id === def.id)) blocks.push(structuredClone(def));
  }
  const nextCore: SettingsDefaults = {
    ...core,
    blocks,
    templates,
    pattern: core.pattern ?? [...defaults.pattern],
    heatmapMode: core.heatmapMode ?? defaults.heatmapMode,
    catalogue: core.catalogue ?? structuredClone(defaults.catalogue),
    streak: { ...core.streak, percent: core.streak.percent ?? defaults.streak.percent },
  };
  return {
    ...stored,
    version: SETTINGS_VERSION,
    core: nextCore,
    schedule: { ...(stored.schedule ?? { overrides: [], days: {}, history: [] }), busy: stored.schedule?.busy ?? [] },
    pace: stored.pace ?? {},
    pauses: stored.pauses ?? [],
    catchUp: stored.catchUp ?? {},
    layout: stored.layout ? withCalendarTab(stored.layout) : defaultLayout(nextCore),
  };
}

/** The tabs before Calendar, as a fresh install had them. */
const OLD_DEFAULT_TABS = ['today', 'plan', 'library', 'activity'];

/**
 * Calendar joins the tab bar between Plan and Library for everyone who kept the old default tabs; tabs the user
 * chose stay as they are (Calendar can be added under Settings > Layout).
 */
function withCalendarTab(layout: Layout): Layout {
  if (layout.tabs.join() !== OLD_DEFAULT_TABS.join()) return layout;
  return { ...layout, tabs: ['today', 'plan', 'calendar', 'library', 'activity'] };
}

/**
 * Settings saved before a curriculum renamed a block still carry the old default name (and its summary). A block
 * whose name is one of the defaults' former names takes the new name and summary; a name the user chose is kept.
 */
export function withCurrentBlockNames(stored: StoredSettings, core: SettingsDefaults): StoredSettings {
  let changed = false;
  const blocks = stored.core.blocks.map((block) => {
    const fresh = core.blocks.find((b) => b.id === block.id);
    if (!fresh || !fresh.formerNames?.includes(block.name)) return block;
    changed = true;
    return { ...block, name: fresh.name, summary: fresh.summary, formerNames: fresh.formerNames };
  });
  return changed ? { ...stored, core: { ...stored.core, blocks } } : stored;
}

/** The paper cadence of earlier curricula, never edited by the user, gives way to the current default. */
export function withCurrentPaperCadence(stored: StoredSettings, core: SettingsDefaults): StoredSettings {
  const cadence = stored.core.paperCadence;
  const untouchedOldDefault = cadence.fromPhase === undefined && cadence.fromYear === 2 && cadence.perWeek === 1;
  if (!untouchedOldDefault || core.paperCadence.fromPhase === undefined) return stored;
  return { ...stored, core: { ...stored.core, paperCadence: { ...core.paperCadence } } };
}

/**
 * Settings saved while Practice existed (until pull request #6) lose it: its block (the one with `role: practice`,
 * P) leaves the blocks, every template, the copies of earlier schedules, the layout's order, pace, pauses, catch-up
 * and day changes, and the `practice` section goes. A pause whose time went to Practice gives it to free time.
 * Nothing else changes; settings without Practice come back as the same object. Minutes already logged to P are
 * day logs, not settings, and stay (shown as "Practice": src/lib/retired.ts).
 */
export function withoutPractice<S extends StoredSettingsInput | StoredSettings>(stored: S): S {
  const core = stored.core as StoredCore;
  const gone = new Set(core.blocks.filter((b) => b.role === 'practice').map((b) => b.id));
  if (gone.size === 0 && core.practice === undefined) return stored;
  const keep = (id: BlockId): boolean => !gone.has(id);
  const { practice: _practice, ...rest } = core;
  const nextCore = {
    ...rest,
    blocks: core.blocks.filter((b) => keep(b.id)),
    ...(core.templates ? { templates: core.templates.map((t) => ({ ...t, blocks: t.blocks.filter((b) => keep(b.block)) })) } : {}),
  };
  const without = <V>(record: Record<string, V> | undefined): Record<string, V> | undefined =>
    record && Object.fromEntries(Object.entries(record).filter(([id]) => keep(id)));
  const next: StoredSettingsInput = { ...(stored as StoredSettingsInput), core: nextCore as StoredCore };
  if (stored.schedule) {
    const days: Record<string, DayChange> = {};
    for (const [date, change] of Object.entries(stored.schedule.days)) {
      const clean: DayChange = { ...change };
      if (change.minutes) clean.minutes = without(change.minutes)!;
      if (change.skip) clean.skip = change.skip.filter(keep);
      if (change.toTomorrow) clean.toTomorrow = change.toTomorrow.filter(keep);
      if (change.swaps) clean.swaps = change.swaps.filter(([a, b]) => keep(a) && keep(b));
      for (const key of ['minutes', 'skip', 'toTomorrow', 'swaps'] as const) {
        const value = clean[key];
        if (value && (Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0)) delete clean[key];
      }
      if (Object.keys(clean).length > 0) days[date] = clean;
    }
    next.schedule = {
      ...stored.schedule,
      days,
      history: stored.schedule.history.map((v) => ({
        ...v,
        templates: v.templates.map((t) => ({ ...t, blocks: t.blocks.filter((b) => keep(b.block)) })),
        blocks: v.blocks.filter((b) => keep(b.id)),
      })),
    };
  }
  if (stored.pace) next.pace = without(stored.pace);
  if (stored.catchUp) next.catchUp = without(stored.catchUp);
  if (stored.pauses) next.pauses = stored.pauses.filter((p) => keep(p.block)).map((p) => (p.to !== 'free' && !keep(p.to) ? { ...p, to: 'free' as const } : p));
  if (stored.layout) next.layout = { ...stored.layout, today: { ...stored.layout.today, order: stored.layout.today.order.filter(keep) } };
  return next as S;
}

/** Stored settings, whatever their version, as the app uses them. */
export function currentSettings(stored: StoredSettingsInput | StoredSettings | undefined, core: SettingsDefaults): StoredSettings {
  if (!stored) return defaultSettings(core);
  return withCurrentPaperCadence(withCurrentBlockNames(upgradeSettings(stored, core), core), core);
}

