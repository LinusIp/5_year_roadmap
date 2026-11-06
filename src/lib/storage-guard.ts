/**
 * Keeping the user's data (Storage API): everything Atlas knows about the user lives in this browser's IndexedDB,
 * which a browser may clear on its own when the device runs low on space, unless the site's storage is marked
 * persistent. Atlas asks for that once at start-up where asking is silent (Chromium browsers decide by themselves,
 * and grant it to an installed app), and from Settings on a tap everywhere else (Firefox asks the user).
 */

export type StorageState = 'kept' | 'not-kept' | 'unknown';

interface StorageManagerLike {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}

function manager(): StorageManagerLike | undefined {
  return typeof navigator !== 'undefined' ? (navigator.storage as StorageManagerLike | undefined) : undefined;
}

/** Whether the browser has promised to keep this site's data; 'unknown' where it cannot say. */
export async function storageState(storage: StorageManagerLike | undefined = manager()): Promise<StorageState> {
  if (!storage?.persisted) return 'unknown';
  try {
    return (await storage.persisted()) ? 'kept' : 'not-kept';
  } catch {
    return 'unknown';
  }
}

/** Asks the browser to keep this site's data. Resolves with the state after asking. */
export async function askToKeep(storage: StorageManagerLike | undefined = manager()): Promise<StorageState> {
  if (!storage?.persist) return storageState(storage);
  try {
    return (await storage.persist()) ? 'kept' : 'not-kept';
  } catch {
    return storageState(storage);
  }
}

/** Firefox shows a permission prompt for `persist()`: start-up asks only where the answer comes without one. */
export function asksSilently(userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  return !/Firefox\//.test(userAgent);
}

/** At start-up: ask once, quietly, if the data is not kept yet. Never throws. */
export async function keepStorageOnStart(storage: StorageManagerLike | undefined = manager(), userAgent?: string): Promise<StorageState> {
  const state = await storageState(storage);
  if (state !== 'not-kept' || !asksSilently(userAgent)) return state;
  return askToKeep(storage);
}
