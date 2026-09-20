import { useEffect, useState } from 'react';

/**
 * Shows a change immediately while the write to IndexedDB lands.
 *
 * Writes here are local and fast, but they are still asynchronous, and a controlled checkbox bound
 * straight to a live query visibly snaps back for a frame after every click. This keeps the value the
 * user just chose until the stored value catches up with it.
 */
export function useOptimistic<T>(actual: T): [T, (value: T) => void] {
  const [override, setOverride] = useState<{ value: T } | null>(null);

  // Once the stored value arrives, it wins: this also covers the write failing or being changed elsewhere.
  useEffect(() => {
    setOverride(null);
  }, [actual]);

  return [override ? override.value : actual, (value: T) => setOverride({ value })];
}
