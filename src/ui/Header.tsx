import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import { Link } from '../router/router.tsx';

/** The redesign mockup's back knob: a 44 px raised tile with the first lane's chevron, before the title. */
export function BackKnob({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} aria-label={label} className="tile grid size-11 shrink-0 place-items-center rounded-[14px] text-[var(--x0)]">
      <Icon name="chevronLeft" size={18} />
    </Link>
  );
}

/**
 * The top of a screen, as the mockup draws it: no app bar, the header row 44 px down (the phone's safe area). The
 * title (28/900, or 26 beside a back knob) and one meta line on the left, controls on the right; `backTo` puts a back
 * knob before the title (a shelf, a path, Sleep, the log).
 */
export function Header({ title, sub, actions, back, backTo, backLabel = 'Back' }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; back?: ReactNode; backTo?: string; backLabel?: string }) {
  const knob = backTo ? <BackKnob to={backTo} label={backLabel} /> : back;
  return (
    <header className="flex items-center justify-between gap-3 px-1 pt-[max(44px,env(safe-area-inset-top))]">
      {knob && <div className="shrink-0">{knob}</div>}
      <div className="min-w-0 flex-1">
        <h1 className={(knob ? 'text-[26px]' : 'text-[28px]') + ' font-black leading-tight tracking-[-0.01em]'}>{title}</h1>
        {sub && <p className={'text-ink2 ' + (knob ? 'text-label' : 'mt-0.5 text-meta')}>{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
