import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Layout } from './components/Layout.tsx';
import { ThemeToggle } from './components/ThemeToggle.tsx';
import { useSettings } from './db/settings.ts';
import { applyTheme, watchSystemTheme } from './lib/theme.ts';
import { ComingSoon } from './pages/ComingSoon.tsx';
import { Today } from './pages/Today.tsx';
import { NotFound } from './pages/NotFound.tsx';
import { matchPath } from './router/paths.ts';
import { useLocation } from './router/router.tsx';
import { seed } from './seed/index.ts';

interface RouteDef {
  pattern: string;
  render: (params: Record<string, string>) => ReactNode;
}

const ROUTES: RouteDef[] = [
  { pattern: '/', render: () => <Today /> },
  { pattern: '/activity', render: () => <ComingSoon title="Activity" lead="Every day of the five years, at a glance." icon="activity" milestone={4} /> },
  { pattern: '/roadmap', render: () => <ComingSoon title="Roadmap" lead="Five years, six phases, five lanes." icon="roadmap" milestone={5} /> },
  { pattern: '/library', render: () => <ComingSoon title="Library" lead="Every course, book, tutorial and repo in the plan." icon="library" milestone={6} /> },
  { pattern: '/papers', render: () => <ComingSoon title="Papers" lead="The reading queue." icon="papers" milestone={6} /> },
  { pattern: '/certs', render: () => <ComingSoon title="Certifications" lead="Certificates and portfolio milestones for every subject." icon="certs" milestone={6} /> },
  { pattern: '/projects', render: () => <ComingSoon title="Projects" lead="Weekly mini-builds, monthly projects, yearly capstones." icon="projects" milestone={7} /> },
  { pattern: '/reviews', render: () => <ComingSoon title="Reviews" lead="Weekly and monthly reviews." icon="reviews" milestone={8} /> },
  { pattern: '/stats', render: () => <ComingSoon title="Stats" lead="Hours, completion and cadence over time." icon="stats" milestone={8} /> },
  { pattern: '/settings', render: () => <ComingSoon title="Settings" lead="Blocks, thresholds, streak rules, theme, backup." icon="settings" milestone={8} /> },
];

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
      {page}
    </Layout>
  );
}
