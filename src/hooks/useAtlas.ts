/**
 * One hook that assembles everything a page needs: the curriculum with the user's edits applied, their
 * settings, their item states and their logs. Pages take what they need from it rather than wiring up
 * five live queries each.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.ts';
import { useCustomEntities, useOverrides, usePlanPatches } from '../db/edits.ts';
import { useSettings } from '../db/settings.ts';
import { useItemStates } from '../db/state.ts';
import { resolveSeed } from '../lib/plan.ts';
import { loadLibrary, peekLibrary, seed as coreSeed, subscribeLibrary } from '../seed/index.ts';
import type { AppSeed } from '../seed/schema.ts';
import type { DayLog, PlanPatch, StoredSettings, UserItemState } from '../db/types.ts';

export interface Atlas {
  /** The curriculum with the user's patches and additions applied. */
  seed: AppSeed;
  /** The curriculum exactly as /data has it, for "reset to the original". */
  original: AppSeed;
  settings: StoredSettings;
  states: Map<string, UserItemState>;
  logs: DayLog[];
  /** The plan edits, for Undo. */
  patches: PlanPatch[];
}

/** The Library's long tail (ATLAS-LIBRARY): null until its chunk, asked for after the first render, has loaded. */
export function useLibrary(): AppSeed['resources'] | null {
  useEffect(() => void loadLibrary(), []);
  return useSyncExternalStore(subscribeLibrary, peekLibrary);
}

/** Whether a plan edit names a resource outside the core: the plan waits for the Library rather than lose it. */
export function needsLibrary(patches: readonly PlanPatch[], core: Pick<AppSeed, 'resources'>): boolean {
  const known = new Set(core.resources.map((r) => r.id));
  return patches.some((p) => {
    const id = p.op === 'add' ? p.item.resourceId : p.op === 'swap' ? p.resourceId : undefined;
    return id !== undefined && !known.has(id);
  });
}

/** `undefined` while the first reads are in flight. Pages render a short loading line. */
export function useAtlas(): Atlas | undefined {
  const library = useLibrary();
  const rawSeed = useMemo<AppSeed>(() => (library ? { ...coreSeed, resources: [...coreSeed.resources, ...library] } : coreSeed), [library]);
  const settings = useSettings(rawSeed.settings);
  const states = useItemStates();
  const overrides = useOverrides();
  const customs = useCustomEntities();
  const patches = usePlanPatches();
  const logs = useLiveQuery(() => db.dayLogs.toArray(), []);

  const waiting = !library && patches !== undefined && needsLibrary(patches, coreSeed);
  const resolved = useMemo(
    () => (overrides && customs && patches && !waiting ? resolveSeed(rawSeed, overrides, customs, patches) : null),
    [rawSeed, overrides, customs, patches, waiting],
  );

  return useMemo(() => {
    if (!settings || !states || !logs || !resolved || !patches) return undefined;
    return { seed: resolved, original: rawSeed, settings, states, logs, patches };
  }, [settings, states, logs, resolved, patches, rawSeed]);
}
