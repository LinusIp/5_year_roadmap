import { useRef, useState } from 'react';
import { Row, RowList } from '../../ui/Row.tsx';
import { Sheet } from '../../ui/Sheet.tsx';

export interface StatusOption<T extends string> {
  value: T;
  label: string;
}

/**
 * A status as a pill: a tap moves it to the next status, a long press (or right click, or Shift+Enter)
 * opens the full list. A status that is not allowed yet (a project without a repository cannot be done) is
 * skipped by the tap and explained in the list.
 */
export function StatusPill<T extends string>({
  label,
  value,
  options,
  onChange,
  blocked,
  done = 'done' as T,
}: {
  /** What the pill is the status of, for its accessible name. */
  label: string;
  value: T;
  options: StatusOption<T>[];
  onChange: (value: T) => void;
  blocked?: (value: T) => string | null;
  /** The status shown in the accent colour. */
  done?: T;
}) {
  const [listOpen, setListOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const current = options.find((o) => o.value === value) ?? options[0]!;

  const cycle = (): void => {
    const start = options.findIndex((o) => o.value === value);
    for (let step = 1; step <= options.length; step++) {
      const next = options[(start + step) % options.length]!;
      if (!blocked?.(next.value)) {
        onChange(next.value);
        return;
      }
    }
  };
  const openList = (): void => {
    setMessage(null);
    setListOpen(true);
  };

  return (
    <>
      <button
        type="button"
        aria-label={label + ': ' + current.label + '. Tap for the next status; hold for all of them.'}
        aria-haspopup="dialog"
        onPointerDown={() => {
          longPressed.current = false;
          timer.current = window.setTimeout(() => {
            longPressed.current = true;
            openList();
          }, 500);
        }}
        onPointerUp={() => timer.current !== null && window.clearTimeout(timer.current)}
        onPointerLeave={() => timer.current !== null && window.clearTimeout(timer.current)}
        onContextMenu={(e) => {
          e.preventDefault();
          openList();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            openList();
          }
        }}
        onClick={() => {
          if (longPressed.current) return;
          cycle();
        }}
        className={
          'inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-pill px-3 text-meta ' +
          (value === done ? 'bg-accent-soft font-medium text-accent' : 'border border-line text-ink')
        }
      >
        {current.label}
      </button>
      <Sheet open={listOpen} title={label} onClose={() => setListOpen(false)}>
        <RowList>
          {options.map((option) => {
            const reason = blocked?.(option.value) ?? null;
            return (
              <Row
                key={option.value}
                title={option.label}
                meta={reason ?? undefined}
                selected={option.value === value}
                onClick={() => {
                  if (reason) {
                    setMessage(reason);
                    return;
                  }
                  onChange(option.value);
                  setListOpen(false);
                }}
              />
            );
          })}
        </RowList>
        {message && (
          <p role="alert" className="mt-3 text-meta font-medium text-ink">
            {message}
          </p>
        )}
      </Sheet>
    </>
  );
}
