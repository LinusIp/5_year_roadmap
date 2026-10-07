import type { ReactNode } from 'react';

/** What to do next, in one sentence, with at most one way to do it. */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="py-10 text-center">
      <p className="mx-auto max-w-sm text-body text-ink2">{children}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
