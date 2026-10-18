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
  /** A day to mark with a tick above its week, and the tick's accessible name ("Plan started 21 Sep"). */
  mark?: { date: string; label: string };
}

/** A cell stays readable on a phone (HEATMAP-FULL-YEAR): 10 px with a 3 px gap, the strip scrolling. A card with room
 * for the whole year at 8 px or more (a wide screen; the gap may close to 2 px) shows it all, the cells filling its
 * width, and does not scroll. */
const CELL_W = 10;
const MIN_FIT_W = 8;
const CELL_H = 10;
const GAP = 3;
/** Room above the grid for the tick that marks a day (the plan's start). */
const TOP = 7;
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
export function Heatmap<C extends HeatmapCell>({ cells, columns, months, title, label, onSelect, selected, color, mark }: HeatmapProps<C>) {
  const titleId = useId();
  const hintId = useId();
  const box = useRef<HTMLDivElement>(null);
  // It fades at an edge where more weeks are hidden; where it opens is set below, once the cells are measured.
  useEdgeFade(box);
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
  // The whole calendar year, January to December; days still ahead are cells faint (below).
  const now = today();
  const thisWeek = cells.find((c) => c.date === now)?.column;
  // Fitting the year, the gap may close to 2 px before the cells go under 8 px (a 1280 px screen's card).
  const fitsAt = (g: number): number => (boxWidth - (columns - 1) * g) / columns;
  const gap = fitsAt(GAP) >= MIN_FIT_W ? GAP : fitsAt(2) >= MIN_FIT_W ? 2 : GAP;
  const cellW = fitsAt(gap) >= MIN_FIT_W ? fitsAt(gap) : CELL_W;
  const pitch = cellW + gap;
  const width = columns * pitch - gap;
  const height = TOP + 7 * (CELL_H + gap) - gap + MONTH_ROW;
  const scrolls = width > boxWidth + 0.5;
  // It opens with this week about two thirds of the way across: the recent past, and a few weeks to come. A year that
  // is over opens at its end, one still ahead at its start.
  const allAhead = cells.every((c) => c.outside || c.date > now);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !scrolls) return;
    el.scrollLeft = thisWeek !== undefined ? Math.max(0, (thisWeek + 0.5) * pitch - (el.clientWidth * 2) / 3) : allAhead ? 0 : el.scrollWidth;
  }, [thisWeek, pitch, scrolls, allAhead]);
  const markColumn = mark ? cells.find((c) => c.date === mark.date && !c.outside)?.column : undefined;

  // When two month names would touch, the later one stays: the first month of a range is often a sliver.
  const shownMonths = useMemo(() => {
    const out: MonthLabel[] = [];
    let nextX = Infinity;
    for (const month of [...months].reverse()) {
      const x = month.column * pitch;
      if (nextX - x >= MIN_LABEL_GAP) {
        out.unshift(month);
        nextX = x;
      }
    }
    return out;
  }, [months, pitch]);

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

  // With no days to tab to, the strip itself is the tab stop while it scrolls.
  const region = !onSelect && scrolls ? { tabIndex: 0, role: 'region', 'aria-label': title + ', scroll for the other months' } : {};
  return (
    <div className="fade-strip w-full">
      <div ref={box} className="relative w-full overflow-x-auto" {...region}>
        <svg ref={svg} role="group" aria-labelledby={titleId} aria-describedby={onSelect ? hintId : undefined} width={width} height={height} className="heat block" style={trackRamp(color)}>
          <title id={titleId}>{title}</title>
          {cells.map((cell) => {
            if (cell.outside) return null;
            const isSelected = selected === cell.date;
            const text = label(cell);
            // Still ahead: a faint outline, "not yet", unlike a day with nothing logged. Today: an ice ring.
            const ahead = cell.date > now;
            const isToday = cell.date === now;
            return (
              <rect
                key={cell.date}
                data-date={cell.date}
                x={cell.column * pitch}
                y={TOP + cell.row * (CELL_H + gap)}
                width={cellW}
                height={CELL_H}
                rx={2}
                className={(ahead ? 'heat-future' : 'heat-' + cell.level) + (onSelect ? ' cursor-pointer outline-none focus-visible:stroke-[var(--ink)] focus-visible:[stroke-width:2]' : '')}
                data-phase={ahead ? 'future' : isToday ? 'today' : undefined}
                stroke={isSelected ? 'var(--ink)' : isToday ? 'var(--ice-deep)' : cell.frozen ? 'var(--ink2)' : undefined}
                strokeWidth={isSelected ? 1.5 : isToday ? 2 : cell.frozen ? 1 : undefined}
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
          {markColumn !== undefined && mark && (
            <g role="img" aria-label={mark.label}>
              <title>{mark.label}</title>
              <line x1={markColumn * pitch + cellW / 2} x2={markColumn * pitch + cellW / 2} y1={0} y2={TOP - 2} stroke="var(--blue-deep)" strokeWidth={2} strokeLinecap="round" />
            </g>
          )}
          {shownMonths.map((month) => {
            // December's name would run past the grid's last week; it ends there instead.
            const x = month.column * pitch;
            const edge = width;
            const atEdge = x <= edge && x + 22 > edge;
            return (
              <text key={month.column + month.label} x={atEdge ? edge : x} textAnchor={atEdge ? 'end' : 'start'} y={TOP + 7 * (CELL_H + gap) - gap + 17} className="fill-ink2 text-small">
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
