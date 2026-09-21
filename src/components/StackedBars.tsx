import { useId, useState } from 'react';
import { niceScale } from '../lib/stats.ts';

export interface StackSeries {
  key: number;
  name: string;
  color: string;
}

export interface StackBar {
  key: string;
  label: string;
  /** Short axis label; the full label goes in the tooltip. */
  tick: string;
  values: Record<number, number>;
}

interface StackedBarsProps {
  title: string;
  series: StackSeries[];
  bars: StackBar[];
  /** Formats a value for tooltips, the axis and the table. */
  format: (value: number) => string;
  /** Converts a raw value to the plotted unit (minutes to hours, say). */
  scale?: (value: number) => number;
  height?: number;
}

const GAP = 2; // surface-coloured gap between stacked segments
const RADIUS = 3;

/**
 * Stacked vertical bars in plain SVG. Series keep a fixed order (the categorical slot order), so a colour
 * always sits in the same place in a stack. Hovering or focusing a bar shows its breakdown; the legend is
 * always present because there is more than one series; "Show table" gives the same numbers as a table.
 */
export function StackedBars({ title, series, bars, format, scale = (v) => v, height = 220 }: StackedBarsProps) {
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();

  const totals = bars.map((bar) => series.reduce((sum, s) => sum + scale(bar.values[s.key] ?? 0), 0));
  const { max, step } = niceScale(Math.max(0, ...totals));
  const left = 36;
  const bottom = 22;
  const top = 8;
  const width = Math.max(320, bars.length * 26 + left + 8);
  const plotH = height - top - bottom;
  const band = (width - left - 8) / Math.max(1, bars.length);
  const barW = Math.max(6, Math.min(22, band * 0.62));
  const y = (v: number): number => top + plotH - (v / max) * plotH;
  const ticks: number[] = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(t);
  const labelEvery = Math.ceil(bars.length / 12);

  const activeBar = active !== null ? bars[active] : undefined;

  return (
    <figure className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <figcaption id={titleId} className="text-sm font-semibold">
          {title}
        </figcaption>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
          {asTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      <ul className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2" aria-label="Legend">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>

      {asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-ink-3">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Period
                </th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="py-1 pr-3 text-right font-medium">
                    {s.name}
                  </th>
                ))}
                <th scope="col" className="py-1 text-right font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="num">
              {bars.map((bar, i) => (
                <tr key={bar.key} className="border-t border-line">
                  <th scope="row" className="py-1 pr-3 font-normal">
                    {bar.label}
                  </th>
                  {series.map((s) => (
                    <td key={s.key} className="py-1 pr-3 text-right">
                      {format(scale(bar.values[s.key] ?? 0))}
                    </td>
                  ))}
                  <td className="py-1 text-right font-medium">{format(totals[i]!)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <svg role="img" aria-labelledby={titleId} width={width} height={height} className="max-w-none" onMouseLeave={() => setActive(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={left} x2={width - 4} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--line-strong)' : 'var(--line)'} strokeWidth={1} />
                <text x={left - 6} y={y(t) + 3} textAnchor="end" className="num fill-[var(--ink-3)] text-[10px]">
                  {format(t)}
                </text>
              </g>
            ))}
            {bars.map((bar, i) => {
              const x = left + band * i + (band - barW) / 2;
              let base = 0;
              const segments = series
                .map((s) => ({ s, v: scale(bar.values[s.key] ?? 0) }))
                .filter((seg) => seg.v > 0);
              return (
                <g key={bar.key}>
                  {segments.map((seg, j) => {
                    const y0 = y(base);
                    const y1 = y(base + seg.v);
                    base += seg.v;
                    const isTop = j === segments.length - 1;
                    const h = Math.max(0, y0 - y1 - (j > 0 ? GAP : 0));
                    return (
                      <path
                        key={seg.s.key}
                        d={
                          isTop && h > RADIUS
                            ? 'M' + x + ',' + (y1 + h) + 'V' + (y1 + RADIUS) + 'Q' + x + ',' + y1 + ' ' + (x + RADIUS) + ',' + y1 + 'H' + (x + barW - RADIUS) + 'Q' + (x + barW) + ',' + y1 + ' ' + (x + barW) + ',' + (y1 + RADIUS) + 'V' + (y1 + h) + 'Z'
                            : 'M' + x + ',' + y1 + 'h' + barW + 'v' + h + 'h' + -barW + 'Z'
                        }
                        fill={seg.s.color}
                        opacity={active === null || active === i ? 1 : 0.45}
                      />
                    );
                  })}
                  {/* The hit target is the whole column, not just the ink, and it is keyboard-reachable. */}
                  <rect
                    x={left + band * i}
                    y={top}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    tabIndex={0}
                    role="button"
                    aria-label={bar.label + ': ' + format(totals[i]!)}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className="outline-none focus-visible:stroke-[var(--accent)]"
                  />
                  {i % labelEvery === 0 && (
                    <text x={left + band * i + band / 2} y={height - 6} textAnchor="middle" className="fill-[var(--ink-3)] text-[10px]">
                      {bar.tick}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {activeBar && (
            <div className="pointer-events-none absolute right-2 top-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg" role="status">
              <p className="mb-1 font-semibold">{activeBar.label}</p>
              <ul className="num space-y-0.5">
                {series
                  .filter((s) => (activeBar.values[s.key] ?? 0) > 0)
                  .map((s) => (
                    <li key={s.key} className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="inline-block size-2 rounded-sm" style={{ background: s.color }} />
                      <span className="text-ink-2">{s.name}</span>
                      <span className="ml-auto pl-3">{format(scale(activeBar.values[s.key] ?? 0))}</span>
                    </li>
                  ))}
                <li className="mt-1 flex border-t border-line pt-1 font-medium">
                  Total<span className="ml-auto pl-3">{format(totals[active!]!)}</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
