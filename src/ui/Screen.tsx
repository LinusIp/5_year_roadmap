import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';
import { useSettings } from '../db/settings.ts';
import type { TabId } from '../db/types.ts';
import { Link, useLocation } from '../router/router.tsx';
import { isWithin } from '../router/paths.ts';
import { seed } from '../seed/index.ts';

/** Every tab Settings > Layout can show. The default four are the mockup's. */
export const TAB_DEFS: Record<TabId, { to: string; label: string; icon: IconName }> = {
  today: { to: '/', label: 'Today', icon: 'today' },
  plan: { to: '/plan', label: 'Plan', icon: 'plan' },
  library: { to: '/library', label: 'Library', icon: 'library' },
  activity: { to: '/activity', label: 'Activity', icon: 'activity' },
  projects: { to: '/plan?view=projects', label: 'Projects', icon: 'projects' },
  map: { to: '/plan/map', label: 'Map', icon: 'map' },
  reviews: { to: '/reviews', label: 'Reviews', icon: 'reviews' },
};
const DEFAULT_TABS: TabId[] = ['today', 'plan', 'library', 'activity'];

/**
 * A screen: one column, 20 px gutters on a phone (as in the mockup) and 24 px from a tablet up, at most 640 px
 * wide and centred, over the four tabs. Settings has no tab: it sits behind the gear in Today's header.
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
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[640px] px-5 pb-[calc(3.5rem+max(1.75rem,env(safe-area-inset-bottom)))] outline-none sm:px-6">
        {children}
      </main>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface px-2 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-2.5">
        <ul className="mx-auto grid max-w-[640px]" style={{ gridTemplateColumns: 'repeat(' + tabs.length + ', minmax(0, 1fr))' }}>
          {tabs.map((tab) => (
            <li key={tab.to}>
              <Link
                to={tab.to}
                aria-current={tab.to === active ? 'page' : undefined}
                className="flex min-h-11 flex-col items-center justify-center gap-1 text-small font-medium text-ink2 aria-[current=page]:text-accent"
              >
                <Icon name={tab.icon} />
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
