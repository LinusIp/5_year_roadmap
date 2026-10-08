import { useEffect, useState } from 'react';
import { onSyncNotice } from '../../sync/engine.ts';

/**
 * Sync's quiet notices ("Settings were changed on another device — kept the newer version."), shown for six
 * seconds above the tab bar and read out politely. Never blocks anything; there is nothing to dismiss.
 */
export function SyncNotice() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = onSyncNotice((next) => {
      setText(next);
      clearTimeout(timer);
      timer = setTimeout(() => setText(null), 6_000);
    });
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, []);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-[640px] px-5">
      {text && <p className="rounded-card bg-ink px-4 py-3 text-meta text-canvas">{text}</p>}
    </div>
  );
}
