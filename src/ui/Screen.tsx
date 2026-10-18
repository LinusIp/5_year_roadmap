import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';
import { useSettings } from '../db/settings.ts';
import type { TabId } from '../db/types.ts';
import { Link, useLocation } from '../router/router.tsx';
import { isWithin } from '../router/paths.ts';
import { seed } from '../seed/index.ts';

/** Every tab Settings > Layout can show. The default five: Today, Plan, Calendar, Library, Activity. */
export const TAB_DEFS: Record<TabId, { to: string; label: string; icon: IconName }> = {
  today: { to: '/', label: 'Today', icon: 'today' },
  plan: { to: '/plan', label: 'Plan', icon: 'plan' },
  calendar: { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  library: { to: '/library', label: 'Library', icon: 'library' },
  activity: { to: '/activity', label: 'Activity', icon: 'activity' },
  projects: { to: '/plan?view=projects', label: 'Projects', icon: 'projects' },
  map: { to: '/plan/map', label: 'Map', icon: 'map' },
  reviews: { to: '/reviews', label: 'Reviews', icon: 'reviews' },
};
const DEFAULT_TABS: TabId[] = ['today', 'plan', 'calendar', 'library', 'activity'];

/**
 * A screen: one column of tiles 18 px apart, 20 px gutters on a phone and 24 px from a tablet up, at most 640 px
 * wide and centred, over the floating tab bar. Settings has no tab: it sits behind the gear in Today's header.
 */
export function Screen({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = title + ' · Atlas';
  }, [title]);
  const settings = useSettings(seed.settings);
  const tabs = (settings?.layout.tabs ?? DEFAULT_TABS).map((id) => TAB_DEFS[id]);
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
      {/* Room under the last card for the tab bar: its 68 px, the 24 px it floats above the edge, and 24 px of air, plus
          the phone's safe area. The layout test checks it at 360, 390 and 412 px. */}
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[640px] px-5 pb-[calc(68px+24px+24px+env(safe-area-inset-bottom))] outline-none sm:px-6">
        {children}
      </main>
      {/* The tab bar: a raised pill floating 24 px above the bottom; the active tab is pressed in, in blue-deep. */}
      <nav aria-label="Main" className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-10 px-5 sm:px-6">
        <ul className="tile pointer-events-auto mx-auto flex max-w-[600px] items-center justify-around rounded-pill p-2">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <Link
                to={tab.to}
                aria-current={tab.to === active ? 'page' : undefined}
                className="press flex h-12 w-[60px] items-center justify-center rounded-[18px] text-ink2 aria-[current=page]:text-blue-deep aria-[current=page]:[box-shadow:inset_3px_3px_7px_var(--lo),inset_-3px_-3px_7px_var(--hi)]"
              >
                <Icon name={tab.icon} size={22} />
                <span className="sr-only">{tab.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
