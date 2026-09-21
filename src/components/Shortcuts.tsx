import { useEffect, useState } from 'react';
import { Icon } from './Icon.tsx';
import { Modal } from './Modal.tsx';
import { useMeta } from '../db/state.ts';
import { SHORTCUTS, SHORTCUTS_META_KEY, helpRequests, logTimeRequests, shortcutFor } from '../lib/shortcuts.ts';
import { Link, navigate, useLocation } from '../router/router.tsx';

/** Focuses this page's search box, or goes to the Library and focuses its box once it is on screen. */
function focusSearch(): void {
  const here = document.querySelector<HTMLInputElement>('[data-search-box]');
  if (here) {
    here.focus();
    here.select();
    return;
  }
  navigate('/library');
  // The Library is its own chunk, so its search box can take a moment to appear.
  const started = performance.now();
  const look = (): void => {
    const box = document.querySelector<HTMLInputElement>('[data-search-box]');
    if (box) box.focus();
    else if (performance.now() - started < 3000) requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
}

export function ShortcutList() {
  return (
    <dl className="grid grid-cols-[2.5rem_1fr] items-center gap-x-3 gap-y-2 text-sm">
      {SHORTCUTS.map((shortcut) => (
        <div key={shortcut.key} className="contents">
          <dt>
            <kbd className="kbd">{shortcut.key}</kbd>
          </dt>
          <dd className="text-ink-2">{shortcut.label}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The global key handler, and the dialog that lists the shortcuts. */
export function KeyboardShortcuts() {
  const enabled = useMeta<boolean>(SHORTCUTS_META_KEY, true);
  const { path } = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(
    () =>
      helpRequests.listen(() => {
        if (helpRequests.take()) setHelpOpen(true);
      }),
    [],
  );

  useEffect(() => {
    if (enabled === false) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (document.querySelector('dialog[open]')) return;
      const action = shortcutFor(event);
      if (!action) return;
      event.preventDefault();
      if (action === 'today') navigate('/');
      else if (action === 'roadmap') navigate('/roadmap');
      else if (action === 'search') focusSearch();
      else if (action === 'help') setHelpOpen(true);
      else {
        if (path !== '/') navigate('/');
        logTimeRequests.request();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, path]);

  return (
    <Modal open={helpOpen} title="Keyboard shortcuts" onClose={() => setHelpOpen(false)}>
      <ShortcutList />
      <p className="mt-4 text-xs text-ink-3">
        They work anywhere except while you type.{' '}
        {enabled === false ? 'They are off right now; ' : ''}
        <Link to="/settings?section=keyboard" className="text-accent-text underline underline-offset-2" onClick={() => setHelpOpen(false)}>
          {enabled === false ? 'turn them on in Settings' : 'Turn them off in Settings'}
        </Link>
        .
      </p>
    </Modal>
  );
}

/** For the sidebar: the shortcuts are no use to anyone who does not know they exist. */
export function ShortcutsButton() {
  return (
    <button type="button" className="btn btn-ghost w-full justify-start gap-3 px-3" onClick={() => helpRequests.request()}>
      <Icon name="keyboard" />
      Shortcuts
      <kbd className="kbd ml-auto" aria-hidden="true">
        ?
      </kbd>
    </button>
  );
}
