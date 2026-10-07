import { useEffect, useMemo, useState } from 'react';
import { refreshCalendar, useCachedCalendar, useGithubConnected } from '../../db/github.ts';
import type { RefreshOutcome } from '../../db/github.ts';
import { dayName, formatShort, toIsoDate } from '../../lib/dates.ts';
import { buildContributionGrid, calendarQueryRange, compareDays } from '../../lib/github.ts';
import type { ContributionCell } from '../../lib/github.ts';
import { Link } from '../../router/router.tsx';
import { Button } from '../../ui/Button.tsx';
import { HeatLegend, Heatmap } from '../../ui/Heatmap.tsx';
import { plural } from './text.ts';

function cellLabel(cell: ContributionCell): string {
  const head = dayName(cell.date) + ' ' + formatShort(cell.date);
  return head + ': ' + (cell.count === 0 ? 'no contributions' : plural(cell.count, 'contribution'));
}

function timeOf(epochMs: number): string {
  const d = new Date(epochMs);
  return formatShort(toIsoDate(d), new Date().getFullYear()) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/**
 * The user's GitHub contribution calendar over exactly the year of the heatmap above it, column for column.
 * Drawn from the cache at once; refreshed from GitHub when the copy is over an hour old, or on request.
 */
export function GithubCalendar({ from, to, year, weekStartsOn, username, atlasDates }: { from: string; to: string; year: string; weekStartsOn: 0 | 1; username: string; atlasDates: string[] }) {
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

  const status =
    outcome === 'loading'
      ? cached
        ? 'Checking GitHub for anything new…'
        : 'Fetching your calendar from GitHub…'
      : outcome && outcome.status === 'failed'
        ? outcome.message + (cached ? ' Showing the copy from ' + timeOf(cached.fetchedAt) + '.' : '')
        : cached
          ? 'Updated ' + timeOf(cached.fetchedAt) + '.'
          : '';

  return (
    <section aria-labelledby="github-title" className="rounded-card bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="github-title" className="text-meta font-medium">
          GitHub{username ? ' @' + username : ''}
        </h2>
        {connected && started && <HeatLegend />}
      </div>

      {!connected ? (
        <p className="text-meta text-ink2">
          The GitHub calendar needs a token, and a token is never part of a backup.{' '}
          <Link to="/settings?section=github" className="text-accent">
            Add it in Settings
          </Link>
          .
        </p>
      ) : !started ? (
        <p className="text-meta text-ink2">{year} has not started yet, so there is nothing to compare.</p>
      ) : (
        <>
          <Heatmap cells={grid.cells} columns={grid.columns} months={grid.months} title={'GitHub contributions in ' + year} label={cellLabel} />
          {cached && cached.days.length > 0 && (
            <p className="mt-3 text-meta text-ink2">
              {plural(grid.total, 'contribution')} on {plural(grid.activeDays, 'day')} · both on {overlap.both} of {plural(overlap.atlas, 'Atlas day')}
            </p>
          )}
          <p className="mt-1 text-meta text-ink2" role="status">
            {status}
            {outcome && typeof outcome === 'object' && outcome.status === 'failed' && outcome.reason === 'unauthorized' && (
              <>
                {' '}
                <Link to="/settings?section=github" className="text-accent">
                  Update the token in Settings
                </Link>
                .
              </>
            )}
          </p>
          <Button
            className="mt-2"
            icon="refresh"
            aria-disabled={outcome === 'loading' || undefined}
            onClick={() => {
              if (outcome === 'loading') return;
              setOutcome('loading');
              void refreshCalendar(from, to, { force: true }).then(setOutcome);
            }}
          >
            {outcome === 'loading' ? 'Updating' : 'Refresh'}
          </Button>
        </>
      )}
    </section>
  );
}
