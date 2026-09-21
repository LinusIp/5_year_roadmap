import { useEffect, useMemo, useState } from 'react';
import { GridSvg, LevelLegend } from './Heatmap.tsx';
import { Icon } from './Icon.tsx';
import { refreshCalendar, useCachedCalendar, useGithubConnected } from '../db/github.ts';
import type { RefreshOutcome } from '../db/github.ts';
import { dayName, formatShort, toIsoDate } from '../lib/dates.ts';
import { buildContributionGrid, calendarQueryRange, compareDays, LEVEL_TITLES } from '../lib/github.ts';
import type { ContributionCell } from '../lib/github.ts';
import { Link } from '../router/router.tsx';

function cellLabel(cell: ContributionCell): string {
  const head = dayName(cell.date, true) + ' ' + formatShort(cell.date);
  if (cell.count === 0) return head + ': no contributions';
  return head + ': ' + cell.count + (cell.count === 1 ? ' contribution' : ' contributions');
}

function timeOf(epochMs: number): string {
  const d = new Date(epochMs);
  return formatShort(toIsoDate(d), new Date().getFullYear()) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export interface GitHubCalendarProps {
  from: string;
  to: string;
  year: string;
  weekStartsOn: 0 | 1;
  username: string;
  /** Days with Atlas time, for "both on N days". */
  atlasDates: string[];
}

/**
 * The user's real GitHub contribution calendar, over exactly the range of the Atlas heatmap above it. Drawn
 * from the cache at once; refreshed from GitHub when the cache is over an hour old, or on request.
 */
export function GitHubCalendar({ from, to, year, weekStartsOn, username, atlasDates }: GitHubCalendarProps) {
  const connected = useGithubConnected();
  const cached = useCachedCalendar(from, to);
  const [outcome, setOutcome] = useState<RefreshOutcome | 'loading'>();
  // A year still ahead has nothing on GitHub, so it is not asked about.
  const started = calendarQueryRange(from, to) !== null;

  useEffect(() => {
    if (!connected || !started) return;
    let live = true;
    setOutcome('loading');
    void refreshCalendar(from, to).then((result) => {
      if (live) setOutcome(result);
    });
    return () => {
      live = false;
    };
  }, [connected, started, from, to]);

  const grid = useMemo(() => buildContributionGrid(from, to, cached?.days ?? [], weekStartsOn), [from, to, cached, weekStartsOn]);
  const overlap = useMemo(() => compareDays(atlasDates, cached?.days ?? [], from, to), [atlasDates, cached, from, to]);

  if (connected === undefined || cached === undefined) return null;

  const refresh = (): void => {
    setOutcome('loading');
    void refreshCalendar(from, to, { force: true }).then(setOutcome);
  };

  return (
    <section className="mt-4 border-t border-line pt-4" aria-labelledby="github-calendar-title">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 id="github-calendar-title" className="text-sm font-semibold">
            GitHub contributions
            {username && ' '}
            {username && <span className="font-normal text-ink-3">@{username}</span>}
          </h2>
          {cached && cached.days.length > 0 && (
            <p className="num mt-0.5 text-xs text-ink-3">
              {grid.total} {grid.total === 1 ? 'contribution' : 'contributions'} on {grid.activeDays} {grid.activeDays === 1 ? 'day' : 'days'} ·
              both calendars active on {overlap.both} of {overlap.atlas} Atlas {overlap.atlas === 1 ? 'day' : 'days'}
            </p>
          )}
        </div>
        {connected && started && (
          <button type="button" className="btn btn-sm" onClick={refresh} disabled={outcome === 'loading'}>
            <Icon name="refresh" size={13} />
            {outcome === 'loading' ? 'Updating…' : 'Refresh'}
          </button>
        )}
      </header>

      {!connected ? (
        <p className="text-sm text-ink-2">
          Your GitHub calendar needs a token, and a token is never part of a backup.{' '}
          <Link to="/settings?section=github" className="text-accent-text underline underline-offset-2">
            Add it in Settings
          </Link>
          .
        </p>
      ) : !started ? (
        <p className="text-sm text-ink-3">{year} has not started yet, so there is nothing to compare.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <GridSvg
              cells={grid.cells}
              columns={grid.columns}
              months={grid.months}
              weekStartsOn={weekStartsOn}
              title={'GitHub contributions in ' + year}
              label={cellLabel}
            />
            <LevelLegend titles={LEVEL_TITLES}>
              <span className="ml-2 hidden sm:inline">GitHub's own scale</span>
            </LevelLegend>
          </div>
          <p className="mt-2 text-xs text-ink-3" role="status">
            {outcome === 'loading'
              ? cached
                ? 'Checking GitHub for anything new…'
                : 'Fetching your calendar from GitHub…'
              : outcome && outcome.status === 'failed'
                ? outcome.message + (cached ? ' Showing the copy from ' + timeOf(cached.fetchedAt) + '.' : '')
                : cached
                  ? 'Updated ' + timeOf(cached.fetchedAt) + '.'
                  : ''}
            {outcome && typeof outcome === 'object' && outcome.status === 'failed' && outcome.reason === 'unauthorized' && (
              <>
                {' '}
                <Link to="/settings?section=github" className="text-accent-text underline underline-offset-2">
                  Update the token in Settings
                </Link>
                .
              </>
            )}
          </p>
        </>
      )}
    </section>
  );
}
