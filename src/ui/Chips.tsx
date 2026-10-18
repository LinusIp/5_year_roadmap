import { useRef } from 'react';
import { useEdgeFade } from './edgeFade.ts';
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
 * its own (it fades at an edge where more are hidden, CLAY-STYLE). A chip is a 44 px knob pill; the selected one is pressed in (a well) and turns blue-deep, so the state
 * shows by colour as well as by depth.
 */
export function Chips({ label, items }: { label: string; items: Chip[] }) {
  // The row opens with the selected chip in view, and fades at an edge where more chips are hidden.
  const row = useRef<HTMLDivElement>(null);
  useEdgeFade(row, 'current');
  return (
    <div className="fade-strip -mx-5 sm:-mx-6">
      <div ref={row} role="group" aria-label={label} className="relative flex gap-2.5 overflow-x-auto px-5 py-2 sm:px-6">
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
    </div>
  );
}
