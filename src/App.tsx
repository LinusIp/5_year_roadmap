import { Suspense, lazy, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Layout } from './components/Layout.tsx';
import { ThemeToggle } from './components/ThemeToggle.tsx';
import { useSettings } from './db/settings.ts';
import { applyTheme, watchSystemTheme } from './lib/theme.ts';
import { ComingSoon } from './pages/ComingSoon.tsx';
import { NotFound } from './pages/NotFound.tsx';
import { Today } from './pages/Today.tsx';
import { matchPath } from './router/paths.ts';
import { useLocation } from './router/router.tsx';
import { seed } from './seed/index.ts';

/*
 * Today is what the app opens on, so it ships in the main chunk. Every other page is its own chunk, fetched
 * the first time it is visited. The service worker precaches all of them, so this changes how much has to be
 * parsed before the first screen, not whether the app works offline.
 */
const Activity = lazy(() => import('./pages/Activity.tsx').then((m) => ({ default: m.Activity })));
const Roadmap = lazy(() => import('./pages/Roadmap.tsx').then((m) => ({ default: m.Roadmap })));
const Library = lazy(() => import('./pages/Library.tsx').then((m) => ({ default: m.Library })));
const ItemDetail = lazy(() => import('./pages/ItemDetail.tsx').then((m) => ({ default: m.ItemDetail })));
const Papers = lazy(() => import('./pages/Papers.tsx').then((m) => ({ default: m.Papers })));
const Certifications = lazy(() => import('./pages/Certifications.tsx').then((m) => ({ default: m.Certifications })));

interface RouteDef {
  pattern: string;
  render: (params: Record<string, string>) => ReactNode;
}

const ROUTES: RouteDef[] = [
  { pattern: '/', render: () => <Today /> },
  { pattern: '/activity', render: () => <Activity /> },
  { pattern: '/roadmap', render: () => <Roadmap /> },
  { pattern: '/library', render: () => <Library /> },
  { pattern: '/library/:id', render: (p) => <ItemDetail id={p.id!} /> },
  { pattern: '/projects/:id', render: (p) => <ItemDetail id={p.id!} /> },
  { pattern: '/papers', render: () => <Papers /> },
  { pattern: '/certs', render: () => <Certifications /> },
  { pattern: '/projects', render: () => <ComingSoon title="Projects" lead="Weekly mini-builds, monthly projects, yearly capstones." icon="projects" milestone={7} /> },
  { pattern: '/reviews', render: () => <ComingSoon title="Reviews" lead="Weekly and monthly reviews." icon="reviews" milestone={8} /> },
  { pattern: '/stats', render: () => <ComingSoon title="Stats" lead="Hours, completion and cadence over time." icon="stats" milestone={8} /> },
  { pattern: '/settings', render: () => <ComingSoon title="Settings" lead="Blocks, thresholds, streak rules, theme, backup." icon="settings" milestone={8} /> },
];

function PageLoading() {
  return (
    <p className="text-sm text-ink-3" role="status">
      Loading…
    </p>
  );
}

export function App() {
  const { path } = useLocation();
  const settings = useSettings(seed.settings);
  const theme = settings?.theme;

  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);
  useEffect(() => watchSystemTheme(() => theme ?? 'dark'), [theme]);

  let page: ReactNode = <NotFound path={path} />;
  for (const route of ROUTES) {
    const params = matchPath(route.pattern, path);
    if (params) {
      page = route.render(params);
      break;
    }
  }

  const themeToggle = settings ? <ThemeToggle settings={settings} core={seed.settings} /> : null;
  const themeToggleCompact = settings ? <ThemeToggle settings={settings} core={seed.settings} compact /> : null;

  return (
    <Layout sidebarFooter={themeToggle} mobileActions={themeToggleCompact}>
      <Suspense fallback={<PageLoading />}>{page}</Suspense>
    </Layout>
  );
}
