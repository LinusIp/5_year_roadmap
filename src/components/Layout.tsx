import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import { NAV_ITEMS } from './nav.ts';
import { Link, useLocation } from '../router/router.tsx';
import { isWithin } from '../router/paths.ts';

const linkBase = 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
const linkIdle = 'text-ink-2 hover:bg-raised hover:text-ink';
const linkActive = 'bg-accent-wash text-accent-text';

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg px-3 py-2" aria-label="Atlas, go to Today">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="8" fill="var(--accent-fill)" />
        <path d="M16 6.5 7.5 25h3.6l1.7-4h6.4l1.7 4h3.6zM14.1 18l1.9-4.6 1.9 4.6z" fill="#fff" />
      </svg>
      <span className="text-base font-semibold tracking-tight">Atlas</span>
    </Link>
  );
}

function Sidebar({ footer }: { footer?: ReactNode }) {
  const { path } = useLocation();
  return (
    // The site's header, laid out down the side: the name, the main navigation, and app-wide controls.
    <header className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-3 py-4 lg:flex">
      <Wordmark />
      <nav aria-label="Main" className="mt-5 flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link key={item.to} to={item.to} nav className={linkBase + ' ' + (isWithin(item.to, path) ? linkActive : linkIdle)}>
            <Icon name={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>
      {footer}
    </header>
  );
}

function BottomNav() {
  const { path } = useLocation();
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const primary = NAV_ITEMS.filter((i) => i.primary);
  const rest = NAV_ITEMS.filter((i) => !i.primary);
  const restActive = rest.some((i) => isWithin(i.to, path));

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    sheetRef.current?.querySelector('a')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const tab = 'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[0.6875rem] font-medium';
  return (
    <div className="lg:hidden">
      {open && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 bg-page/70" onClick={() => setOpen(false)} />
          <div ref={sheetRef} id="more-menu" className="fixed inset-x-2 bottom-[4.25rem] z-40 rounded-xl border border-line bg-surface p-2 shadow-xl">
            <nav aria-label="More" className="grid grid-cols-2 gap-1">
              {rest.map((item) => (
                <Link key={item.to} to={item.to} nav className={linkBase + ' ' + (isWithin(item.to, path) ? linkActive : linkIdle)}>
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t border-line bg-surface px-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5">
        {primary.map((item) => (
          <Link key={item.to} to={item.to} nav className={tab + ' ' + (isWithin(item.to, path) ? 'text-accent-text' : 'text-ink-2')}>
            <Icon name={item.icon} size={20} />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        ))}
        <button type="button" className={tab + ' ' + (restActive || open ? 'text-accent-text' : 'text-ink-2')} aria-expanded={open} aria-controls="more-menu" onClick={() => setOpen((v) => !v)}>
          <Icon name="menu" size={20} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}

interface LayoutProps {
  children: ReactNode;
  sidebarFooter?: ReactNode;
  mobileActions?: ReactNode;
}

export function Layout({ children, sidebarFooter, mobileActions }: LayoutProps) {
  const { path } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // On navigation, move focus to the page so keyboard and screen-reader users land on the new content.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [path]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <button type="button" className="sr-only-focusable btn btn-primary fixed left-3 top-3 z-50" onClick={() => mainRef.current?.focus()}>
        Skip to content
      </button>
      <Sidebar footer={sidebarFooter} />
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line bg-surface px-2 py-1.5 lg:hidden">
          <Wordmark />
          <div className="flex items-center gap-1 pr-1">{mobileActions}</div>
        </header>
        <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 outline-none lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
