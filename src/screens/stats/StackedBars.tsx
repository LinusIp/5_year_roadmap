import { useId, useState } from 'react';
import { niceScale } from '../../lib/stats.ts';
import { Button } from '../../ui/Button.tsx';

export interface StackSeries {
  key: number;
  name: string;
  color: string;
}

export interface StackBar {
  key: string;
  label: string;
  /** Short axis label; the full label goes in the readout. */
  tick: string;
  values: Record<number, number>;
}

/**
 * Stacked bars in plain SVG. Series keep a fixed order, so a colour always sits in the same place in a stack.
 * Tapping or focusing a bar reads its breakdown out under the chart; "Show the table" gives the same numbers.
 */
export function StackedBars({ title, series, bars, format, scale = (v) => v, height = 200 }: { title: string; series: StackSeries[]; bars: StackBar[]; format: (value: number) => string; scale?: (value: number) => number; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();
  const totals = bars.map((bar) => series.reduce((sum, s) => sum + scale(bar.values[s.key] ?? 0), 0));
  const { max, step } = niceScale(Math.max(0, ...totals));
  const left = 36;
  const bottom = 20;
  const top = 6;
  const width = Math.max(300, bars.length * 26 + left + 8);
  const plotH = height - top - bottom;
  const band = (width - left - 8) / Math.max(1, bars.length);
  const barW = Math.max(6, Math.min(20, band * 0.62));
  const y = (v: number): number => top + plotH - (v / max) * plotH;
  const ticks: number[] = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(t);
  const labelEvery = Math.ceil(bars.length / 12);
  const shown = active !== null ? bars[active] : bars[bars.length - 1];
  const shownIndex = active ?? bars.length - 1;

  return (
    <figure className="min-w-0">
      <figcaption id={titleId} className="text-meta font-medium">
        {title}
      </figcaption>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-small text-ink2" aria-label="Legend">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block size-2.5" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>

      {asTable ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-small">
            <thead>
              <tr className="text-ink2">
                <th scope="col" className="py-1 pr-3 font-normal">
                  Month
                </th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="py-1 pr-3 text-right font-normal">
                    {s.name}
                  </th>
                ))}
                <th scope="col" className="py-1 text-right font-normal">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
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
        <>
          <div className="mt-3 overflow-x-auto">
            <svg role="img" aria-labelledby={titleId} width={width} height={height} className="max-w-none">
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={left} x2={width - 4} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                  <text x={left - 6} y={y(t) + 4} textAnchor="end" className="fill-ink2 text-small">
                    {format(t)}
                  </text>
                </g>
              ))}
              {bars.map((bar, i) => {
                const x = left + band * i + (band - barW) / 2;
                let base = 0;
                return (
                  <g key={bar.key}>
                    {series
                      .map((s) => ({ s, v: scale(bar.values[s.key] ?? 0) }))
                      .filter((seg) => seg.v > 0)
                      .map((seg, j) => {
                        const y0 = y(base);
                        const y1 = y(base + seg.v);
                        base += seg.v;
                        // A 1 px gap in the surface colour between segments.
                        return <rect key={seg.s.key} x={x} y={y1} width={barW} height={Math.max(0, y0 - y1 - (j > 0 ? 1 : 0))} fill={seg.s.color} opacity={active === null || active === i ? 1 : 0.45} />;
                      })}
                    <rect
                      x={left + band * i}
                      y={top}
                      width={band}
                      height={plotH}
                      fill="transparent"
                      tabIndex={0}
                      role="button"
                      aria-label={bar.label + ': ' + format(totals[i]!)}
                      onClick={() => setActive(active === i ? null : i)}
                      onFocus={() => setActive(i)}
                      className="cursor-pointer outline-none focus-visible:stroke-[var(--accent)]"
                    />
                    {i % labelEvery === 0 && (
                      <text x={left + band * i + band / 2} y={height - 4} textAnchor="middle" className="fill-ink2 text-small">
                        {bar.tick}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          {shown && (
            <p className="mt-2 text-meta text-ink2" role="status">
              {shown.label}: {format(totals[shownIndex]!)}
              {series
                .filter((s) => (shown.values[s.key] ?? 0) > 0)
                .map((s) => ' · ' + s.name + ' ' + format(scale(shown.values[s.key] ?? 0)))
                .join('')}
            </p>
          )}
        </>
      )}
      <Button className="mt-3" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
        {asTable ? 'Show the chart' : 'Show the table'}
      </Button>
    </figure>
  );
}
