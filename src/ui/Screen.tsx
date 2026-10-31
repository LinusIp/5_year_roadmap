import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';
import { useSettings } from '../db/settings.ts';
import type { TabId } from '../db/types.ts';
import { Link, useLocation } from '../router/router.tsx';
import { isWithin } from '../router/paths.ts';
import { seed } from '../seed/index.ts';
import { useFocusPlayer } from '../lib/focus-player.ts';
import { readCachedTabs, writeCachedTabs } from '../lib/tabs-cache.ts';

/** Every tab Settings > Layout can show. The default six: Today, Plan, Calendar, Library, Stats, Focus (the redesign mockup). */
export const TAB_DEFS: Record<TabId, { to: string; label: string; icon: IconName }> = {
  today: { to: '/', label: 'Today', icon: 'today' },
  plan: { to: '/plan', label: 'Plan', icon: 'plan' },
  calendar: { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  library: { to: '/library', label: 'Library', icon: 'library' },
  activity: { to: '/activity', label: 'Stats', icon: 'stats' },
  focus: { to: '/focus', label: 'Focus', icon: 'headphones' },
  projects: { to: '/plan?view=projects', label: 'Projects', icon: 'projects' },
  map: { to: '/plan/map', label: 'Map', icon: 'map' },
  reviews: { to: '/reviews', label: 'Reviews', icon: 'reviews' },
};
const DEFAULT_TABS: TabId[] = ['today', 'plan', 'calendar', 'library', 'activity', 'focus'];

/** The tab bar's height (6 px padding, 52 px tabs, the 2 px rim) and how far it floats above the bottom. */
export const TAB_BAR = { height: 68, bottom: 16 } as const;

/**
 * A screen, as the redesign mockup draws it: one column of tiles 16 to 18 px apart, 20 px gutters, 44 px of air at
 * the top, at most 640 px wide and centred, over the floating tab bar. `dark` is the Focus screen's ground: the
 * scene's dark set takes over every token while it is open (index.css [data-dark-screen]).
 */
export function Screen({ title, children, dark = false }: { title: string; children: ReactNode; dark?: boolean }) {
  useEffect(() => {
    document.title = title + ' · Atlas';
  }, [title]);
  useEffect(() => {
    if (!dark) return undefined;
    document.documentElement.dataset.darkScreen = 'true';
    return () => {
      delete document.documentElement.dataset.darkScreen;
    };
  }, [dark]);
  const settings = useSettings(seed.settings);
  // Until IndexedDB answers, the tabs the user last saw (mirrored to localStorage), so the bar never flashes the defaults.
  const tabIds = settings?.layout.tabs ?? readCachedTabs() ?? DEFAULT_TABS;
  useEffect(() => {
    if (settings) writeCachedTabs(settings.layout.tabs);
  }, [settings]);
  const tabs = tabIds.map((id) => TAB_DEFS[id]);
  // The docked Focus player (ATLAS-FOCUS-MUSIC) takes 232 px above the tab bar: the page keeps that room under its
  // last card, so nothing sits under the player.
  const player = useFocusPlayer();
  const dockedPlayer = player.session !== null && player.docked;
  const location = useLocation();
  // The tab that matches the address most closely: Projects (/plan?view=projects) and Map (/plan/map) beat Plan.
  const score = (to: string): number => {
    const [path, query] = to.split('?') as [string, string | undefined];
    if (!isWithin(path, location.path)) return -1;
    if (query && [...new URLSearchParams(query)].some(([k, v]) => location.query.get(k) !== v)) return -1;
    return path.length + (query ? 1 : 0);
  };
  const active = tabs.reduce<{ to: string; score: number } | null>((best, t) => {
    const s = score(t.to);
    return s >= 0 && (!best || s > best.score) ? { to: t.to, score: s } : best;
  }, null)?.to;

  return (
    <>
      {/* Room under the last card for the tab bar: its 68 px, the 16 px it floats above the edge, and 24 px of air, plus
          the phone's safe area. The layout test checks it at 360, 390 and 412 px on every screen with the bar. */}
      <main id="main" tabIndex={-1} className={'mx-auto w-full max-w-[640px] px-5 outline-none ' + (dockedPlayer ? 'pb-[calc(68px+16px+24px+232px+env(safe-area-inset-bottom))]' : 'pb-[calc(68px+16px+24px+env(safe-area-inset-bottom))]')}>
        {children}
      </main>
      {/* A short fade to the ground behind the bar (ATLAS-UI-POLISH): content passing under it does not clash with it. */}
      <div aria-hidden="true" className="tab-bar-fade pointer-events-none fixed inset-x-0 bottom-0 z-[9] h-[calc(68px+16px+16px+env(safe-area-inset-bottom))]" />
      {/* The tab bar (the mockup's .tabs): a raised pill 12 px from the sides, 16 px above the bottom, each tab its icon
          over its name; the active tab sits on the first lane's tint in its text colour. */}
      <nav aria-label="Main" className="pointer-events-none fixed inset-x-3 bottom-[calc(16px+env(safe-area-inset-bottom))] z-10">
        <ul className="tile pointer-events-auto mx-auto flex max-w-[600px] items-center justify-between rounded-[28px] p-1.5">
          {tabs.map((tab) => (
            <li key={tab.to} className="min-w-0 flex-1">
              <Link
                to={tab.to}
                aria-current={tab.to === active ? 'page' : undefined}
                className="flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 rounded-[20px] text-ink2 aria-[current=page]:bg-[var(--tab-on-bg)] aria-[current=page]:text-[var(--tab-on-text)]"
              >
                <Icon name={tab.icon} size={22} />
                <span className="text-[11px] font-semibold leading-none">{tab.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
