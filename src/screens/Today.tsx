import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { stepsTicked } from '../seed/catalogue.ts';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCatalogueIndex, useChallengeEvents } from '../hooks/useCatalogue.ts';
import { dailyChallenge, isSlotDay, languageOf, weeklyChallenge } from '../lib/catalogue/daily.ts';
import type { Pick as ChallengePick } from '../lib/catalogue/daily.ts';
import { groupLabel } from '../lib/catalogue/filters.ts';
import { editItemState, setWeekPick, useWeekPick } from '../db/state.ts';
import { startTimer, stopTimer, useRunningTimer } from '../db/timer.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import type { Atlas } from '../hooks/useAtlas.ts';
import { useUnits } from '../hooks/useUnits.ts';
import { addDays, dayName, formatLong, formatStopwatch, monthName, startOfWeek, today as todayDate } from '../lib/dates.ts';
import { editLog, emptyLog, isBlockDone, minutesByBlock, minutesForRef, readLog, setBlockMinutes, toggleBlockDone, totalMinutes } from '../lib/logs.ts';
import { plannedFor } from '../lib/day-plan.ts';
import { catchUpMinutes, laneBalance } from '../lib/pace.ts';
import { planForDay, suggestWeeklyBuild } from '../lib/schedule.ts';
import type { ScheduledItem, TodayBlock } from '../lib/schedule.ts';
import type { DayLog } from '../db/types.ts';
import { counts as dayCounts, dailyTotals, heatLevel, relativeLevel, streak } from '../lib/streaks.ts';
import { ArtPanel } from '../ui/ArtPanel.tsx';
import { useArtSettings } from '../hooks/useArt.ts';
import { SCENES, useCurrentScene } from '../hooks/useScenes.ts';
import { laneSlot, pickScene, shiftDate } from '../lib/scenes.ts';
import { applyScene } from '../lib/theme.ts';
import { blockEndsAt, mixFor, shouldOffer } from '../lib/focus.ts';
import { blockStopped, play as playFocus } from '../lib/focus-player.ts';
import { categoryLabel } from '../seed/focus.ts';
import type { FocusCategory } from '../seed/focus.ts';
import { firstOf } from '../lib/focus-sessions.ts';
import { saveFocusPrefs } from './settings/shared.tsx';
import { ScenePanel, SceneSwatches } from '../ui/ScenePanel.tsx';
import { phaseSlot, streakSlot, todaySlot } from '../lib/art.ts';
import type { ArtSlot } from '../seed/art.ts';
import { buildPaths } from '../lib/library-home.ts';
import { buildModel } from './plan/model.ts';
import { activePhase } from '../lib/schedule.ts';
import { resolveTheme } from '../lib/theme.ts';
import { Link, useQueryParam } from '../router/router.tsx';
import { isRealIsoDate } from '../seed/schema.ts';
import type { BlockId, TrackId } from '../seed/schema.ts';
import { Button } from '../ui/Button.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Icon } from '../ui/Icon.tsx';
import { blockIconName, BlockTile, IconTile, KindIcon } from '../ui/glyphs.tsx';
import { checkBlogPost, useBlogPosts } from '../db/blog.ts';
import { blogReminderDue } from '../lib/blog.ts';
import { useSleep } from '../db/sleep.ts';
import { useInternSummaries } from '../hooks/useInternships.ts';
import { roleName } from '../lib/internships.ts';
import { lengthText, timeOf } from '../lib/sleep.ts';
import { ProgressLine } from '../ui/ProgressLine.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { Sheet } from '../ui/Sheet.tsx';
import { LessonList, LessonWindow, playVideo } from './parts/LessonChecklist.tsx';
import { checklistCounts, checklistMeta, currentUnit, isChecklist } from '../lib/checklist.ts';
import { Checklist, criteriaUnits } from './parts/Checklist.tsx';
import type { ChecklistUnit } from './parts/Checklist.tsx';
import type { Unit } from '../seed/schema.ts';
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
import { clockNow, formatWindow, groupDay, switchPrompt } from '../lib/clock-plan.ts';
import { takenProject } from './parts/taken.ts';
import { blockShort, dateTitle, nameOf, partOf, span, unitDetail } from './parts/text.ts';
import { todayLine, tokenDaysLeft, useSyncView } from '../sync/status.ts';

type SheetName = 'date' | 'day' | 'note' | 'change' | 'lessons' | null;

/**
 * The check-in (the redesign mockup's "how did it go?" card): the last block whose window passed with nothing logged,
 * today's or last night's, with one tap to log its hours as planned, half of them, or to mark it skipped.
 */
interface CheckIn {
  date: string;
  block: BlockId;
  lane: number;
  name: string;
  item: string | null;
  window: string;
  target: number;
  track: TrackId;
  refId: string | undefined;
  answer: 'planned' | 'partly' | 'skipped' | null;
  /** The day as it was before the answer logged to it, for Undo. */
  before?: DayLog;
}

/** Check-ins marked skipped ("2026-10-30:E"), on this device, the last thirty. */
const SKIPPED_KEY = 'atlas.checkins';
function readSkipped(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SKIPPED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
function writeSkipped(list: string[]): void {
  try {
    localStorage.setItem(SKIPPED_KEY, JSON.stringify(list.slice(-30)));
  } catch {
    // Storage blocked: the answer still holds for this page.
  }
}

/** The item a block puts in front of you. Block D carries the week's build first, then the monthly project. */
/**
 * The finish card (ATLAS-ART): on the day a streak reaches 7, 30 or 100, a path's last step is ticked, or the
 * current phase's lanes are all done. The phase model is Plan's arithmetic; it is kept per atlas and day.
 */
const modelCache = new WeakMap<object, { date: string; model: ReturnType<typeof buildModel> }>();
function finishCard(atlas: Atlas, date: string, streakDays: number): { slot: ArtSlot; line: string; alt: string } | null {
  const streakMilestone = streakSlot(streakDays);
  if (streakMilestone) return { slot: streakMilestone, line: streakDays + ' days in a row', alt: 'A streak of ' + streakDays + ' days' };
  const path = buildPaths(atlas.seed, atlas.states).find((p) => p.steps.length > 0 && p.done === p.steps.length && p.steps.some((st) => atlas.states.get(st.refId)?.doneAt === date));
  if (path) return { slot: 'path-complete', line: path.name + ': every step done', alt: 'The ' + path.name + ' path, finished' };
  const phase = activePhase(date, atlas.seed.phases);
  if (!phase) return null;
  const hit = modelCache.get(atlas);
  const model = hit && hit.date === date ? hit.model : buildModel(atlas, date);
  modelCache.set(atlas, { date, model });
  const current = model.find((m) => m.phase.id === phase.id);
  if (current && current.progress.totalHours > 0 && current.progress.remainingHours <= 0) return { slot: phaseSlot(current.phase), line: current.phase.title + ': every lane done', alt: 'The phase ' + current.phase.title + ', finished' };
  return null;
}

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

/**
 * A block's window on the right of its row, "06:00–08:00" in 14 px ink2 (SCHEDULE-TIMES). On a narrow phone the two
 * times stack, "06:00" over "08:00"; it never shrinks or cuts. Anything without a window says "any time".
 */
function WindowTime({ text }: { text: string }) {
  const [from, to] = text.split('–');
  if (!to) return <span className="whitespace-nowrap">{text}</span>;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="flex flex-wrap justify-end whitespace-nowrap text-right tabular-nums max-[400px]:flex-col max-[400px]:items-end max-[400px]:leading-tight">
        <span>{from}</span>
        <span>
          <span className="max-[400px]:hidden">–</span>
          {to}
        </span>
      </span>
    </>
  );
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
  // The illustrations' settings (ATLAS-ART): read with the other hooks, before the loading return.
  const art = useArtSettings();
  // The day's scene (ATLAS-DAILY-SCENES) and a preview of another day's, which colours the screen while it is shown
  // and is never saved.
  const current = useCurrentScene();
  const [sceneShift, setSceneShift] = useState(0);
  const [offer, setOffer] = useState<{ block: string; mix: string } | null>(null);
  const previewDay = sceneShift === 0 ? null : shiftDate(current.day, sceneShift);
  const previewScene = previewDay ? (pickScene(SCENES, previewDay, { ...current.prefs, pinned: undefined, skipped: undefined })?.scene ?? null) : null;
  const sceneShown = previewScene ?? current.scene;
  useEffect(() => {
    if (!previewScene) return undefined;
    const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    applyScene(previewScene, theme);
    return () => applyScene(current.scene, theme);
  }, [previewScene, current.scene]);
  const units = useUnits();
  const timer = useRunningTimer();
  const blogPosts = useBlogPosts();
  const nights = useSleep();
  // Internships: the first goal with an upcoming application has a card.
  const internSummary = useInternSummaries(now)?.find((g) => g.card) ?? null;
  const internCard = internSummary?.card ? { goal: internSummary.goal, name: internSummary.name, card: internSummary.card } : null;
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
  // Last night's block for the check-in: yesterday's log, and the answer given (or being undone).
  const yesterday = addDays(now, -1);
  const yesterdayLog = useLiveQuery(() => readLog(yesterday), [yesterday]);
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [skippedList, setSkippedList] = useState<string[]>(() => readSkipped());
  // "Detect my post automatically", when it is on: once an evening, from 21:00, on today.
  const eveningCheck = date === now && minuteNow >= 21 * 60;
  useEffect(() => {
    if (eveningCheck) void checkBlogPost(now).catch(() => undefined);
  }, [eveningCheck, now]);
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
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

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

  // Yesterday's plan, for the check-in's target and item.
  const yesterdayPlan = useMemo(() => (settings && ctx ? planForDay({ date: yesterday, settings, weeklyPickId: weekPick?.projectId, ctx }) : null), [yesterday, settings, weekPick, ctx]);

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
  const blockName = (id: string): string => settings.core.blocks.find((b) => b.id === id)?.name ?? id;
  // Later today by the clock (SCHEDULE-TIMES): each session's blocks still to come, the break between the sessions
  // while it is ahead, the blocks whose window passed unfinished, and the ones done. A past day is all over; a day
  // ahead is all to come. Blocks with no time on the day (not in the schedule) come last, as "any time".
  const groupMinute = isToday ? minuteNow : date < now ? 24 * 60 : -1;
  const groups = groupDay(placed, groupMinute, nowBlock?.id ?? null, (id) => blocks.some((b) => b.id === id && done(b)));
  const unplaced = blocks.filter((b) => !windowOf(b.id) && b !== nowBlock && !done(b));
  const blockOf = (id: string): TodayBlock => blocks.find((b) => b.id === id)!;
  const windowText = (id: string): string => (windowOf(id) ? formatWindow(windowOf(id)!.start, windowOf(id)!.minutes) : 'any time');
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
  // The week strip: the six days before today and today, each shaded by its share of its plan on the heatmap's ramp,
  // with a dot under a day that met its plan or kept the streak (ATLAS-UI-POLISH).
  const weekDays = dailyTotals(atlas.logs, addDays(now, -6), now, plannedFor(settings)).map((t) => ({
    date: t.date,
    minutes: t.minutes,
    level: settings.core.heatmapMode === 'relative' ? relativeLevel(t.minutes, t.planned ?? 0, settings.core.heatmapThresholds) : heatLevel(t.minutes, settings.core.heatmapThresholds),
    met: t.minutes > 0 && ((t.planned ?? 0) > 0 ? t.minutes >= (t.planned ?? 0) : false),
    counted: dayCounts(t, settings.core.streak),
  }));
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
  // The illustrations (ATLAS-ART): the header's picture by the hour, the season or the block's track, and a card
  // on the day a streak reaches 7, 30 or 100, a path's last step is ticked, or the phase's lanes are all done.
  const finish = art.on && isToday ? finishCard(atlas, date, streakState.current) : null;

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
    // Its own short title on one line; what kind of challenge it is leads the meta line (SCHEDULE-TIMES).
    title: pick.challenge.title,
    meta: pick.solved
      ? label + ' · solved'
      : [label, pick.challenge.difficulty, groupLabel(pick.challenge.group), (pick.anotherLanguage ? 'in another language: ' : 'in ') + pick.language].join(' · '),
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
  // The day's blog post (DAILY-BLOG): written in the user's own blog; Today reminds once the last block is over.
  const blogPosted = Boolean(blogPosts?.find((p) => p.date === date)?.posted);
  const blogDue = isToday && blogPosts !== undefined && blogReminderDue({ slots: placed, minute: minuteNow, log, runningBlock: timer?.block, posted: blogPosted });
  const blogTo = isToday ? '/blog' : '/blog?date=' + date;
  const showBlogRow = date <= now && blogPosts !== undefined;
  // Sleep (SLEEP-LOG): the night that ended this morning.
  const slept = nights?.find((n) => n.date === date);
  const sleepTo = date === now ? '/sleep' : '/sleep?date=' + date;
  // The check-in's candidate: today's latest block whose window passed with nothing logged and not marked done, else
  // last night's; one marked skipped is not asked again; an answer given shows its card until Undo.
  if (isToday && checkIn === null && yesterdayLog !== undefined) {
    const candidateOn = (d: string, dayPlan: typeof plan | null, dayLog: DayLog | undefined, endBefore: number): CheckIn | null => {
      if (!dayPlan) return null;
      const minutesOn = minutesByBlock(dayLog);
      const slots = dayLayout(d, settings)
        .filter((p) => p.start + p.minutes <= endBefore && (minutesOn[p.id] ?? 0) === 0 && !isBlockDone(dayLog, p.id) && !skippedList.includes(d + ':' + p.id))
        .sort((a, b) => b.start + b.minutes - (a.start + a.minutes));
      const slot = slots[0];
      const block = slot ? dayPlan.blocks.find((b) => b.id === slot.id) : undefined;
      if (!slot || !block || block.kind === 'review' || block.kind === 'empty' || block.targetMinutes <= 0) return null;
      const blockItem = focusItem(block, monthlyFirst);
      return { date: d, block: block.id, lane: laneSlot(block.id), name: blockShort(block.def.name), item: blockItem ? nameOf(blockItem) : null, window: formatWindow(slot.start, slot.minutes), target: block.targetMinutes, track: blockItem?.track ?? 'career', refId: blockItem?.refId, answer: null };
    };
    const candidate = candidateOn(date, plan, log, minuteNow) ?? (!dayLayout(yesterday, settings).length ? null : candidateOn(yesterday, yesterdayPlan, yesterdayLog, 24 * 60 + 1));
    if (candidate && (checkIn as CheckIn | null)?.block !== candidate.block) setCheckIn(candidate);
  }
  const answerCheckIn = async (answer: 'planned' | 'partly' | 'skipped'): Promise<void> => {
    const c = checkIn;
    if (!c || c.answer) return;
    if (answer === 'skipped') {
      const next = [...skippedList, c.date + ':' + c.block];
      setSkippedList(next);
      writeSkipped(next);
      setCheckIn({ ...c, answer });
      return;
    }
    const minutes = answer === 'planned' ? c.target : Math.round(c.target / 2 / 5) * 5;
    let before: DayLog | undefined;
    await editLog(c.date, (l) => {
      before = l;
      return setBlockMinutes(l, c.block, c.track, c.refId, minutes);
    });
    setCheckIn({ ...c, answer, before });
  };
  const undoCheckIn = async (): Promise<void> => {
    const c = checkIn;
    if (!c || !c.answer) return;
    if (c.answer === 'skipped') {
      const next = skippedList.filter((k) => k !== c.date + ':' + c.block);
      setSkippedList(next);
      writeSkipped(next);
    } else {
      const before = c.before;
      await editLog(c.date, () => before ?? emptyLog(c.date));
    }
    setCheckIn(null);
  };
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
    // A lesson checklist says where in the course you are ("Module 1 · 6 of 97").
    const lessons = blockItem.kind === 'resource' ? units?.[blockItem.refId] : undefined;
    const detail = lessons && isChecklist(lessons) ? checklistMeta(lessons, atlas.states.get(blockItem.refId)?.unitsDone ?? [], true) : detailOf(blockItem);
    return { title: block.def.name, meta: [nameOf(blockItem), detail].filter(Boolean).join(' · '), doc };
  };

  const start = (): void => {
    if (!nowBlock) return;
    void startTimer({ block: nowBlock.id, track: item?.track ?? 'career', refId: item?.refId });
    // "Start with Lofi?" (ATLAS-FOCUS-MUSIC): once per block with a saved mix, remembered either way.
    const mix = shouldOffer(settings.focus, nowBlock.id);
    if (mix) setOffer({ block: nowBlock.id, mix });
  };
  // The timer logs each day's part on its own day, so a stop never needs to know which date is on screen. A Focus
  // session started for the block fades out with it.
  const stop = (): void => {
    if (timer) blockStopped(timer.block);
    setOffer(null);
    void stopTimer();
  };
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
  // A lesson checklist (ZOOMCAMP-CHECKLIST): its module and count lead the meta line, its progress fills the well, its
  // lessons show in the card, and its second button plays the current video.
  const lessons = item?.kind === 'resource' && isChecklist(allUnits) ? (allUnits as Unit[]) : null;
  const lessonNow = lessons ? currentUnit(lessons, unitsDone) : null;
  const lessonCounts = lessons ? checklistCounts(lessons, unitsDone) : null;
  const resource = item?.kind === 'resource' ? atlas.seed.resources.find((r) => r.id === item.refId) : undefined;
  const otherD =
    nowBlock?.id === 'D' && nowBlock.item && nowBlock.weeklyBuild && nowBlock.weeklyBuild.status !== 'done'
      ? item === nowBlock.item
        ? nowBlock.weeklyBuild
        : nowBlock.item
      : undefined;
  // The block by name; the item it works on leads the line under it, after the time.
  const headline = nowBlock ? (nowBlock.kind === 'review' ? 'Weekly review and paper' : item && nowBlock.weeklyBuild === item ? nameOf(item) : item ? nowBlock.def.name : nowBlock.id === 'D' ? 'No project this week' : (nowBlock.emptyReason ?? 'Nothing planned')) : '';
  const linkClass = 'inline-flex min-h-11 items-center gap-2 text-button font-medium text-blue-deep';


  // The header row (the mockup's): the wordmark, the date (a tap picks a day), and the knobs. The mockup has one knob,
  // Daily scenes; Settings and Change today have no other home, so their knobs stay (DECISIONS.md, pull request #43).
  const knobClass = 'tile grid size-11 shrink-0 place-items-center rounded-[14px] text-[var(--x0)]';
  const headerRow = (
    <header className="flex items-center gap-2.5 px-1 pt-[max(44px,env(safe-area-inset-top))]">
      <span aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
        <img src={'./brand/atlas-mark-' + theme + '.png'} width={26} height={26} alt="" className="max-[359px]:hidden" />
        <span className="text-[24px] font-black tracking-[-0.01em]">Atlas</span>
      </span>
      <button type="button" className="min-h-11 min-w-0 flex-1 truncate text-left text-meta font-semibold text-[var(--x0)]" onClick={() => setSheet('date')} aria-haspopup="dialog" aria-label={shortDate(date) + (isToday ? ', today' : '') + ', pick a date'}>
        {shortDate(date) + (previewDay ? ' (preview)' : '')}
      </button>
      <span className="flex shrink-0 gap-2">
        {canChange && (
          <button type="button" className={knobClass} aria-label={isToday ? 'Change today' : 'Change ' + dateTitle(date)} aria-haspopup="dialog" onClick={() => setSheet('change')}>
            <Icon name="sliders" size={20} />
          </button>
        )}
        <Link to="/settings" className={knobClass} aria-label="Settings">
          <Icon name="gear" size={20} />
        </Link>
        <Link to="/scenes" className={knobClass} aria-label="Daily scenes">
          <Icon name="image" size={20} />
        </Link>
      </span>
    </header>
  );

  // The greeting on the picture, by the clock; another day is named instead.
  const greeting = !isToday ? dateTitle(date) : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const sceneLine = sceneShown
    ? previewDay
      ? (sceneShift === 1 ? 'Tomorrow' : sceneShift === -1 ? 'Yesterday' : shortDate(todayDate(previewDay))) + ' · ' + sceneShown.name
      : (current.why === 'pinned' ? 'Pinned scene · ' : 'Today’s scene · ') + sceneShown.name
    : '';

  // The day's hours (the mockup's ring tile): the number in 36/900 with a ring of the day's share, or the running
  // timer with when it started.
  const dayFraction = plan.targetMinutes > 0 ? Math.min(1, dayMinutes / plan.targetMinutes) : 0;
  const RING = 2 * Math.PI * 26;
  const hoursTile =
    layout.stats || nowRunning || otherRunning ? (
      <section aria-label="Today's hours" className="tile mt-[18px] flex items-center gap-[18px] px-5 py-[18px]">
        <svg viewBox="0 0 64 64" className="size-16 shrink-0" role="img" aria-label={Math.round(dayFraction * 100) + " percent of today's plan"}>
          <circle cx="32" cy="32" r="26" fill="none" stroke="var(--sd)" strokeWidth="8" />
          <circle cx="32" cy="32" r="26" fill="none" stroke="var(--l0)" strokeWidth="8" strokeLinecap="round" strokeDasharray={dayFraction * RING + ' ' + RING} transform="rotate(-90 32 32)" />
        </svg>
        {nowRunning || otherRunning ? (
          <p className="flex min-w-0 flex-1 flex-col">
            {/* The block's total for today, not this run alone: a restart continues from it. */}
            <span role="timer" aria-label={'Running, ' + span(Math.floor(blockMs(timer!.block) / 60_000)) + ' on this block today'} className="text-[36px] font-black leading-none tabular-nums text-[var(--x0)]">
              {formatStopwatch(blockMs(timer!.block))}
            </span>{' '}
            <span className="mt-1.5 text-meta text-ink2">
              <span className="font-semibold text-[var(--x0)]">Running</span>
              {' · since ' + clockOf(timer!.startedAt) + ' · ' + span(Math.floor(blockMs(timer!.block) / 60_000)) + ' on this block today'}
            </span>
          </p>
        ) : (
          <p className="flex min-w-0 flex-1 flex-col">
            <span className="text-[36px] font-black leading-none">{span(dayMinutes)}</span>{' '}
            <span className="mt-1.5 text-meta text-ink2">{'of ' + span(plan.targetMinutes) + ' today' + (templateNote ? ' · ' + templateNote : '') + ' · ' + (streakState.current > 0 ? streakState.current + '-day streak' : 'no streak yet')}</span>
          </p>
        )}
      </section>
    ) : null;

  // The check-in (the mockup's "how did it go?" card): the last block whose window passed with nothing logged, today's
  // or last night's; one tap logs its hours as planned, half of them, or marks it skipped, with Undo.
  const checkInCard = checkIn ? (
    checkIn.answer ? (
      <section aria-label="Check-in" className="tile mt-4 flex items-center gap-3 px-[18px] py-3.5">
        <IconTile icon="check" size={44} lane={checkIn.lane} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-chip font-medium leading-tight">{checkIn.answer === 'planned' ? 'Logged ' + span(checkIn.target) + ' to ' + checkIn.name : checkIn.answer === 'partly' ? 'Logged ' + span(Math.round(checkIn.target / 2 / 5) * 5) + ' to ' + checkIn.name : 'Marked as skipped'}</span>
          {checkIn.item && <span className="truncate text-label text-ink2">{checkIn.item}</span>}
        </span>
        <Button size="sm" onClick={() => void undoCheckIn()}>
          Undo
        </Button>
      </section>
    ) : (
      <section aria-label="Check-in" className="tile mt-4 flex flex-col gap-3 px-[18px] py-4">
        <div className="flex items-start gap-3">
          <IconTile icon={blockIconName(checkIn.block)} size={44} lane={checkIn.lane} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className={'section-label mb-0 uppercase text-[var(--x' + checkIn.lane + ')]'}>{(checkIn.date === now ? 'Earlier' : 'Last night') + ' · ' + checkIn.window}</span>
            <span className="text-body font-medium leading-tight">{checkIn.name + ': how did it go?'}</span>
            <span className="text-label text-ink2">No timer ran. One tap logs it.</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="filled" lane={checkIn.lane as 0 | 1 | 2 | 3 | 4} className="flex-[1.3] !px-2.5" name={'As planned: log ' + span(checkIn.target) + ' to ' + checkIn.name} onClick={() => void answerCheckIn('planned')}>
            As planned
          </Button>
          <Button className="flex-1 !px-2.5" name={'Partly: log ' + span(Math.round(checkIn.target / 2 / 5) * 5) + ' to ' + checkIn.name} onClick={() => void answerCheckIn('partly')}>
            Partly
          </Button>
          <Button className="flex-1 !px-2.5" name={'Skipped ' + checkIn.name} onClick={() => void answerCheckIn('skipped')}>
            Skipped
          </Button>
        </div>
      </section>
    )
  ) : null;

  const nowLane = nowBlock ? laneSlot(nowBlock.id) : 0;
  // The line under the bar (the mockup's "55 m of 2 h", with what the block works on after it): the hours, the item,
  // the catch-up, where in it you are, and done.
  const nowHours = nowBlock
    ? [
        span(nowMinutes) + ' of ' + span(nowBlock.targetMinutes),
        item && headline !== nameOf(item) ? nameOf(item) : null,
        nowBlock.catchUp ? span(nowBlock.catchUp) + ' of it catch-up' : null,
        lessons ? checklistMeta(lessons, unitsDone) : detailOf(item),
        isProject && item && item.unitCount > 0 ? item.unitsDone + ' of ' + item.unitCount + ' ticked' : null,
        nowDone ? 'done' : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const mix = nowBlock ? mixFor(settings.focus, nowBlock.id) : null;

  // A block's row in Later today and its groups (the mockup's NEXT row): its lane tile, its window as the label ("NEXT ·
  // 18:00–20:00" on the first), the block and what it works on, a chevron. An earlier or done block says how far it got.
  const blockRow = (block: TodayBlock, progress = false, first = false) => {
    const row = rowFor(block);
    const minutes = Math.floor(blockMs(block.id) / 60_000);
    const isTaken = Boolean(taken && block.id === 'D' && focusItem(block, monthlyFirst)?.refId === taken.id);
    const meta = progress
      ? [span(minutes) + ' of ' + span(block.targetMinutes), row.meta].join(' · ')
      : [minutes >= 1 ? span(minutes) + ' today' : null, row.meta, extrasNote(block.id)].filter(Boolean).join(' · ');
    const body = (
      <>
        <BlockTile block={block.id} size={42} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-chip font-medium leading-tight">{row.title}</span>
          {layout.view !== 'compact' && <span className="truncate text-label text-ink2">{meta}</span>}
          <span className={'section-label mb-0 -order-1 whitespace-nowrap uppercase ' + (first ? 'text-[var(--x' + laneSlot(block.id) + ')]' : '')}>
            {first && <span aria-hidden="true">Next · </span>}
            {windowText(block.id)}
          </span>
        </span>
        <Icon name="chevronRight" size={18} className="text-[var(--x0)]" />
      </>
    );
    const cls = 'flex min-h-16 w-full items-center gap-3 py-2 text-left';
    return (
      <li key={block.id} className={'relative ' + (isTaken ? 'taken' : '')}>
        {row.to ? (
          <Link to={row.to} className={cls}>
            {body}
          </Link>
        ) : (
          <button
            type="button"
            className={cls}
            onClick={
              row.doc
                ? () => setDoc({ id: row.doc!, block: block.id, from: 'later' })
                : () => {
                    setChosen(block.id);
                    setExpanded(false);
                    window.scrollTo(0, 0);
                  }
            }
          >
            {body}
          </button>
        )}
        {isTaken && <span aria-hidden="true" className="taken-line absolute inset-x-0 bottom-0 h-0.5 bg-[var(--l0)]" />}
      </li>
    );
  };
  const upcoming = [...groups.sessions.flatMap((g) => g.upcoming), ...unplaced.map((b) => b.id)];
  // "How was today?": the day in one line, so the card is never empty.
  const daySummary = [
    span(dayMinutes) + ' logged',
    blocks.filter(reached).length + ' of ' + blocks.length + ' blocks done',
    slept ? 'slept ' + lengthText(slept.minutes) : null,
    blogPosts !== undefined && date <= now ? (blogPosted ? 'blog posted' : 'blog not yet') : null,
  ]
    .filter(Boolean)
    .join(' · ');
  // The log tile: the blocks with hours are the topics the post has to write about.
  const topics = Object.values(byBlock).filter((m) => m > 0).length;

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
        {headerRow}
        {/* The scene (the mockup's 250 px tile): the picture from the top, the greeting and the scene's name on its fade,
            the swatches on the right, the preview knobs at the top right. */}
        {current.scene && sceneShown ? (
          <ScenePanel
            slot="today"
            scene={sceneShown}
            focal="50% 45%"
            eager
            alt={(previewDay ? 'Scene for ' + shortDate(todayDate(previewDay)) : 'Today’s scene') + ': ' + sceneShown.name}
            className="mt-[18px] h-[250px] w-full"
            bottom={
              <div className="flex items-end justify-between gap-3">
                <Link to="/scenes" className="flex min-w-0 flex-1 flex-col rounded-knob">
                  <span className="text-[22px] font-black leading-tight">{greeting}</span>
                  <span className="truncate text-label text-ink2">{sceneLine}</span>
                  {previewDay && <span className="text-label text-ink2">A preview, not saved</span>}
                </Link>
                <SceneSwatches scene={sceneShown} size={14} />
              </div>
            }
          >
            {/* Previous and next day's scenes, a look only: two paper knobs at the picture's top right. */}
            <span className="absolute right-3 top-3 flex gap-2">
              <Button variant="icon" icon="chevronLeft" className="scene-chip !size-11 !rounded-pill text-ink" label="Preview the previous day's scene" onClick={() => setSceneShift((n) => n - 1)} />
              <Button variant="icon" icon="chevronRight" className="scene-chip !size-11 !rounded-pill text-ink" label="Preview the next day's scene" onClick={() => setSceneShift((n) => n + 1)} />
            </span>
          </ScenePanel>
        ) : art.on ? (
          <ArtPanel slot={todaySlot(art.todayBy, new Date(), item?.track)} aspect="2 / 1" eager alt="" className="mt-[18px]" bottom={<p className="text-[22px] font-black leading-tight">{greeting}</p>} />
        ) : null}
        {!isToday && (
          <div className="mt-3 flex">
            <Button size="sm" icon="today" onClick={() => setDate(now)}>
              Back to today
            </Button>
          </div>
        )}
        {hoursTile}
        {finish && (
          <ArtPanel slot={finish.slot} aspect="5 / 2" className="mt-4" alt={finish.alt} bottom={<p className="text-body font-semibold">{finish.line}</p>} />
        )}
        {/* The two small tiles (the mockup's): last night's sleep, and today's log. */}
        <div className="mt-4 grid grid-cols-2 gap-3.5">
          <Link to={sleepTo} className="tile flex min-h-[108px] flex-col gap-1 px-4 py-3.5">
            <span className="flex items-center gap-1.5 text-[var(--x1)]">
              <Icon name="moon" size={16} />
              <span className="section-label mb-0 uppercase text-[var(--x1)]">Sleep</span>
            </span>
            <span className="text-[24px] font-black leading-[1.1] tabular-nums">{slept ? lengthText(slept.minutes) : 'Not logged'}</span>
            <span className="truncate text-small text-ink2">{slept ? timeOf(slept.bed) + ' → ' + timeOf(slept.wake) + (isToday ? ' · log tonight' : '') : isToday ? 'Log last night' : 'Nothing logged'}</span>
          </Link>
          {showBlogRow || isToday ? (
            <Link to={blogTo} className="tile flex min-h-[108px] flex-col gap-1 px-4 py-3.5">
              <span className="flex items-center gap-1.5 text-[var(--x2)]">
                <Icon name="doc" size={16} />
                <span className="section-label mb-0 uppercase text-[var(--x2)]">{isToday ? 'Today’s log' : 'The day’s log'}</span>
              </span>
              <span className="text-[18px] font-black leading-[1.15]">{blogPosted ? 'Posted ✓' : 'Not written yet'}</span>
              <span className="truncate text-small text-ink2">{blogPosted ? 'Written in your blog' : blogDue ? 'The day’s outline is ready' : topics > 0 ? topics + (topics === 1 ? ' topic' : ' topics') + ' to write about' : 'Nothing to write about yet'}</span>
            </Link>
          ) : (
            <div className="tile flex min-h-[108px] flex-col gap-1 px-4 py-3.5">
              <span className="section-label mb-0 uppercase text-[var(--x2)]">Log</span>
              <span className="text-[18px] font-black leading-[1.15]">A day ahead</span>
            </div>
          )}
        </div>
        {/* The week so far (the mockup's strip): each day shaded by its share of its plan, today a ring. */}
        <nav aria-label="This week: a day is shaded by its share of its plan, today is a ring" className="tile mt-4 flex justify-between px-2.5 py-3.5">
          {weekDays.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => setDate(d.date)}
              aria-current={d.date === date ? 'date' : undefined}
              className={'flex min-w-11 flex-col items-center gap-1.5 text-small font-semibold ' + (d.date === now ? 'text-[var(--x0)]' : 'text-ink2')}
            >
              {/* The visible "Sat 10" starts the name; the full date and whether it counted follow for screen readers. */}
              <span>{dayName(d.date, true)}</span>
              <span
                className={
                  'grid size-[34px] place-items-center rounded-pill text-label font-semibold ' +
                  (d.date === now ? 'day-ring' : 'day-' + d.level) +
                  (d.date === date && date !== now ? ' outline outline-2 outline-dashed outline-offset-2 outline-[var(--x0)]' : '')
                }
              >
                {Number(d.date.slice(8, 10))}
              </span>
              <span className="sr-only">
                {', ' + dateTitle(d.date) + (d.date === now ? ', today' : '') + (d.minutes > 0 ? ', ' + span(d.minutes) + ' logged' : ', nothing logged') + (d.met ? ', plan met' : d.counted ? ', streak kept' : '')}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {outside && <p className="mt-2 text-meta text-ink2">{outside}</p>}

      {checkInCard}

      {moveOn && (
        // A quiet offer when a running block's time is up: the next block starts now, or the day is over.
        <section aria-label="Move on" className="tile lane-1 lane-tile mt-4 flex flex-col gap-3 p-[18px]">
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
          <p className="section-label mb-0 uppercase">Now</p>
          <p className="text-[22px] font-black">A rest day.</p>
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
          <h2 className="mt-1 text-[22px] font-black">{'Break until ' + hm(clock.until)}</h2>
          <p className="text-meta text-ink2">{span(dayMinutes) + ' of ' + span(plan.targetMinutes) + ' so far today'}</p>
          {(() => {
            const next = blocks.find((b) => b.id === clock.next);
            if (!next) return null;
            const row = rowFor(next);
            return (
              <ul className="rows mt-2 border-t-[1.5px] border-dashed border-[var(--sd)]">
                <Row icon={<BlockTile block={next.id} />} title={'Next: ' + blockName(next.id)} meta={row.meta} trailing={<WindowTime text={windowText(next.id)} />} onClick={() => setChosen(next.id)} />
              </ul>
            );
          })()}
        </section>
      ) : !nowBlock ? (
        <section aria-label="Now" className="tile mt-4 flex flex-col gap-1.5 p-[18px]">
          <p className="section-label mb-0 uppercase">{clock?.kind === 'done' ? 'Day done' : 'Now'}</p>
          <p className="text-[22px] font-black">{clock?.kind === 'done' ? 'That was the day.' : 'Every block is done.'}</p>
          <p className="text-meta text-ink2">{span(dayMinutes) + ' of ' + span(plan.targetMinutes) + ' · ' + blocks.filter(reached).length + ' of ' + blocks.length + ' blocks'}</p>
          {isToday && (
            <Button size="sm" icon="blog" className="mt-2 self-start" to="/blog">
              {blogPosted ? 'Blog post · posted ✓' : 'Today’s blog post'}
            </Button>
          )}
        </section>
      ) : (
        <section aria-labelledby="now-title" className={'tile mt-4 flex flex-col gap-3 px-5 py-[18px]' + (taken && item?.refId === taken.id ? ' taken' : '')}>
          {/* The mockup's Now card: the block's tile, "NOW · 10:00–12:00" in the lane's colour over the block's name, the
              Focus mix as a tinted pill on the right. */}
          <div className="flex items-center gap-3">
            <IconTile icon={blockIconName(nowBlock.id)} size={44} lane={nowLane} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={'section-label mb-0 truncate uppercase text-[var(--x' + nowLane + ')]'}>{'Now · ' + (windowOf(nowBlock.id) ? windowText(nowBlock.id) : blockShort(nowBlock.def.name))}</span>
              <h2 className="text-[22px] font-black leading-tight">
                {isProject && item ? (
                  // A project's title opens its tech doc; everything else unfolds in place.
                  <button id="now-title" type="button" aria-haspopup="dialog" onClick={() => setDoc({ id: item.refId, block: nowBlock.id, from: 'now' })} className="-my-2 flex min-h-11 w-full items-center py-1 text-left text-[22px] font-black">
                    <span className="line-clamp-2">{headline}</span>
                  </button>
                ) : (
                  <button id="now-title" type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} className="-my-2 flex min-h-11 w-full items-center py-1 text-left text-[22px] font-black">
                    <span className="line-clamp-2">{headline}</span>
                  </button>
                )}
              </h2>
            </span>
            {isToday && (
              <Link to={'/focus?block=' + nowBlock.id} aria-label={'Focus music' + (mix ? ' · ' + categoryLabel(mix) : '') + ' for ' + blockShort(nowBlock.def.name)} className={'lane-tile lane-' + nowLane + ' flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill px-3 text-label font-semibold'}>
                <Icon name="headphones" size={16} />
                {mix ? categoryLabel(mix) : 'Focus'}
              </Link>
            )}
          </div>
          {lessonCounts && item ? (
            <ProgressLine value={lessonCounts.hours > 0 ? lessonCounts.hoursDone / lessonCounts.hours : 0} label={'Progress on ' + nameOf(item)} lane={nowLane} />
          ) : (
            <ProgressLine value={nowBlock.targetMinutes > 0 ? nowMinutes / nowBlock.targetMinutes : 0} label={'Time on ' + blockShort(nowBlock.def.name) + ' today'} lane={nowLane} />
          )}
          <p className="-mt-1 text-meta text-ink2">{nowHours}</p>
          {offer && offer.block === nowBlock.id && (
            <div role="status" className={'lane-tile lane-' + nowLane + ' flex flex-wrap items-center gap-2 rounded-knob px-3 py-2'}>
              <span className="flex-1 text-meta font-medium">{'Start with ' + categoryLabel(offer.mix) + '?'}</span>
              <Button
                size="sm"
                icon="headphones"
                onClick={() => {
                  const session = firstOf(offer.mix as FocusCategory, settings.focus);
                  if (session) playFocus(session, { timer: 'block', blockEndsAt: blockEndsAt(windowOf(offer.block), new Date()), block: offer.block });
                  saveFocusPrefs((p) => ({ ...p, offered: { ...p.offered, [offer.block]: true } }));
                  setOffer(null);
                }}
              >
                Yes
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  saveFocusPrefs((p) => ({ ...p, offered: { ...p.offered, [offer.block]: false } }));
                  setOffer(null);
                }}
              >
                Not now
              </Button>
            </div>
          )}

          {lessons && item && <LessonWindow refId={item.refId} units={lessons} done={unitsDone} onShowAll={() => setSheet('lessons')} />}

          {expanded && (
            <div>
              {item?.brief && <p className="mb-2 text-body text-ink2">{item.brief}</p>}
              {item?.note && <p className="mb-2 text-meta text-ink2">{item.note}</p>}
              {item && allUnits.length > 0 && !lessons && <Checklist plain compact refId={item.refId} units={unitWindow(allUnits, unitsDone)} done={unitsDone} />}
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

          {/* Start (the one filled button, in the first lane's colour) and the raised secondary: the course, the tech doc
              or the lesson's video; Done is the knob at the end. Each keeps its width; on the narrowest phones the
              secondary keeps only its icon. */}
          <div className="flex items-center gap-2.5 [&>*]:min-w-0 [&>*]:flex-1">
            {primary}
            {otherName && (
              <Button size="sm" icon="stop" className="!flex-none" name={'Stop ' + otherName} onClick={stop}>
                {otherName}
              </Button>
            )}
            {isProject && item ? (
              <Button icon="doc" aria-haspopup="dialog" name="Tech doc" onClick={() => setDoc({ id: item.refId, block: nowBlock.id, from: 'now' })}>
                <span className="truncate max-[379px]:sr-only">Tech doc</span>
              </Button>
            ) : lessonNow?.video ? (
              <Button icon="play" onClick={() => playVideo(lessonNow.video!)}>
                <span className="truncate max-[379px]:sr-only">{'Play ' + lessonNow.id}</span>
              </Button>
            ) : item?.url ? (
              <Button icon="external" href={item.url} name={resource?.type === 'book' ? 'Open the book' : 'Open course'}>
                <span className="truncate max-[379px]:sr-only">Open</span>
              </Button>
            ) : null}
            <Button
              variant="icon"
              icon="check"
              className={'knob !size-12 !flex-none !rounded-knob ' + (nowDone ? 'text-[var(--x0)]' : 'text-ink2')}
              label={nowDone ? 'Mark not done' : 'Mark done'}
              aria-pressed={nowDone}
              onClick={() => {
                void editLog(date, (current) => toggleBlockDone(current, nowBlock.id));
                setChosen(null);
                setExpanded(false);
              }}
            />
          </div>
          {extrasFor(nowBlock.id).length > 0 && <ul className="rows border-t-[1.5px] border-dashed border-[var(--sd)]">{extrasFor(nowBlock.id).map(extraRow)}</ul>}
        </section>
      )}

      {/* What is left today (the mockup's NEXT tile): the blocks still to come, the first one marked Next; a tap makes a
          block Now. The sessions' breaks and headings stay as rows between them. */}
      {!nothingPlanned && layout.later && (upcoming.length > 0 || leadingExtras.length > 0) && (
        <section className="tile mt-4 px-[18px] py-1" aria-label="Later today">
          <h2 className="sr-only">Later today</h2>
          <span className="sr-only">{blocks.filter(done).length + ' of ' + blocks.length + ' done'}</span>
          <ul className="rows">
            {leadingExtras.map(extraRow)}
            {groups.sessions.flatMap((session, k) => {
              if (session.upcoming.length === 0) return [];
              const pause = groups.breaks.find((b) => b.before === session.number);
              const firstUpcoming = upcoming[0];
              return [
                // The quiet break between the sessions, while it is still ahead.
                pause && (
                  <li key={'break-' + session.number} className="flex min-h-11 items-center gap-3 py-2 text-meta font-semibold text-ink2">
                    <span className="grid w-[42px] place-items-center">
                      <Icon name="moon" size={18} />
                    </span>
                    {'Break · ' + formatWindow(pause.from, pause.until - pause.from)}
                  </li>
                ),
                groups.sessions.length > 1 && k > 0 && (
                  <li key={'session-' + session.number} className="flex min-h-11 items-end pb-1 pt-2">
                    <h3 className="section-label mb-0">{'Session ' + session.number + ' · ' + formatWindow(session.from, session.until - session.from)}</h3>
                  </li>
                ),
                ...session.upcoming.map((id) => blockRow(blockOf(id), false, id === firstUpcoming && leadingExtras.length === 0)),
              ];
            })}
            {unplaced.map((block) => blockRow(block, false, upcoming[0] === block.id && leadingExtras.length === 0))}
          </ul>
        </section>
      )}

      {/* Internships (INTERNSHIPS): while a target has an upcoming apply date, the next role, the gate, the phase and the one thing for today. */}
      {isToday && internCard && (
        <section aria-labelledby="intern-card-title" className="tile mt-4 flex flex-col gap-1.5 p-[18px]">
          <p className="section-label mb-0 uppercase text-[var(--x1)]">{'Internships · ' + internCard.name}</p>
          <p id="intern-card-title" className="text-[22px] font-black leading-tight">
            {roleName(internCard.card.target) + ' · ' + (internCard.card.days === 0 ? 'apply today' : 'apply in ' + internCard.card.days + (internCard.card.days === 1 ? ' day' : ' days'))}
          </p>
          <p className="text-meta text-ink2">{'Gate ticked ' + internCard.card.gate.done + ' of ' + internCard.card.gate.total + ' · Phase ' + internCard.card.phase.n + ', ' + internCard.card.week}</p>
          {internCard.card.line && (
            <>
              <p className="section-label mb-0 mt-1 uppercase">{'Today in ' + internCard.card.block}</p>
              <p className="text-body">{internCard.card.line}</p>
            </>
          )}
          <div className="mt-2 flex gap-3 [&>*]:min-w-0 [&>*]:flex-1">
            <Button variant="ice" lane={1} icon="briefcase" to={'/internships?goal=' + internCard.goal.goal.id}>
              Open
            </Button>
            <Button icon="check" to={'/internships?goal=' + internCard.goal.goal.id + '&tab=roadmap'}>
              Checklist
            </Button>
          </div>
        </section>
      )}

      {/* Blocks whose window has passed and that are not done: still there to start, but no longer "later". */}
      {!nothingPlanned && layout.later && groups.earlier.length > 0 && (
        <section className="tile mt-4 px-[18px] py-1" aria-labelledby="earlier-title">
          <h2 id="earlier-title" className="section-label mb-0 pt-3">
            Earlier · not finished
          </h2>
          <ul className="rows">{groups.earlier.map((id) => blockRow(blockOf(id), true))}</ul>
        </section>
      )}

      {!nothingPlanned && layout.later && groups.done.length > 0 && (
        <section className="tile mt-4 px-[18px] py-1">
          <details>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-meta font-semibold text-ink2">
              {'Done today (' + groups.done.length + ')'}
              <Icon name="chevronDown" size={18} />
            </summary>
            <ul className="rows">{groups.done.map((id) => blockRow(blockOf(id), true))}</ul>
          </details>
        </section>
      )}

      {showDayRow && (
        <RowList className="mt-4">
          <Row
            title={isToday ? 'How was today?' : 'How was ' + dateTitle(date) + '?'}
            meta={daySummary}
            metaWraps
            trailing={log?.energy ? 'Energy ' + log.energy + ' of 5' : undefined}
            onClick={() => setSheet('day')}
            chevron
          />
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

      {lessons && item && (
        <Sheet open={sheet === 'lessons'} title={nameOf(item)} aside={lessonCounts ? lessonCounts.videosDone + ' of ' + lessonCounts.videos + ' videos' : undefined} onClose={() => setSheet(null)}>
          <LessonList refId={item.refId} units={lessons} done={unitsDone} />
        </Sheet>
      )}
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
