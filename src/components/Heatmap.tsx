import { useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { dayName, formatMinutes, formatShort } from '../lib/dates.ts';
import { buildGrid } from '../lib/heatmap.ts';
import type { GridOptions, GridSlot, HeatCell, MonthLabel } from '../lib/heatmap.ts';
import { heatLabel } from '../lib/streaks.ts';
import type { HeatLevel } from '../lib/streaks.ts';
import type { SettingsDefaults } from '../seed/schema.ts';

const CELL = 11;
const GAP = 2.5;
const PITCH = CELL + GAP;
const LEFT = 26; // room for the weekday labels
const TOP = 16; // room for the month labels

const LEVEL_FILL = ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)'];

export interface HeatmapProps extends Omit<GridOptions, 'thresholds'> {
  thresholds: SettingsDefaults['heatmapThresholds'];
  /** Rendered under the grid when a cell is hovered or focused. */
  onSelect?: (date: string) => void;
  selected?: string;
  title?: string;
  /** Weekday initials, starting at the configured first day. */
  compact?: boolean;
}

function cellTitle(cell: HeatCell, filtered: boolean): string {
  if (cell.outside) return '';
  const head = dayName(cell.date, true) + ' ' + formatShort(cell.date);
  if (cell.minutes === 0 && cell.totalMinutes === 0) {
    return head + ': nothing logged' + (cell.frozen ? ' (freeze day)' : '');
  }
  const shown = formatMinutes(cell.minutes);
  const rest = filtered && cell.totalMinutes !== cell.minutes ? ' of ' + formatMinutes(cell.totalMinutes) + ' that day' : '';
  return head + ': ' + shown + rest + (cell.frozen ? ' (freeze day)' : '');
}

/** What the grid needs to draw one day. */
export interface GridCellView extends GridSlot {
  level: HeatLevel;
  frozen?: boolean;
}

export interface GridSvgProps<C extends GridCellView> {
  cells: C[];
  columns: number;
  months: MonthLabel[];
  title: string;
  weekStartsOn: 0 | 1;
  /** The day's tooltip, and its accessible name when the cells are buttons. */
  label: (cell: C) => string;
  onSelect?: (date: string) => void;
  selected?: string;
}

/**
 * A contribution grid, drawn as plain SVG: one rect per day, columns are weeks. Shared by the Atlas heatmap
 * and the GitHub calendar, so the two look alike and line up.
 *
 * With `onSelect`, every cell is a real button, reachable by keyboard and by a screen reader, with the day's
 * total in its accessible name. Intensity is a single-hue ordered ramp, so more reads as darker (light theme)
 * or brighter (dark theme) rather than as a different colour.
 */
export function GridSvg<C extends GridCellView>({ cells, columns, months, title, weekStartsOn, label, onSelect, selected }: GridSvgProps<C>) {
  const labelId = useId();
  const width = LEFT + columns * PITCH;
  const height = TOP + 7 * PITCH;
  const dayLabels = weekStartsOn === 1 ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <svg role="group" aria-labelledby={labelId} width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} className="max-w-none">
      <title id={labelId}>{title}</title>

      {months.map((month) => (
        <text key={month.column + month.label} x={LEFT + month.column * PITCH} y={10} className="fill-[var(--ink-3)] text-[9px]">
          {month.label}
        </text>
      ))}

      {[0, 2, 4].map((row) => (
        <text key={row} x={0} y={TOP + row * PITCH + CELL - 2} className="fill-[var(--ink-3)] text-[9px]">
          {dayLabels[row]}
        </text>
      ))}

      {cells.map((cell) => {
        if (cell.outside) return null;
        const isSelected = selected === cell.date;
        const text = label(cell);
        return (
          <rect
            key={cell.date}
            x={LEFT + cell.column * PITCH}
            y={TOP + cell.row * PITCH}
            width={CELL}
            height={CELL}
            rx={2.5}
            fill={LEVEL_FILL[cell.level]}
            stroke={isSelected ? 'var(--ink)' : cell.frozen ? 'var(--accent-text)' : 'transparent'}
            strokeWidth={isSelected ? 1.5 : cell.frozen ? 1 : 0}
            strokeDasharray={cell.frozen && !isSelected ? '2 1.5' : undefined}
            className={onSelect ? 'cursor-pointer outline-none focus-visible:stroke-[var(--accent)] focus-visible:[stroke-width:2]' : ''}
            tabIndex={onSelect ? 0 : undefined}
            role={onSelect ? 'button' : undefined}
            aria-label={onSelect ? text : undefined}
            onClick={onSelect ? () => onSelect(cell.date) : undefined}
            onKeyDown={
              onSelect
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(cell.date);
                    }
                  }
                : undefined
            }
          >
            <title>{text}</title>
          </rect>
        );
      })}
    </svg>
  );
}

/** The Atlas heatmap: minutes logged per day, optionally filtered to one track. */
export function Heatmap({ thresholds, onSelect, selected, title, compact, ...options }: HeatmapProps) {
  const grid = useMemo(() => buildGrid({ ...options, thresholds }), [options, thresholds]);
  const filtered = Boolean(options.tracks && options.tracks.length > 0);

  return (
    <div className="overflow-x-auto">
      <GridSvg
        cells={grid.cells}
        columns={grid.columns}
        months={grid.months}
        weekStartsOn={options.weekStartsOn ?? 1}
        title={title ?? 'Activity from ' + formatShort(grid.start) + ' to ' + formatShort(grid.end)}
        label={(cell) => cellTitle(cell, filtered)}
        onSelect={onSelect}
        selected={selected}
      />
      {!compact && <HeatLegend thresholds={thresholds} />}
    </div>
  );
}

/** "Less ▢▢▢▢▢ More", with a tooltip per level. */
export function LevelLegend({ titles, children }: { titles: readonly string[]; children?: ReactNode }) {
  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-3">
      <span>Less</span>
      {([0, 1, 2, 3, 4] as HeatLevel[]).map((level) => (
        <span key={level} title={titles[level]} className="inline-block size-3 rounded-[3px]" style={{ background: LEVEL_FILL[level] }} />
      ))}
      <span>More</span>
      {children}
    </div>
  );
}

export function HeatLegend({ thresholds }: { thresholds: SettingsDefaults['heatmapThresholds'] }) {
  return (
    <LevelLegend titles={([0, 1, 2, 3, 4] as HeatLevel[]).map((level) => heatLabel(level, thresholds))}>
      <span className="ml-2 hidden items-center gap-1 sm:inline-flex">
        <span className="inline-block size-3 rounded-[3px] border border-dashed border-[var(--accent-text)]" />
        Freeze day
      </span>
    </LevelLegend>
  );
}

/** A year at a time, with the year's own totals. Used for the stacked all-years view. */
export function HeatmapYear({
  year,
  ...props
}: HeatmapProps & { year: number }) {
  const grid = useMemo(() => buildGrid({ ...props, thresholds: props.thresholds }), [props]);
  return (
    <section className="py-2">
      <header className="mb-1 flex flex-wrap items-baseline gap-x-3">
        <h3 className="num text-sm font-semibold">{year}</h3>
        <span className="num text-xs text-ink-3">
          {(grid.totalMinutes / 60).toFixed(0)}h over {grid.daysWithActivity} days
        </span>
      </header>
      <Heatmap {...props} compact title={'Activity in ' + year} />
    </section>
  );
}

/** Live hover state for a heatmap, so a panel outside the SVG can show the day's detail. */
export function useHoveredDay(): [string | undefined, (date: string | undefined) => void] {
  const [date, setDate] = useState<string>();
  return [date, setDate];
}
