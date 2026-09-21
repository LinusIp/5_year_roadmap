import { Suspense, lazy, useEffect } from 'react';
import type { ReactNode } from 'react';
import { BackupReminder, UpdateBanner } from './components/Banners.tsx';
import { Layout } from './components/Layout.tsx';
import { KeyboardShortcuts, ShortcutsButton } from './components/Shortcuts.tsx';
import { ThemeToggle } from './components/ThemeToggle.tsx';
import { useSettings } from './db/settings.ts';
import { applyTheme, watchSystemTheme } from './lib/theme.ts';
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
const Projects = lazy(() => import('./pages/Projects.tsx').then((m) => ({ default: m.Projects })));
const Reviews = lazy(() => import('./pages/Reviews.tsx').then((m) => ({ default: m.Reviews })));
const Stats = lazy(() => import('./pages/Stats.tsx').then((m) => ({ default: m.Stats })));
const Settings = lazy(() => import('./pages/Settings.tsx').then((m) => ({ default: m.Settings })));
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
  { pattern: '/projects', render: () => <Projects /> },
  { pattern: '/reviews', render: () => <Reviews /> },
  { pattern: '/stats', render: () => <Stats /> },
  { pattern: '/settings', render: () => <Settings /> },
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

  const themeToggle = settings ? (
    <div className="space-y-0.5">
      <ShortcutsButton />
      <ThemeToggle settings={settings} core={seed.settings} />
    </div>
  ) : null;
  const themeToggleCompact = settings ? <ThemeToggle settings={settings} core={seed.settings} compact /> : null;

  return (
    <Layout sidebarFooter={themeToggle} mobileActions={themeToggleCompact}>
      <UpdateBanner />
      <BackupReminder />
      <Suspense fallback={<PageLoading />}>{page}</Suspense>
      <KeyboardShortcuts />
    </Layout>
  );
}
