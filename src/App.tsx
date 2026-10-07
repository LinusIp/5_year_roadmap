import { Suspense, lazy, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useSettings } from './db/settings.ts';
import { applyTheme, watchSystemTheme } from './lib/theme.ts';
import { matchPath } from './router/paths.ts';
import { navigate, useLocation } from './router/router.tsx';
import { KeyboardShortcuts } from './screens/Shortcuts.tsx';
import { Today } from './screens/Today.tsx';
import { seed } from './seed/index.ts';

/*
 * Today is what the app opens on, so it ships in the main chunk. Every other screen is its own chunk, fetched
 * the first time it is visited; the service worker precaches all of them, so this changes how much is parsed
 * before the first screen, not whether the app works offline.
 */
const Activity = lazy(() => import('./screens/Activity.tsx').then((m) => ({ default: m.Activity })));
const Plan = lazy(() => import('./screens/Plan.tsx').then((m) => ({ default: m.Plan })));
const Library = lazy(() => import('./screens/Library.tsx').then((m) => ({ default: m.Library })));
const Reviews = lazy(() => import('./screens/Reviews.tsx').then((m) => ({ default: m.Reviews })));
const Stats = lazy(() => import('./screens/Stats.tsx').then((m) => ({ default: m.Stats })));
const Settings = lazy(() => import('./screens/Settings.tsx').then((m) => ({ default: m.Settings })));
const NotFound = lazy(() => import('./screens/NotFound.tsx').then((m) => ({ default: m.NotFound })));
const PickProject = lazy(() => import('./screens/PickProject.tsx').then((m) => ({ default: m.PickProject })));
const DevComponents = lazy(() => import('./screens/DevComponents.tsx').then((m) => ({ default: m.DevComponents })));

interface RouteDef {
  pattern: string;
  render: (params: Record<string, string>) => ReactNode;
}

const ROUTES: RouteDef[] = [
  { pattern: '/', render: () => <Today /> },
  { pattern: '/activity', render: () => <Activity /> },
  { pattern: '/plan', render: () => <Plan /> },
  { pattern: '/plan/pick', render: () => <PickProject /> },
  { pattern: '/library', render: () => <Library /> },
  { pattern: '/library/:id', render: (p) => <Library openId={p.id!} /> },
  { pattern: '/reviews', render: () => <Reviews /> },
  { pattern: '/stats', render: () => <Stats /> },
  { pattern: '/settings', render: () => <Settings /> },
  { pattern: '/dev/components', render: () => <DevComponents /> },
];

/** Addresses from before the redesign, kept working: Roadmap, Projects, Papers and Certifications live in Plan. */
const MOVED: Record<string, string> = {
  '/roadmap': '/plan',
  '/projects': '/plan?view=projects',
  '/papers': '/plan?view=papers',
  '/certs': '/plan?view=credentials',
};

function Loading() {
  return (
    <p className="mx-auto max-w-[640px] px-4 pt-6 text-meta text-ink2" role="status">
      Loading…
    </p>
  );
}

export function App() {
  const { path, query } = useLocation();
  const settings = useSettings(seed.settings);
  const theme = settings?.theme;
  const firstRender = useRef(true);

  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);
  useEffect(() => watchSystemTheme(() => theme ?? 'light'), [theme]);

  // On navigation, move focus to the new screen so keyboard and screen-reader users land on it. An item's
  // sheet over the Library (/library/:id) is the same screen, so opening it keeps the list where it was.
  const screen = path.startsWith('/library/') ? '/library' : path;
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [screen]);

  const moved = MOVED[path] ?? (matchPath('/projects/:id', path) ? '/plan?view=projects&item=' + encodeURIComponent(path.split('/')[2]!) : null);
  useEffect(() => {
    if (moved) {
      const extra = query.toString();
      navigate(moved + (extra ? (moved.includes('?') ? '&' : '?') + extra : ''), { replace: true });
    }
  }, [moved, query]);

  let page: ReactNode = moved ? null : <NotFound path={path} />;
  for (const route of ROUTES) {
    const params = matchPath(route.pattern, path);
    if (params) {
      page = route.render(params);
      break;
    }
  }

  return (
    <>
      <Suspense fallback={<Loading />}>{page}</Suspense>
      <KeyboardShortcuts />
    </>
  );
}
