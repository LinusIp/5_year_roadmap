import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.ts';
import { useCatalogueIndex, useChallengeEvents } from '../hooks/useCatalogue.ts';
import { dailyChallenge, isSlotDay, languageOf, weeklyChallenge } from '../lib/catalogue/daily.ts';
import type { Pick as ChallengePick } from '../lib/catalogue/daily.ts';
import { groupLabel } from '../lib/catalogue/filters.ts';
import { updateSettings } from '../db/settings.ts';
import { clearTimer, editItemState, setItemStatus, setWeekPick, startTimer, useRunningTimer, useWeekPick } from '../db/state.ts';
import type { RunningTimer } from '../db/types.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { useUnits } from '../hooks/useUnits.ts';
import { addDays, dayName, formatLong, formatStopwatch, startOfWeek, today as todayDate, weekday } from '../lib/dates.ts';
import { addEntry, editLog, isBlockDone, minutesByBlock, minutesForRef, readLog, toggleBlockDone, totalMinutes } from '../lib/logs.ts';
import { plannedFor } from '../lib/day-plan.ts';
import { catchUpMinutes, laneBalance } from '../lib/pace.ts';
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
import { BlockIcon, KindIcon } from '../ui/glyphs.tsx';
import { ProgressLine } from '../ui/ProgressLine.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { Sheet } from '../ui/Sheet.tsx';
import { Checklist, criteriaUnits } from './parts/Checklist.tsx';
import type { ChecklistUnit } from './parts/Checklist.tsx';
import { ChangeTodaySheet } from './parts/ChangeTodaySheet.tsx';
import { ItemSheet } from './parts/ItemSheet.tsx';
import { DayFields } from './parts/DayFields.tsx';
import { LogTimeSheet } from './parts/LogTimeSheet.tsx';
import { NotesField } from './parts/NotesField.tsx';
import { PickerSheet } from './parts/PickerSheet.tsx';
import { useElapsed } from './parts/RunningTime.tsx';
import { takenProject } from './parts/taken.ts';
import { blockShort, dateTitle, nameOf, partOf, span, unitDetail } from './parts/text.ts';
import { todayLine, tokenDaysLeft, useSyncView } from '../sync/status.ts';

type SheetName = 'log' | 'date' | 'day' | 'note' | 'change' | null;

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

/** Position of a block in a fixed order; blocks not listed go last, in the day's order. */
function rank(order: string[], id: string): number {
  const i = order.indexOf(id);
  return i < 0 ? order.length : i;
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
  // How far today's practice set has got: "1 of 3 subjects". A subject counts once it is finished, which is when its
  // minutes reach the Practice block under practice:<subject>.
  const practiceAnswered = useLiveQuery(() => db.practice.where('date').equals(date).filter((a) => a.set === 'daily:' + date).count(), [date]) ?? 0;
  const practiceMeta = (it: ScheduledItem): string => {
    const total = atlas?.seed.practiceSubjects?.length ?? 3;
    const finished = new Set((log?.entries ?? []).filter((e) => e.refId?.startsWith('practice:')).map((e) => e.refId)).size;
    if (practiceAnswered === 0 && finished === 0) return it.note ?? '';
    return finished >= total ? 'All ' + total + ' subjects done' : finished + ' of ' + total + ' subjects';
  };
  const settings = atlas?.settings;
  const weekStart = useMemo(() => startOfWeek(date, settings?.core.weekStartsOn ?? 1), [date, settings]);
  const weekPick = useWeekPick(weekStart);
  const syncView = useSyncView();

  const [chosen, setChosen] = useState<BlockId | null>(null);
  const [expanded, setExpanded] = useState(false);
  // A project just taken from the deck: its row carries the shared-element move and the underline.
  const [taken] = useState(() => takenProject.recent());
  const [monthlyFirst, setMonthlyFirst] = useState(() => taken?.kind === 'monthly');
  const [sheet, setSheet] = useState<SheetName>(null);
  // A project's tech doc over Today, opened from the Now card or a Later today row. Today stays as it was under it.
  const [doc, setDoc] = useState<{ id: string; block: BlockId; from: 'now' | 'later' } | null>(null);
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

  const catalogue = useCatalogueIndex();
  const challengeEvents = useChallengeEvents();
  const ctx = useMemo(() => (atlas ? { seed: atlas.seed, states: atlas.states, units, ...(catalogue ? { catalogue } : {}) } : null), [atlas, units, catalogue]);
  const plan = useMemo(() => {
    if (!settings || !ctx || !atlas) return null;
    const day = planForDay({ date, settings, weeklyPickId: weekPick?.projectId, ctx });
    // Lanes that opted into catch-up get their extra minutes on top, up to the cap, while they are behind.
    if (day.phase && Object.keys(settings.catchUp).length > 0) {
      let extra = 0;
      const blocks = day.blocks.map((b) => {
        const more = catchUpMinutes(settings, laneBalance(settings, atlas.logs, b.id, day.phase!.start, date));
        extra += more;
        return more > 0 ? { ...b, targetMinutes: b.targetMinutes + more, catchUp: more } : b;
      });
      return { ...day, blocks, targetMinutes: day.targetMinutes + extra };
    }
    return day;
  }, [date, settings, weekPick, ctx, atlas]);

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
  const layout = settings.layout.today;
  const blocks = plan.blocks;
  const done = (b: TodayBlock): boolean => isBlockDone(log, b.id);
  const timerBlock = isToday && timer ? blocks.find((b) => b.id === timer.block) : undefined;
  // "Now" is the first unfinished block, in the day's order or in the order set under Settings > Layout.
  const nowOrder = layout.now === 'order' ? [...blocks].sort((a, b) => rank(layout.order, a.id) - rank(layout.order, b.id)) : blocks;
  const nowBlock = (chosen ? blocks.find((b) => b.id === chosen) : undefined) ?? timerBlock ?? nowOrder.find((b) => !done(b)) ?? null;
  const later = blocks.filter((b) => b !== nowBlock && !done(b));
  const finished = blocks.filter((b) => b !== nowBlock && done(b));
  const byBlock = minutesByBlock(log);
  const logged = totalMinutes(log);
  const streakState = streak(atlas.logs, settings.core.streak, date, plannedFor(settings));
  const restDay = plan.resolved.rest;
  const nothingPlanned = !restDay && blocks.every((b) => b.kind === 'empty' && !b.weeklyBuild);
  // The day's template is named in the header only when it is not the usual Full day.
  const templateNote = restDay ? 'rest day' : plan.resolved.templateId !== 'full' || plan.resolved.source === 'change' ? plan.resolved.templateName : null;
  const canChange = date >= now;

  const item = nowBlock ? focusItem(nowBlock, monthlyFirst) : undefined;
  const isProject = item?.kind === 'project';
  const nowRunning = Boolean(timer && nowBlock && timer.block === nowBlock.id);
  const otherRunning = Boolean(timer && !nowRunning);
  const nowMinutes = nowBlock ? (byBlock[nowBlock.id] ?? 0) + (nowRunning ? elapsed / 60_000 : 0) : 0;
  const nowDone = nowBlock ? done(nowBlock) : false;

  const reviewDay = settings.core.review.day;
  const isReviewDay = weekday(date) === reviewDay;
  // GitHub Sync's one quiet line: changes that cannot go out, or a token about to expire. Nothing otherwise.
  const tokenDays = syncView?.connected ? tokenDaysLeft(syncView.config, now) : null;
  const syncLine =
    todayLine(syncView) ??
    (tokenDays !== null && tokenDays <= 7 ? (tokenDays < 0 ? 'The GitHub token has expired' : 'The GitHub token expires in ' + tokenDays + (tokenDays === 1 ? ' day' : ' days')) : null);
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

  // The project catalogue on Today: the day's easy challenge under Block B; on the weekly slot's days, the week's
  // medium challenge under Block D; and a real case taken from the Deck, also under Block D.
  const blockLanguage = languageOf(((b) => (b ? b.refId + ' ' + b.title : undefined))(blocks.find((b) => b.id === 'B')?.item));
  const daily: ChallengePick | null =
    isToday && settings.core.catalogue.dailyChallenge && catalogue && challengeEvents ? dailyChallenge({ entries: catalogue, events: challengeEvents, date, blockLanguage }) : null;
  const weeklyPick: ChallengePick | null =
    isToday && isSlotDay(date, settings.core.catalogue.weeklyDays) && catalogue && challengeEvents ? weeklyChallenge({ entries: catalogue, events: challengeEvents, weekStart, blockLanguage }) : null;
  const activeCase = catalogue?.find((e) => e.kind === 'case' && atlas.states.get(e.id)?.status === 'active');
  type ExtraRow = { key: string; kind: 'challenge' | 'case'; title: string; meta: string; to?: string; doc?: string; trailing: string };
  const challengeRow = (label: string, pick: ChallengePick, query: string): ExtraRow => ({
    key: label,
    kind: 'challenge',
    title: label + ' · ' + pick.challenge.title,
    meta: pick.solved
      ? 'Solved'
      : [pick.challenge.difficulty, (pick.challenge.estMinutes ?? 30) + ' min', groupLabel(pick.challenge.group), (pick.anotherLanguage ? 'in another language: ' : 'in ') + pick.language].join(' · '),
    to: '/challenge/' + pick.challenge.id + query,
    trailing: pick.solved ? 'Done' : span(pick.challenge.estMinutes ?? 30),
  });
  const extrasFor = (id: BlockId): ExtraRow[] => {
    const rows: ExtraRow[] = [];
    if (id === 'B' && daily) rows.push(challengeRow('Daily challenge', daily, '?daily=1'));
    if (id === 'D' && weeklyPick) rows.push(challengeRow('Weekly challenge', weeklyPick, ''));
    if (id === 'D' && activeCase) {
      const ticked = atlas.states.get(activeCase.id)?.unitsDone.length ?? 0;
      rows.push({ key: 'Monthly case', kind: 'case', title: 'Monthly case · ' + activeCase.title, meta: 'Advanced · ' + ticked + ' of ' + (activeCase.steps ?? 0) + ' milestones ticked · ' + activeCase.hours + ' h', doc: activeCase.id, trailing: hoursOn(activeCase.id) + ' h' });
    }
    return rows;
  };
  // They live inside their block, so Today still fits one screen: on the block's Now card as rows, and as a mention on
  // its Later today row. Once the block is done, they lead Later today.
  const leadingExtras = finished.flatMap((b) => extrasFor(b.id));
  const extrasNote = (id: BlockId): string | null => {
    const rows = extrasFor(id);
    return rows.length ? rows.map((r) => r.key.toLowerCase() + (r.trailing === 'Done' ? ' done' : '')).join(', ') : null;
  };
  const extraRow = (row: ExtraRow) => (
    <Row
      key={row.key}
      icon={<KindIcon kind={row.kind} />}
      title={row.title}
      meta={layout.view === 'compact' ? undefined : row.meta}
      trailing={row.trailing}
      to={row.to}
      onClick={row.doc ? () => setDoc({ id: row.doc!, block: 'D', from: nowBlock?.id === 'D' ? 'now' : 'later' }) : undefined}
    />
  );

  const rowFor = (block: TodayBlock): { title: string; meta: string; to?: string; doc?: string } => {
    const name = blockShort(block.def.name);
    if (block.item?.kind === 'practice') return { title: block.def.name, meta: practiceMeta(block.item), to: '/practice' };
    if (block.kind === 'review') return { title: 'Weekly review and paper', meta: name + ' · close the week' };
    const blockItem = focusItem(block, monthlyFirst);
    if (!blockItem) {
      if (block.id === 'D') return { title: 'No project this week', meta: 'Pick one', to: '/plan/pick?from=today' };
      return { title: block.emptyReason ?? 'Nothing planned', meta: name };
    }
    // A project's row opens its tech doc; the doc's "Work on it now" makes it Now.
    const doc = blockItem.kind === 'project' ? blockItem.refId : undefined;
    if (blockItem === block.weeklyBuild) return { title: nameOf(blockItem), meta: 'Weekly build · ' + hoursOn(blockItem.refId) + ' of ' + blockItem.estHours + ' h done', doc };
    return { title: nameOf(blockItem), meta: [name, detailOf(blockItem)].filter(Boolean).join(' · '), doc };
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
  } else if (item?.kind === 'practice' && !nowRunning) {
    primary = (
      <Button variant="filled" icon="play" to="/practice">
        {practiceAnswered > 0 ? 'Go on' : 'Start the set'}
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

  const allUnits: ChecklistUnit[] = item
    ? item.kind === 'project'
      ? criteriaUnits(item.acceptance ?? [])
      : (atlas.seed.resources.find((r) => r.id === item.refId)?.customUnits ?? units?.[item.refId] ?? [])
    : [];
  const unitsDone = item ? (atlas.states.get(item.refId)?.unitsDone ?? []) : [];
  const resource = item?.kind === 'resource' ? atlas.seed.resources.find((r) => r.id === item.refId) : undefined;
  const otherD =
    nowBlock?.id === 'D' && nowBlock.item && nowBlock.weeklyBuild && nowBlock.weeklyBuild.status !== 'done'
      ? item === nowBlock.item
        ? nowBlock.weeklyBuild
        : nowBlock.item
      : undefined;
  const headline = nowBlock ? (nowBlock.kind === 'review' ? 'Weekly review and paper' : item?.kind === 'practice' ? practiceMeta(item) : item ? nameOf(item) : nowBlock.id === 'D' ? 'No project this week' : (nowBlock.emptyReason ?? 'Nothing planned')) : '';
  const metaLine = nowBlock
    ? [
        blockShort(nowBlock.def.name),
        span(nowMinutes) + ' of ' + span(nowBlock.targetMinutes),
        nowBlock.catchUp ? span(nowBlock.catchUp) + ' of it catch-up' : null,
        detailOf(item),
        isProject && item.unitCount > 0 ? item.unitsDone + ' of ' + item.unitCount + ' ticked' : null,
        nowDone ? 'done' : null,
      ]
        .filter(Boolean)
        .join(' · ')
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
          sub={
            layout.stats ? (
              // The stats line: the clock for time, the flame for the streak, and the only place the flame shows.
              <span className="inline-flex flex-wrap items-center gap-x-1.5">
                <Icon name="clock" size={16} />
                <span>{span(logged) + ' of ' + span(plan.targetMinutes) + ' today' + (templateNote ? ' · ' + templateNote : '') + ' · '}</span>
                {streakState.current > 0 && <Icon name="flame" size={16} />}
                <span>{streakState.current > 0 ? streakState.current + '-day streak' : 'no streak yet'}</span>
              </span>
            ) : undefined
          }
          actions={
            <>
              {canChange && <Button variant="icon" icon="sliders" label={isToday ? 'Change today' : 'Change ' + dateTitle(date)} onClick={() => setSheet('change')} />}
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

      {restDay ? (
        <section aria-label="Now" className="mt-6 flex flex-col gap-1.5 rounded-card bg-surface p-5">
          <p className="section-label mb-0">Now</p>
          <p className="text-headline font-semibold">A rest day.</p>
          <p className="text-meta text-ink2">Nothing is planned, and the streak is safe.{logged > 0 ? ' ' + span(logged) + ' logged anyway.' : ''}</p>
        </section>
      ) : nothingPlanned ? (
        <EmptyState action={<Button to="/plan">Open Plan</Button>}>Nothing scheduled. Open Plan to pick what you&apos;re learning.</EmptyState>
      ) : !nowBlock ? (
        <section aria-label="Now" className="mt-6 flex flex-col gap-1.5 rounded-card bg-surface p-5">
          <p className="section-label mb-0">Now</p>
          <p className="text-headline font-semibold">All five blocks are done.</p>
          <p className="text-meta text-ink2">{span(logged)} logged today.</p>
        </section>
      ) : (
        <section aria-labelledby="now-title" className={'mt-6 flex flex-col gap-1.5 rounded-card bg-surface p-5' + (taken && item?.refId === taken.id ? ' taken' : '')}>
          <div className="flex items-center justify-between gap-2">
            <p className="section-label mb-0 flex items-center gap-2">
              <BlockIcon block={nowBlock.id} />
              {nowRunning ? 'Now · running' : 'Now'}
            </p>
            {!expanded && (
              // Mark done sits on the card's first line, so the actions row keeps room for Tech doc.
              <Button
                className="-my-3 -mr-2"
                size="sm"
                variant="icon"
                icon="check"
                aria-pressed={nowDone}
                onClick={() => {
                  void editLog(date, (current) => toggleBlockDone(current, nowBlock.id));
                  setChosen(null);
                  setExpanded(false);
                }}
              >
                {nowDone ? 'Mark not done' : 'Mark done'}
              </Button>
            )}
          </div>
          <h2 className="text-headline">
            {isProject && item ? (
              // A project's title opens its tech doc; everything else unfolds in place.
              <button id="now-title" type="button" aria-haspopup="dialog" onClick={() => setDoc({ id: item.refId, block: nowBlock.id, from: 'now' })} className="-my-2 line-clamp-2 w-full py-2 text-left text-headline font-semibold">
                {headline}
              </button>
            ) : (
              <button id="now-title" type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} className="-my-2 line-clamp-2 w-full py-2 text-left text-headline font-semibold">
                {headline}
              </button>
            )}
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
            {isProject && item && (
              <Button variant="icon" icon="doc" aria-haspopup="dialog" onClick={() => setDoc({ id: item.refId, block: nowBlock.id, from: 'now' })}>
                Tech doc
              </Button>
            )}

          </div>
          {extrasFor(nowBlock.id).length > 0 && (
            <ul className="mt-3 divide-y divide-line border-t border-line">{extrasFor(nowBlock.id).map(extraRow)}</ul>
          )}
        </section>
      )}

      {!nothingPlanned && layout.later && (later.length > 0 || leadingExtras.length > 0) && (
        <RowList flat label="Later today" className="mt-6">
          {leadingExtras.map(extraRow)}
          {later.flatMap((block) => {
            const row = rowFor(block);
            const isTaken = Boolean(taken && block.id === 'D' && focusItem(block, monthlyFirst)?.refId === taken.id);
            return [
              <Row
                key={block.id}
                className={isTaken ? 'taken' : ''}
                icon={<BlockIcon block={block.id} />}
                title={row.title}
                meta={layout.view === 'compact' ? undefined : [row.meta, extrasNote(block.id)].filter(Boolean).join(' · ')}
                trailing={span(block.targetMinutes)}
                to={row.to}
                onClick={
                  row.to
                    ? undefined
                    : row.doc
                      ? () => setDoc({ id: row.doc!, block: block.id, from: 'later' })
                      : () => {
                          setChosen(block.id);
                          setExpanded(false);
                          window.scrollTo(0, 0);
                        }
                }
              >
                {isTaken && <span aria-hidden="true" className="taken-line absolute inset-x-0 bottom-0 h-0.5 bg-accent" />}
              </Row>,
            ];
          })}
        </RowList>
      )}

      {layout.footer && finished.length > 0 && (
        <p className="mt-4 text-meta text-ink2">
          Done today: {finished.map((b) => rowFor(b).title).join(', ')}
        </p>
      )}

      {showDayRow && (
        <RowList flat className="mt-4">
          <Row title="How was today?" trailing={log?.energy ? 'Energy ' + log.energy + ' of 5' : undefined} onClick={() => setSheet('day')} />
        </RowList>
      )}

      {layout.review && !isReviewDay && (
        <Link to="/reviews" className="mt-1 flex min-h-11 items-center text-meta text-ink2">
          Weekly review on {dayName(addDays(date, (reviewDay - weekday(date) + 7) % 7))}
        </Link>
      )}

      {layout.footer && syncLine && (
        <Link to="/settings?section=sync" className="flex min-h-11 items-center text-meta text-ink2">
          {syncLine}
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

      <ItemSheet
        atlas={atlas}
        id={doc?.id ?? null}
        onClose={() => setDoc(null)}
        footer={
          doc?.from === 'later' ? (
            <Button
              onClick={() => {
                setChosen(doc.block);
                setExpanded(false);
                setDoc(null);
                window.scrollTo(0, 0);
              }}
            >
              Work on it now
            </Button>
          ) : undefined
        }
        after={
          doc?.from === 'now' && doc.block === 'D' && nowBlock?.id === 'D' ? (
            <>
              {otherD && (
                <Row
                  title={otherD === nowBlock.weeklyBuild ? 'Work on the weekly build instead' : 'Work on the monthly project instead'}
                  onClick={() => {
                    setMonthlyFirst((v) => !v);
                    setDoc(null);
                  }}
                />
              )}
              {nowBlock.weeklyBuild && item === nowBlock.weeklyBuild && (
                <Row
                  title="Suggest another weekly build"
                  onClick={() => {
                    pickAnother();
                    setDoc(null);
                  }}
                />
              )}
              <Row title="Pick a project" to="/plan/pick?from=today" />
            </>
          ) : undefined
        }
      />

      <ChangeTodaySheet open={sheet === 'change'} onClose={() => setSheet(null)} date={date} settings={settings} title={isToday ? 'Change today' : 'Change ' + dateTitle(date)} />

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
