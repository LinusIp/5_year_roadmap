import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Icon } from '../components/Icon.tsx';
import { Page } from '../components/Page.tsx';
import { db } from '../db/db.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import type { Atlas } from '../hooks/useAtlas.ts';
import { formatHours, formatMinutes, formatRange, monthName, today as todayDate } from '../lib/dates.ts';
import { buildPlanItemView, laneProgress, phaseProgress } from '../lib/progress.ts';
import { replan } from '../lib/replan.ts';
import { monthRange, monthsSoFar, summarise, weekRange, weeksSoFar, WEEKLY_PROMPTS } from '../lib/reviews.ts';
import type { PeriodSummary } from '../lib/reviews.ts';
import { activePhase, lane } from '../lib/schedule.ts';
import type { Review } from '../db/types.ts';
import { Link, useQueryParam } from '../router/router.tsx';

async function saveReview(id: string, base: Omit<Review, 'id'>, change: (r: Review) => Review): Promise<void> {
  await db.transaction('rw', db.reviews, async () => {
    const current = (await db.reviews.get(id)) ?? ({ id, ...base } as Review);
    await db.reviews.put(change(current));
  });
}

function Numbers({ summary, atlas }: { summary: PeriodSummary; atlas: Atlas }) {
  const percent = summary.targetMinutes > 0 ? Math.round((summary.totalMinutes / summary.targetMinutes) * 100) : 0;
  const titleOf = (id: string): string => atlas.seed.resources.find((r) => r.id === id)?.title ?? atlas.seed.projects.find((p) => p.id === id)?.title ?? id;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-line px-3 py-2">
          <div className="eyebrow">Logged</div>
          <div className="num text-base font-semibold">{formatHours(summary.totalMinutes)}</div>
          <div className="num text-xs text-ink-3">
            {percent}% of {formatHours(summary.targetMinutes, 0)}
          </div>
        </div>
        <div className="rounded-lg border border-line px-3 py-2">
          <div className="eyebrow">Days counted</div>
          <div className="num text-base font-semibold">
            {summary.daysCounted} of {summary.days}
          </div>
        </div>
        <div className="rounded-lg border border-line px-3 py-2">
          <div className="eyebrow">Finished</div>
          <div className="num text-base font-semibold">{summary.itemsFinished.length}</div>
        </div>
        <div className="rounded-lg border border-line px-3 py-2">
          <div className="eyebrow">Energy</div>
          <div className="num text-base font-semibold">{summary.averageEnergy !== null ? summary.averageEnergy.toFixed(1) + ' / 5' : '—'}</div>
        </div>
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label="Minutes per block">
        {atlas.settings.core.blocks.map((b) => (
          <li key={b.id} className="chip num" title={b.name}>
            {b.id} · {formatMinutes(summary.minutesByBlock[b.id])}
          </li>
        ))}
      </ul>
      {summary.itemsFinished.length > 0 && (
        <ul className="space-y-0.5 text-sm">
          {summary.itemsFinished.map((id) => (
            <li key={id} className="flex items-center gap-1.5">
              <Icon name="check" size={13} className="text-good-text" />
              <Link to={'/library/' + id} className="hover:text-accent-text">
                {titleOf(id)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Prompt({ label, placeholder, value, onSave }: { label: string; placeholder: string; value: string | undefined; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea
        className="input"
        rows={2}
        value={draft ?? value ?? ''}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null && draft !== (value ?? '')) onSave(draft);
          setDraft(null);
        }}
      />
    </label>
  );
}

function WeekReview({ atlas, weekStart, review, open, onToggle }: { atlas: Atlas; weekStart: string; review: Review | undefined; open: boolean; onToggle: () => void }) {
  const { start, end } = weekRange(weekStart, atlas.settings.core.weekStartsOn);
  const summary = summarise(start, end, atlas.logs, atlas.seed, atlas.states, atlas.settings);
  const id = 'week:' + start;
  const base = { kind: 'week' as const, periodStart: start };
  const done = Boolean(review?.completedAt);
  const isCurrent = todayDate() >= start && todayDate() <= end;

  return (
    <article className="card">
      <button type="button" className="flex w-full items-center gap-3 p-4 text-left hover:bg-raised/40" onClick={onToggle} aria-expanded={open}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} className="text-ink-3" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Week of {formatRange(start, end)}</h3>
          <p className="num text-xs text-ink-3">
            {formatHours(summary.totalMinutes)} logged · {summary.itemsFinished.length} finished
          </p>
        </div>
        {isCurrent && <span className="chip border-accent/50 text-accent-text">This week</span>}
        {done ? <span className="chip border-good/40 text-good-text">Reviewed</span> : !isCurrent && summary.totalMinutes > 0 && <span className="chip">Not reviewed</span>}
      </button>
      {open && (
        <div className="space-y-4 border-t border-line p-4">
          <Numbers summary={summary} atlas={atlas} />
          <div className="grid gap-3 md:grid-cols-3">
            {WEEKLY_PROMPTS.map((prompt) => (
              <Prompt
                key={prompt.key}
                label={prompt.label}
                placeholder={prompt.placeholder}
                value={review?.[prompt.key]}
                onSave={(v) =>
                  void saveReview(id, base, (r) => {
                    const next = { ...r };
                    if (v.trim()) next[prompt.key] = v;
                    else delete next[prompt.key];
                    return next;
                  })
                }
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {done ? (
              <p className="text-sm text-good-text">
                <Icon name="check" size={14} className="mr-1 inline" />
                Reviewed on {review!.completedAt}
              </p>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() =>
                  void saveReview(id, base, (r) => ({
                    ...r,
                    completedAt: todayDate(),
                    // Keep the numbers as they stood, so a later edit to the logs does not rewrite history.
                    snapshot: {
                      totalMinutes: summary.totalMinutes,
                      targetMinutes: summary.targetMinutes,
                      minutesByBlock: summary.minutesByBlock,
                      itemsFinished: summary.itemsFinished,
                      daysCounted: summary.daysCounted,
                    },
                  }))
                }
              >
                Mark this week reviewed
              </button>
            )}
            <Link to="/papers" className="btn btn-sm">
              This week&apos;s paper
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}

function MonthReview({ atlas, monthStart, review, open, onToggle }: { atlas: Atlas; monthStart: string; review: Review | undefined; open: boolean; onToggle: () => void }) {
  const { start, end } = monthRange(monthStart);
  const summary = summarise(start, end, atlas.logs, atlas.seed, atlas.states, atlas.settings);
  const id = 'month:' + start.slice(0, 7);
  const base = { kind: 'month' as const, periodStart: start };
  const phase = activePhase(end < todayDate() ? end : todayDate(), atlas.seed.phases);
  const moves = useMemo(() => (open ? replan({ seed: atlas.seed, settings: atlas.settings, states: atlas.states, asOf: todayDate() }).moves.length : 0), [open, atlas]);
  const progress = phase
    ? phaseProgress(
        phase.id,
        atlas.settings.core.blocks.map((b) =>
          laneProgress(
            b.id,
            lane(atlas.seed, phase.id, b.id)
              .map((i) => buildPlanItemView(i, atlas.seed, atlas.states))
              .filter((v) => v !== null),
            0,
          ),
        ),
      )
    : null;
  const shippedAuto = summary.shipped.monthly.length + summary.shipped.capstone.length > 0;
  const shipped = review?.projectShipped ?? shippedAuto;
  const date = new Date(start + 'T00:00:00');

  return (
    <article className="card">
      <button type="button" className="flex w-full items-center gap-3 p-4 text-left hover:bg-raised/40" onClick={onToggle} aria-expanded={open}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} className="text-ink-3" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">
            {monthName(date.getMonth())} {date.getFullYear()}
          </h3>
          <p className="num text-xs text-ink-3">
            {formatHours(summary.totalMinutes)} logged · project {shipped ? 'shipped' : 'not shipped'}
          </p>
        </div>
        {review?.completedAt && <span className="chip border-good/40 text-good-text">Reviewed</span>}
      </button>
      {open && (
        <div className="space-y-4 border-t border-line p-4">
          <Numbers summary={summary} atlas={atlas} />
          {phase && progress && (
            <p className="text-sm">
              <span className="text-ink-3">Phase:</span> <Link to="/roadmap" className="font-medium text-accent-text hover:underline">{phase.title}</Link>
              <span className="num text-ink-2"> · {Math.round(progress.fraction * 100)}% done, {progress.itemsDone} of {progress.itemsTotal} items</span>
            </p>
          )}
          <div className="rounded-lg border border-line bg-raised/40 p-3 text-sm">
            <p className="font-medium">Re-plan suggestion</p>
            <p className="mt-0.5 text-ink-2">
              {moves === 0
                ? 'Everything still fits where it is. No re-plan needed.'
                : 'A re-plan from today would move ' + moves + (moves === 1 ? ' item' : ' items') + ' to fit the hours you actually have.'}
            </p>
            {moves > 0 && (
              <Link to="/roadmap" className="btn btn-sm mt-2">
                Review it on the Roadmap
              </Link>
            )}
          </div>
          <fieldset>
            <legend className="label">Did a monthly project ship?</legend>
            <div className="flex gap-1.5">
              {([true, false] as const).map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  aria-pressed={shipped === value}
                  className={'btn btn-sm' + (shipped === value ? ' btn-primary' : '')}
                  onClick={() => void saveReview(id, base, (r) => ({ ...r, projectShipped: value }))}
                >
                  {value ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
            {review?.projectShipped === undefined && (
              <p className="mt-1 text-xs text-ink-3">Filled in from your projects: {shippedAuto ? 'one was marked done this month' : 'none was marked done this month'}.</p>
            )}
          </fieldset>
          <div className="grid gap-3 md:grid-cols-3">
            {WEEKLY_PROMPTS.map((prompt) => (
              <Prompt
                key={prompt.key}
                label={prompt.label.replace('next week', 'next month')}
                placeholder={prompt.placeholder.replace('week', 'month')}
                value={review?.[prompt.key]}
                onSave={(v) =>
                  void saveReview(id, base, (r) => {
                    const next = { ...r };
                    if (v.trim()) next[prompt.key] = v;
                    else delete next[prompt.key];
                    return next;
                  })
                }
              />
            ))}
          </div>
          {!review?.completedAt && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void saveReview(id, base, (r) => ({ ...r, completedAt: todayDate(), projectShipped: r.projectShipped ?? shippedAuto }))}>
              Mark this month reviewed
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function Reviews() {
  const atlas = useAtlas();
  const reviews = useLiveQuery(async () => new Map((await db.reviews.toArray()).map((r) => [r.id, r])), []);
  const [tab, setTab] = useQueryParam('tab');
  const [openId, setOpenId] = useState<string | null>(null);

  if (!atlas || !reviews) {
    return (
      <Page title="Reviews">
        <p className="text-sm text-ink-3">Loading…</p>
      </Page>
    );
  }

  const asOf = todayDate();
  const planStart = atlas.seed.phases[0]!.start;
  const firstLog = atlas.logs.map((l) => l.date).sort()[0];
  const from = firstLog && firstLog < planStart ? firstLog : planStart;
  const weekStartsOn = atlas.settings.core.weekStartsOn;
  const monthly = tab === 'month';
  const weeks = weeksSoFar(from, asOf < from ? from : asOf, weekStartsOn);
  const months = monthsSoFar(from, asOf < from ? from : asOf);
  const current = monthly ? 'month:' + (months[0] ?? '').slice(0, 7) : 'week:' + (weeks[0] ?? '');
  const expanded = openId ?? current;

  return (
    <Page
      title="Reviews"
      lead="Sunday closes the week; the first days of a month close the month. The numbers fill themselves in."
      actions={
        <div className="flex gap-1" role="tablist" aria-label="Review period">
          <button type="button" role="tab" aria-selected={!monthly} className={'btn btn-sm' + (!monthly ? ' btn-primary' : '')} onClick={() => setTab(null)}>
            Weekly
          </button>
          <button type="button" role="tab" aria-selected={monthly} className={'btn btn-sm' + (monthly ? ' btn-primary' : '')} onClick={() => setTab('month')}>
            Monthly
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {monthly
          ? months.map((m) => {
              const id = 'month:' + m.slice(0, 7);
              return <MonthReview key={id} atlas={atlas} monthStart={m} review={reviews.get(id)} open={expanded === id} onToggle={() => setOpenId(expanded === id ? '' : id)} />;
            })
          : weeks.map((w) => {
              const id = 'week:' + w;
              return <WeekReview key={id} atlas={atlas} weekStart={w} review={reviews.get(id)} open={expanded === id} onToggle={() => setOpenId(expanded === id ? '' : id)} />;
            })}
      </div>
    </Page>
  );
}
