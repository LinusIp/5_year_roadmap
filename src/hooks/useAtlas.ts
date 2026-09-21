/**
 * One hook that assembles everything a page needs: the curriculum with the user's edits applied, their
 * settings, their item states and their logs. Pages take what they need from it rather than wiring up
 * five live queries each.
 */
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.ts';
import { useCustomEntities, useOverrides } from '../db/edits.ts';
import { useSettings } from '../db/settings.ts';
import { useItemStates } from '../db/state.ts';
import { resolveSeed } from '../lib/plan.ts';
import { seed as rawSeed } from '../seed/index.ts';
import type { AppSeed } from '../seed/schema.ts';
import type { DayLog, StoredSettings, UserItemState } from '../db/types.ts';

export interface Atlas {
  /** The curriculum with the user's patches and additions applied. */
  seed: AppSeed;
  /** The curriculum exactly as /data has it, for "reset to the original". */
  original: AppSeed;
  settings: StoredSettings;
  states: Map<string, UserItemState>;
  logs: DayLog[];
}

/** `undefined` while the first reads are in flight. Pages render a short loading line. */
export function useAtlas(): Atlas | undefined {
  const settings = useSettings(rawSeed.settings);
  const states = useItemStates();
  const overrides = useOverrides();
  const customs = useCustomEntities();
  const logs = useLiveQuery(() => db.dayLogs.toArray(), []);

  const resolved = useMemo(
    () => (overrides && customs ? resolveSeed(rawSeed, overrides, customs) : null),
    [overrides, customs],
  );

  return useMemo(() => {
    if (!settings || !states || !logs || !resolved) return undefined;
    return { seed: resolved, original: rawSeed, settings, states, logs };
  }, [settings, states, logs, resolved]);
}
