import type { ReactNode } from 'react';
import { ArtPanel } from './ArtPanel.tsx';

/** What to do next, in one sentence, with at most one way to do it, under a small vignette (ATLAS-ART). */
export function EmptyState({ children, action, art = true }: { children: ReactNode; action?: ReactNode; art?: boolean }) {
  return (
    <div className="py-8 text-center">
      {art && <ArtPanel slot="empty-state" aspect="4 / 5" decorative className="mx-auto mb-4 w-20" />}
      <p className="mx-auto max-w-sm text-body text-ink2">{children}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
