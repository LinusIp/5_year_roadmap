/**
 * Settings as the app uses them: defaults for a fresh install, and the upgrade of older stored settings.
 * Pure, so the Node scripts (learning log, sync test) use it too; src/db/settings.ts does the reading and writing.
 */
import { SETTINGS_VERSION } from '../db/types.ts';
import type { Layout, StoredSettings, StoredSettingsInput } from '../db/types.ts';
import type { SettingsDefaults } from '../seed/schema.ts';

/** Layout as a fresh install has it: exactly the mockups. */
/** The blocks that are lanes of the plan: every block but Practice, which is fed by the question sets, not plan items. */
export function planBlocks<B extends { role?: string }>(core: { blocks: B[] }): B[] {
  return core.blocks.filter((b) => b.role !== 'practice');
}

export function defaultLayout(core: Pick<SettingsDefaults, 'blocks'>): Layout {
  return {
    today: { stats: true, later: true, review: true, footer: true, view: 'detailed', now: 'first', order: core.blocks.map((b) => b.id) },
    tabs: ['today', 'plan', 'library', 'activity'],
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
    schedule: { overrides: [], days: {}, history: [] },
    pace: {},
    pauses: [],
    catchUp: {},
    layout: defaultLayout(core),
  };
}

/**
 * Brings stored settings of any version to version 2 (the flexibility brief), filling what is missing from the
 * curriculum's defaults. Version 1 had five fixed blocks, each with its minutes and weekdays; the Full day
 * template lists the blocks without minutes, so it keeps whatever minutes the user had set, and the weekly
 * pattern starts as Full day on every day. Days already logged keep their plan.
 *
 * Pure and idempotent: version 2 settings come back unchanged (as the same object when nothing was missing).
 */
export function upgradeSettings(stored: StoredSettingsInput | StoredSettings, defaults: SettingsDefaults): StoredSettings {
  const core = stored.core;
  const complete =
    stored.version === SETTINGS_VERSION && core.templates && core.pattern && core.heatmapMode && core.streak.percent !== undefined && core.practice && core.catalogue &&
    stored.schedule && stored.pace && stored.pauses && stored.catchUp && stored.layout;
  if (complete) return stored as StoredSettings;

  const blocks = [...core.blocks];
  let templates = core.templates ?? structuredClone(defaults.templates);
  if (!core.templates) {
    // Blocks the curriculum's templates use that these settings predate.
    for (const def of defaults.blocks) if (!blocks.some((b) => b.id === def.id)) blocks.push(structuredClone(def));
  }
  if (!core.practice) {
    // Settings from before the practice brief: the Practice block joins, in the templates the curriculum puts it in.
    for (const def of defaults.blocks.filter((b) => b.role === 'practice')) {
      if (blocks.some((b) => b.id === def.id)) continue;
      blocks.push(structuredClone(def));
      templates = templates.map((t) => {
        const entry = defaults.templates.find((d) => d.id === t.id)?.blocks.find((b) => b.block === def.id);
        return entry && !t.blocks.some((b) => b.block === def.id) ? { ...t, blocks: [...t.blocks, { ...entry }] } : t;
      });
    }
  }
  const nextCore: SettingsDefaults = {
    ...core,
    blocks,
    templates,
    pattern: core.pattern ?? [...defaults.pattern],
    heatmapMode: core.heatmapMode ?? defaults.heatmapMode,
    practice: core.practice ?? { ...defaults.practice },
    catalogue: core.catalogue ?? structuredClone(defaults.catalogue),
    streak: { ...core.streak, percent: core.streak.percent ?? defaults.streak.percent },
  };
  return {
    ...stored,
    version: SETTINGS_VERSION,
    core: nextCore,
    schedule: stored.schedule ?? { overrides: [], days: {}, history: [] },
    pace: stored.pace ?? {},
    pauses: stored.pauses ?? [],
    catchUp: stored.catchUp ?? {},
    layout: stored.layout ?? defaultLayout(nextCore),
  };
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

/** Stored settings, whatever their version, as the app uses them. */
export function currentSettings(stored: StoredSettingsInput | StoredSettings | undefined, core: SettingsDefaults): StoredSettings {
  if (!stored) return defaultSettings(core);
  return withCurrentPaperCadence(withCurrentBlockNames(upgradeSettings(stored, core), core), core);
}

