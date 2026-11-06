/** Whether the browser keeps Atlas's data (src/lib/storage-guard.ts), read once and after asking. */
import { useCallback, useEffect, useState } from 'react';
import { askToKeep, storageState } from '../lib/storage-guard.ts';
import type { StorageState } from '../lib/storage-guard.ts';

export function useStorageState(): { state: StorageState | undefined; ask: () => Promise<StorageState> } {
  const [state, setState] = useState<StorageState | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void storageState().then((s) => live && setState(s));
    return () => {
      live = false;
    };
  }, []);
  const ask = useCallback(async () => {
    const next = await askToKeep();
    setState(next);
    return next;
  }, []);
  return { state, ask };
}
