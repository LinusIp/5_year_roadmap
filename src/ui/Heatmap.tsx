import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { addDays, today } from '../lib/dates.ts';
import { useEdgeFade } from './edgeFade.ts';
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

/** Weeks across the card at once, as in the mockup; earlier weeks of the year are a sideways scroll away. */
const WEEKS_SHOWN = 30;
/** The narrowest cell that still reads: a card wide enough for every week at this size shows them all, unscrolled. */
const MIN_CELL_W = 8;
const CELL_H = 9;
const GAP = 2.5;
const MONTH_ROW = 22; // month names sit under the grid
const MIN_LABEL_GAP = 28;

/** The ramp for a track's colour: the same four steps, mixed from the track colour instead of accent. */
export function trackRamp(color: string | undefined): CSSProperties | undefined {
  if (!color) return undefined;
  const mix = (share: number): string => 'color-mix(in srgb, ' + color + ' ' + share + '%, var(--bg))';
  return { '--heat-color': color, '--heat-1': mix(22), '--heat-2': mix(48), '--heat-3': mix(74) } as CSSProperties;
}

/**
 * Days as an SVG grid, columns are weeks, month names underneath. Thirty weeks fill the card's width, so a
 * cell is about 9 px; empty days are the hairline grey, then four greens up to accent. This year's grid ends at
 * this week (the weeks still ahead have nothing to show); it opens scrolled to its end and swipes back to the
 * earlier months, with no bar, a fade over the hidden side instead (CLAY-STYLE, Scrolling). A card wide enough for
 * every week shows them all and does not scroll.
 *
 * With `onSelect` it is one tab stop: the arrows move by a day or a week, and the strip scrolls to the focused day;
 * Home and End go to the ends, Enter opens the day. Without it (the GitHub calendar) the strip itself is the tab
 * stop when it scrolls, and the arrows scroll it.
 */
export function Heatmap<C extends HeatmapCell>({ cells, columns, months, title, label, onSelect, selected, color }: HeatmapProps<C>) {
  const titleId = useId();
  const hintId = useId();
  const box = useRef<HTMLDivElement>(null);
  // It opens at its end, this week, and fades at an edge where more weeks are hidden.
  useEdgeFade(box, 'end');
  const svg = useRef<SVGSVGElement>(null);
  const [focused, setFocused] = useState<string>();
  const [boxWidth, setBoxWidth] = useState(326);

  // The cell width follows the card: thirty columns and their gaps fill it exactly.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const measure = (): void => setBoxWidth(el.clientWidth || 326);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // This year's grid stops at this week; a year that is over (or still ahead) keeps all its weeks.
  const thisWeek = cells.find((c) => c.date === today())?.column;
  const shown = thisWeek === undefined ? columns : thisWeek + 1;
  const fitAll = (boxWidth - (shown - 1) * GAP) / shown >= MIN_CELL_W;
  const cellW = fitAll ? (boxWidth - (shown - 1) * GAP) / shown : Math.max(6, (boxWidth - (WEEKS_SHOWN - 1) * GAP) / WEEKS_SHOWN);
  const pitch = cellW + GAP;
  const width = shown * pitch - GAP;
  const height = 7 * (CELL_H + GAP) - GAP + MONTH_ROW;
  const scrolls = width > boxWidth + 0.5;
  const drawn = useMemo(() => cells.filter((c) => c.column < shown), [cells, shown]);

  // When two month names would touch, the later one stays: the first month of a range is often a sliver.
  const shownMonths = useMemo(() => {
    const out: MonthLabel[] = [];
    let nextX = Infinity;
    for (const month of [...months].reverse()) {
      const x = month.column * pitch;
      if (month.column < shown && nextX - x >= MIN_LABEL_GAP) {
        out.unshift(month);
        nextX = x;
      }
    }
    return out;
  }, [months, shown, pitch]);

  const days = useMemo(() => new Set(drawn.filter((c) => !c.outside).map((c) => c.date)), [drawn]);
  const first = drawn.find((c) => !c.outside)?.date;
  const last = drawn.findLast((c) => !c.outside)?.date;
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

  // With no days to tab to, the strip itself is the tab stop while it scrolls.
  const region = !onSelect && scrolls ? { tabIndex: 0, role: 'region', 'aria-label': title + ', scroll for earlier months' } : {};
  return (
    <div className="fade-strip w-full">
      <div ref={box} className="relative w-full overflow-x-auto" {...region}>
        <svg ref={svg} role="group" aria-labelledby={titleId} aria-describedby={onSelect ? hintId : undefined} width={width} height={height} className="heat block" style={trackRamp(color)}>
          <title id={titleId}>{title}</title>
          {drawn.map((cell) => {
            if (cell.outside) return null;
            const isSelected = selected === cell.date;
            const text = label(cell);
            return (
              <rect
                key={cell.date}
                data-date={cell.date}
                x={cell.column * pitch}
                y={cell.row * (CELL_H + GAP)}
                width={cellW}
                height={CELL_H}
                rx={2}
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
          {shownMonths.map((month) => {
            // The current month's name would run past the grid's last week; it ends there instead.
            const x = month.column * pitch;
            const edge = width;
            const atEdge = x <= edge && x + 22 > edge;
            return (
              <text key={month.column + month.label} x={atEdge ? edge : x} textAnchor={atEdge ? 'end' : 'start'} y={7 * (CELL_H + GAP) - GAP + 17} className="fill-ink2 text-small">
                {month.label}
              </text>
            );
          })}
        </svg>
        {onSelect && (
          <p id={hintId} className="sr-only">
            Arrow keys move by a day or a week, Home and End go to the first and last day, Enter opens the day.
          </p>
        )}
      </div>
    </div>
  );
}

/** "Less ■■■■■ More": the five steps, in the same colours as the grid. */
export function HeatLegend({ color }: { color?: string }) {
  return (
    <span className="heat inline-flex items-center gap-1.5 text-small text-ink2" style={trackRamp(color)} aria-hidden="true">
      Less
      {[0, 1, 2, 3, 4].map((level) => (
        <span key={level} className={'inline-block size-2.5 rounded-cell heat-swatch-' + level} />
      ))}
      More
    </span>
  );
}
