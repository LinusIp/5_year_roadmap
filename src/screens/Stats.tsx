import { useMemo } from 'react';
import { useAtlas } from '../hooks/useAtlas.ts';
import { addDays, monthName, startOfWeek, today as todayDate } from '../lib/dates.ts';
import { plannedFor } from '../lib/day-plan.ts';
import { paceSummary } from '../lib/forecast.ts';
import { minutesPerBlock, minutesPerTrack } from '../lib/heatmap.ts';
import { adherence } from '../lib/shipping.ts';
import { completionByYear, families, hoursByFamilyPerMonth } from '../lib/stats.ts';
import { streak } from '../lib/streaks.ts';
import { Button } from '../ui/Button.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Header } from '../ui/Header.tsx';
import { ScenePanel } from '../ui/ScenePanel.tsx';
import { useCurrentScene } from '../hooks/useScenes.ts';
import { ProgressLine } from '../ui/ProgressLine.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { blockShort, hours, plural } from './parts/text.ts';
import { blockNameOf, retiredWithMinutes } from '../lib/retired.ts';
import { StackedBars } from './stats/StackedBars.tsx';
import { seriesColour } from '../ui/colors.ts';

const CADENCE = { weekly: 'Weekly builds', monthly: 'Monthly projects', research: 'Research', capstone: 'Capstones' } as const;
const PERIOD = { weekly: 'week', monthly: 'month', research: 'quarter', capstone: 'plan year' } as const;

/** Stats: hours per track family by month, completion by year, cadences, and where the hours went. */
export function Stats() {
  const atlas = useAtlas();
  const { scene } = useCurrentScene();
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
  const streakState = streak(logs, settings.core.streak, asOf, plannedFor(settings));
  const blocks = minutesPerBlock(logs);
  const tracks = minutesPerTrack(logs);
  const cadences = (['weekly', 'monthly', 'capstone'] as const).map((c) => adherence(seed.projects, atlas.states, c, model.planStart, asOf, settings.core.weekStartsOn));
  const weekStart = startOfWeek(asOf, settings.core.weekStartsOn);
  const weekMinutes = logs.filter((l) => l.date >= weekStart && l.date <= asOf).reduce((sum, l) => sum + l.entries.reduce((s, e) => s + e.minutes, 0), 0);
  const planned = plannedFor(settings);
  let weekPlanned = 0;
  for (let d = weekStart; d <= asOf; d = addDays(d, 1)) weekPlanned += planned(d);

  return (
    <Screen title="Stats">
      <Header
        title="Stats"
        sub={hours(total) + ' logged · ' + pace.actual.toFixed(1) + ' h a day over the last ' + pace.windowDays + ' days, the plan says ' + pace.planned.toFixed(0) + ' · longest streak ' + plural(streakState.longest, 'day')}
      />

      {/* The week's banner and the streak card (ATLAS-DAILY-SCENES): the scene behind the numbers, on paper chips. */}
      {scene && total > 0 && (
        <>
          <ScenePanel slot="stats-week" aspect="16 / 9" focal="50% 20%" decorative className="mt-[18px]">
            <div className="scene-chip absolute bottom-4 left-4 flex flex-col px-3.5 py-2.5">
              <span className="section-label mb-0">This week</span>
              <span className="text-hero font-semibold leading-[1.05]">{hours(weekMinutes)}</span>
              <span className="text-meta text-ink2">{'of ' + hours(weekPlanned) + ' planned'}</span>
            </div>
          </ScenePanel>
          <section className="tile mt-[18px] flex min-h-[132px] overflow-hidden !p-0" aria-label="Streak">
            <ScenePanel slot="stats-streak" focal="80% 70%" decorative bare className="w-[118px] shrink-0" />
            <div className="flex flex-col justify-center gap-0.5 px-[18px] py-4">
              <span className="section-label mb-0">Streak</span>
              <span className="text-hero font-semibold leading-[1.05]">{plural(streakState.current, 'day')}</span>
              <span className="text-meta text-ink2">{'longest ' + plural(streakState.longest, 'day')}</span>
            </div>
          </section>
        </>
      )}
      {total === 0 ? (
        <EmptyState action={<Button to="/">Go to Today</Button>}>The charts fill in as you log time.</EmptyState>
      ) : (
        <section className="tile mt-[18px] p-[18px]">
          <StackedBars
            title="Hours per track family, by month"
            series={model.fams.map((f, i) => ({ key: f.slot, name: f.name, color: seriesColour(i) }))}
            bars={model.months.map((m) => {
              const [y, mo] = m.month.split('-').map(Number) as [number, number];
              return { key: m.month, label: monthName(mo - 1) + ' ' + y, tick: monthName(mo - 1, true), values: m.bySlot };
            })}
            scale={(minutes) => minutes / 60}
            format={(h) => (h >= 10 ? Math.round(h) : Math.round(h * 10) / 10) + ' h'}
          />
        </section>
      )}

      <RowList label="Completion by year" className="mt-[18px]">
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

      <RowList label="Cadences" className="mt-[18px]">
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
          <RowList label="Hours per block" className="mt-[18px]">
            {settings.core.blocks.map((b) => (
              <Row key={b.id} title={'Block ' + b.id + ' · ' + blockShort(b.name)} trailing={hours(blocks[b.id] ?? 0)} />
            ))}
            {/* A block that no longer exists (P, Practice) keeps the hours logged to it. */}
            {retiredWithMinutes(settings.core, blocks).map((id) => (
              <Row key={id} title={'Block ' + id + ' · ' + blockNameOf(settings.core, id)} trailing={hours(blocks[id] ?? 0)} />
            ))}
          </RowList>
          <RowList label="Hours per track" className="mt-[18px]">
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
