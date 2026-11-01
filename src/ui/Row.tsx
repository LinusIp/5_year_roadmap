import { useId } from 'react';
import type { ReactNode, Ref } from 'react';
import { Icon } from './Icon.tsx';
import { Link } from '../router/router.tsx';

export interface RowProps {
  title: ReactNode;
  /** One line under the title, 14 px, ink2. */
  meta?: ReactNode;
  /** Let the meta run to a second line instead of cutting it (a summary that has to be read whole). */
  metaWraps?: boolean;
  /** Text at the end of the row (hours, a date): part of the row's tap target. */
  trailing?: ReactNode;
  /** A control at the end of the row (a status pill, a remove button): a tap target of its own. */
  action?: ReactNode;
  onClick?: () => void;
  to?: string;
  href?: string;
  /** For rows that open content in place. */
  expanded?: boolean;
  /** A 20 px icon before the title: the block, the subject or the kind of project. */
  icon?: ReactNode;
  /** A leading 20 px box that fills with accent and a tick; a ticked row's title turns ink2. */
  check?: { checked: boolean; onChange: (checked: boolean) => void; label?: string; disabled?: boolean };
  /** A trailing 36 x 20 switch, named by the row's title. */
  toggle?: { on: boolean; onChange: (on: boolean) => void; disabled?: boolean };
  /** Pickers: a leading radio dot, filled for the chosen option. */
  selected?: boolean;
  /** Content shown under the row when it is expanded. */
  children?: ReactNode;
  className?: string;
  /**
   * The mockup's min-height for the row's content, which sits inside 8 to 10 px of padding: 56 on Today (a 76 px
   * row), 48 on Activity, 52 for phases, 60 in the Library; 44 is a checklist item with no padding.
   */
  height?: 44 | 48 | 52 | 56 | 60;
  /** Keep the title to one line, ending in an ellipsis (the Library). */
  truncate?: boolean;
  /** Kept for callers: checklist titles are 16/700 like every row in clay. */
  plainTitle?: boolean;
  /** A row of a list that can be reordered by dragging (useDragReorder finds rows by it). */
  dragRow?: boolean;
  /** A trailing chevron: the row opens something (it turns down while the row is expanded). */
  chevron?: boolean;
  /**
   * What the row's icon says, read after its name (the type tile and its stars: "Article, quality 5 of 5: Canon"); it
   * describes the row rather than naming it, so the name stays the title, meta and trailing text.
   */
  describe?: string;
}

/** The clay checkbox: a 24 px sunken square with 8 px corners; checked, a filled blue gradient with a white tick. */
function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span className={'grid size-6 place-items-center rounded-check ' + (checked ? 'fill-blue' : 'well rounded-check text-transparent')}>
      <Icon name="check" size={16} />
    </span>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span aria-hidden="true" className="well grid size-6 shrink-0 place-items-center rounded-pill">
      {selected && <span className="fill-blue size-3 rounded-pill" />}
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
      className="-mr-1 grid h-11 w-14 shrink-0 place-items-center disabled:opacity-50"
    >
      <span className={'relative h-7 w-12 rounded-pill ' + (on ? 'fill-blue' : 'well rounded-pill')}>
        <span className={'knob absolute top-1 size-5 rounded-pill ' + (on ? 'left-6' : 'left-1')} />
      </span>
    </button>
  );
}

/**
 * The one list item of the system: an optional 40 px icon knob, a title (16/700, at most two lines), an optional meta
 * line (14, ink2), optional trailing text, and at most one of a checkbox, a switch or a radio dot. Rows sit in a
 * list group, divided by dashed lines, never boxed one by one.
 */
const HEIGHT = { 44: 'min-h-11', 48: 'min-h-16 py-2', 52: 'min-h-16 py-2', 56: 'min-h-16 py-2', 60: 'min-h-16 py-2' } as const;

export function Row({ title, meta, metaWraps, trailing, action, onClick, to, href, expanded, check, toggle, selected, children, className = '', height = 56, truncate, plainTitle: _plainTitle, dragRow, icon, chevron, describe }: RowProps) {
  const titleId = useId();
  const describeId = useId();
  const describedBy = describe ? describeId : undefined;
  const titleClass =
    'block text-body leading-[1.25] font-medium' + (check?.checked ? ' text-ink2 line-through' : '') + (truncate ? ' truncate' : ' line-clamp-2');
  const body = (
    <>
      {selected !== undefined && <RadioDot selected={selected} />}
      {icon}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={titleId} className={titleClass}>
          {title}
        </span>
        {meta && <span className={'block text-meta text-ink2 ' + (metaWraps ? 'line-clamp-2' : 'truncate')}>{meta}</span>}
      </span>
      {trailing !== undefined && trailing !== null && <span className="flex shrink-0 items-center gap-1.5 text-meta text-ink2">{trailing}</span>}
      {chevron && <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={18} className="text-ink2" />}
    </>
  );
  const mainClass = 'row-main flex min-w-0 flex-1 items-center gap-3 text-left ' + HEIGHT[height];

  let main: ReactNode;
  if (to) {
    main = (
      <Link to={to} className={mainClass} onClick={onClick} aria-describedby={describedBy}>
        {body}
      </Link>
    );
  } else if (href) {
    main = (
      <a href={href} target="_blank" rel="noreferrer noopener" className={mainClass} aria-describedby={describedBy}>
        {body}
      </a>
    );
  } else if (onClick) {
    main = (
      <button type="button" className={mainClass} onClick={onClick} aria-expanded={expanded} aria-pressed={selected} aria-describedby={describedBy}>
        {body}
      </button>
    );
  } else {
    main = <div className={mainClass}>{body}</div>;
  }

  return (
    <li className={'relative ' + className} data-drag-row={dragRow || undefined}>
      <div className="flex items-center gap-1">
        {check && (
          <button
            type="button"
            role="checkbox"
            aria-checked={check.checked}
            aria-label={check.label}
            aria-labelledby={check.label ? undefined : titleId}
            aria-disabled={check.disabled || undefined}
            onClick={() => !check.disabled && check.onChange(!check.checked)}
            className={'-ml-2.5 grid size-11 shrink-0 place-items-center' + (check.disabled ? ' cursor-default' : '')}
          >
            <CheckBox checked={check.checked} />
          </button>
        )}
        {main}
        {action}
        {toggle && <Switch on={toggle.on} onChange={toggle.onChange} labelledBy={titleId} disabled={toggle.disabled} />}
      </div>
      {describe && (
        <span id={describeId} hidden>
          {describe}
        </span>
      )}
      {children}
    </li>
  );
}

/**
 * A list group: one raised tile, its section label inside at the top, rows divided by dashed lines. `plain` is the
 * bare list, for a list inside another tile. `flat` is kept for callers and now looks the same as the tile.
 */
export function RowList({ label, children, className = '', flat: _flat, plain, ref, aside }: { label?: ReactNode; children: ReactNode; className?: string; flat?: boolean; plain?: boolean; ref?: Ref<HTMLElement>; aside?: ReactNode }) {
  const heading = label ? (
    <div className="flex items-baseline justify-between gap-3 pb-1 pt-0.5">
      <h2 className="section-label mb-0">{label}</h2>
      {aside && <span className="text-meta text-ink2">{aside}</span>}
    </div>
  ) : null;
  if (plain) {
    return (
      <section className={className} ref={ref}>
        {heading}
        <ul className="rows">{children}</ul>
      </section>
    );
  }
  return (
    <section className={'tile px-[18px] pb-2 pt-3.5 ' + className} ref={ref}>
      {heading}
      <ul className="rows">{children}</ul>
    </section>
  );
}
