import type { ReactNode } from 'react';

/**
 * The top of a screen, as in the mockup: 56 px down, its name (16/500) level with any icon actions on the
 * right, and at most one line under it in ink2. On Today the name is the date: there is no "Today" heading and
 * no logo. Whatever comes next sets its own distance below.
 */
export function Header({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="pt-14">
      {actions ? (
        <div className="flex min-h-10 items-center justify-between gap-2">
          <h1 className="min-w-0 text-body font-medium">{title}</h1>
          <div className="-my-0.5 -mr-0.5 flex shrink-0 items-center">{actions}</div>
        </div>
      ) : (
        <h1 className="text-body font-medium">{title}</h1>
      )}
      {sub && <p className="mt-1 text-meta text-ink2">{sub}</p>}
    </header>
  );
}
