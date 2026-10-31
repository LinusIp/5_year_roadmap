import { useRef } from 'react';
import { useEdgeFade } from './edgeFade.ts';
import { Icon } from './Icon.tsx';

export interface Chip {
  key: string;
  label: string;
  /** Shown inside the chip, quieter than the label: "Agents & MCP 1,023". */
  count?: number | string;
  pressed: boolean;
  onClick: () => void;
  /** A chip that opens a sheet (Track) shows a chevron. */
  chevron?: boolean;
  /** Pushes the chip to the far end of the row ("By track"). */
  end?: boolean;
  /** The lane whose tint the chip takes (the Library's quick filters cycle through the five); 0 by default. */
  lane?: number;
}

/**
 * Filters as pills in one row, scrolling sideways on a phone (the mockup's .chip strip). "Any" is the absence of a
 * selection, never a chip of its own (it fades at an edge where more are hidden, CLAY-STYLE). A chip is a 44 px pill
 * in a lane's tint with its text; the pressed one is the lane's fill with white text, so the state shows by colour
 * as well as by depth.
 */
export function Chips({ label, items }: { label: string; items: Chip[] }) {
  // The row opens with the selected chip in view, and fades at an edge where more chips are hidden.
  const row = useRef<HTMLDivElement>(null);
  useEdgeFade(row, 'current');
  return (
    <div className="fade-strip -mx-5 sm:-mx-6">
      <div ref={row} role="group" aria-label={label} className="relative flex gap-2.5 overflow-x-auto px-5 py-1 sm:px-6">
        {items.map((chip) => (
          <button
            key={chip.key}
            type="button"
            aria-pressed={chip.pressed}
            onClick={chip.onClick}
            className={
              'press inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-3.5 text-meta font-medium lane-' +
              (chip.lane ?? 0) +
              (chip.pressed ? ' lane-fill text-[var(--on-lane)]' : ' lane-tile') +
              (chip.end ? ' ml-auto' : '')
            }
          >
            {chip.label}
            {chip.count !== undefined && <span className="font-black opacity-70">{chip.count}</span>}
            {chip.chevron && <Icon name="chevronDown" size={16} />}
          </button>
        ))}
      </div>
    </div>
  );
}
