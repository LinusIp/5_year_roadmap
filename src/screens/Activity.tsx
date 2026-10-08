import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { addDays, today as todayDate, weekday } from '../lib/dates.ts';
import { buildGrid, planYears } from '../lib/heatmap.ts';
import type { HeatCell } from '../lib/heatmap.ts';
import { isBlockDone, totalMinutes } from '../lib/logs.ts';
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
import { PickerSheet } from './parts/PickerSheet.tsx';
import { dateTitle, hours, plural, span } from './parts/text.ts';

/**
 * Activity: the year as a heatmap (year chips underneath, a track filter), the three numbers in one
 * sentence, and the last seven days. A day opens in a sheet to correct.
 */
export function Activity() {
  const atlas = useAtlas();
  const [yearParam, setYear] = useQueryParam('year');
  const [trackParam, setTrack] = useQueryParam('track');
  const [open, setOpen] = useState<string | null>(null);
  const [pickingTrack, setPickingTrack] = useState(false);
  const reviews = useLiveQuery(() => db.reviews.where('kind').equals('week').toArray(), []);
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
  const color = track ? 'var(--track-' + track.id + ')' : undefined;
  const weekStartsOn = settings.core.weekStartsOn;
  const gridFor = (y: number) =>
    buildGrid({ from: y + '-01-01', to: y + '-12-31', logs, thresholds: settings.core.heatmapThresholds, tracks: track ? [track.id as TrackId] : [], weekStartsOn });

  const rules = settings.core.streak;
  const streakState = streak(logs, rules, now);
  const freezesLeft = Math.max(0, rules.freezesPerMonth - freezesSpentInMonth(logs, rules, now));
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
    const scheduled = settings.core.blocks.filter((b) => b.days.includes(weekday(date)));
    const done = scheduled.filter((b) => isBlockDone(log, b.id)).length;
    const blocks = done + ' of ' + scheduled.length + ' blocks done';
    const meta = log?.frozen ? 'Freeze day' : reviewedOn.has(date) ? 'Review written · ' + done + ' of ' + scheduled.length : blocks;
    const title = date === now ? 'Today' : dateTitle(date).split(' ')[0]!;
    return { title, meta, minutes: totalMinutes(log) };
  };

  return (
    <Screen title="Activity">
      <Header
        title="Activity"
        sub={hours(logged) + ' logged · longest streak ' + plural(streakState.longest, 'day') + ' · ' + plural(freezesLeft, 'freeze') + ' left this month'}
      />

      {(allYears ? years : [year]).map((y, index) => {
        const grid = gridFor(y);
        return (
          <section key={y} aria-labelledby={'heatmap-' + y} className={(index === 0 ? 'mt-6' : 'mt-3') + ' flex flex-col gap-3 rounded-card bg-surface p-4'}>
            <div className="flex items-center justify-between gap-2">
              <h2 id={'heatmap-' + y} className="text-meta font-medium">
                {y}
                {track ? ' · ' + track.name : ''}
              </h2>
              {index === 0 && <HeatLegend color={color} />}
            </div>
            <Heatmap
              cells={grid.cells}
              columns={grid.columns}
              months={grid.months}
              title={'Time logged in ' + y + (track ? ' on ' + track.name : '')}
              label={cellLabel}
              onSelect={setOpen}
              selected={open ?? undefined}
              color={color}
            />
          </section>
        );
      })}

      <div className="mt-3">
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
          <GithubCalendar from={range.from} to={range.to} year={String(year)} weekStartsOn={weekStartsOn} username={settings.github.username} atlasDates={atlasDates} />
        </div>
      )}

      {logged === 0 ? (
        <EmptyState action={<Button to="/">Go to Today</Button>}>Nothing logged yet. Log an hour on Today and the first square lights up.</EmptyState>
      ) : (
        <RowList flat label="Last 7 days" className="mt-6">
          {lastWeek.map((date) => {
            const row = dayRow(date);
            return <Row key={date} height={48} title={row.title} meta={row.meta} trailing={span(row.minutes)} onClick={() => setOpen(date)} />;
          })}
        </RowList>
      )}

      <RowList flat className="mt-6">
        <Row height={48} title="Weekly reviews" meta="What worked, what didn't, what changes" to="/reviews" />
        <Row height={48} title="Stats" meta="Hours per track and block, pace against the plan" to="/stats" />
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
