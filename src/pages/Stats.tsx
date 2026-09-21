import { useMemo } from 'react';
import { EmptyState, Page } from '../components/Page.tsx';
import { StackedBars } from '../components/StackedBars.tsx';
import { trackColor } from '../components/TrackDot.tsx';
import { useAtlas } from '../hooks/useAtlas.ts';
import { formatHours, monthName, today as todayDate } from '../lib/dates.ts';
import { paceSummary } from '../lib/forecast.ts';
import { minutesPerBlock } from '../lib/heatmap.ts';
import { adherence } from '../lib/shipping.ts';
import { completionByYear, families, hoursByFamilyPerMonth } from '../lib/stats.ts';
import { streak } from '../lib/streaks.ts';
import { Link } from '../router/router.tsx';

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card px-3 py-2.5">
      <div className="eyebrow">{label}</div>
      <div className="num mt-0.5 text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

export function Stats() {
  const atlas = useAtlas();
  const asOf = todayDate();

  const model = useMemo(() => {
    if (!atlas) return null;
    const firstLog = atlas.logs.map((l) => l.date).sort()[0];
    const planStart = atlas.seed.phases[0]!.start;
    const from = firstLog && firstLog < planStart ? firstLog : planStart;
    const fams = families(atlas.seed.tracks);
    const months = hoursByFamilyPerMonth(atlas.logs, atlas.seed.tracks, from, asOf < from ? from : asOf).slice(-24);
    return { fams, months, years: completionByYear(atlas.seed, atlas.states), planStart };
  }, [atlas, asOf]);

  if (!atlas || !model) {
    return (
      <Page title="Stats">
        <p className="text-sm text-ink-3">Loading…</p>
      </Page>
    );
  }

  const total = atlas.logs.reduce((sum, l) => sum + l.entries.reduce((s, e) => s + e.minutes, 0), 0);
  const pace = paceSummary(atlas.logs, atlas.settings, asOf);
  const streakState = streak(atlas.logs, atlas.settings.core.streak, asOf);
  const blocks = minutesPerBlock(atlas.logs);
  const weekStartsOn = atlas.settings.core.weekStartsOn;
  const cadences = (['weekly', 'monthly', 'capstone'] as const).map((c) => adherence(atlas.seed.projects, atlas.states, c, model.planStart, asOf, weekStartsOn));
  const cadenceName = { weekly: 'Weekly mini-builds', monthly: 'Monthly projects', capstone: 'Capstones' } as const;
  const periodName = { weekly: 'weeks', monthly: 'months', capstone: 'plan years' } as const;

  return (
    <Page title="Stats" lead="Hours per track over time, completion by year, and how well the cadences are holding.">
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Total logged" value={formatHours(total, 0)} sub={atlas.logs.length + ' days with a log'} />
        <Tile label="Pace" value={pace.actual.toFixed(1) + ' h/day'} sub={'last ' + pace.windowDays + ' days · plan ' + pace.planned.toFixed(0) + ' h'} />
        <Tile label="Streak" value={streakState.current + ' days'} sub={'longest ' + streakState.longest} />
        <Tile label="Busiest block" value={total > 0 ? (Object.entries(blocks).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—') : '—'} sub={total > 0 ? formatHours(Math.max(...Object.values(blocks)), 0) : undefined} />
      </div>

      {total === 0 ? (
        <div className="mb-4">
          <EmptyState icon="stats" title="No hours logged yet" action={<Link to="/" className="btn btn-primary">Go to Today</Link>}>
            The charts fill in as you log time. Completion by year and cadence adherence are below already.
          </EmptyState>
        </div>
      ) : (
        <section className="card mb-4 p-4">
          <StackedBars
            title="Hours per track family, by month"
            series={model.fams.map((f) => ({ key: f.slot, name: f.name, color: trackColor(f.slot) }))}
            bars={model.months.map((m) => {
              const [y, mo] = m.month.split('-').map(Number) as [number, number];
              return { key: m.month, label: monthName(mo - 1) + ' ' + y, tick: monthName(mo - 1, true), values: m.bySlot };
            })}
            scale={(minutes) => minutes / 60}
            format={(hours) => (hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10) + 'h'}
          />
        </section>
      )}

      <section className="card mb-4 p-4">
        <h2 className="mb-3 text-sm font-semibold">Completion by year</h2>
        <ul className="space-y-2.5">
          {model.years.map((year) => {
            const percent = Math.round(year.fraction * 100);
            return (
              <li key={year.year} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3">
                <span className="text-sm">Year {year.year}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-label={'Year ' + year.year} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full" style={{ width: percent + '%', background: 'var(--series-1)' }} />
                </div>
                <span className="num w-44 text-right text-xs text-ink-2">
                  {percent}% · {formatHours(year.doneHours * 60, 0)} of {formatHours(year.plannedHours * 60, 0)} · {year.itemsDone}/{year.itemsTotal}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Cadence adherence</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {cadences.map((c) => {
            const rate = c.periods > 0 ? Math.round((c.hit / c.periods) * 100) : null;
            return (
              <div key={c.cadence} className="rounded-lg border border-line px-3 py-2.5">
                <div className="eyebrow">{cadenceName[c.cadence]}</div>
                <div className="num mt-0.5 text-lg font-semibold">{rate === null ? '—' : rate + '%'}</div>
                <div className="num text-xs text-ink-3">
                  {c.periods > 0 ? c.hit + ' of ' + c.periods + ' ' + periodName[c.cadence] + ' · ' + c.shipped + ' shipped' : 'Starts with the plan'}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </Page>
  );
}
