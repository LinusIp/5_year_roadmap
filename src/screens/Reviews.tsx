import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.ts';
import type { Review } from '../db/types.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import type { Atlas } from '../hooks/useAtlas.ts';
import { formatRange, monthName, today as todayDate } from '../lib/dates.ts';
import { buildPlanItemView, laneProgress, phaseProgress } from '../lib/progress.ts';
import { replan } from '../lib/replan.ts';
import { monthRange, monthsSoFar, quarterOf, quarterRange, quartersSoFar, summarise, weekRange, weeksSoFar, WEEKLY_PROMPTS } from '../lib/reviews.ts';
import type { PeriodSummary } from '../lib/reviews.ts';
import { activePhase, lane } from '../lib/schedule.ts';
import { useQueryParam } from '../router/router.tsx';
import { Button } from '../ui/Button.tsx';
import { Header } from '../ui/Header.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import { Sheet } from '../ui/Sheet.tsx';
import { TextField } from '../ui/TextField.tsx';
import { LinkField } from './parts/ItemSheet.tsx';
import { blockShort, longDate, plural, shortTitle, span } from './parts/text.ts';

async function saveReview(id: string, base: Omit<Review, 'id'>, change: (r: Review) => Review): Promise<void> {
  await db.transaction('rw', db.reviews, async () => {
    const current = (await db.reviews.get(id)) ?? ({ id, ...base } as Review);
    await db.reviews.put(change(current));
  });
}

/** The numbers of a period in two sentences, then what was finished. */
function Numbers({ summary, atlas }: { summary: PeriodSummary; atlas: Atlas }) {
  const percent = summary.targetMinutes > 0 ? Math.round((summary.totalMinutes / summary.targetMinutes) * 100) : 0;
  const titleOf = (id: string): string => atlas.seed.resources.find((r) => r.id === id)?.title ?? atlas.seed.projects.find((p) => p.id === id)?.title ?? id;
  return (
    <div>
      <p className="text-body">
        {span(summary.totalMinutes)} of {span(summary.targetMinutes)} ({percent}%) · {summary.daysCounted} of {plural(summary.days, 'day')} counted
        {summary.averageEnergy !== null ? ' · energy ' + summary.averageEnergy.toFixed(1) + ' of 5' : ''}
      </p>
      <p className="mt-1 text-meta text-ink2">{atlas.settings.core.blocks.map((b) => blockShort(b.name) + ' ' + span(summary.minutesByBlock[b.id])).join(' · ')}</p>
      {summary.itemsFinished.length > 0 && (
        <RowList label="Finished" className="mt-4">
          {summary.itemsFinished.map((id) => (
            <Row key={id} title={shortTitle(titleOf(id))} to={'/library/' + id} />
          ))}
        </RowList>
      )}
    </div>
  );
}

/** One of the three reflection prompts, saved when it loses focus. */
function Prompt({ label, hint, value, onSave }: { label: string; hint: string; value: string | undefined; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <TextField
      label={label}
      multiline
      rows={2}
      hint={hint}
      value={draft ?? value ?? ''}
      onChange={setDraft}
      onBlur={() => {
        if (draft !== null && draft !== (value ?? '')) onSave(draft);
        setDraft(null);
      }}
    />
  );
}

function PromptFields({ id, base, review, period }: { id: string; base: Omit<Review, 'id'>; review: Review | undefined; period: 'week' | 'month' | 'quarter' }) {
  return (
    <div className="space-y-3">
      {WEEKLY_PROMPTS.map((prompt) => (
        <Prompt
          key={prompt.key}
          label={period === 'week' ? prompt.label : prompt.label.replace('next week', 'next ' + period)}
          hint={period === 'week' ? prompt.placeholder : prompt.placeholder.replace('week', period)}
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
  );
}

function WeekSheet({ atlas, weekStart, review, onClose }: { atlas: Atlas; weekStart: string | null; review: Review | undefined; onClose: () => void }) {
  const range = weekStart ? weekRange(weekStart, atlas.settings.core.weekStartsOn) : null;
  const summary = range ? summarise(range.start, range.end, atlas.logs, atlas.seed, atlas.states, atlas.settings) : null;
  const id = range ? 'week:' + range.start : '';
  const base = { kind: 'week' as const, periodStart: range?.start ?? '' };
  const done = Boolean(review?.completedAt);
  const markDone = (): void => {
    if (!summary) return;
    void saveReview(id, base, (r) => ({
      ...r,
      completedAt: todayDate(),
      // Keep the numbers as they stood, so a later edit to the logs does not rewrite history.
      snapshot: { totalMinutes: summary.totalMinutes, targetMinutes: summary.targetMinutes, minutesByBlock: summary.minutesByBlock, itemsFinished: summary.itemsFinished, daysCounted: summary.daysCounted },
    }));
  };
  return (
    <Sheet
      open={range !== null}
      title={range ? 'Week of ' + formatRange(range.start, range.end) : ''}
      onClose={onClose}
      footer={
        range && !done ? (
          <Button variant="filled" onClick={markDone}>
            Mark this week reviewed
          </Button>
        ) : undefined
      }
    >
      {range && summary && (
        <div key={id} className="space-y-5">
          <Numbers summary={summary} atlas={atlas} />
          <PromptFields id={id} base={base} review={review} period="week" />
          <RowList label="Next">
            <Row title="Next week's build" meta="Pick it from the deck" to="/plan/pick?week=next&from=reviews" />
            <Row title="This week's paper" meta="Papers in Plan" to="/plan?view=papers" />
          </RowList>
          {done && <p className="text-meta text-ink2">Reviewed on {longDate(review!.completedAt!)}.</p>}
        </div>
      )}
    </Sheet>
  );
}

function MonthSheet({ atlas, monthStart, review, onClose }: { atlas: Atlas; monthStart: string | null; review: Review | undefined; onClose: () => void }) {
  const range = monthStart ? monthRange(monthStart) : null;
  const summary = range ? summarise(range.start, range.end, atlas.logs, atlas.seed, atlas.states, atlas.settings) : null;
  const id = range ? 'month:' + range.start.slice(0, 7) : '';
  const base = { kind: 'month' as const, periodStart: range?.start ?? '' };
  const asOf = todayDate();
  const open = range !== null;
  const moves = useMemo(() => (open ? replan({ seed: atlas.seed, settings: atlas.settings, states: atlas.states, asOf }).moves.length : 0), [open, atlas, asOf]);
  const phase = range ? activePhase(range.end < asOf ? range.end : asOf, atlas.seed.phases) : null;
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
  const shippedAuto = summary ? summary.shipped.monthly.length + summary.shipped.capstone.length > 0 : false;
  const shipped = review?.projectShipped ?? shippedAuto;
  const date = range ? new Date(range.start + 'T00:00:00') : null;

  return (
    <Sheet
      open={range !== null}
      title={date ? monthName(date.getMonth()) + ' ' + date.getFullYear() : ''}
      onClose={onClose}
      footer={
        range && !review?.completedAt ? (
          <Button variant="filled" onClick={() => void saveReview(id, base, (r) => ({ ...r, completedAt: todayDate(), projectShipped: r.projectShipped ?? shippedAuto }))}>
            Mark this month reviewed
          </Button>
        ) : undefined
      }
    >
      {range && summary && (
        <div key={id} className="space-y-5">
          <Numbers summary={summary} atlas={atlas} />
          {phase && progress && (
            <p className="text-body">
              {phase.title}: {Math.round(progress.fraction * 100)}% done, {progress.itemsDone} of {plural(progress.itemsTotal, 'item')}.
            </p>
          )}
          <RowList>
            <Row
              title={moves === 0 ? 'Everything still fits' : 'A re-plan would move ' + plural(moves, 'item')}
              meta={moves === 0 ? 'No re-plan needed' : 'To fit the hours you actually have'}
              to={moves === 0 ? undefined : '/plan'}
            />
          </RowList>
          <div>
            <SegmentedControl
              label="Did a monthly project ship?"
              value={shipped ? 'yes' : 'no'}
              onChange={(v) => void saveReview(id, base, (r) => ({ ...r, projectShipped: v === 'yes' }))}
              options={[
                { value: 'yes', label: 'A project shipped' },
                { value: 'no', label: 'Nothing shipped' },
              ]}
            />
            {review?.projectShipped === undefined && (
              <p className="mt-1.5 text-meta text-ink2">Filled in from your projects: {shippedAuto ? 'one was marked done this month' : 'none was marked done this month'}.</p>
            )}
          </div>
          <PromptFields id={id} base={base} review={review} period="month" />
          {review?.completedAt && <p className="text-meta text-ink2">Reviewed on {longDate(review.completedAt)}.</p>}
        </div>
      )}
    </Sheet>
  );
}

/**
 * The quarterly review is the research cadence's: the quarter's numbers, the research cards shipped, the question
 * the quarter asked and the link to its two-page report.
 */
function QuarterSheet({ atlas, quarterStart, review, onClose }: { atlas: Atlas; quarterStart: string | null; review: Review | undefined; onClose: () => void }) {
  const range = quarterStart ? quarterRange(quarterStart) : null;
  const summary = range ? summarise(range.start, range.end, atlas.logs, atlas.seed, atlas.states, atlas.settings) : null;
  const id = range ? 'quarter:' + quarterOf(range.start) : '';
  const base = { kind: 'quarter' as const, periodStart: range?.start ?? '' };
  const titleOf = (refId: string): string => atlas.seed.projects.find((p) => p.id === refId)?.title ?? refId;
  const active = atlas.seed.projects.filter((p) => p.cadence === 'research' && atlas.states.get(p.id)?.status === 'active');
  const [question, setQuestion] = useState<string | null>(null);
  const setField = (key: 'question' | 'reportUrl', v: string): void =>
    void saveReview(id, base, (r) => {
      const next = { ...r };
      if (v.trim()) next[key] = v.trim();
      else delete next[key];
      return next;
    });
  return (
    <Sheet
      open={range !== null}
      title={range ? quarterOf(range.start).replace('-', ' ') : ''}
      onClose={onClose}
      footer={
        range && !review?.completedAt ? (
          <Button variant="filled" onClick={() => void saveReview(id, base, (r) => ({ ...r, completedAt: todayDate() }))}>
            Mark this quarter reviewed
          </Button>
        ) : undefined
      }
    >
      {range && summary && (
        <div key={id} className="space-y-5">
          <Numbers summary={summary} atlas={atlas} />
          <RowList label="Research">
            {summary.shipped.research.map((refId) => (
              <Row key={refId} title={shortTitle(titleOf(refId))} meta="Shipped this quarter" to={'/library/' + refId} />
            ))}
            {active.map((p) => (
              <Row key={p.id} title={shortTitle(p.title)} meta="In progress" to={'/library/' + p.id} />
            ))}
            {summary.shipped.research.length === 0 && active.length === 0 && <Row title="No research card this quarter" meta="Projects, then Research" to="/plan?view=projects" />}
          </RowList>
          <TextField
            label="This quarter's research question"
            multiline
            rows={2}
            hint="Hypothesis, experiment, result. A negative result counts."
            value={question ?? review?.question ?? ''}
            onChange={setQuestion}
            onBlur={() => {
              if (question !== null && question !== (review?.question ?? '')) setField('question', question);
              setQuestion(null);
            }}
          />
          <LinkField label="Report" value={review?.reportUrl} onSave={(v) => setField('reportUrl', v)} />
          <PromptFields id={id} base={base} review={review} period="quarter" />
          {review?.completedAt && <p className="text-meta text-ink2">Reviewed on {longDate(review.completedAt)}.</p>}
        </div>
      )}
    </Sheet>
  );
}

/** Reviews: the weeks, months and quarters so far, newest first; one opens in a sheet with its numbers already filled in. */
export function Reviews() {
  const atlas = useAtlas();
  const reviews = useLiveQuery(async () => new Map((await db.reviews.toArray()).map((r) => [r.id, r])), []);
  const [tab, setTab] = useQueryParam('tab');
  const [openParam, setOpen] = useQueryParam('open');

  if (!atlas || !reviews) {
    return (
      <Screen title="Reviews">
        <Header title="Reviews" />
      </Screen>
    );
  }

  const asOf = todayDate();
  const planStart = atlas.seed.phases[0]!.start;
  const firstLog = atlas.logs.map((l) => l.date).sort()[0];
  const from = firstLog && firstLog < planStart ? firstLog : planStart;
  const weekStartsOn = atlas.settings.core.weekStartsOn;
  const period = tab === 'month' || tab === 'quarter' ? tab : 'week';
  const monthly = period === 'month';
  const weeks = weeksSoFar(from, asOf < from ? from : asOf, weekStartsOn);
  const months = monthsSoFar(from, asOf < from ? from : asOf);
  const openWeek = openParam?.startsWith('week:') ? openParam.slice(5) : null;
  const openMonth = openParam?.startsWith('month:') ? openParam.slice(6) + '-01' : null;
  const quarters = quartersSoFar(from, asOf < from ? from : asOf);
  const quarterMatch = /^quarter:(\d{4})-Q([1-4])$/.exec(openParam ?? '');
  const openQuarter = quarterMatch ? quarterMatch[1] + '-' + String((Number(quarterMatch[2]) - 1) * 3 + 1).padStart(2, '0') + '-01' : null;

  return (
    <Screen title="Reviews">
      <Header title="Reviews" sub="Sunday closes the week, the first days of a month close the month, and each quarter closes with research. The numbers fill themselves in." />
      <div className="mt-5">
        <SegmentedControl
          label="Review period"
          value={period}
          onChange={(v) => setTab(v === 'week' ? null : v)}
          options={[
            { value: 'week', label: 'Weekly' },
            { value: 'month', label: 'Monthly' },
            { value: 'quarter', label: 'Quarterly' },
          ]}
        />
      </div>
      <RowList className="mt-5">
        {period === 'quarter'
          ? quarters.map((q) => {
              const id = 'quarter:' + quarterOf(q);
              const { start, end } = quarterRange(q);
              const summary = summarise(start, end, atlas.logs, atlas.seed, atlas.states, atlas.settings);
              const review = reviews.get(id);
              return (
                <Row
                  key={id}
                  title={quarterOf(q).replace('-', ' ')}
                  meta={span(summary.totalMinutes) + ' logged · ' + (summary.shipped.research.length ? plural(summary.shipped.research.length, 'research card') + ' shipped' : review?.question ? 'a question asked' : 'no research shipped')}
                  trailing={review?.completedAt ? 'Reviewed' : asOf >= start && asOf <= end ? 'This quarter' : undefined}
                  onClick={() => setOpen(id, { replace: false })}
                />
              );
            })
          : monthly
          ? months.map((m) => {
              const id = 'month:' + m.slice(0, 7);
              const { start, end } = monthRange(m);
              const summary = summarise(start, end, atlas.logs, atlas.seed, atlas.states, atlas.settings);
              const date = new Date(start + 'T00:00:00');
              return (
                <Row
                  key={id}
                  title={monthName(date.getMonth()) + ' ' + date.getFullYear()}
                  meta={span(summary.totalMinutes) + ' logged · ' + (summary.shipped.monthly.length + summary.shipped.capstone.length > 0 ? 'a project shipped' : 'no project shipped')}
                  trailing={reviews.get(id)?.completedAt ? 'Reviewed' : undefined}
                  onClick={() => setOpen(id, { replace: false })}
                />
              );
            })
          : weeks.map((w) => {
              const id = 'week:' + w;
              const { start, end } = weekRange(w, weekStartsOn);
              const summary = summarise(start, end, atlas.logs, atlas.seed, atlas.states, atlas.settings);
              const isCurrent = asOf >= start && asOf <= end;
              const done = Boolean(reviews.get(id)?.completedAt);
              return (
                <Row
                  key={id}
                  title={'Week of ' + formatRange(start, end)}
                  meta={span(summary.totalMinutes) + ' logged · ' + summary.itemsFinished.length + ' finished'}
                  trailing={done ? 'Reviewed' : isCurrent ? 'This week' : summary.totalMinutes > 0 ? 'Not reviewed' : undefined}
                  onClick={() => setOpen(id, { replace: false })}
                />
              );
            })}
      </RowList>
      <WeekSheet atlas={atlas} weekStart={openWeek} review={openWeek ? reviews.get('week:' + openWeek) : undefined} onClose={() => setOpen(null)} />
      <MonthSheet atlas={atlas} monthStart={openMonth} review={openMonth ? reviews.get('month:' + openMonth.slice(0, 7)) : undefined} onClose={() => setOpen(null)} />
      <QuarterSheet atlas={atlas} quarterStart={openQuarter} review={openQuarter ? reviews.get('quarter:' + quarterOf(openQuarter)) : undefined} onClose={() => setOpen(null)} />
    </Screen>
  );
}
