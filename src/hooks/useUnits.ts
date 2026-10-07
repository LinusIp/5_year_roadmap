import { useEffect, useState } from 'react';
import { loadAllUnits } from '../seed/index.ts';
import type { Unit } from '../seed/schema.ts';

/** Every unit checklist, loaded once from its own chunk. Screens render without it, then again with it. */
export function useUnits(): Record<string, Unit[]> | undefined {
  const [units, setUnits] = useState<Record<string, Unit[]>>();
  useEffect(() => {
    let live = true;
    void loadAllUnits().then((all) => {
      if (live) setUnits(all);
    });
    return () => {
      live = false;
    };
  }, []);
  return units;
}
