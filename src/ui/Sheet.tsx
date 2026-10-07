import { createContext, useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button.tsx';

/** Lists inside a sheet sit flat on it: a card on a card of the same colour would only add an inset. */
export const InSheet = createContext(false);

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Actions pinned under the content. */
  footer?: ReactNode;
}

/**
 * A bottom sheet for details and forms, on the native <dialog>: it traps focus, closes on Escape or a tap
 * outside, and gives focus back to whatever opened it. Sheets can open other sheets (a picker over a form).
 */
export function Sheet({ open, title, onClose, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // A sheet opened from inside this one (a status list) closes on its own: React hands its close and
      // cancel events up the component tree, so only this dialog's own events count.
      onClose={(e) => {
        if (e.target === e.currentTarget && open) onClose();
      }}
      onCancel={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A tap on the backdrop lands on the dialog element itself.
        if (e.target === ref.current) onClose();
      }}
      className="mx-auto mb-0 mt-auto max-h-[88dvh] w-full max-w-[640px] rounded-t-card bg-surface p-0 text-ink sm:mb-6 sm:rounded-card"
    >
      {open && (
        <div className="flex max-h-[88dvh] flex-col">
          <header className="flex items-center justify-between gap-3 py-1 pl-4 pr-1.5">
            <h2 id={titleId} className="min-w-0 text-body font-medium">
              {title}
            </h2>
            <Button variant="icon" icon="x" label="Close" onClick={onClose} />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            <InSheet.Provider value={true}>{children}</InSheet.Provider>
          </div>
          {footer && <footer className="flex flex-wrap gap-2 px-4 pb-4 pt-2">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
