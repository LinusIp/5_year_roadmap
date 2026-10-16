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
 * Filters as pills in one row, scrolling sideways on a phone. "Any" is the absence of a selection, never a chip of
 * its own. A chip is a 44 px knob pill; the selected one is pressed in (a well) and turns blue-deep, so the state
 * shows by colour as well as by depth.
 */
export function Chips({ label, items }: { label: string; items: Chip[] }) {
  return (
    <div role="group" aria-label={label} className="-mx-5 flex gap-2.5 overflow-x-auto px-5 py-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
      {items.map((chip) => (
        <button
          key={chip.key}
          type="button"
          aria-pressed={chip.pressed}
          onClick={chip.onClick}
          className={
            'press inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-4 text-chip font-medium ' +
            (chip.pressed ? 'well text-blue-deep' : 'knob text-ink2') +
            (chip.end ? ' ml-auto' : '')
          }
        >
          {chip.label}
          {chip.count !== undefined && <span className={chip.pressed ? 'text-blue-deep' : 'text-ink2'}>{chip.count}</span>}
          {chip.chevron && <Icon name="chevronDown" size={16} />}
        </button>
      ))}
    </div>
  );
}
