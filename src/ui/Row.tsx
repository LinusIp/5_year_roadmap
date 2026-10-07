import { useContext, useId } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import { Link } from '../router/router.tsx';
import { InSheet } from './Sheet.tsx';

export interface RowProps {
  title: ReactNode;
  /** One line under the title, 14 px, ink2. */
  meta?: ReactNode;
  /** Text at the end of the row (hours, a date): part of the row's tap target. */
  trailing?: ReactNode;
  /** A control at the end of the row (a status pill, a remove button): a tap target of its own. */
  action?: ReactNode;
  /** A 3 px edge in a lane's colour; the roadmap is the only place that uses it. */
  edge?: string;
  onClick?: () => void;
  to?: string;
  href?: string;
  /** For rows that open content in place. */
  expanded?: boolean;
  /** A leading 20 px circle that fills with accent and a tick. */
  check?: { checked: boolean; onChange: (checked: boolean) => void; label?: string };
  /** A trailing 36 x 20 switch, named by the row's title. */
  toggle?: { on: boolean; onChange: (on: boolean) => void; disabled?: boolean };
  /** Pickers: a leading radio dot, filled for the chosen option. */
  selected?: boolean;
  /** Content shown under the row when it is expanded. */
  children?: ReactNode;
  className?: string;
}

function CheckCircle({ checked }: { checked: boolean }) {
  return (
    <span
      className={
        'grid size-5 place-items-center rounded-pill border ' +
        (checked ? 'border-accent bg-accent text-on-accent' : 'border-ink2 text-transparent')
      }
    >
      <Icon name="check" size={14} />
    </span>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span aria-hidden="true" className={'grid size-5 shrink-0 place-items-center rounded-pill border ' + (selected ? 'border-accent' : 'border-ink2')}>
      {selected && <span className="size-2.5 rounded-pill bg-accent" />}
    </span>
  );
}

/** A switch: a 36 x 20 pill inside a 44 px target. */
export function Switch({ on, onChange, labelledBy, label, disabled }: { on: boolean; onChange: (on: boolean) => void; labelledBy?: string; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="-mr-1 grid size-11 shrink-0 place-items-center disabled:opacity-50"
    >
      <span className={'relative h-5 w-9 rounded-pill ' + (on ? 'bg-accent' : 'bg-line')}>
        <span className={'absolute top-0.5 size-4 rounded-pill bg-surface ' + (on ? 'left-[18px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

/**
 * The one list item of the system: a title (16/500), an optional meta line (14, ink2), optional trailing
 * text, and at most one of a check circle, a switch or a radio dot. Rows are separated by a hairline from
 * their list, never boxed one by one.
 */
export function Row({ title, meta, trailing, action, edge, onClick, to, href, expanded, check, toggle, selected, children, className = '' }: RowProps) {
  const titleId = useId();
  const body = (
    <>
      {selected !== undefined && <RadioDot selected={selected} />}
      <span className="min-w-0 flex-1">
        <span id={titleId} className="block text-body font-medium">
          {title}
        </span>
        {meta && <span className="block truncate text-meta text-ink2">{meta}</span>}
      </span>
      {trailing !== undefined && trailing !== null && <span className="shrink-0 text-meta text-ink2">{trailing}</span>}
    </>
  );
  const mainClass = 'flex min-h-11 min-w-0 flex-1 items-center gap-3 py-2.5 text-left';

  let main: ReactNode;
  if (to) {
    main = (
      <Link to={to} className={mainClass} onClick={onClick}>
        {body}
      </Link>
    );
  } else if (href) {
    main = (
      <a href={href} target="_blank" rel="noreferrer noopener" className={mainClass}>
        {body}
      </a>
    );
  } else if (onClick) {
    main = (
      <button type="button" className={mainClass} onClick={onClick} aria-expanded={expanded} aria-pressed={selected}>
        {body}
      </button>
    );
  } else {
    main = <div className={mainClass}>{body}</div>;
  }

  return (
    <li className={'relative ' + className}>
      {edge && <span aria-hidden="true" className="absolute inset-y-2.5 left-0 w-[3px] rounded-pill" style={{ background: edge }} />}
      <div className={'flex items-center gap-1' + (edge ? ' pl-3' : '')}>
        {check && (
          <button
            type="button"
            role="checkbox"
            aria-checked={check.checked}
            aria-label={check.label}
            aria-labelledby={check.label ? undefined : titleId}
            onClick={() => check.onChange(!check.checked)}
            className="-ml-3 grid size-11 shrink-0 place-items-center"
          >
            <CheckCircle checked={check.checked} />
          </button>
        )}
        {main}
        {action}
        {toggle && <Switch on={toggle.on} onChange={toggle.onChange} labelledBy={titleId} disabled={toggle.disabled} />}
      </div>
      {children}
    </li>
  );
}

/**
 * A list of rows: on the one card level, or `flat` on the page between hairlines (Today's "Later today").
 * `label` is the section's quiet heading above it.
 */
export function RowList({ label, children, className = '', flat, plain }: { label?: ReactNode; children: ReactNode; className?: string; flat?: boolean; plain?: boolean }) {
  const inSheet = useContext(InSheet);
  const list = plain ? '' : flat || inSheet ? 'divide-y divide-line border-y border-line' : 'divide-y divide-line rounded-card bg-surface px-4';
  return (
    <section className={className}>
      {label && <h2 className="mb-1.5 text-meta font-normal text-ink2">{label}</h2>}
      <ul className={list}>{children}</ul>
    </section>
  );
}
