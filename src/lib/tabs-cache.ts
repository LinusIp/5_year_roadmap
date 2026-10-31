/**
 * The tab bar's last known tabs, mirrored to localStorage (ATLAS-FOCUS-MUSIC follow-up): the settings come from
 * IndexedDB, so the first paint of a screen used to draw the default six tabs and swap to the user's own a moment
 * later. Like the theme (public/theme-init.js), the mirror only bridges that moment; the settings stay the truth.
 */
import { TAB_IDS } from '../db/types.ts';
import type { TabId } from '../db/types.ts';

const KEY = 'atlas.tabs';

/** The mirrored tabs, or null when none is stored or it does not read as a list of tab ids. */
export function readCachedTabs(storage: Pick<Storage, 'getItem'> | null = safeStorage()): TabId[] | null {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 3 || parsed.length > 6) return null;
    if (!parsed.every((t) => typeof t === 'string' && (TAB_IDS as readonly string[]).includes(t))) return null;
    return parsed as TabId[];
  } catch {
    return null;
  }
}

export function writeCachedTabs(tabs: readonly TabId[], storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(tabs));
  } catch {
    /* storage blocked: the next paint falls back to the defaults */
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
