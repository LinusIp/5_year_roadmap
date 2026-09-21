import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BlockCard } from '../components/BlockCard.tsx';
import { Icon } from '../components/Icon.tsx';
import { Page } from '../components/Page.tsx';
import { TrackDot } from '../components/TrackDot.tsx';
import { db } from '../db/db.ts';
import { setWeekPick, useItemStates, useRunningTimer, useWeekPick } from '../db/state.ts';
import { useSettings } from '../db/settings.ts';
import { addDays, formatHours, formatLong, formatMinutes, parseDuration, startOfWeek, today as todayDate } from '../lib/dates.ts';
import { addEntry, editLog, isBlockDone, minutesByBlock, minutesForRef, readLog, readLogs, removeEntry, setBlockMinutes, toggleBlockDone, totalMinutes } from '../lib/logs.ts';
import { planForDay, suggestWeeklyBuild, weeklyTargetMinutes } from '../lib/schedule.ts';
import type { ScheduledItem } from '../lib/schedule.ts';
import { streak } from '../lib/streaks.ts';
import { useOptimistic } from '../lib/useOptimistic.ts';
import { loadAllUnits, seed } from '../seed/index.ts';
import type { Unit } from '../seed/schema.ts';
import type { BlockId, TrackId } from '../seed/schema.ts';
import { isRealIsoDate } from '../seed/schema.ts';
import { Link, useQueryParam } from '../router/router.tsx';
import { useAtlas } from '../hooks/useAtlas.ts';

const ENERGY_LABELS = ['Drained', 'Low', 'Even', 'Good', 'Sharp'];

/** Every unit checklist, loaded once from its own chunk. Renders without it, then again with it. */
function useUnits(): Record<string, Unit[]> | undefined {
  const [units, setUnits] = useState<Record<string, Unit[]>>();
  useEffect(() => {
    let live = true;
    void loadAllUnits().then((all) => {
      if (live) setUnits(all);
    });
    return () => {
      live = false;
    };
  }, []);
  return units;
}

function StatTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'warning' }) {
  const toneClass = tone === 'good' ? 'text-good-text' : tone === 'warning' ? 'text-warning-text' : '';
  return (
    <div className="card px-3 py-2.5">
      <div className="eyebrow">{label}</div>
      <div className={'num mt-0.5 text-lg font-semibold leading-tight ' + toneClass}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

export function Today() {
  // A date in the URL (from the heatmap's "Edit this day") opens that day; otherwise today.
  const [dateParam, setDateParam] = useQueryParam('date');
  const date = dateParam && isRealIsoDate(dateParam) ? dateParam : todayDate();
  const setDate = (next: string): void => setDateParam(next === todayDate() ? null : next);
  const settings = useSettings(seed.settings);
  const states = useItemStates();
  const units = useUnits();
  const timer = useRunningTimer();
  const log = useLiveQuery(() => readLog(date), [date]);
  const allLogs = useLiveQuery(() => db.dayLogs.toArray(), []);

  const weekStart = useMemo(() => startOfWeek(date, settings?.core.weekStartsOn ?? 1), [date, settings]);
  const weekPick = useWeekPick(weekStart);
  const weekLogs = useLiveQuery(() => readLogs(weekStart, addDays(weekStart, 6)), [weekStart]);

  // The curriculum with the user's roadmap edits applied, so a reordered lane or an added item shows here.
  const atlas = useAtlas();
  const ctx = useMemo(() => ({ seed: atlas?.seed ?? seed, states: states ?? new Map(), units }), [atlas, states, units]);
  const plan = useMemo(
    () => (settings ? planForDay({ date, settings, weeklyPickId: weekPick?.projectId, ctx }) : null),
    [date, settings, weekPick, ctx],
  );

  const blockMinutes = minutesByBlock(log);
  const loggedToday = totalMinutes(log);
  const weekMinutes = (weekLogs ?? []).reduce((sum, l) => sum + l.entries.reduce((s, e) => s + e.minutes, 0), 0);
  const weekTarget = settings ? weeklyTargetMinutes(settings) : 0;
  const streakState = settings && allLogs ? streak(allLogs, settings.core.streak, date) : null;

  const addMinutes = useCallback(
    (block: BlockId, item: ScheduledItem, minutes: number) => {
      void editLog(date, (current) => addEntry(current, { block, track: item.track, refId: item.refId, minutes }));
    },
    [date],
  );
  const setMinutes = useCallback(
    (block: BlockId, item: ScheduledItem, minutes: number) => {
      void editLog(date, (current) => setBlockMinutes(current, block, item.track, item.refId, minutes));
    },
    [date],
  );

  const pickAnother = useCallback(() => {
    if (!plan) return;
    const current = plan.blocks.find((b) => b.id === 'D')?.weeklyBuild?.refId;
    for (let skip = 1; skip <= 12; skip++) {
      const next = suggestWeeklyBuild(plan.phase, ctx, skip);
      if (next && next.id !== current) {
        void setWeekPick(weekStart, next.id);
        return;
      }
    }
  }, [plan, ctx, weekStart]);

  if (!settings || !plan || !states || !atlas) {
    return (
      <Page title="Today">
        <p className="text-sm text-ink-3">Loading your day…</p>
      </Page>
    );
  }

  const isToday = date === todayDate();
  const remaining = Math.max(0, plan.targetMinutes - loggedToday);

  return (
    <Page
      title="Today"
      lead={
        <span className="flex flex-wrap items-center gap-x-2">
          {formatLong(date)}
          {plan.phase && (
            <>
              <span aria-hidden="true" className="text-ink-3">
                ·
              </span>
              <Link to="/roadmap" className="text-accent-text hover:underline">
                {plan.phase.title}
              </Link>
            </>
          )}
        </span>
      }
      actions={
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-icon" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
            <Icon name="chevronLeft" />
          </button>
          {!isToday && (
            <button type="button" className="btn btn-sm" onClick={() => setDate(todayDate())}>
              Today
            </button>
          )}
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => setDate(addDays(date, 1))}
            disabled={date >= todayDate()}
            aria-label="Next day"
          >
            <Icon name="chevronRight" />
          </button>
        </div>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="Logged today"
          value={formatMinutes(loggedToday)}
          sub={remaining > 0 ? formatMinutes(remaining) + ' to go' : 'Target met'}
          tone={remaining === 0 && loggedToday > 0 ? 'good' : undefined}
        />
        <StatTile
          label="This week"
          value={formatHours(weekMinutes)}
          sub={'of ' + formatHours(weekTarget, 0) + ' target'}
        />
        <StatTile
          label="Streak"
          value={streakState ? streakState.current + (streakState.current === 1 ? ' day' : ' days') : '—'}
          sub={
            streakState?.atRisk
              ? 'Log ' + settings.core.streak.minMinutes + ' min to keep it'
              : streakState && streakState.longest > 0
                ? 'Longest ' + streakState.longest
                : undefined
          }
          tone={streakState?.atRisk ? 'warning' : streakState && streakState.current > 0 ? 'good' : undefined}
        />
        <StatTile
          label="Blocks done"
          value={(log?.doneBlocks?.length ?? 0) + ' of ' + plan.blocks.filter((b) => b.kind !== 'rest').length}
          sub={plan.isReviewDay ? 'Review day' : undefined}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {plan.blocks.map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            tracks={seed.tracks}
            timer={timer ?? null}
            loggedMinutes={blockMinutes[block.id]}
            itemMinutes={block.item ? minutesForRef(log, block.item.refId) : 0}
            weeklyMinutes={block.weeklyBuild ? minutesForRef(log, block.weeklyBuild.refId) : 0}
            done={isBlockDone(log, block.id)}
            onAddMinutes={(item, minutes) => addMinutes(block.id, item, minutes)}
            onSetMinutes={(item, minutes) => setMinutes(block.id, item, minutes)}
            onToggleDone={() => void editLog(date, (current) => toggleBlockDone(current, block.id))}
            onPickAnother={pickAnother}
          />
        ))}
      </div>

      <QuickAdd date={date} />
      <DayEntries date={date} />
      <EndOfDay date={date} />
    </Page>
  );
}

/* ------------------------------------------------------------------ quick add */

function QuickAdd({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const [what, setWhat] = useState('');
  const [minutes, setMinutes] = useState('');
  const [track, setTrack] = useState<TrackId>('swe');
  const [block, setBlock] = useState<BlockId>('D');

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    const parsed = parseDuration(minutes);
    if (parsed === null || parsed <= 0 || !what.trim()) return;
    void editLog(date, (current) => addEntry(current, { block, track, minutes: parsed, note: what.trim() }));
    setWhat('');
    setMinutes('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button type="button" className="btn mt-4 w-full justify-center" onClick={() => setOpen(true)}>
        <Icon name="plus" size={15} />
        I did something else
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card mt-4 p-4">
      <h2 className="mb-3 text-sm font-semibold">Log something else</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <label className="block">
          <span className="label">What did you do?</span>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the form only exists once the user asks for it */}
          <input className="input" value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Read a paper, fixed the build…" autoFocus />
        </label>
        <label className="block">
          <span className="label">Track</span>
          <select className="input" value={track} onChange={(e) => setTrack(e.target.value as TrackId)}>
            {seed.tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Block</span>
          <select className="input" value={block} onChange={(e) => setBlock(e.target.value as BlockId)}>
            {seed.settings.blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Minutes</span>
          <input className="input num w-24" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="45" inputMode="numeric" />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm">
          Add
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ the day's entries */

function DayEntries({ date }: { date: string }) {
  const log = useLiveQuery(() => readLog(date), [date]);
  if (!log || log.entries.length === 0) return null;

  const titleOf = (refId: string | undefined): string | null => {
    if (!refId) return null;
    return (
      seed.resources.find((r) => r.id === refId)?.title ??
      seed.projects.find((p) => p.id === refId)?.title ??
      seed.papers.find((p) => p.id === refId)?.title ??
      refId
    );
  };

  return (
    <section className="card mt-4 p-4">
      <h2 className="mb-2 text-sm font-semibold">
        Logged today <span className="num font-normal text-ink-3">· {formatMinutes(totalMinutes(log))}</span>
      </h2>
      <ul className="divide-y divide-line">
        {log.entries.map((entry, index) => {
          const track = seed.tracks.find((t) => t.id === entry.track);
          return (
            <li key={index} className="flex items-center gap-2 py-2">
              <span className="chip w-7 justify-center px-0 font-mono text-[0.6875rem]">{entry.block}</span>
              <TrackDot track={track} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {entry.note ?? titleOf(entry.refId) ?? track?.name ?? 'Untitled'}
              </span>
              <span className="num shrink-0 text-sm text-ink-2">{formatMinutes(entry.minutes)}</span>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => void editLog(date, (current) => removeEntry(current, index))}
                aria-label={'Remove this entry of ' + formatMinutes(entry.minutes)}
              >
                <Icon name="x" size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ end of day */

function EndOfDay({ date }: { date: string }) {
  const log = useLiveQuery(() => readLog(date), [date]);
  const [draft, setDraft] = useState<string | null>(null);
  const reflection = draft ?? log?.reflection ?? '';
  const [frozen, showFrozen] = useOptimistic(Boolean(log?.frozen));
  const [energy, showEnergy] = useOptimistic(log?.energy);

  const save = (): void => {
    if (draft === null) return;
    const text = draft.trim();
    void editLog(date, (current) => {
      const next = { ...current };
      if (text) next.reflection = text;
      else delete next.reflection;
      return next;
    });
    setDraft(null);
  };

  return (
    <section className="card mt-4 p-4">
      <h2 className="mb-1 text-sm font-semibold">End of day</h2>
      <p className="mb-3 text-xs text-ink-3">One line about today, and how the day felt.</p>

      <label className="block">
        <span className="sr-only">Reflection</span>
        <textarea
          className="input"
          rows={2}
          value={reflection}
          placeholder="What moved today? What got in the way?"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
        />
      </label>

      <fieldset className="mt-3">
        <legend className="label">Energy</legend>
        <div className="flex flex-wrap gap-1.5">
          {([1, 2, 3, 4, 5] as const).map((value) => {
            const selected = energy === value;
            return (
              <button
                key={value}
                type="button"
                className={'btn btn-sm' + (selected ? ' btn-primary' : '')}
                aria-pressed={selected}
                onClick={() => {
                  showEnergy(selected ? undefined : value);
                  void editLog(date, (current) => {
                    const next = { ...current };
                    if (selected) delete next.energy;
                    else next.energy = value;
                    return next;
                  });
                }}
              >
                <span className="num">{value}</span>
                <span className="hidden sm:inline">{ENERGY_LABELS[value - 1]}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="mt-3 flex items-center gap-2 text-sm text-ink-2">
        <input
          type="checkbox"
          className="size-4 accent-[var(--accent-fill)]"
          checked={frozen}
          onChange={(e) => {
            const next = e.target.checked;
            showFrozen(next);
            void editLog(date, (current) => {
              const updated = { ...current };
              if (next) updated.frozen = true;
              else delete updated.frozen;
              return updated;
            });
          }}
        />
        <Icon name="snowflake" size={14} />
        Use a freeze day: keep the streak without logging time
      </label>
    </section>
  );
}
