import { useEffect, useState } from 'react';
import { useMeta } from '../db/state.ts';
import { SHORTCUTS, SHORTCUTS_META_KEY, helpRequests, logTimeRequests, shortcutFor } from '../lib/shortcuts.ts';
import { navigate, useLocation } from '../router/router.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Sheet } from '../ui/Sheet.tsx';

/** Focuses this page's search field, or goes to the Library and focuses its field once it is on screen. */
function focusSearch(): void {
  const here = document.querySelector<HTMLInputElement>('[data-search-box]');
  if (here) {
    here.focus();
    here.select();
    return;
  }
  navigate('/library');
  // The Library is its own chunk, so its search field can take a moment to appear.
  const started = performance.now();
  const look = (): void => {
    const box = document.querySelector<HTMLInputElement>('[data-search-box]');
    if (box) box.focus();
    else if (performance.now() - started < 3000) requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
}

export function ShortcutRows() {
  return (
    <RowList>
      {SHORTCUTS.map((shortcut) => (
        <Row key={shortcut.key} title={shortcut.label} trailing={<kbd className="font-medium text-ink">{shortcut.key}</kbd>} />
      ))}
    </RowList>
  );
}

/** The global key handler, and the sheet that lists the shortcuts. */
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
      else if (action === 'roadmap') navigate('/plan');
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
    <Sheet open={helpOpen} title="Keyboard shortcuts" onClose={() => setHelpOpen(false)}>
      <ShortcutRows />
      <p className="mt-3 text-meta text-ink2">
        They work anywhere except while you type{enabled === false ? ', and they are off right now' : ''}. Settings turns them
        {enabled === false ? ' on' : ' off'}.
      </p>
    </Sheet>
  );
}
