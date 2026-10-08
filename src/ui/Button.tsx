import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';
import { Link } from '../router/router.tsx';

export type ButtonVariant = 'filled' | 'quiet' | 'icon';

interface Common {
  /** filled: the one primary action on a screen; quiet: every other action; icon: a glyph with a label. */
  variant?: ButtonVariant;
  icon?: IconName;
  /** Required for the icon variant, which shows no text. */
  label?: string;
  /** lg: the deck's 48 px buttons; sm: a small quiet button in 14 px type (Re-plan). */
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
  className?: string;
}

type ButtonProps = Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & { to?: undefined; href?: undefined };
type LinkProps = Common & { to: string; href?: undefined; onClick?: () => void };
type ExternalProps = Common & { href: string; to?: undefined; onClick?: () => void };

const BASE = 'inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-button font-medium disabled:opacity-50 aria-disabled:opacity-50';
const VARIANT: Record<ButtonVariant, string> = {
  filled: 'bg-accent px-5 text-on-accent hover:opacity-90',
  quiet: 'border border-line px-4 text-ink hover:bg-accent-soft',
  icon: 'min-w-11 text-ink2 hover:text-ink',
};
const SIZE = { sm: ' text-meta px-3.5', md: ' text-button', lg: ' text-button min-h-12' } as const;

/** Glyph sizes inside buttons, as in the mockup: play and pause 14, shuffle and links 16, ticks 18. */
const GLYPH: Partial<Record<IconName, number>> = { play: 14, pause: 14, shuffle: 16, external: 16, refresh: 16, search: 18, check: 18, plus: 18 };

export function buttonClass(variant: ButtonVariant = 'quiet', extra = '', size: 'sm' | 'md' | 'lg' = 'md'): string {
  const padding = size === 'lg' && variant === 'filled' ? ' px-[22px]' : '';
  return BASE + ' ' + VARIANT[variant] + SIZE[size] + padding + (extra ? ' ' + extra : '');
}

/**
 * Buttons say what happens: "Start", "Stop", "Mark done", "Log 30 min". At least 44 px tall. A quiet button
 * with only an icon is square; the icon variant has no border, for headers.
 */
export function Button(props: ButtonProps | LinkProps | ExternalProps) {
  const { variant = 'quiet', icon, label, children, className = '', size = 'md' } = props;
  const square = !children && icon && variant === 'quiet' ? ' w-11 px-0' : '';
  const classes = buttonClass(variant, className + square, size);
  const content = (
    <>
      {icon && <Icon name={icon} size={variant === 'icon' && !children ? 20 : (GLYPH[icon] ?? 16)} />}
      {children}
    </>
  );
  const aria = { 'aria-label': children ? undefined : label, 'data-variant': variant };

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
  const { variant: _v, icon: _i, label: _l, children: _c, className: _cn, to: _to, href: _h, size: _s, ...rest } = props as ButtonProps;
  return (
    <button type="button" {...rest} className={classes} {...aria}>
      {content}
    </button>
  );
}
