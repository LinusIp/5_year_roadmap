export interface Chip {
  key: string;
  label: string;
  /** Shown inside the chip in ink2: "Queued 42". */
  count?: number;
  pressed: boolean;
  onClick: () => void;
}

/**
 * Filters as pills in one row, scrolling sideways on a phone. "Any" is the absence of a selection, never a
 * chip of its own. A chip whose options do not fit in a row opens a sheet from its onClick.
 */
export function Chips({ label, items }: { label: string; items: Chip[] }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
      {items.map((chip) => (
        <button
          key={chip.key}
          type="button"
          aria-pressed={chip.pressed}
          onClick={chip.onClick}
          className={
            'inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-4 text-meta ' +
            (chip.pressed ? 'bg-accent-soft font-medium text-accent' : 'border border-line text-ink')
          }
        >
          {chip.label}
          {chip.count !== undefined && <span className="font-normal text-ink2">{chip.count}</span>}
        </button>
      ))}
    </div>
  );
}
