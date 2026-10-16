import type { ReactNode } from 'react';

/**
 * The top of a screen: no app bar, just the header row 52 px down. The title (26/800) and one meta line on the
 * left, 48 px knob buttons on the right; `back` puts a back knob before the title (a shelf, a path).
 */
export function Header({ title, sub, actions, back }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 pt-[52px]">
      {back && <div className="shrink-0">{back}</div>}
      <div className="min-w-0 flex-1">
        <h1 className="text-headline font-semibold tracking-[-0.01em]">{title}</h1>
        {sub && <p className="mt-1 text-meta text-ink2">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </header>
  );
}
