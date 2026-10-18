import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { stepsTicked } from '../seed/catalogue.ts';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCatalogueIndex, useChallengeEvents } from '../hooks/useCatalogue.ts';
import { dailyChallenge, isSlotDay, languageOf, weeklyChallenge } from '../lib/catalogue/daily.ts';
import type { Pick as ChallengePick } from '../lib/catalogue/daily.ts';
import { groupLabel } from '../lib/catalogue/filters.ts';
import { updateSettings } from '../db/settings.ts';
import { editItemState, setWeekPick, useWeekPick } from '../db/state.ts';
import { startTimer, stopTimer, useRunningTimer } from '../db/timer.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { useUnits } from '../hooks/useUnits.ts';
import { addDays, dayName, daysBetween, formatLong, formatStopwatch, monthName, startOfWeek, today as todayDate } from '../lib/dates.ts';
import { editLog, isBlockDone, minutesByBlock, minutesForRef, readLog, toggleBlockDone, totalMinutes } from '../lib/logs.ts';
import { plannedFor } from '../lib/day-plan.ts';
import { catchUpMinutes, laneBalance } from '../lib/pace.ts';
import { planForDay, suggestWeeklyBuild } from '../lib/schedule.ts';
import type { ScheduledItem, TodayBlock } from '../lib/schedule.ts';
import { dailyTotals, streak } from '../lib/streaks.ts';
import { resolveTheme } from '../lib/theme.ts';
import { applyUpdate, onUpdateReady } from '../pwa/register.ts';
import { Link, useQueryParam } from '../router/router.tsx';
import { isRealIsoDate } from '../seed/schema.ts';
import type { BlockId } from '../seed/schema.ts';
import { Button } from '../ui/Button.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Icon } from '../ui/Icon.tsx';
import { BlockIcon, BlockTile, KindIcon } from '../ui/glyphs.tsx';
import { blockTone, toneInk } from '../ui/colors.ts';
import { ProgressLine } from '../ui/ProgressLine.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { Sheet } from '../ui/Sheet.tsx';
import { Checklist, criteriaUnits } from './parts/Checklist.tsx';
import type { ChecklistUnit } from './parts/Checklist.tsx';
import { ChangeTodaySheet } from './parts/ChangeTodaySheet.tsx';
import { ItemSheet } from './parts/ItemSheet.tsx';
import { DayFields } from './parts/DayFields.tsx';
import { NotesField } from './parts/NotesField.tsx';
import { PickerSheet } from './parts/PickerSheet.tsx';
import { useElapsed } from './parts/RunningTime.tsx';
import { useTimerCarry } from '../db/timer.ts';
import { carriedMs, runningMsOn } from '../lib/timer.ts';
import { dayLayout } from '../lib/calendar.ts';
import { hm } from '../lib/calendar-layout.ts';
import { breaksOf, clockNow, switchPrompt } from '../lib/clock-plan.ts';
import { takenProject } from './parts/taken.ts';
import { blockShort, dateTitle, nameOf, partOf, span, unitDetail } from './parts/text.ts';
import { todayLine, tokenDaysLeft, useSyncView } from '../sync/status.ts';

type SheetName = 'date' | 'day' | 'note' | 'change' | null;

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
/** Minutes since local midnight. */
function minuteOfDay(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** The block ends "Keep going" answered today (this tab's session): "C@480". */
const KEPT_KEY = 'atlas-kept-going';
function readKept(): Set<string> {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEPT_KEY) ?? '{}') as { date?: string; ends?: string[] };
    return new Set(saved.date === todayDate() ? (saved.ends ?? []) : []);
  } catch {
    return new Set();
  }
}
function saveKept(ends: Set<string>): void {
  try {
    sessionStorage.setItem(KEPT_KEY, JSON.stringify({ date: todayDate(), ends: [...ends] }));
  } catch {
    // Storage blocked: the answer still holds for this page.
  }
}

function rank(order: string[], id: string): number {
  const i = order.indexOf(id);
  return i < 0 ? order.length : i;
}

/** "Sun 18 Oct": the header's date. */
function shortDate(date: string): string {
  return dayName(date, true) + ' ' + Number(date.slice(8, 10)) + ' ' + monthName(Number(date.slice(5, 7)) - 1, true);
}

/** "08:12": the local clock time of a timestamp. */
function clockOf(ms: number): string {
  const d = new Date(ms);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
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
  const carry = useTimerCarry();
  // The minute of the day, for Now by the clock and the prompt to move on.
  const [minuteNow, setMinuteNow] = useState(minuteOfDay);
  useEffect(() => {
    const id = window.setInterval(() => setMinuteNow(minuteOfDay()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  // "Keep going" answers the prompt to move on for that block's end, for the rest of the session.
  const [keptGoing, setKeptGoing] = useState<Set<string>>(() => readKept());
  const log = useLiveQuery(() => readLog(date), [date]);
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
  // The day's blocks at their times (the template's, or the date's own). On today, Now follows the clock; a block
  // tapped in Later today, or the one whose timer runs, comes first. Settings > Layout's own order still wins.
  const placed = dayLayout(date, settings).filter((p) => blocks.some((b) => b.id === p.id));
  const windowOf = (id: string) => placed.find((p) => p.id === id);
  const clock = isToday && layout.now !== 'order' ? clockNow(placed, minuteNow) : null;
  const nowOrder = layout.now === 'order' ? [...blocks].sort((a, b) => rank(layout.order, a.id) - rank(layout.order, b.id)) : blocks;
  const clockBlock = clock?.kind === 'block' ? blocks.find((b) => b.id === clock.id) : undefined;
  const nowBlock = (chosen ? blocks.find((b) => b.id === chosen) : undefined) ?? timerBlock ?? (clock ? (clockBlock ?? null) : (nowOrder.find((b) => !done(b)) ?? null));
  const startOf = (b: TodayBlock): number => windowOf(b.id)?.start ?? 24 * 60;
  const blockName = (id: string): string => settings.core.blocks.find((b) => b.id === id)?.name ?? id;
  const later = blocks.filter((b) => b !== nowBlock && !done(b)).sort((a, b) => startOf(a) - startOf(b));
  const dayBreak = breaksOf(placed)[0];
  const moveOn = isToday && timer ? switchPrompt(placed, timer.block, minuteNow, keptGoing) : null;
  const byBlock = minutesByBlock(log);
  const logged = totalMinutes(log);
  // Every second counts: the logged minutes, the seconds stops carried, and the running timer's part of this date.
  const runningToday = isToday && timer ? runningMsOn(timer, date, timer.startedAt + elapsed) : 0;
  const blockMs = (id: string): number => (byBlock[id] ?? 0) * 60_000 + carriedMs(carry, date, id) + (timer?.block === id ? runningToday : 0);
  const dayMinutes = Math.floor((logged * 60_000 + carriedMs(carry, date) + runningToday) / 60_000);
  // A block counts as done once it is marked done or its time reaches its target.
  const reached = (b: TodayBlock): boolean => done(b) || (b.targetMinutes > 0 && blockMs(b.id) >= b.targetMinutes * 60_000);
  const streakState = streak(atlas.logs, settings.core.streak, date, plannedFor(settings));
  // The week strip: the six days before today and today. A day counts as it does for the streak.
  const weekDays = dailyTotals(atlas.logs, addDays(now, -6), now, plannedFor(settings)).map((t) => ({ date: t.date, minutes: t.minutes }));
  const restDay = plan.resolved.rest;
  const nothingPlanned = !restDay && blocks.every((b) => b.kind === 'empty' && !b.weeklyBuild);
  // The day's template is named in the header only when it is not the usual Full day.
  const templateNote = restDay ? 'rest day' : plan.resolved.templateId !== 'full' || plan.resolved.source === 'change' ? plan.resolved.templateName : null;
  const canChange = date >= now;

  const item = nowBlock ? focusItem(nowBlock, monthlyFirst) : undefined;
  const isProject = item?.kind === 'project';
  const nowRunning = Boolean(timer && nowBlock && timer.block === nowBlock.id);
  const otherRunning = Boolean(timer && !nowRunning);
  const nowMinutes = nowBlock ? Math.floor(blockMs(nowBlock.id) / 60_000) : 0;
  const nowDone = nowBlock ? done(nowBlock) : false;

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
      const ticked = stepsTicked(atlas.states.get(activeCase.id)?.unitsDone);
      rows.push({ key: 'Monthly case', kind: 'case', title: 'Monthly case · ' + activeCase.title, meta: 'Advanced · ' + ticked + ' of ' + (activeCase.steps ?? 0) + ' milestones ticked · ' + activeCase.hours + ' h', doc: activeCase.id, trailing: hoursOn(activeCase.id) + ' h' });
    }
    return rows;
  };
  // They live inside their block, so Today still fits one screen: on the block's Now card as rows, and as a mention on
  // its Later today row. Once the block is done, they lead Later today.
  const leadingExtras = blocks.filter((b) => b !== nowBlock && done(b)).flatMap((b) => extrasFor(b.id));
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
    if (block.kind === 'review') return { title: 'Weekly review and paper', meta: name + ' · close the week' };
    const blockItem = focusItem(block, monthlyFirst);
    if (!blockItem) {
      if (block.id === 'D') return { title: 'No project this week', meta: 'Pick one', to: '/plan/pick?from=today' };
      return { title: block.emptyReason ?? 'Nothing planned', meta: name };
    }
    // A project's row opens its tech doc; the doc's "Work on it now" makes it Now.
    const doc = blockItem.kind === 'project' ? blockItem.refId : undefined;
    if (blockItem === block.weeklyBuild) return { title: block.def.name, meta: nameOf(blockItem) + ' · weekly build · ' + hoursOn(blockItem.refId) + ' of ' + blockItem.estHours + ' h done', doc };
    // As the boards draw it: the block by name, what it works on underneath ("Hugging Face · LLM Course · chapter 3").
    return { title: block.def.name, meta: [nameOf(blockItem), detailOf(blockItem)].filter(Boolean).join(' · '), doc };
  };

  const start = (): void => {
    if (!nowBlock) return;
    void startTimer({ block: nowBlock.id, track: item?.track ?? 'career', refId: item?.refId });
  };
  // The timer logs each day's part on its own day, so a stop never needs to know which date is on screen.
  const stop = (): void => void stopTimer();
  // Starting a block while another runs switches: the other stops and keeps its minutes.
  const otherName = otherRunning && timer ? blockShort(settings.core.blocks.find((b) => b.id === timer.block)?.name ?? timer.block) : null;

  let primary;
  if (nowRunning) {
    primary = (
      <Button variant="filled" icon="stop" onClick={stop}>
        Stop
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
    // Minutes are the timer's; a past day is corrected in Calendar's day view.
    primary = (
      <Button variant="filled" icon="calendar" to={'/calendar?view=day&date=' + date} name={'Open ' + dateTitle(date) + ' in Calendar'}>
        Calendar
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
  // The block by name; the item it works on leads the line under it, after the time.
  const headline = nowBlock ? (nowBlock.kind === 'review' ? 'Weekly review and paper' : item && nowBlock.weeklyBuild === item ? nameOf(item) : item ? nowBlock.def.name : nowBlock.id === 'D' ? 'No project this week' : (nowBlock.emptyReason ?? 'Nothing planned')) : '';
  const metaLine = nowBlock
    ? [
        span(nowMinutes) + ' of ' + span(nowBlock.targetMinutes),
        item && headline !== nameOf(item) ? nameOf(item) : null,
        nowBlock.catchUp ? span(nowBlock.catchUp) + ' of it catch-up' : null,
        detailOf(item),
        isProject && item.unitCount > 0 ? item.unitsDone + ' of ' + item.unitCount + ' ticked' : null,
        nowDone ? 'done' : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const linkClass = 'inline-flex min-h-11 items-center gap-2 text-button font-medium text-blue-deep';

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
        {/* The page's title, for screen readers: the date. The mark and wordmark are decoration. */}
        <h1 className="sr-only">{dateTitle(date)}</h1>
        {/* One row: the mark, the wordmark, the date, and the three knobs (change, settings, theme), 44 px each. */}
        <div className="-mb-1.5 flex items-center gap-1 pt-[max(2.25rem,env(safe-area-inset-top))]">
          <span aria-hidden="true" className="flex shrink-0 items-center gap-1.5 pl-1">
            <img src={'./brand/atlas-mark-' + theme + '.png'} width={26} height={26} alt="" />
            <span className="text-[1.125rem] font-semibold tracking-[-0.01em]">Atlas</span>
          </span>
          <button type="button" className="min-h-11 min-w-0 flex-1 truncate rounded-pill px-1.5 text-left text-meta font-semibold text-blue-deep" onClick={() => setSheet('date')} aria-haspopup="dialog" aria-label={shortDate(date) + (isToday ? ', today' : '') + ', pick a date'}>
            {shortDate(date)}
          </button>
          <span className="-mr-1.5 flex shrink-0">
            {canChange && <Button variant="icon" icon="sliders" className="!size-11" label={isToday ? 'Change today' : 'Change ' + dateTitle(date)} onClick={() => setSheet('change')} />}
            <Button variant="icon" icon="gear" className="!size-11" label="Settings" to="/settings" />
            <Button
              variant="icon"
              icon={theme === 'dark' ? 'sun' : 'moon'}
              className="!size-11"
              label={'Switch to the ' + nextTheme + ' theme'}
              onClick={() => void updateSettings(settings.core, (s) => ({ ...s, theme: nextTheme }))}
            />
          </span>
        </div>
        {!isToday && (
          <div className="mt-2 flex">
            <Button size="sm" icon="today" onClick={() => setDate(now)}>
              Back to today
            </Button>
          </div>
        )}
        <div className="mt-4">
          <div className="tile flex flex-col items-center justify-center gap-1.5 px-[18px] py-4 text-center">
            {nowRunning || otherRunning ? (
              <p className="flex flex-col items-center gap-1.5">
                {/* The block's total for today, not this run alone: a restart continues from it. */}
                <span role="timer" aria-label={'Running, ' + span(Math.floor(blockMs(timer!.block) / 60_000)) + ' on this block today'} className="well well-blue rounded-[14px] px-[18px] py-1.5 text-big font-semibold tabular-nums">
                  {formatStopwatch(blockMs(timer!.block))}
                </span>{' '}
                <span className="text-meta text-ink2">
                  <span className="font-semibold text-blue-deep">Running</span>
                  {' · since ' + clockOf(timer!.startedAt) + ' · ' + span(Math.floor(blockMs(timer!.block) / 60_000)) + ' on this block today'}
                </span>
              </p>
            ) : layout.stats ? (
              <p className="flex flex-col items-center gap-1.5">
                <span className="well well-ice rounded-[14px] px-[18px] py-1.5 text-big font-semibold">{span(dayMinutes)}</span>{' '}
                <span className="text-meta text-ink2">{'of ' + span(plan.targetMinutes) + ' today' + (templateNote ? ' · ' + templateNote : '') + ' · ' + (streakState.current > 0 ? streakState.current + '-day streak' : 'no streak yet')}</span>
              </p>
            ) : null}
          </div>
        </div>
        {/* The week so far: a day that counted is blue, today is ice, a day that did not count is pressed in. */}
        <nav aria-label="This week: a blue day has time logged, a pressed-in day has none, today is ice" className="tile mt-4 flex justify-between px-2.5 py-2.5">
          {weekDays.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => setDate(d.date)}
              aria-current={d.date === date ? 'date' : undefined}
              className="flex min-w-11 flex-col items-center gap-1.5"
            >
              {/* The visible "Sat 10" starts the name; the full date and whether it counted follow for screen readers. */}
              <span className="text-small font-semibold text-ink2">{dayName(d.date, true)}</span>
              <span
                className={
                  'grid size-[34px] place-items-center rounded-pill text-label font-semibold ' +
                  (d.date === now ? 'fill-ice' : d.minutes > 0 ? 'fill-blue' : 'well rounded-pill text-ink2') +
                  (d.date === date && date !== now ? ' outline outline-2 outline-offset-2 outline-blue-deep' : '')
                }
              >
                {Number(d.date.slice(8, 10))}
              </span>
              <span className="sr-only">{', ' + dateTitle(d.date) + (d.date === now ? ', today' : '') + (d.minutes > 0 ? ', ' + span(d.minutes) + ' logged' : ', nothing logged')}</span>
            </button>
          ))}
        </nav>
      </div>

      {outside && <p className="mt-2 text-meta text-ink2">{outside}</p>}

      {updateReady && (
        <RowList className="mt-4">
          <Row title="A new version of Atlas is ready" trailing="Reload" onClick={applyUpdate} />
        </RowList>
      )}

      {moveOn && (
        // A quiet offer when a running block's time is up: the next block starts now, or the day is over.
        <section aria-label="Move on" className="tile well-ice mt-4 flex flex-col gap-3 p-[18px]">
          <p className="text-body font-semibold">
            {moveOn.to ? 'Move on to ' + (settings.core.blocks.find((b) => b.id === moveOn.to)?.name ?? moveOn.to) + '?' : blockName(moveOn.from) + ' ended at ' + hm(moveOn.at) + '.'}
          </p>
          <div className="flex gap-3 [&>*]:min-w-0 [&>*]:flex-1">
            <Button
              icon={moveOn.to ? 'play' : 'stop'}
              onClick={() => {
                const next = moveOn.to ? blocks.find((b) => b.id === moveOn.to) : undefined;
                const nextItem = next ? focusItem(next, monthlyFirst) : undefined;
                if (next) {
                  setChosen(null);
                  void startTimer({ block: next.id, track: nextItem?.track ?? 'career', refId: nextItem?.refId });
                } else void stopTimer();
              }}
            >
              {moveOn.to ? 'Switch' : 'Stop'}
            </Button>
            <Button
              onClick={() => {
                const next = new Set(keptGoing).add(moveOn.from + '@' + moveOn.at);
                setKeptGoing(next);
                saveKept(next);
              }}
            >
              Keep going
            </Button>
          </div>
        </section>
      )}

      {restDay ? (
        <section aria-label="Now" className="tile mt-4 flex flex-col gap-1.5 p-[18px]">
          <p className="section-label mb-0">Now</p>
          <p className="text-card font-semibold">A rest day.</p>
          <p className="text-meta text-ink2">Nothing is planned, and the streak is safe.{logged > 0 ? ' ' + span(logged) + ' logged anyway.' : ''}</p>
        </section>
      ) : nothingPlanned ? (
        <EmptyState action={<Button to="/plan">Open Plan</Button>}>Nothing scheduled. Open Plan to pick what you&apos;re learning.</EmptyState>
      ) : !nowBlock && clock?.kind === 'break' ? (
        // 12:00 to 18:00: the break, with the block after it underneath (a tap starts it early).
        <section aria-label="Now" className="tile mt-4 flex flex-col gap-1.5 p-[18px]">
          <p className="section-label mb-0 flex items-center gap-1.5 uppercase">
            <Icon name="moon" size={18} />
            {'Break · ' + hm(clock.from) + '–' + hm(clock.until)}
          </p>
          <h2 className="mt-1 text-card font-semibold">{'Break until ' + hm(clock.until)}</h2>
          <p className="text-meta text-ink2">{span(dayMinutes) + ' of ' + span(plan.targetMinutes) + ' so far today'}</p>
          {(() => {
            const next = blocks.find((b) => b.id === clock.next);
            if (!next) return null;
            const row = rowFor(next);
            return (
              <ul className="rows mt-2 border-t-[1.5px] border-dashed border-dash">
                <Row icon={<BlockTile block={next.id} />} title={'Next: ' + blockName(next.id)} meta={row.meta} trailing={hm(clock.until)} onClick={() => setChosen(next.id)} />
              </ul>
            );
          })()}
        </section>
      ) : !nowBlock ? (
        <section aria-label="Now" className="tile mt-4 flex flex-col gap-1.5 p-[18px]">
          <p className="section-label mb-0">{clock?.kind === 'done' ? 'Day done' : 'Now'}</p>
          <p className="text-card font-semibold">{clock?.kind === 'done' ? 'That was the day.' : 'Every block is done.'}</p>
          <p className="text-meta text-ink2">{span(dayMinutes) + ' of ' + span(plan.targetMinutes) + ' · ' + blocks.filter(reached).length + ' of ' + blocks.length + ' blocks'}</p>
        </section>
      ) : (
        <section aria-labelledby="now-title" className={'tile mt-4 flex flex-col gap-1.5 p-[18px]' + (taken && item?.refId === taken.id ? ' taken' : '')}>
          <div className="flex items-center justify-between gap-2">
            <p className="section-label mb-0 flex min-w-0 items-center gap-1.5 uppercase" style={{ color: toneInk(blockTone(nowBlock.id)) }}>
              <BlockIcon block={nowBlock.id} size={18} />
              <span className="truncate">{'Now · ' + (windowOf(nowBlock.id) ? hm(windowOf(nowBlock.id)!.start) + '–' + hm(windowOf(nowBlock.id)!.start + windowOf(nowBlock.id)!.minutes) : blockShort(nowBlock.def.name))}</span>
            </p>
            {!expanded && (
              <div className="-my-1 flex shrink-0 gap-2">
                {otherName && (
                  <Button size="sm" icon="stop" name={'Stop ' + otherName} onClick={stop}>
                    {otherName}
                  </Button>
                )}
                <Button
                  size="sm"
                  icon="check"
                  name={nowDone ? 'Mark not done' : 'Mark done'}
                  aria-pressed={nowDone}
                onClick={() => {
                  void editLog(date, (current) => toggleBlockDone(current, nowBlock.id));
                  setChosen(null);
                  setExpanded(false);
                }}
              >
                  {nowDone ? 'Undo' : 'Done'}
                </Button>
              </div>
            )}
          </div>
          <h2 className="mt-1 text-card">
            {isProject && item ? (
              // A project's title opens its tech doc; everything else unfolds in place.
              <button id="now-title" type="button" aria-haspopup="dialog" onClick={() => setDoc({ id: item.refId, block: nowBlock.id, from: 'now' })} className="-my-1 line-clamp-2 min-h-11 w-full py-1 text-left text-card font-semibold">
                {headline}
              </button>
            ) : (
              <button id="now-title" type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} className="-my-1 line-clamp-2 min-h-11 w-full py-1 text-left text-card font-semibold">
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
                {item && (
                  <button type="button" className={linkClass} onClick={() => setSheet('note')}>
                    Add a note
                  </button>
                )}
                {item?.url && item.kind === 'project' ? (
                  <a href={item.url} target="_blank" rel="noreferrer noopener" className={linkClass}>
                    <Icon name="external" size={16} />
                    Open the source
                  </a>
                ) : !item?.url && item?.searchHint ? (
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

          {/* Start (the one filled button) and the ice secondary: the tech doc, or the course. */}
          {/* Two equal buttons that never leave the card; on the narrowest phones the second keeps only its icon. */}
          <div className={(expanded ? 'mt-2' : 'mt-3.5') + ' flex items-center gap-3 [&>*]:min-w-0 [&>*]:flex-1'}>
            {primary}
            {isProject && item ? (
              <Button variant="ice" icon="doc" aria-haspopup="dialog" name="Tech doc" onClick={() => setDoc({ id: item.refId, block: nowBlock.id, from: 'now' })}>
                <span className="truncate max-[379px]:sr-only">Tech doc</span>
              </Button>
            ) : item?.url ? (
              <Button variant="ice" icon="external" href={item.url} name={resource?.type === 'book' ? 'Open the book' : 'Open course'}>
                <span className="line-clamp-2 whitespace-normal text-center leading-tight max-[379px]:sr-only">{resource?.type === 'book' ? 'Open the book' : 'Open course'}</span>
              </Button>
            ) : null}
          </div>
          {extrasFor(nowBlock.id).length > 0 && <ul className="rows mt-3 border-t-[1.5px] border-dashed border-dash">{extrasFor(nowBlock.id).map(extraRow)}</ul>}
        </section>
      )}

      {!restDay && !nothingPlanned && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="tile flex flex-col items-center gap-2 p-3.5">
            <span className="section-label mb-0">Blocks today</span>
            <span className="text-big font-semibold leading-none">
              {blocks.filter(reached).length}
              <span className="text-ink2">/{blocks.length}</span>
            </span>
            <span aria-hidden="true" className="flex gap-1.5">
              {blocks.map((b) => (
                <span key={b.id} className={'size-3 rounded-pill ' + (reached(b) ? 'fill-blue' : 'well rounded-pill')} />
              ))}
            </span>
          </div>
          {plan.phase && (
            <div className="tile flex flex-col items-center gap-2 p-3.5">
              <span className="section-label mb-0 max-w-full truncate">{plan.phase.title.split(' — ')[0]}</span>
              <span className="well well-blue rounded-[14px] px-3.5 py-1 text-card font-semibold leading-tight text-blue-deep">{Math.max(0, daysBetween(date, plan.phase.end))}</span>
              <span className="text-meta text-ink2">days left</span>
            </div>
          )}
        </div>
      )}

      {!nothingPlanned && layout.later && (later.length > 0 || leadingExtras.length > 0) && (
        <RowList
          label="Later today"
          className="mt-4"
          aside={blocks.some(done) ? 'Done: ' + blocks.filter(done).map((b) => blockName(b.id)).join(', ') : 'Done: 0 of ' + blocks.length}
        >
          {leadingExtras.map(extraRow)}
          {later.flatMap((block, i) => {
            const row = rowFor(block);
            // The quiet break between the sessions, where the list crosses it.
            const prev = later[i - 1];
            const divider =
              dayBreak && windowOf(block.id) && windowOf(block.id)!.start >= dayBreak.until && (!prev || startOf(prev) < dayBreak.until) && (prev || (clock?.kind === 'block' && windowOf(clock.id)!.start < dayBreak.until)) ? (
                <li key="break" className="flex min-h-11 items-center gap-3 py-2 text-meta font-semibold text-ink2">
                  <span className="grid w-10 place-items-center">
                    <Icon name="moon" size={18} />
                  </span>
                  {'Break · ' + hm(dayBreak.from) + ' – ' + hm(dayBreak.until)}
                </li>
              ) : null;
            const isTaken = Boolean(taken && block.id === 'D' && focusItem(block, monthlyFirst)?.refId === taken.id);
            return [
              divider,
              <Row
                key={block.id}
                className={isTaken ? 'taken' : ''}
                icon={<BlockTile block={block.id} />}
                title={row.title}
                meta={layout.view === 'compact' ? undefined : [blockMs(block.id) >= 60_000 ? span(Math.floor(blockMs(block.id) / 60_000)) + ' today' : null, row.meta, extrasNote(block.id)].filter(Boolean).join(' · ')}
                trailing={windowOf(block.id) ? hm(windowOf(block.id)!.start) : span(block.targetMinutes)}
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
                {isTaken && <span aria-hidden="true" className="taken-line absolute inset-x-0 bottom-0 h-0.5 bg-blue" />}
              </Row>,
            ];
          })}
        </RowList>
      )}

      {showDayRow && (
        <RowList className="mt-4">
          <Row title="How was today?" trailing={log?.energy ? 'Energy ' + log.energy + ' of 5' : undefined} onClick={() => setSheet('day')} />
        </RowList>
      )}


      {layout.footer && syncLine && (
        <Link to="/settings?section=sync" className="mt-2 flex min-h-11 items-center px-1 text-meta text-ink2">
          {syncLine}
        </Link>
      )}

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
              variant="filled"
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
