import type { ReactNode } from 'react';

/**
 * The top of a screen: its name (16/500), at most one line under it in ink2, and icon actions on the right.
 * On Today the name is the date: there is no "Today" heading and no logo.
 */
export function Header({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-2 pb-5 pt-8">
      <div className="min-w-0 pt-2.5">
        <h1 className="text-body font-medium">{title}</h1>
        {sub && <p className="mt-1 text-meta text-ink2">{sub}</p>}
      </div>
      {actions && <div className="-mr-2.5 flex shrink-0 items-center">{actions}</div>}
    </header>
  );
}
