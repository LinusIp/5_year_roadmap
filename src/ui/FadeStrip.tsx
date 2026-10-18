import { useRef } from 'react';
import type { ReactNode } from 'react';
import { useEdgeFade } from './edgeFade.ts';

/** A horizontal strip with no scrollbar that fades at a hidden edge and opens where `open` says (src/ui/edgeFade.ts). */
export function FadeStrip({ open = 'start', className = '', children }: { open?: 'start' | 'end' | 'current'; className?: string; children: ReactNode }) {
  const strip = useRef<HTMLDivElement>(null);
  useEdgeFade(strip, open);
  return (
    <div ref={strip} className={'edge-fade overflow-x-auto ' + className}>
      {children}
    </div>
  );
}
