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
 * A screen: one column, 20 px gutters on a phone (as in the mockup) and 24 px from a tablet up, at most 640 px
 * wide and centred, over the four tabs. Settings has no tab: it sits behind the gear in Today's header.
 */
export function Screen({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = title + ' · Atlas';
  }, [title]);

  return (
    <>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[640px] px-5 pb-[calc(3.5rem+max(1.75rem,env(safe-area-inset-bottom)))] outline-none sm:px-6">
        {children}
      </main>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface px-2 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-2.5">
        <ul className="mx-auto grid max-w-[640px] grid-cols-4">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <Link
                to={tab.to}
                nav
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
