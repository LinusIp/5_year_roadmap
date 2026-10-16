import { useEffect, useState } from 'react';
import { useRunningTimer } from '../../db/state.ts';
import type { RunningTimer } from '../../db/types.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { formatStopwatch } from '../../lib/dates.ts';
import { blockShort } from './text.ts';

/** Elapsed time of the running timer, ticking once a second. */
export function useElapsed(timer: RunningTimer | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timer) return undefined;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer]);
  return timer ? Math.max(0, now - timer.startedAt) : 0;
}

/**
 * The running timer in a sheet's header, "Running · 12:04", so a tech doc opened from Today keeps the time in
 * view. The timer lives in the database, not in the screen: opening or closing a sheet never touches it. Nothing
 * shows while no timer runs; a timer on another item names its block.
 */
export function RunningTime({ atlas, refId, pill }: { atlas: Atlas; refId: string | null; pill?: boolean }) {
  const timer = useRunningTimer();
  const elapsed = useElapsed(timer);
  if (!timer) return null;
  const own = timer.refId === refId;
  const block = atlas.settings.core.blocks.find((b) => b.id === timer.block);
  return (
    <span role="timer" className={'shrink-0 tabular-nums ' + (pill ? 'well well-blue rounded-pill px-3 py-1.5 text-meta font-semibold text-blue-deep' : 'text-meta text-ink2')}>
      {(own ? 'Running' : blockShort(block?.name ?? timer.block) + ' running') + ' · ' + formatStopwatch(elapsed)}
    </span>
  );
}
