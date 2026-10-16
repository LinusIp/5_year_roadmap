import { useEffect, useRef, useState } from 'react';
import { undoPlanEdit } from '../db/edits.ts';
import { onEdit } from '../lib/edit-events.ts';
import type { EditEvent } from '../lib/edit-events.ts';

/** The topmost open modal sheet, if any: content outside it is inert while it is open. */
function topDialog(): HTMLDialogElement | null {
  const open = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')];
  return open.at(-1) ?? null;
}

/**
 * After a plan edit: "Moved CS231n to Year 2 · Undo", for eight seconds above the tab bar. Undo takes the whole
 * edit back (a re-plan is one edit). Older edits are undone from Plan > Edit plan, up to the last 50.
 *
 * A modal sheet makes the rest of the page inert, so every sheet carries a copy (`inSheet`) and only the one in the
 * topmost open sheet, or the page's when no sheet is open, shows.
 */
export function UndoToast({ inSheet = false }: { inSheet?: boolean }) {
  const [edit, setEdit] = useState<EditEvent | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [mine, setMine] = useState(!inSheet);
  const [undone, setUndone] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let decide: ReturnType<typeof setTimeout> | undefined;
    const claim = (): void => {
      const top = topDialog();
      const here = ref.current?.closest('dialog') ?? null;
      setMine(inSheet ? top !== null && here === top : top === null);
    };
    const stop = onEdit((next) => {
      // The sheet that made the edit often closes right after it: decide where the toast shows once it has.
      claim();
      clearTimeout(decide);
      decide = setTimeout(claim, 150);
      setEdit(next);
      setUndone(null);
      clearTimeout(timer);
      timer = setTimeout(() => setEdit(null), 8_000);
    });
    return () => {
      stop();
      clearTimeout(timer);
      clearTimeout(decide);
    };
  }, [inSheet]);

  const undo = async (): Promise<void> => {
    if (!edit) return;
    const ok = await undoPlanEdit(edit.group);
    setEdit(null);
    setUndone(ok ? 'Undone: ' + edit.label : null);
    if (ok) setTimeout(() => setUndone(null), 4_000);
  };

  return (
    <div ref={ref} role="status" aria-live="polite" className={'pointer-events-none z-20 mx-auto max-w-[640px] px-5 ' + (inSheet ? 'sticky bottom-2 mt-3 px-0' : 'fixed inset-x-0 bottom-[calc(7rem+env(safe-area-inset-bottom))]')}>
      {edit && mine && (
        <p className="pointer-events-auto flex min-h-11 items-center gap-3 knob rounded-pill py-1 pl-5 pr-1.5 text-meta text-ink">
          <span className="min-w-0 flex-1">{edit.label}</span>
          <button type="button" onClick={() => void undo()} className="min-h-11 shrink-0 rounded-pill px-4 font-semibold text-blue-deep">
            Undo
          </button>
        </p>
      )}
      {!edit && mine && undone && <p className="knob rounded-pill px-5 py-3 text-meta text-ink">{undone}</p>}
    </div>
  );
}
