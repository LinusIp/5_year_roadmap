import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';
import { Link } from '../router/router.tsx';

export type ButtonVariant = 'filled' | 'ice' | 'quiet' | 'icon';

interface Common {
  /**
   * filled: the one primary action on a screen, a flat pill in a lane's colour with white text (the mockup's .btn.p);
   * ice: a secondary action, a pill in a lane's tint with its text (the Lofi and Swap pills); quiet: a neutral raised
   * pill; icon: a 48 px knob with a glyph and a label (no text), or plain quiet text when given words.
   */
  variant?: ButtonVariant;
  /** The lane whose colour a filled or tinted button takes: 0 by default (Today, Plan, Calendar), 1 on Sleep and Internships. */
  lane?: 0 | 1 | 2 | 3 | 4;
  icon?: IconName;
  /** Required for the icon variant without text. */
  label?: string;
  /** An accessible name that contains the visible words but says more ("Mark done" for "Done"). */
  name?: string;
  /** sm: a 44 px pill in 14 px type (Undo, Add time); md and lg: the 48 px pill. */
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
  className?: string;
}

type ButtonProps = Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & { to?: undefined; href?: undefined };
type LinkProps = Common & { to: string; href?: undefined; onClick?: () => void };
type ExternalProps = Common & { href: string; to?: undefined; onClick?: () => void };

const BASE = 'press inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-pill font-semibold disabled:opacity-50 aria-disabled:opacity-50';
const VARIANT: Record<ButtonVariant, string> = {
  filled: 'btn-fill min-h-12 px-[18px]',
  ice: 'btn-tint min-h-12 px-[18px]',
  quiet: 'knob min-h-12 rounded-pill px-[18px] text-ink',
  icon: 'min-h-11 min-w-11 text-ink2 hover:text-ink',
};
const SIZE = { sm: ' text-meta !min-h-11 !px-3.5', md: ' text-button', lg: ' text-button' } as const;

export function buttonClass(variant: ButtonVariant = 'quiet', extra = '', size: 'sm' | 'md' | 'lg' = 'md', lane?: number): string {
  const laneClass = lane !== undefined && (variant === 'filled' || variant === 'ice') ? ' lane-' + lane : '';
  return BASE + ' ' + VARIANT[variant] + SIZE[size] + laneClass + (extra ? ' ' + extra : '');
}

/**
 * Buttons say what happens: "Start", "Stop", "Mark done", "Log 30 min". 48 px pills (44 px small). An icon sits next
 * to the label; only the header's knobs go without words, and carry an aria-label instead.
 */
export function Button(props: ButtonProps | LinkProps | ExternalProps) {
  const { variant = 'quiet', lane, icon, label, name, children, className = '', size = 'md' } = props;
  // An icon with no words is a 48 px knob (the header's settings, theme and close).
  const knob = !children && icon ? ' knob size-12 rounded-knob !px-0' : '';
  const classes = buttonClass(variant, className + knob, size, lane);
  const content = (
    <>
      {icon && <Icon name={icon} size={!children ? 20 : 16} />}
      {children}
    </>
  );
  const aria = { 'aria-label': children ? name : label, 'data-variant': variant };

  if ('to' in props && props.to !== undefined) {
    return (
      <Link to={props.to} className={classes} onClick={props.onClick} {...aria}>
        {content}
      </Link>
    );
  }
  if ('href' in props && props.href !== undefined) {
    return (
      <a href={props.href} target="_blank" rel="noreferrer noopener" className={classes} onClick={props.onClick} {...aria}>
        {content}
      </a>
    );
  }
  const { variant: _v, lane: _ln, icon: _i, label: _l, name: _n, children: _c, className: _cn, to: _to, href: _h, size: _s, ...rest } = props as ButtonProps;
  return (
    <button type="button" {...rest} className={classes} {...aria}>
      {content}
    </button>
  );
}
