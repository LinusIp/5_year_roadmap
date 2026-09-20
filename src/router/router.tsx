import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { buildPath, isWithin, parseLocation } from './paths.ts';
import type { RouteLocation } from './paths.ts';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function readHash(): string {
  return window.location.hash;
}

export function useLocation(): RouteLocation {
  const hash = useSyncExternalStore(subscribe, readHash);
  return useMemo(() => parseLocation(hash), [hash]);
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const target = '#' + to;
  if (window.location.hash === target) return;
  if (options.replace) {
    window.history.replaceState(null, '', target);
    // replaceState does not fire hashchange; subscribers still need to hear about it.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = to;
  }
}

/**
 * One query parameter of the current route as state. Filters live in the URL so that a view can be
 * bookmarked and the back button undoes a filter change.
 */
export function useQueryParam(key: string): [string | null, (value: string | null, options?: { replace?: boolean }) => void] {
  const { path, query } = useLocation();
  const value = query.get(key);
  const set = useCallback(
    (next: string | null, options: { replace?: boolean } = { replace: true }) => {
      const current = parseLocation(window.location.hash);
      const merged: Record<string, string> = {};
      current.query.forEach((v, k) => {
        merged[k] = v;
      });
      if (next === null || next === '') delete merged[key];
      else merged[key] = next;
      navigate(buildPath(path, merged), options);
    },
    [key, path],
  );
  return [value, set];
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  children: ReactNode;
  /** Adds aria-current="page" when the current route is `to` or beneath it. */
  nav?: boolean;
}

export function Link({ to, children, nav, ...rest }: LinkProps) {
  const { path } = useLocation();
  const target = to.split('?')[0] ?? to;
  const current = nav && isWithin(target, path);
  return (
    <a href={'#' + to} aria-current={current ? 'page' : undefined} {...rest}>
      {children}
    </a>
  );
}
