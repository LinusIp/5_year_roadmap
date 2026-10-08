import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { updateSettings } from '../db/settings.ts';
import { clearTimer, editItemState, setItemStatus, setWeekPick, startTimer, useRunningTimer, useWeekPick } from '../db/state.ts';
import type { RunningTimer } from '../db/types.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { useUnits } from '../hooks/useUnits.ts';
import { addDays, dayName, formatLong, formatStopwatch, startOfWeek, today as todayDate, weekday } from '../lib/dates.ts';
import { addEntry, editLog, isBlockDone, minutesByBlock, minutesForRef, readLog, toggleBlockDone, totalMinutes } from '../lib/logs.ts';
import { planForDay, suggestWeeklyBuild } from '../lib/schedule.ts';
import type { ScheduledItem, TodayBlock } from '../lib/schedule.ts';
import { logTimeRequests } from '../lib/shortcuts.ts';
import { streak } from '../lib/streaks.ts';
import { resolveTheme } from '../lib/theme.ts';
import { applyUpdate, onUpdateReady } from '../pwa/register.ts';
import { Link, useQueryParam } from '../router/router.tsx';
import { isRealIsoDate } from '../seed/schema.ts';
import type { BlockId } from '../seed/schema.ts';
import { Button } from '../ui/Button.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Header } from '../ui/Header.tsx';
import { Icon } from '../ui/Icon.tsx';
import { ProgressLine } from '../ui/ProgressLine.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { Sheet } from '../ui/Sheet.tsx';
import { Checklist, criteriaUnits } from './parts/Checklist.tsx';
import type { ChecklistUnit } from './parts/Checklist.tsx';
import { DayFields } from './parts/DayFields.tsx';
import { LogTimeSheet } from './parts/LogTimeSheet.tsx';
import { NotesField } from './parts/NotesField.tsx';
import { PickerSheet } from './parts/PickerSheet.tsx';
import { takenProject } from './parts/taken.ts';
import { blockShort, dateTitle, nameOf, partOf, span, unitDetail } from './parts/text.ts';

type SheetName = 'log' | 'date' | 'day' | 'note' | null;

/** The item a block puts in front of you. Block D carries the week's build first, then the monthly project. */
function focusItem(block: TodayBlock, monthlyFirst: boolean): ScheduledItem | undefined {
  if (block.kind === 'review') return undefined;
  const weekly = block.weeklyBuild && block.weeklyBuild.status !== 'done' ? block.weeklyBuild : undefined;
  if (block.id === 'D' && weekly && block.item) return monthlyFirst ? block.item : weekly;
  return weekly ?? block.item;
}

/** What follows the block's name in a meta line: "part 1 of 3", "module 6, decision trees", "day 19". */
function detailOf(item: ScheduledItem | undefined): string | null {
  if (!item) return null;
  return partOf(item.title) ?? (item.nextUnit ? unitDetail(item.nextUnit.title) : null);
}

/** The few units around where you are: the current section, or the two before and three after the next one. */
function unitWindow(units: ChecklistUnit[], done: string[]): ChecklistUnit[] {
  if (units.length <= 6) return units;
  const ticked = new Set(done);
  const next = units.findIndex((u) => !ticked.has(u.id));
  if (next < 0) return units.slice(-3);
  const section = units[next]!.section;
  if (section) {
    const inSection = units.filter((u) => u.section === section);
    if (inSection.length <= 8) return inSection;
  }
  const start = Math.max(0, next - 2);
  return units.slice(start, start + 5);
}

/** Elapsed time of the running timer, ticking once a second. */
function useElapsed(timer: RunningTimer | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timer) return undefined;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer]);
  return timer ? Math.max(0, now - timer.startedAt) : 0;
}

async function stopTimer(timer: RunningTimer, date: string, item: ScheduledItem | undefined): Promise<void> {
  const minutes = Math.round((Date.now() - timer.startedAt) / 60_000);
  await clearTimer();
  if (minutes > 0) await editLog(date, (current) => addEntry(current, { block: timer.block, track: timer.track, refId: timer.refId, minutes }));
  if (item && item.status === 'todo') await setItemStatus(item.refId, 'active');
}

export function Today() {
  const [dateParam, setDateParam] = useQueryParam('date');
  const now = todayDate();
  const date = dateParam && isRealIsoDate(dateParam) ? dateParam : now;
  const setDate = (next: string): void => setDateParam(next >= now ? null : next);

  const atlas = useAtlas();
  const units = useUnits();
  const timer = useRunningTimer();
  const elapsed = useElapsed(timer);
  const log = useLiveQuery(() => readLog(date), [date]);
  const settings = atlas?.settings;
  const weekStart = useMemo(() => startOfWeek(date, settings?.core.weekStartsOn ?? 1), [date, settings]);
  const weekPick = useWeekPick(weekStart);

  const [chosen, setChosen] = useState<BlockId | null>(null);
  const [expanded, setExpanded] = useState(false);
  // A project just taken from the deck: its row carries the shared-element move and the underline.
  const [taken] = useState(() => takenProject.recent());
  const [monthlyFirst, setMonthlyFirst] = useState(() => taken?.kind === 'monthly');
  const [sheet, setSheet] = useState<SheetName>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => onUpdateReady(() => setUpdateReady(true)), []);
  useEffect(() => {
    setChosen(null);
    setExpanded(false);
  }, [date]);
  // The "l" shortcut: a request made on another page waits until Today is on screen.
  useEffect(() => {
    const take = (): void => {
      if (logTimeRequests.take()) setSheet('log');
    };
    take();
    return logTimeRequests.listen(take);
  }, []);

  const ctx = useMemo(() => (atlas ? { seed: atlas.seed, states: atlas.states, units } : null), [atlas, units]);
  const plan = useMemo(
    () => (settings && ctx ? planForDay({ date, settings, weeklyPickId: weekPick?.projectId, ctx }) : null),
    [date, settings, weekPick, ctx],
  );

  const pickAnother = useCallback(() => {
    if (!plan || !ctx) return;
    const current = plan.blocks.find((b) => b.id === 'D')?.weeklyBuild?.refId;
    for (let skip = 1; skip <= 12; skip++) {
      const next = suggestWeeklyBuild(plan.phase, ctx, skip);
      if (next && next.id !== current) {
        void setWeekPick(weekStart, next.id);
        return;
      }
    }
  }, [plan, ctx, weekStart]);

  if (!atlas || !settings || !plan) {
    return (
      <Screen title="Today">
        <p className="pt-10 text-meta text-ink2">Loading your day…</p>
      </Screen>
    );
  }

  const isToday = date === now;
  const blocks = plan.blocks.filter((b) => b.kind !== 'rest');
  const done = (b: TodayBlock): boolean => isBlockDone(log, b.id);
  const timerBlock = isToday && timer ? blocks.find((b) => b.id === timer.block) : undefined;
  const nowBlock = (chosen ? blocks.find((b) => b.id === chosen) : undefined) ?? timerBlock ?? blocks.find((b) => !done(b)) ?? null;
  const later = blocks.filter((b) => b !== nowBlock && !done(b));
  const finished = blocks.filter((b) => b !== nowBlock && done(b));
  const byBlock = minutesByBlock(log);
  const logged = totalMinutes(log);
  const streakState = streak(atlas.logs, settings.core.streak, date);
  const nothingPlanned = blocks.every((b) => b.kind === 'empty' && !b.weeklyBuild);

  const item = nowBlock ? focusItem(nowBlock, monthlyFirst) : undefined;
  const nowRunning = Boolean(timer && nowBlock && timer.block === nowBlock.id);
  const otherRunning = Boolean(timer && !nowRunning);
  const nowMinutes = nowBlock ? byBlock[nowBlock.id] + (nowRunning ? elapsed / 60_000 : 0) : 0;
  const nowDone = nowBlock ? done(nowBlock) : false;

  const reviewDay = settings.core.review.day;
  const isReviewDay = weekday(date) === reviewDay;
  const hour = new Date().getHours();
  const showDayRow = !isToday || blocks.every(done) || hour >= 22;

  const planStart = atlas.seed.phases[0]!.start;
  const planEnd = atlas.seed.phases.at(-1)!.end;
  const outside =
    date < planStart
      ? 'The plan starts on ' + formatLong(planStart) + '. This is its first day; anything you log before then is a head start.'
      : date > planEnd
        ? 'The five years ended on ' + formatLong(planEnd) + '. This is what the last phase still has open; Plan can re-plan it.'
        : null;

  const theme = resolveTheme(settings.theme);
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  /** Hours already put into a project, over every day: "2 of 4 h done". */
  const hoursOn = (refId: string): number => Math.round(atlas.logs.reduce((sum, l) => sum + minutesForRef(l, refId), 0) / 60);

  const rowFor = (block: TodayBlock): { title: string; meta: string; to?: string } => {
    const name = blockShort(block.def.name);
    if (block.kind === 'review') return { title: 'Weekly review and paper', meta: name + ' · close the week' };
    const blockItem = focusItem(block, monthlyFirst);
    if (!blockItem) {
      if (block.id === 'D') return { title: 'No project this week', meta: 'Pick one', to: '/plan/pick?from=today' };
      return { title: block.emptyReason ?? 'Nothing planned', meta: name };
    }
    if (blockItem === block.weeklyBuild) return { title: nameOf(blockItem), meta: 'Weekly build · ' + hoursOn(blockItem.refId) + ' of ' + blockItem.estHours + ' h done' };
    return { title: nameOf(blockItem), meta: [name, detailOf(blockItem)].filter(Boolean).join(' · ') };
  };

  const start = (): void => {
    if (!nowBlock) return;
    void startTimer({ block: nowBlock.id, track: item?.track ?? 'career', refId: item?.refId });
  };
  const stop = (): void => {
    if (!timer) return;
    const timerItem = blocks.map((b) => focusItem(b, monthlyFirst)).find((i) => i?.refId === timer.refId);
    void stopTimer(timer, date, timerItem);
  };

  let primary;
  let primaryLogs = false;
  if (otherRunning && timer) {
    const name = blockShort(settings.core.blocks.find((b) => b.id === timer.block)?.name ?? timer.block);
    primary = (
      <Button variant="filled" icon="pause" onClick={stop}>
        Stop {name} {formatStopwatch(elapsed)}
      </Button>
    );
  } else if (nowRunning) {
    primary = (
      <Button variant="filled" icon="pause" onClick={stop}>
        Stop {formatStopwatch(elapsed)}
      </Button>
    );
  } else if (nowBlock?.kind === 'review') {
    primary = (
      <Button variant="filled" to="/reviews">
        Open the review
      </Button>
    );
  } else if (nowBlock && !item) {
    primary = (
      <Button variant="filled" to={nowBlock.id === 'D' ? '/plan/pick?from=today' : '/plan'}>
        {nowBlock.id === 'D' ? 'Pick a project' : 'Open Plan'}
      </Button>
    );
  } else if (!isToday) {
    primaryLogs = true;
    primary = (
      <Button variant="filled" onClick={() => setSheet('log')}>
        Log time
      </Button>
    );
  } else {
    primary = (
      <Button variant="filled" icon="play" onClick={start}>
        Start
      </Button>
    );
  }

  const allUnits: ChecklistUnit[] = item ? (item.kind === 'project' ? criteriaUnits(item.acceptance ?? []) : (units?.[item.refId] ?? [])) : [];
  const unitsDone = item ? (atlas.states.get(item.refId)?.unitsDone ?? []) : [];
  const resource = item?.kind === 'resource' ? atlas.seed.resources.find((r) => r.id === item.refId) : undefined;
  const otherD =
    nowBlock?.id === 'D' && nowBlock.item && nowBlock.weeklyBuild && nowBlock.weeklyBuild.status !== 'done'
      ? item === nowBlock.item
        ? nowBlock.weeklyBuild
        : nowBlock.item
      : undefined;
  const headline = nowBlock ? (nowBlock.kind === 'review' ? 'Weekly review and paper' : item ? nameOf(item) : nowBlock.id === 'D' ? 'No project this week' : (nowBlock.emptyReason ?? 'Nothing planned')) : '';
  const metaLine = nowBlock
    ? [blockShort(nowBlock.def.name), span(nowMinutes) + ' of ' + span(nowBlock.targetMinutes), detailOf(item), nowDone ? 'done' : null].filter(Boolean).join(' · ')
    : '';
  const linkClass = 'inline-flex min-h-11 items-center gap-2 text-button font-medium text-accent';

  return (
    <Screen title="Today">
      <div
        onPointerDown={(e) => {
          swipeStart.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const s = swipeStart.current;
          swipeStart.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) > 60 && Math.abs(e.clientY - s.y) < 40) setDate(addDays(date, dx > 0 ? -1 : 1));
        }}
      >
        <Header
          title={
            <button type="button" className="-mx-2 -my-2.5 min-h-11 rounded-button px-2 text-left" onClick={() => setSheet('date')} aria-haspopup="dialog">
              {dateTitle(date)}
            </button>
          }
          sub={span(logged) + ' of ' + span(plan.targetMinutes) + ' today · ' + (streakState.current > 0 ? streakState.current + '-day streak' : 'no streak yet')}
          actions={
            <>
              <Button variant="icon" icon="gear" label="Settings" to="/settings" />
              <Button
                variant="icon"
                icon={theme === 'dark' ? 'sun' : 'moon'}
                label={'Switch to the ' + nextTheme + ' theme'}
                onClick={() => void updateSettings(settings.core, (s) => ({ ...s, theme: nextTheme }))}
              />
            </>
          }
        />
      </div>

      {outside && <p className="mt-2 text-meta text-ink2">{outside}</p>}

      {updateReady && (
        <RowList flat className="mt-5">
          <Row title="A new version of Atlas is ready" trailing="Reload" onClick={applyUpdate} />
        </RowList>
      )}

      {nothingPlanned ? (
        <EmptyState action={<Button to="/plan">Open Plan</Button>}>Nothing scheduled. Open Plan to pick what you&apos;re learning.</EmptyState>
      ) : !nowBlock ? (
        <section aria-label="Now" className="mt-7 flex flex-col gap-1.5 rounded-card bg-surface p-5">
          <p className="text-meta text-ink2">Now</p>
          <p className="text-headline font-semibold">All five blocks are done.</p>
          <p className="text-meta text-ink2">{span(logged)} logged today.</p>
        </section>
      ) : (
        <section aria-labelledby="now-title" className={'mt-7 flex flex-col gap-1.5 rounded-card bg-surface p-5' + (taken && item?.refId === taken.id ? ' taken' : '')}>
          <p className="text-meta text-ink2">{nowRunning ? 'Now · running' : 'Now'}</p>
          <h2 className="text-headline">
            <button id="now-title" type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} className="-my-2 block w-full py-2 text-left text-headline font-semibold">
              {headline}
            </button>
          </h2>
          <p className="text-meta text-ink2">{metaLine}</p>
          <div className="mt-2.5">
            <ProgressLine value={nowBlock.targetMinutes > 0 ? nowMinutes / nowBlock.targetMinutes : 0} label={'Time on ' + blockShort(nowBlock.def.name) + ' today'} />
          </div>

          {expanded && (
            <div className="mt-4">
              {item?.brief && <p className="mb-2 text-body text-ink2">{item.brief}</p>}
              {item?.note && <p className="mb-2 text-meta text-ink2">{item.note}</p>}
              {item && allUnits.length > 0 && <Checklist plain compact refId={item.refId} units={unitWindow(allUnits, unitsDone)} done={unitsDone} />}
              <div className="flex flex-col items-start">
                {item?.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer noopener" className={linkClass}>
                    <Icon name="external" size={16} />
                    {item.kind === 'project' ? 'Open the source' : resource?.type === 'book' ? 'Open the book' : 'Open course'}
                  </a>
                ) : item?.searchHint ? (
                  <a href={'https://duckduckgo.com/?q=' + encodeURIComponent(item.searchHint)} target="_blank" rel="noreferrer noopener" className={linkClass}>
                    <Icon name="search" size={16} />
                    Find a link
                  </a>
                ) : null}
                {otherD && (
                  <button type="button" className={linkClass} onClick={() => setMonthlyFirst((v) => !v)}>
                    {otherD === nowBlock.weeklyBuild ? 'Work on the weekly build instead' : 'Work on the monthly project instead'}
                  </button>
                )}
                {nowBlock.id === 'D' && nowBlock.weeklyBuild && (
                  <button type="button" className={linkClass} onClick={pickAnother}>
                    Suggest another weekly build
                  </button>
                )}
                {nowBlock.id === 'D' && (
                  <Link to="/plan/pick?from=today" className={linkClass}>
                    Pick a project
                  </Link>
                )}
                {nowBlock.kind === 'review' && (
                  <Link to="/plan?view=papers" className={linkClass}>
                    This week&apos;s paper
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className={(expanded ? 'mt-1.5' : 'mt-3.5') + ' flex items-center gap-2'}>
            {primary}
            {expanded && item ? (
              <Button onClick={() => setSheet('note')}>Add a note</Button>
            ) : (
              !primaryLogs && <Button onClick={() => setSheet('log')}>Log time</Button>
            )}
            {!expanded && (
              <Button
                className="ml-auto"
                icon="check"
                label={nowDone ? 'Mark not done' : 'Mark done'}
                aria-pressed={nowDone}
                onClick={() => {
                  void editLog(date, (current) => toggleBlockDone(current, nowBlock.id));
                  setChosen(null);
                  setExpanded(false);
                }}
              />
            )}
          </div>
        </section>
      )}

      {!nothingPlanned && later.length > 0 && (
        <RowList flat label="Later today" className="mt-7">
          {later.map((block) => {
            const row = rowFor(block);
            const isTaken = Boolean(taken && block.id === 'D' && focusItem(block, monthlyFirst)?.refId === taken.id);
            return (
              <Row
                key={block.id}
                className={isTaken ? 'taken' : ''}
                title={row.title}
                meta={row.meta}
                trailing={span(block.targetMinutes)}
                to={row.to}
                onClick={
                  row.to
                    ? undefined
                    : () => {
                        setChosen(block.id);
                        setExpanded(false);
                        window.scrollTo(0, 0);
                      }
                }
              >
                {isTaken && <span aria-hidden="true" className="taken-line absolute inset-x-0 bottom-0 h-0.5 bg-accent" />}
              </Row>
            );
          })}
        </RowList>
      )}

      {finished.length > 0 && (
        <p className="mt-4 text-meta text-ink2">
          Done today: {finished.map((b) => rowFor(b).title).join(', ')}
        </p>
      )}

      {showDayRow && (
        <RowList flat className="mt-4">
          <Row title="How was today?" trailing={log?.energy ? 'Energy ' + log.energy + ' of 5' : undefined} onClick={() => setSheet('day')} />
        </RowList>
      )}

      {!isReviewDay && (
        <Link to="/reviews" className="mt-1 flex min-h-11 items-center text-meta text-ink2">
          Weekly review on {dayName(addDays(date, (reviewDay - weekday(date) + 7) % 7))}
        </Link>
      )}

      <LogTimeSheet
        key={(nowBlock?.id ?? '') + date + (item?.refId ?? '')}
        open={sheet === 'log'}
        onClose={() => setSheet(null)}
        date={date}
        block={nowBlock?.kind === 'item' ? nowBlock.id : undefined}
        item={nowBlock?.kind === 'item' ? item : undefined}
      />

      <PickerSheet
        open={sheet === 'date'}
        title="Go to a day"
        searchLabel="Search days"
        value={date}
        options={Array.from({ length: 60 }, (_, i) => addDays(now, -i)).map((d) => ({
          value: d,
          label: d === now ? 'Today, ' + dateTitle(d) : dateTitle(d),
          keywords: d,
          trailing: span(totalMinutes(atlas.logs.find((l) => l.date === d))),
        }))}
        onPick={(v) => v && setDate(v)}
        onClose={() => setSheet(null)}
      />

      <Sheet open={sheet === 'day'} title={isToday ? 'How was today?' : 'How was ' + dateTitle(date) + '?'} onClose={() => setSheet(null)}>
        <DayFields date={date} />
      </Sheet>

      <Sheet open={sheet === 'note'} title={item ? 'Notes on ' + nameOf(item) : 'Notes'} onClose={() => setSheet(null)}>
        {item && (
          <NotesField
            label="Notes"
            startEditing
            value={atlas.states.get(item.refId)?.notes}
            onSave={(text) =>
              void editItemState(item.refId, (s) => {
                const next = { ...s };
                if (text.trim()) next.notes = text;
                else delete next.notes;
                return next;
              })
            }
          />
        )}
      </Sheet>

    </Screen>
  );
}
