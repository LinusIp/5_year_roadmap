import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { addDays, monthName, today as todayDate } from '../lib/dates.ts';
import { buildGrid, monthlyTotals, planYears } from '../lib/heatmap.ts';
import type { HeatCell } from '../lib/heatmap.ts';
import { isBlockDone, totalMinutes } from '../lib/logs.ts';
import { plannedFor, resolveDay } from '../lib/day-plan.ts';
import { freezesSpentInMonth, streak } from '../lib/streaks.ts';
import { useQueryParam } from '../router/router.tsx';
import type { TrackId } from '../seed/schema.ts';
import { Button } from '../ui/Button.tsx';
import { Chips } from '../ui/Chips.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { HeatLegend, Heatmap } from '../ui/Heatmap.tsx';
import { Header } from '../ui/Header.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { DaySheet } from './parts/DaySheet.tsx';
import { GithubCalendar } from './parts/GithubCalendar.tsx';
import { IconTile } from '../ui/glyphs.tsx';
import { longDate } from './parts/text.ts';
import { PickerSheet } from './parts/PickerSheet.tsx';
import { ProjectsActivity } from './parts/ProjectsActivity.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import { dateTitle, hours, plural, span } from './parts/text.ts';
import { Link } from '../router/router.tsx';
import { useSleep } from '../db/sleep.ts';
import type { DayLog, SleepNight } from '../db/types.ts';
import { CHART_MINUTES, averageMinutes, barHours, lengthText, recentBars } from '../lib/sleep.ts';

/**
 * Sleep on Activity (SLEEP-LOG): the last 7 nights' average and the last 30 as a strip of small bars; it opens the
 * Sleep screen. Sleep is not study time: it takes no part in the streak or the heatmap.
 */
function SleepTile({ nights, today }: { nights: SleepNight[] | undefined; today: string }) {
  if (!nights) return null;
  const strip = recentBars(nights, today, 30);
  const average = averageMinutes(recentBars(nights, today, 7));
  const logged = strip.filter((b) => b.minutes !== null);
  // The strip, for screen readers: how many of the 30 nights are logged, and their range.
  const strip30 =
    '· ' +
    logged.length +
    ' of the last 30 nights logged, ' +
    (strip.length - logged.length) +
    ' no entry' +
    (logged.length > 0 ? ', from ' + barHours(Math.min(...logged.map((b) => b.minutes!))) + ' to ' + barHours(Math.max(...logged.map((b) => b.minutes!))) + ' hours' : '');
  return (
    <Link to="/sleep" className="tile mt-4 flex flex-col gap-2.5 p-[18px]">
      <span className="flex items-baseline justify-between gap-3">
        <span className="section-label mb-0">Sleep</span>
        <span className="text-meta text-ink2">
          {average === null ? 'Log a night' : 'last 7 nights · average ' + lengthText(average)}
          <span className="sr-only">{strip30}</span>
        </span>
      </span>
      {/* A night with an entry is a bar (last night in ice); a night with none, a short faint dash on the baseline. */}
      <span aria-hidden="true" className="flex h-10 items-end gap-[3px]">
        {strip.map((b) =>
          b.minutes === null ? (
            <span key={b.date} className="h-[3px] flex-1 rounded-pill bg-dash" />
          ) : (
            <span key={b.date} className="flex-1 rounded-[3px]" style={{ height: Math.min(1, b.minutes / CHART_MINUTES) * 100 + '%', background: b.date === today ? 'var(--ice)' : 'var(--deco)' }} />
          ),
        )}
      </span>
      <span aria-hidden="true" className="-mt-1 flex justify-between text-small text-ink2">
        <span>30 nights ago</span>
        <span>last night</span>
      </span>
    </Link>
  );
}

/**
 * "All years" (HEATMAP-FULL-YEAR): one compact row a year, January to December as twelve blocks shaded by the
 * month's hours (on the heatmap's ramp, against the busiest month of them all); months still ahead are faint outlines.
 * A row opens its year.
 */
function AllYears({ years, logs, today, onOpen }: { years: number[]; logs: DayLog[]; today: string; onOpen: (year: number) => void }) {
  const totals = years.map((y) => monthlyTotals(logs, y));
  const busiest = Math.max(1, ...totals.flat());
  const thisMonth = today.slice(0, 7);
  return (
    <section aria-labelledby="heatmap-all" className="tile mt-[18px] flex flex-col gap-1 p-[18px]">
      <div className="flex items-center justify-between gap-2 pb-1">
        <h2 id="heatmap-all" className="section-label mb-0">
          All years
        </h2>
        <HeatLegend />
      </div>
      <div aria-hidden="true" className="ml-14 grid grid-cols-12 gap-[3px] text-small text-ink2">
        {Array.from({ length: 12 }, (_, m) => (
          <span key={m} className="text-center">
            {monthName(m, true).slice(0, 1)}
          </span>
        ))}
      </div>
      {years.map((y, i) => {
        const months = totals[i]!;
        const total = months.reduce((sum, m) => sum + m, 0);
        const busy = months.map((m, k) => (m > 0 ? monthName(k, true) + ' ' + hours(m) : null)).filter(Boolean);
        return (
          <button key={y} type="button" onClick={() => onOpen(y)} className="flex min-h-11 items-center gap-2 rounded-box text-left" aria-label={y + ': ' + hours(total) + (busy.length ? ' (' + busy.join(', ') + ')' : '') + '. Open ' + y}>
            <span className="w-12 shrink-0 text-meta font-semibold">{y}</span>
            <span aria-hidden="true" className="grid flex-1 grid-cols-12 gap-[3px]">
              {months.map((m, k) => {
                const key = y + '-' + String(k + 1).padStart(2, '0');
                const level = m === 0 ? 0 : Math.min(4, Math.ceil((4 * m) / busiest));
                return <span key={k} title={monthName(k) + ' ' + y + ': ' + hours(m)} className={'h-4 rounded-cell ' + (key > thisMonth ? 'heat-bg-future' : 'heat-swatch-' + level)} />;
              })}
            </span>
          </button>
        );
      })}
    </section>
  );
}

/**
 * Activity: the year as a heatmap (year chips underneath, a track filter), the three numbers in one
 * sentence, and the last seven days. A day opens in a sheet to correct.
 */
export function Activity() {
  const atlas = useAtlas();
  const [yearParam, setYear] = useQueryParam('year');
  const [trackParam, setTrack] = useQueryParam('track');
  const [view, setView] = useQueryParam('view');
  const [open, setOpen] = useState<string | null>(null);
  const [pickingTrack, setPickingTrack] = useState(false);
  const reviews = useLiveQuery(() => db.reviews.where('kind').equals('week').toArray(), []);
  const anyChallenge = (useLiveQuery(() => db.challenges.count(), []) ?? 0) > 0;
  const nights = useSleep();
  const logs = atlas?.logs;
  const atlasDates = useMemo(() => (logs ?? []).filter((log) => log.entries.some((e) => e.minutes > 0)).map((log) => log.date), [logs]);

  if (!atlas || !logs) {
    return (
      <Screen title="Activity">
        <Header title="Activity" />
      </Screen>
    );
  }

  const { seed, settings } = atlas;
  const now = todayDate();
  const planStart = seed.phases[0]!.start;
  const planEnd = seed.phases.at(-1)!.end;
  const years = planYears(planStart, planEnd);
  const currentYear = Number(now.slice(0, 4));
  const allYears = yearParam === 'all';
  const year = yearParam && years.includes(Number(yearParam)) ? Number(yearParam) : years.includes(currentYear) ? currentYear : years[0]!;
  // As in the mockup, the chips reach two years ahead; the rest of the plan is under "All years".
  const yearChips = years.filter((y) => y <= Math.max(currentYear, years[0]!) + 2);
  // The whole calendar year, like GitHub's: days before the plan or still ahead are simply empty.
  const range = { from: year + '-01-01', to: year + '-12-31' };
  const track = seed.tracks.find((t) => t.id === trackParam);
  const weekStartsOn = settings.core.weekStartsOn;
  const gridFor = (y: number) =>
    buildGrid({
      from: y + '-01-01',
      to: y + '-12-31',
      logs,
      thresholds: settings.core.heatmapThresholds,
      tracks: track ? [track.id as TrackId] : [],
      weekStartsOn,
      mode: settings.core.heatmapMode,
      planned,
    });

  const rules = settings.core.streak;
  const planned = plannedFor(settings);
  const streakState = streak(logs, rules, now, planned);
  const freezesLeft = Math.max(0, rules.freezesPerMonth - freezesSpentInMonth(logs, rules, now, planned));
  const logged = logs.reduce((sum, log) => sum + totalMinutes(log), 0);
  const reviewedOn = new Set((reviews ?? []).map((r) => r.completedAt).filter(Boolean));

  const cellLabel = (cell: HeatCell): string => {
    const parts = [dateTitle(cell.date) + ': ' + (cell.minutes > 0 ? span(cell.minutes) : 'nothing logged')];
    if (track && cell.totalMinutes > cell.minutes) parts.push(span(cell.totalMinutes) + ' on all tracks');
    if (cell.frozen) parts.push('freeze day');
    return parts.join(', ');
  };

  const lastWeek = Array.from({ length: 7 }, (_, i) => addDays(now, -i)).filter((d) => d >= planStart || logs.some((l) => l.date === d));
  const dayRow = (date: string): { title: string; meta: string; minutes: number } => {
    const log = logs.find((l) => l.date === date);
    const scheduled = resolveDay(date, settings).blocks;
    const done = scheduled.filter((b) => isBlockDone(log, b.id)).length;
    const blocks = done + ' of ' + scheduled.length + ' blocks done';
    const meta = log?.frozen ? 'Freeze day' : reviewedOn.has(date) ? 'Review written · ' + done + ' of ' + scheduled.length : blocks;
    const title = date === now ? 'Today' : dateTitle(date).split(' ')[0]!;
    return { title, meta, minutes: totalMinutes(log) };
  };

  return (
    <Screen title="Activity">
      <Header title="Activity" sub={'Since ' + longDate(planStart) + ' · longest streak ' + plural(streakState.longest, 'day')} />
      <div className="mt-[18px] grid grid-cols-2 gap-4">
        <section aria-label="Logged" className="tile flex flex-col items-center gap-2 px-3 py-[18px] text-center">
          <h2 className="section-label mb-0">Logged</h2>
          <p className="well-ice rounded-[14px] px-4 py-1 text-big font-semibold leading-tight">{hours(logged)}</p>
        </section>
        <section aria-label="Streak" className="tile flex flex-col items-center gap-2 px-3 py-[18px] text-center">
          <h2 className="section-label mb-0">Streak</h2>
          <p className="well-blue rounded-[14px] px-4 py-1 text-big font-semibold leading-tight text-blue-deep">{plural(streakState.current, 'day')}</p>
          <p className="text-meta text-ink2">{plural(freezesLeft, 'freeze') + ' left this month'}</p>
        </section>
      </div>

      <SleepTile nights={nights} today={now} />

      {/* Projects is a view of its own once there is something to show; a fresh install keeps the mockup. */}
      {(anyChallenge || view === 'projects') && (
        <div className="mt-5">
          <SegmentedControl
            label="View"
            value={view === 'projects' ? view : 'time'}
            options={[
              { value: 'time', label: 'Time' },
              { value: 'projects', label: 'Projects' },
            ]}
            onChange={(v) => setView(v === 'time' ? null : v)}
          />
        </div>
      )}

      {view === 'projects' ? (
        <ProjectsActivity atlas={atlas} />
      ) : (
        <>
          {allYears ? (
            <AllYears years={years} logs={logs} today={now} onOpen={(y) => setYear(y === currentYear ? null : String(y))} />
          ) : (
            (() => {
              const grid = gridFor(year);
              return (
                <section aria-labelledby={'heatmap-' + year} className="tile mt-[18px] flex flex-col gap-3 p-[18px]">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id={'heatmap-' + year} className="section-label mb-0">
                      {year}
                      {track ? ' · ' + track.name : ''}
                    </h2>
                    <HeatLegend />
                  </div>
                  <Heatmap
                    cells={grid.cells}
                    columns={grid.columns}
                    months={grid.months}
                    title={'Time logged in ' + year + (track ? ' on ' + track.name : '')}
                    label={cellLabel}
                    onSelect={setOpen}
                    selected={open ?? undefined}
                    mark={planStart.startsWith(String(year)) ? { date: planStart, label: 'Plan started ' + Number(planStart.slice(8, 10)) + ' ' + monthName(Number(planStart.slice(5, 7)) - 1, true) } : undefined}
                  />
                </section>
              );
            })()
          )}

          <div className="mt-[18px]">
            <Chips
              label="Year and track"
              items={[
                ...yearChips.map((y) => ({ key: String(y), label: String(y), pressed: !allYears && y === year, onClick: () => setYear(y === currentYear ? null : String(y)) })),
                { key: 'all', label: 'All years', pressed: allYears, onClick: () => setYear(allYears ? null : 'all') },
                { key: 'track', label: track ? track.name : 'By track', pressed: Boolean(track), end: true, onClick: () => setPickingTrack(true) },
              ]}
            />
          </div>

          {settings.github.showCalendar && !allYears && (
            <div className="mt-4">
              <GithubCalendar from={range.from} to={range.to} year={String(year)} weekStartsOn={weekStartsOn} username={settings.github.username} atlasDates={atlasDates} clock={settings.layout.general.clock} />
            </div>
          )}

          {logged === 0 ? (
            <EmptyState action={<Button to="/">Go to Today</Button>}>Nothing logged yet. Log an hour on Today and the first square lights up.</EmptyState>
          ) : (
            <RowList flat label="Last 7 days" className="mt-[18px]">
              {lastWeek.map((date) => {
                const row = dayRow(date);
                return <Row key={date} height={48} icon={<IconTile icon="clock" tone={date === now ? 'ice' : 'blue'} />} title={row.title} meta={row.meta} trailing={span(row.minutes)} onClick={() => setOpen(date)} />;
              })}
            </RowList>
          )}
        </>
      )}

      <RowList flat label="More" className="mt-[18px]">
        <Row height={48} icon={<IconTile icon="reviews" tone="ice" />} title="Weekly reviews" meta="What worked, what didn't, what changes" to="/reviews" chevron />
        <Row height={48} icon={<IconTile icon="stats" />} title="Stats" meta="Hours per track and block, pace against the plan" to="/stats" chevron />
      </RowList>

      <DaySheet date={open} title={open ? dateTitle(open) : ''} onClose={() => setOpen(null)} seed={seed} blocks={settings.core.blocks} />

      <PickerSheet
        open={pickingTrack}
        title="Track"
        searchLabel="Search tracks"
        value={track?.id ?? null}
        clearLabel="Every track"
        options={seed.tracks.map((t) => ({ value: t.id, label: t.name, keywords: t.summary }))}
        onPick={(v) => setTrack(v)}
        onClose={() => setPickingTrack(false)}
      />
    </Screen>
  );
}
