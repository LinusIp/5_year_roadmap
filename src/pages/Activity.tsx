import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Heatmap, HeatmapYear } from '../components/Heatmap.tsx';
import { Icon } from '../components/Icon.tsx';
import { EmptyState, Page } from '../components/Page.tsx';
import { TrackDot, trackColor } from '../components/TrackDot.tsx';
import { db } from '../db/db.ts';
import { useSettings } from '../db/settings.ts';
import { addDays, formatHours, formatLong, formatMinutes, today as todayDate } from '../lib/dates.ts';
import { dayDetail, minutesPerBlock, minutesPerTrack, planYears, yearRange } from '../lib/heatmap.ts';
import { freezesSpentInMonth, streak } from '../lib/streaks.ts';
import { seed } from '../seed/index.ts';
import type { TrackId } from '../seed/schema.ts';
import { Link, useQueryParam } from '../router/router.tsx';

const ALL_YEARS = 'all';

function titleOf(refId: string): string {
  return (
    seed.resources.find((r) => r.id === refId)?.title ??
    seed.projects.find((p) => p.id === refId)?.title ??
    seed.papers.find((p) => p.id === refId)?.title ??
    refId
  );
}

function Counter({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: 'flame' | 'clock' | 'snowflake' | 'target' }) {
  return (
    <div className="card px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        {icon && <Icon name={icon} size={13} className="text-ink-3" />}
        <span className="eyebrow">{label}</span>
      </div>
      <div className="num mt-0.5 text-lg font-semibold leading-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

export function Activity() {
  const settings = useSettings(seed.settings);
  const logs = useLiveQuery(() => db.dayLogs.toArray(), []);
  const [yearParam, setYear] = useQueryParam('year');
  const [trackParam, setTrack] = useQueryParam('track');
  const [selected, setSelected] = useState<string>();

  const planStart = seed.phases[0]!.start;
  const planEnd = seed.phases.at(-1)!.end;
  const years = useMemo(() => planYears(planStart, planEnd), [planStart, planEnd]);
  const now = todayDate();
  const currentYear = Number(now.slice(0, 4));
  const view = yearParam ?? String(years.includes(currentYear) ? currentYear : years[0]);
  const tracks: TrackId[] = trackParam ? [trackParam as TrackId] : [];

  const selectedLog = useLiveQuery(async () => (selected ? db.dayLogs.get(selected) : undefined), [selected]);

  if (!settings || !logs) {
    return (
      <Page title="Activity">
        <p className="text-sm text-ink-3">Loading…</p>
      </Page>
    );
  }

  const thresholds = settings.core.heatmapThresholds;
  const weekStartsOn = settings.core.weekStartsOn;
  const streakState = streak(logs, settings.core.streak, now);
  const freezesUsed = freezesSpentInMonth(logs, settings.core.streak, now);
  const trackTotals = minutesPerTrack(logs);
  const blockTotals = minutesPerBlock(logs);
  const grandTotal = trackTotals.reduce((sum, t) => sum + t.minutes, 0);
  const detail = selected ? dayDetail(selectedLog, selected) : null;

  const range = view === ALL_YEARS ? { from: planStart, to: planEnd } : yearRange(Number(view), planStart, planEnd);

  return (
    <Page
      title="Activity"
      lead="Every day of the five years, at a glance."
      actions={
        <div className="flex flex-wrap items-center gap-1">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              className={'btn btn-sm num' + (view === String(year) ? ' btn-primary' : '')}
              aria-pressed={view === String(year)}
              onClick={() => setYear(String(year))}
            >
              {year}
            </button>
          ))}
          <button
            type="button"
            className={'btn btn-sm' + (view === ALL_YEARS ? ' btn-primary' : '')}
            aria-pressed={view === ALL_YEARS}
            onClick={() => setYear(ALL_YEARS)}
          >
            All 5 years
          </button>
        </div>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Counter
          icon="flame"
          label="Current streak"
          value={streakState.current + (streakState.current === 1 ? ' day' : ' days')}
          sub={streakState.atRisk ? 'At risk today' : streakState.startedOn ? 'Since ' + formatLong(streakState.startedOn).split(', ')[1] : undefined}
        />
        <Counter icon="target" label="Longest streak" value={streakState.longest + (streakState.longest === 1 ? ' day' : ' days')} />
        <Counter icon="clock" label="Total logged" value={formatHours(grandTotal, 0)} sub={logs.length + ' days with a log'} />
        <Counter
          icon="snowflake"
          label="Freezes this month"
          value={freezesUsed + ' of ' + settings.core.streak.freezesPerMonth}
          sub={settings.core.streak.autoFreeze ? 'Spent automatically' : 'Spent by hand'}
        />
      </div>

      <section className="card mb-4 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Icon name="filter" size={14} className="text-ink-3" />
          <button
            type="button"
            className={'btn btn-sm' + (tracks.length === 0 ? ' btn-primary' : '')}
            aria-pressed={tracks.length === 0}
            onClick={() => setTrack(null)}
          >
            All tracks
          </button>
          {seed.tracks.map((track) => {
            const active = trackParam === track.id;
            const minutes = trackTotals.find((t) => t.track === track.id)?.minutes ?? 0;
            return (
              <button
                key={track.id}
                type="button"
                className={'btn btn-sm gap-1.5' + (active ? ' btn-primary' : '')}
                aria-pressed={active}
                onClick={() => setTrack(active ? null : track.id)}
                title={track.summary + ' · ' + formatMinutes(minutes) + ' logged'}
              >
                <span
                  aria-hidden="true"
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{ background: active ? 'currentColor' : trackColor(track.slot) }}
                />
                {track.name}
              </button>
            );
          })}
        </div>

        {view === ALL_YEARS ? (
          <div className="divide-y divide-line">
            {years.map((year) => {
              const yr = yearRange(year, planStart, planEnd);
              return (
                <HeatmapYear
                  key={year}
                  year={year}
                  from={yr.from}
                  to={yr.to}
                  logs={logs}
                  thresholds={thresholds}
                  tracks={tracks}
                  weekStartsOn={weekStartsOn}
                  onSelect={setSelected}
                  selected={selected}
                />
              );
            })}
          </div>
        ) : (
          <Heatmap
            from={range.from}
            to={range.to}
            logs={logs}
            thresholds={thresholds}
            tracks={tracks}
            weekStartsOn={weekStartsOn}
            onSelect={setSelected}
            selected={selected}
            title={'Activity in ' + view}
          />
        )}
      </section>

      {detail && (
        <section className="card mb-4 p-4">
          <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{formatLong(detail.date)}</h2>
            <div className="flex items-center gap-1">
              <Link to={'/?date=' + detail.date} className="btn btn-sm">
                <Icon name="edit" size={13} />
                Edit this day
              </Link>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelected(undefined)} aria-label="Close this day">
                <Icon name="x" size={14} />
              </button>
            </div>
          </header>

          {detail.totalMinutes === 0 && !detail.frozen ? (
            <p className="text-sm text-ink-3">Nothing logged.</p>
          ) : (
            <>
              <p className="num text-sm text-ink-2">
                {formatMinutes(detail.totalMinutes)}
                {detail.frozen && <span className="ml-2 text-accent-text">· freeze day</span>}
                {detail.energy && <span className="ml-2 text-ink-3">· energy {detail.energy}/5</span>}
              </p>
              {detail.byBlock.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {detail.byBlock.map((entry) => (
                    <li key={entry.block} className="chip num">
                      Block {entry.block} · {formatMinutes(entry.minutes)}
                    </li>
                  ))}
                </ul>
              )}
              {detail.refIds.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-sm text-ink-2">
                  {detail.refIds.map((refId) => (
                    <li key={refId} className="truncate">
                      {titleOf(refId)}
                    </li>
                  ))}
                </ul>
              )}
              {detail.notes.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-sm text-ink-3">
                  {detail.notes.map((note, i) => (
                    <li key={i} className="truncate">
                      {note}
                    </li>
                  ))}
                </ul>
              )}
              {detail.reflection && <p className="mt-2 border-l-2 border-line pl-2 text-sm italic text-ink-2">{detail.reflection}</p>}
            </>
          )}
        </section>
      )}

      {grandTotal === 0 ? (
        <EmptyState icon="activity" title="Nothing logged yet" action={<Link to="/" className="btn btn-primary">Go to Today</Link>}>
          Log an hour on Today and the first square lights up. Five years of them fit on this page.
        </EmptyState>
      ) : (
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Hours per track</h2>
          <ul className="space-y-2">
            {trackTotals.map((total) => {
              const track = seed.tracks.find((t) => t.id === total.track);
              return (
                <li key={total.track} className="flex items-center gap-2">
                  <TrackDot track={track} />
                  <span className="w-36 shrink-0 truncate text-sm">{track?.name ?? total.track}</span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-raised">
                    <div
                      className="h-full rounded-full"
                      style={{ width: Math.max(2, total.share * 100) + '%', background: track ? trackColor(track.slot) : 'var(--accent-fill)' }}
                    />
                  </div>
                  <span className="num w-16 shrink-0 text-right text-sm text-ink-2">{formatHours(total.minutes, 0)}</span>
                </li>
              );
            })}
          </ul>

          <h2 className="mb-2 mt-4 text-sm font-semibold">Hours per block</h2>
          <ul className="flex flex-wrap gap-1.5">
            {settings.core.blocks.map((block) => (
              <li key={block.id} className="chip num" title={block.name}>
                {block.id} · {formatHours(blockTotals[block.id], 0)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}

/** The date range of the last 12 weeks, for the small heatmap that Today could show later. */
export function recentRange(from: string = todayDate()): { from: string; to: string } {
  return { from: addDays(from, -83), to: from };
}
