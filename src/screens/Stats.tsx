import { useMemo } from 'react';
import { useAtlas } from '../hooks/useAtlas.ts';
import { monthName, today as todayDate } from '../lib/dates.ts';
import { paceSummary } from '../lib/forecast.ts';
import { minutesPerBlock, minutesPerTrack } from '../lib/heatmap.ts';
import { adherence } from '../lib/shipping.ts';
import { completionByYear, families, hoursByFamilyPerMonth } from '../lib/stats.ts';
import { streak } from '../lib/streaks.ts';
import { Button } from '../ui/Button.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Header } from '../ui/Header.tsx';
import { ProgressLine } from '../ui/ProgressLine.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { blockShort, hours, plural } from './parts/text.ts';
import { StackedBars } from './stats/StackedBars.tsx';

const CADENCE = { weekly: 'Weekly builds', monthly: 'Monthly projects', research: 'Research', capstone: 'Capstones' } as const;
const PERIOD = { weekly: 'week', monthly: 'month', research: 'quarter', capstone: 'plan year' } as const;

/** Stats: hours per track family by month, completion by year, cadences, and where the hours went. */
export function Stats() {
  const atlas = useAtlas();
  const asOf = todayDate();
  const model = useMemo(() => {
    if (!atlas) return null;
    const firstLog = atlas.logs.map((l) => l.date).sort()[0];
    const planStart = atlas.seed.phases[0]!.start;
    const from = firstLog && firstLog < planStart ? firstLog : planStart;
    const months = hoursByFamilyPerMonth(atlas.logs, atlas.seed.tracks, from, asOf < from ? from : asOf).slice(-24);
    return { fams: families(atlas.seed.tracks), months, years: completionByYear(atlas.seed, atlas.states), planStart };
  }, [atlas, asOf]);

  if (!atlas || !model) {
    return (
      <Screen title="Stats">
        <Header title="Stats" />
      </Screen>
    );
  }

  const { logs, settings, seed } = atlas;
  const total = logs.reduce((sum, l) => sum + l.entries.reduce((s, e) => s + e.minutes, 0), 0);
  const pace = paceSummary(logs, settings, asOf);
  const streakState = streak(logs, settings.core.streak, asOf);
  const blocks = minutesPerBlock(logs);
  const tracks = minutesPerTrack(logs);
  const cadences = (['weekly', 'monthly', 'capstone'] as const).map((c) => adherence(seed.projects, atlas.states, c, model.planStart, asOf, settings.core.weekStartsOn));

  return (
    <Screen title="Stats">
      <Header
        title="Stats"
        sub={hours(total) + ' logged · ' + pace.actual.toFixed(1) + ' h a day over the last ' + pace.windowDays + ' days, the plan says ' + pace.planned.toFixed(0) + ' · longest streak ' + plural(streakState.longest, 'day')}
      />

      {total === 0 ? (
        <EmptyState action={<Button to="/">Go to Today</Button>}>The charts fill in as you log time.</EmptyState>
      ) : (
        <section className="mt-6 rounded-card bg-surface p-4">
          <StackedBars
            title="Hours per track family, by month"
            series={model.fams.map((f) => ({ key: f.slot, name: f.name, color: 'var(--track-' + f.tracks[0] + ')' }))}
            bars={model.months.map((m) => {
              const [y, mo] = m.month.split('-').map(Number) as [number, number];
              return { key: m.month, label: monthName(mo - 1) + ' ' + y, tick: monthName(mo - 1, true), values: m.bySlot };
            })}
            scale={(minutes) => minutes / 60}
            format={(h) => (h >= 10 ? Math.round(h) : Math.round(h * 10) / 10) + ' h'}
          />
        </section>
      )}

      <RowList label="Completion by year" className="mt-7">
        {model.years.map((year) => (
          <Row
            key={year.year}
            title={'Year ' + year.year}
            meta={Math.round(year.fraction * 100) + '% · ' + Math.round(year.doneHours) + ' of ' + Math.round(year.plannedHours) + ' h · ' + year.itemsDone + ' of ' + plural(year.itemsTotal, 'item')}
          >
            <div className="pb-3">
              <ProgressLine value={year.fraction} label={'Year ' + year.year} />
            </div>
          </Row>
        ))}
      </RowList>

      <RowList label="Cadences" className="mt-7">
        {cadences.map((c) => (
          <Row
            key={c.cadence}
            title={CADENCE[c.cadence]}
            meta={c.periods > 0 ? c.hit + ' of ' + plural(c.periods, PERIOD[c.cadence]) + ' with one · ' + c.shipped + ' shipped' : 'Starts with the plan'}
            trailing={c.periods > 0 ? Math.round((c.hit / c.periods) * 100) + '%' : undefined}
          />
        ))}
      </RowList>

      {total > 0 && (
        <>
          <RowList label="Hours per block" className="mt-7">
            {settings.core.blocks.map((b) => (
              <Row key={b.id} title={'Block ' + b.id + ' · ' + blockShort(b.name)} trailing={hours(blocks[b.id])} />
            ))}
          </RowList>
          <RowList label="Hours per track" className="mt-7">
            {tracks.map((t) => (
              <Row key={t.track} title={seed.tracks.find((x) => x.id === t.track)?.name ?? t.track} trailing={hours(t.minutes)}>
                <div className="pb-3">
                  <ProgressLine value={t.share} label={'Share of ' + (seed.tracks.find((x) => x.id === t.track)?.name ?? t.track)} />
                </div>
              </Row>
            ))}
          </RowList>
        </>
      )}
    </Screen>
  );
}
