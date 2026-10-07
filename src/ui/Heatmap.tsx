import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { addDays, today } from '../lib/dates.ts';
import type { GridSlot, MonthLabel } from '../lib/heatmap.ts';
import type { HeatLevel } from '../lib/streaks.ts';

export interface HeatmapCell extends GridSlot {
  level: HeatLevel;
  frozen?: boolean;
}

interface HeatmapProps<C extends HeatmapCell> {
  cells: C[];
  columns: number;
  months: MonthLabel[];
  /** The grid's accessible name. */
  title: string;
  /** A day's tooltip, and its accessible name when days can be opened. */
  label: (cell: C) => string;
  onSelect?: (date: string) => void;
  selected?: string;
  /** A track's colour replaces the greens when the track filter is on. */
  color?: string;
}

const CELL = 9;
const GAP = 2.5;
const PITCH = CELL + GAP;
const MONTH_ROW = 20; // month names sit under the grid
const MIN_LABEL_GAP = 30;

/**
 * Days as an SVG grid of 9 px squares, columns are weeks, month names underneath. Empty days are the
 * hairline grey, then four greens up to accent. When the year is wider than the screen the grid scrolls
 * sideways and opens on this week. With `onSelect` it is one tab stop: the arrows move by a day or a
 * week, Home and End go to the ends, Enter opens the day.
 */
export function Heatmap<C extends HeatmapCell>({ cells, columns, months, title, label, onSelect, selected, color }: HeatmapProps<C>) {
  const titleId = useId();
  const hintId = useId();
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [focused, setFocused] = useState<string>();
  const width = columns * PITCH - GAP;
  const height = 7 * PITCH - GAP + MONTH_ROW;

  // Open with this week (or the last week, for a year that is over) near the right edge, two weeks of room
  // after it so the current month's name is not cut.
  const anchor = cells.find((c) => c.date === today())?.column ?? columns - 1;
  useLayoutEffect(() => {
    const el = box.current;
    if (el) el.scrollLeft = Math.max(0, (anchor + 3) * PITCH - el.clientWidth);
  }, [anchor]);

  // When two month names would touch, the later one stays: the first month of a range is often a sliver.
  const shownMonths = useMemo(() => {
    const out: MonthLabel[] = [];
    let nextX = Infinity;
    for (const month of [...months].reverse()) {
      const x = month.column * PITCH;
      if (nextX - x >= MIN_LABEL_GAP && x + 22 <= width) {
        out.unshift(month);
        nextX = x;
      }
    }
    return out;
  }, [months, width]);

  const days = useMemo(() => new Set(cells.filter((c) => !c.outside).map((c) => c.date)), [cells]);
  const first = cells.find((c) => !c.outside)?.date;
  const last = cells.findLast((c) => !c.outside)?.date;
  const tabStop = [selected, focused, today(), last].find((d) => d !== undefined && days.has(d));

  useEffect(() => setFocused(undefined), [cells]);

  const moveTo = (date: string | undefined): void => {
    if (!date || !days.has(date)) return;
    setFocused(date);
    svg.current?.querySelector<SVGRectElement>('[data-date="' + date + '"]')?.focus();
  };
  const onKey = (event: KeyboardEvent, date: string): void => {
    const target =
      event.key === 'ArrowUp' ? addDays(date, -1)
      : event.key === 'ArrowDown' ? addDays(date, 1)
      : event.key === 'ArrowLeft' ? addDays(date, -7)
      : event.key === 'ArrowRight' ? addDays(date, 7)
      : event.key === 'Home' ? first
      : event.key === 'End' ? last
      : null;
    if (target !== null) {
      event.preventDefault();
      moveTo(target);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.(date);
    }
  };

  const style = color
    ? ({ '--heat-color': color, '--heat-base': 'color-mix(in srgb, ' + color + ' 12%, var(--surface))' } as CSSProperties)
    : undefined;

  return (
    <div ref={box} className="w-full overflow-x-auto">
      <svg ref={svg} role="group" aria-labelledby={titleId} aria-describedby={onSelect ? hintId : undefined} width={width} height={height} className="heat block" style={style}>
        <title id={titleId}>{title}</title>
        {cells.map((cell) => {
          if (cell.outside) return null;
          const isSelected = selected === cell.date;
          const text = label(cell);
          return (
            <rect
              key={cell.date}
              data-date={cell.date}
              x={cell.column * PITCH}
              y={cell.row * PITCH}
              width={CELL}
              height={CELL}
              className={'heat-' + cell.level + (onSelect ? ' cursor-pointer outline-none focus-visible:stroke-[var(--ink)] focus-visible:[stroke-width:2]' : '')}
              stroke={isSelected ? 'var(--ink)' : cell.frozen ? 'var(--ink2)' : undefined}
              strokeWidth={isSelected ? 1.5 : cell.frozen ? 1 : undefined}
              tabIndex={onSelect ? (cell.date === tabStop ? 0 : -1) : undefined}
              role={onSelect ? 'button' : undefined}
              aria-label={onSelect ? text : undefined}
              onClick={onSelect ? () => onSelect(cell.date) : undefined}
              onFocus={onSelect ? () => setFocused(cell.date) : undefined}
              onKeyDown={onSelect ? (e) => onKey(e, cell.date) : undefined}
            >
              <title>{text}</title>
            </rect>
          );
        })}
        {shownMonths.map((month) => (
          <text key={month.column + month.label} x={month.column * PITCH} y={7 * PITCH - GAP + 16} className="fill-ink2 text-small">
            {month.label}
          </text>
        ))}
      </svg>
      {onSelect && (
        <p id={hintId} className="sr-only">
          Arrow keys move by a day or a week, Home and End go to the first and last day, Enter opens the day.
        </p>
      )}
    </div>
  );
}

/** "Less ■■■■■ More": the five steps, in the same colours as the grid. */
export function HeatLegend({ color }: { color?: string }) {
  const style = color ? ({ '--heat-color': color, '--heat-base': 'color-mix(in srgb, ' + color + ' 12%, var(--surface))' } as CSSProperties) : undefined;
  return (
    <span className="heat inline-flex items-center gap-1.5 text-small text-ink2" style={style} aria-hidden="true">
      Less
      {[0, 1, 2, 3, 4].map((level) => (
        <span key={level} className={'inline-block size-2.5 heat-swatch-' + level} />
      ))}
      More
    </span>
  );
}
