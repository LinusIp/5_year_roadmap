import { useEffect, useState } from 'react';
import { undoPlanEdit } from '../../db/edits.ts';
import { onEdit } from '../../lib/edit-events.ts';
import type { EditEvent } from '../../lib/edit-events.ts';

/**
 * After a plan edit: "Moved CS231n to Year 2 · Undo", for eight seconds above the tab bar. Undo takes the whole
 * edit back (a re-plan is one edit). Older edits are undone from Plan > Undo, up to the last 50.
 */
export function UndoToast() {
  const [edit, setEdit] = useState<EditEvent | null>(null);
  const [undone, setUndone] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = onEdit((next) => {
      setEdit(next);
      setUndone(null);
      clearTimeout(timer);
      timer = setTimeout(() => setEdit(null), 8_000);
    });
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, []);

  const undo = async (): Promise<void> => {
    if (!edit) return;
    const ok = await undoPlanEdit(edit.group);
    setEdit(null);
    setUndone(ok ? 'Undone: ' + edit.label : null);
    if (ok) setTimeout(() => setUndone(null), 4_000);
  };

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-[640px] px-5">
      {edit && (
        <p className="pointer-events-auto flex min-h-11 items-center gap-3 rounded-card bg-ink py-1 pl-4 pr-1 text-meta text-canvas">
          <span className="min-w-0 flex-1">{edit.label}</span>
          <button type="button" onClick={() => void undo()} className="min-h-11 shrink-0 rounded-button px-3 font-medium text-canvas underline underline-offset-2">
            Undo
          </button>
        </p>
      )}
      {!edit && undone && <p className="rounded-card bg-ink px-4 py-3 text-meta text-canvas">{undone}</p>}
    </div>
  );
}
