import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';
import { Link } from '../router/router.tsx';

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Today', icon: 'today' },
  { to: '/plan', label: 'Plan', icon: 'plan' },
  { to: '/library', label: 'Library', icon: 'library' },
  { to: '/activity', label: 'Activity', icon: 'activity' },
];

/**
 * A screen: one column, 16 px gutters on a phone and 24 px from a tablet up, at most 640 px wide and
 * centred, over the four tabs. Settings has no tab: it sits behind the gear in Today's header.
 */
export function Screen({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = title + ' · Atlas';
  }, [title]);

  return (
    <>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[640px] px-4 pb-24 outline-none sm:px-6">
        {children}
      </main>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-[640px] grid-cols-4">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <Link
                to={tab.to}
                nav
                className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-meta font-medium text-ink2 aria-[current=page]:text-accent"
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
