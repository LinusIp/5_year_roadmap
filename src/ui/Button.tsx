import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';
import { Link } from '../router/router.tsx';

export type ButtonVariant = 'filled' | 'ice' | 'quiet' | 'icon';

interface Common {
  /**
   * filled: the one primary action on a screen, a blue gradient pill; ice: a secondary action, an ice pill; quiet: a
   * neutral knob pill; icon: a 48 px knob with a glyph and a label (no text), or plain quiet text when given words.
   */
  variant?: ButtonVariant;
  icon?: IconName;
  /** Required for the icon variant without text. */
  label?: string;
  /** An accessible name that contains the visible words but says more ("Mark done" for "Done"). */
  name?: string;
  /** sm: a 44 px knob pill in 14 px type (Done, README skeleton); md and lg: the 48 px pill. */
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
  className?: string;
}

type ButtonProps = Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & { to?: undefined; href?: undefined };
type LinkProps = Common & { to: string; href?: undefined; onClick?: () => void };
type ExternalProps = Common & { href: string; to?: undefined; onClick?: () => void };

const BASE = 'press inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-pill font-semibold disabled:opacity-50 aria-disabled:opacity-50';
const VARIANT: Record<ButtonVariant, string> = {
  filled: 'btn-blue min-h-12 px-5',
  ice: 'btn-ice min-h-12 px-5',
  quiet: 'knob min-h-12 rounded-pill px-5 text-ink',
  icon: 'min-h-11 min-w-11 text-ink2 hover:text-ink',
};
const SIZE = { sm: ' text-meta !min-h-11 !px-4', md: ' text-button', lg: ' text-button' } as const;

export function buttonClass(variant: ButtonVariant = 'quiet', extra = '', size: 'sm' | 'md' | 'lg' = 'md'): string {
  return BASE + ' ' + VARIANT[variant] + SIZE[size] + (extra ? ' ' + extra : '');
}

/**
 * Buttons say what happens: "Start", "Stop", "Mark done", "Log 30 min". 48 px pills (44 px small). An icon sits next
 * to the label; only the header's knobs go without words, and carry an aria-label instead.
 */
export function Button(props: ButtonProps | LinkProps | ExternalProps) {
  const { variant = 'quiet', icon, label, name, children, className = '', size = 'md' } = props;
  // An icon with no words is a 48 px knob (the header's settings, theme and close).
  const knob = !children && icon ? ' knob size-12 rounded-knob !px-0' : '';
  const classes = buttonClass(variant, className + knob, size);
  const content = (
    <>
      {icon && <Icon name={icon} size={!children ? 20 : 18} />}
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
  const { variant: _v, icon: _i, label: _l, name: _n, children: _c, className: _cn, to: _to, href: _h, size: _s, ...rest } = props as ButtonProps;
  return (
    <button type="button" {...rest} className={classes} {...aria}>
      {content}
    </button>
  );
}
