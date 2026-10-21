import { useEffect, useState } from 'react';
import { applyUpdate, onUpdateReady } from '../../pwa/register.ts';

/**
 * The update prompt, on every screen: a new version has installed and waits; Reload brings it in. It sits above
 * the tab bar where the sync notices appear, and stays until tapped. One pill, not a filled button: a screen keeps
 * its own.
 */
export function UpdateNotice() {
  const [ready, setReady] = useState(false);
  useEffect(() => onUpdateReady(() => setReady(true)), []);
  if (!ready) return null;
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-[640px] px-5">
      <button type="button" onClick={applyUpdate} className="knob flex min-h-[44px] w-full items-center justify-between gap-3 rounded-pill px-5 py-3 text-left text-meta text-ink">
        <span>A new version of Atlas is ready</span>
        <span className="font-semibold text-blue-deep">Reload</span>
      </button>
    </div>
  );
}
