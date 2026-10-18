import { useRef } from 'react';
import type { ReactNode } from 'react';
import { useEdgeFade } from './edgeFade.ts';

/**
 * A horizontal strip with no scrollbar, a fade over a hidden edge, opening where `open` says (src/ui/edgeFade.ts).
 * With `label`, the strip is a focusable region of its own (for content with nothing focusable in it): Tab reaches
 * it, the arrow keys scroll it, and the focus ring shows.
 */
export function FadeStrip({ open = 'start', label, className = '', children }: { open?: 'start' | 'end' | 'current'; label?: string; className?: string; children: ReactNode }) {
  const strip = useRef<HTMLDivElement>(null);
  useEdgeFade(strip, open);
  return (
    <div className={'fade-strip ' + className}>
      <div ref={strip} className="relative overflow-x-auto" {...(label ? { tabIndex: 0, role: 'region', 'aria-label': label } : {})}>
        {children}
      </div>
    </div>
  );
}
