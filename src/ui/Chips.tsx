import { Icon } from './Icon.tsx';

export interface Chip {
  key: string;
  label: string;
  /** Shown inside the chip, quieter than the label: "Queued 42". */
  count?: number;
  pressed: boolean;
  onClick: () => void;
  /** A chip that opens a sheet (Track) shows a chevron. */
  chevron?: boolean;
  /** Pushes the chip to the far end of the row ("By track"). */
  end?: boolean;
}

/**
 * Filters as pills in one row, scrolling sideways on a phone. "Any" is the absence of a selection, never a
 * chip of its own. A pill is 36 px tall, as in the mockup, inside a 44 px tap target that reaches 4 px above
 * and below it, so two rows 8 px apart still never overlap their targets.
 */
export function Chips({ label, items }: { label: string; items: Chip[] }) {
  return (
    <div role="group" aria-label={label} className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
      {items.map((chip) => (
        <button
          key={chip.key}
          type="button"
          aria-pressed={chip.pressed}
          onClick={chip.onClick}
          className={'-my-1 flex min-h-11 shrink-0 items-center' + (chip.end ? ' ml-auto' : '')}
        >
          <span
            className={
              'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-pill border px-3.5 text-meta font-medium ' +
              (chip.pressed ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink')
            }
          >
            {chip.label}
            {chip.count !== undefined && <span className={chip.pressed ? 'text-[color:var(--ramp-3)]' : 'text-ink2'}>{chip.count}</span>}
            {chip.chevron && <Icon name="chevronDown" size={14} />}
          </span>
        </button>
      ))}
    </div>
  );
}
