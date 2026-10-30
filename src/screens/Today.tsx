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
import type { Atlas } from '../hooks/useAtlas.ts';
import { useUnits } from '../hooks/useUnits.ts';
import { addDays, dayName, formatLong, formatStopwatch, monthName, startOfWeek, today as todayDate } from '../lib/dates.ts';
import { editLog, isBlockDone, minutesByBlock, minutesForRef, readLog, toggleBlockDone, totalMinutes } from '../lib/logs.ts';
import { plannedFor } from '../lib/day-plan.ts';
import { catchUpMinutes, laneBalance } from '../lib/pace.ts';
import { planForDay, suggestWeeklyBuild } from '../lib/schedule.ts';
import type { ScheduledItem, TodayBlock } from '../lib/schedule.ts';
import { counts as dayCounts, dailyTotals, heatLevel, relativeLevel, streak } from '../lib/streaks.ts';
import { blockTally } from '../lib/blocks-today.ts';
import { ArtPanel } from '../ui/ArtPanel.tsx';
import { useArtSettings } from '../hooks/useArt.ts';
import { SCENES, useCurrentScene } from '../hooks/useScenes.ts';
import { laneSlot, pickScene, shiftDate } from '../lib/scenes.ts';
import { applyScene } from '../lib/theme.ts';
import { ScenePanel, SceneSwatches } from '../ui/ScenePanel.tsx';
import { phaseSlot, streakSlot, todaySlot } from '../lib/art.ts';
import type { ArtSlot } from '../seed/art.ts';
import { buildPaths } from '../lib/library-home.ts';
import { buildModel } from './plan/model.ts';
import { activePhase } from '../lib/schedule.ts';
import { resolveTheme } from '../lib/theme.ts';
import { Link, useQueryParam } from '../router/router.tsx';
import { isRealIsoDate } from '../seed/schema.ts';
import type { BlockId } from '../seed/schema.ts';
import { Button } from '../ui/Button.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Icon } from '../ui/Icon.tsx';
import { BlockIcon, BlockTile, IconTile, KindIcon } from '../ui/glyphs.tsx';
import { checkBlogPost, useBlogPosts } from '../db/blog.ts';
import { blogReminderDue } from '../lib/blog.ts';
import { useSleep, useSleepSettings } from '../db/sleep.ts';
import { useInternSummaries } from '../hooks/useInternships.ts';
import { roleName } from '../lib/internships.ts';
import { lengthText, timeOf } from '../lib/sleep.ts';
import { blockTone, toneInk } from '../ui/colors.ts';
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
  const sleepSettings = useSleepSettings();
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
  // Blocks today: done, under way (minutes short of the target, or the timer on it), or not yet.
  const tally = blockTally(blocks, (id) => Math.floor(blockMs(id) / 60_000), (id) => blocks.some((b) => b.id === id && done(b)), timer?.block ?? null);
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
  // Sleep (SLEEP-LOG): the night that ended this morning, and the morning question until 12:00, while none is logged.
  const slept = nights?.find((n) => n.date === date);
  const sleepTo = date === now ? '/sleep' : '/sleep?date=' + date;
  const sleepAsk = isToday && nights !== undefined && !slept && sleepSettings?.prompt === true && minuteNow < 12 * 60;
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
  const metaLine = nowBlock
    ? [
        span(nowMinutes) + ' of ' + span(nowBlock.targetMinutes),
        item && headline !== nameOf(item) ? nameOf(item) : null,
        nowBlock.catchUp ? span(nowBlock.catchUp) + ' of it catch-up' : null,
        lessons ? checklistMeta(lessons, unitsDone) : detailOf(item),
        isProject && item.unitCount > 0 ? item.unitsDone + ' of ' + item.unitCount + ' ticked' : null,
        nowDone ? 'done' : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const linkClass = 'inline-flex min-h-11 items-center gap-2 text-button font-medium text-blue-deep';

  // A block's row in Later today and its groups: its window on the right ("06:00–08:00", one line over another on a
  // narrow phone, never cut). An earlier or done block says how far it got: "1 h 22 m of 2 h".
  const blockRow = (block: TodayBlock, progress = false) => {
    const row = rowFor(block);
    const minutes = Math.floor(blockMs(block.id) / 60_000);
    const isTaken = Boolean(taken && block.id === 'D' && focusItem(block, monthlyFirst)?.refId === taken.id);
    const meta = progress
      ? [span(minutes) + ' of ' + span(block.targetMinutes), row.meta].join(' · ')
      : [minutes >= 1 ? span(minutes) + ' today' : null, row.meta, extrasNote(block.id)].filter(Boolean).join(' · ');
    return (
      <Row
        key={block.id}
        className={isTaken ? 'taken' : ''}
        icon={<BlockTile block={block.id} />}
        title={row.title}
        meta={layout.view === 'compact' ? undefined : meta}
        trailing={<WindowTime text={windowText(block.id)} />}
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
      </Row>
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

  // The header row and the day's hours: on the illustration's fades, or on their own when the art is off.
  const headerRow = (
    <>
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
    </>
  );
  const hero =
    nowRunning || otherRunning ? (
      <p className="flex flex-col items-center gap-1.5">
        {/* The block's total for today, not this run alone: a restart continues from it. */}
        <span role="timer" aria-label={'Running, ' + span(Math.floor(blockMs(timer!.block) / 60_000)) + ' on this block today'} className="text-big font-semibold tabular-nums text-blue-deep">
          {formatStopwatch(blockMs(timer!.block))}
        </span>{' '}
        <span className="text-meta text-ink2">
          <span className="font-semibold text-blue-deep">Running</span>
          {' · since ' + clockOf(timer!.startedAt) + ' · ' + span(Math.floor(blockMs(timer!.block) / 60_000)) + ' on this block today'}
        </span>
      </p>
    ) : layout.stats ? (
      <p className="flex flex-col items-center gap-1.5">
        <span className="text-big font-semibold">{span(dayMinutes)}</span>{' '}
        <span className="text-meta text-ink2">{'of ' + span(plan.targetMinutes) + ' today' + (templateNote ? ' · ' + templateNote : '') + ' · ' + (streakState.current > 0 ? streakState.current + '-day streak' : 'no streak yet')}</span>
      </p>
    ) : null;

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
        {/* One row: the mark, the wordmark, the date, and the three knobs (change, settings, theme), 44 px each. With
            the illustrations on it sits on the picture's upper fade and the day's hours on its lower one (one panel
            in place of a header and a tile, so "Later today" stays above the fold at 390 x 844). */}
        {current.scene && sceneShown ? (
          <ScenePanel
            slot="today"
            scene={sceneShown}
            aspect="2 / 1"
            focal="50% 45%"
            eager
            alt={(previewDay ? 'Scene for ' + shortDate(todayDate(previewDay)) : 'Today’s scene') + ': ' + sceneShown.name}
            className="mt-[max(0.75rem,env(safe-area-inset-top))]"
            top={<div className="flex items-center gap-1">{headerRow}</div>}
            bottom={
              <div className="flex items-end justify-between gap-3">
                {/* The day's hours on the left (the hours tile folded in, as with the illustrations), the scene on the right. */}
                <div className="min-w-0 flex-1 [&_p]:!items-start [&_p]:text-left">{hero ?? <p className="text-meta text-ink2">{dateTitle(date)}</p>}</div>
                <Link to="/scenes" className="flex min-h-11 shrink-0 flex-col items-end justify-center gap-0.5 rounded-knob text-right">
                  <span className="max-w-[9.5rem] truncate text-meta font-semibold leading-tight">{previewDay ? (sceneShift === 1 ? 'Tomorrow' : sceneShift === -1 ? 'Yesterday' : shortDate(todayDate(previewDay))) + ' · ' + sceneShown.name : sceneShown.name}</span>
                  <SceneSwatches scene={sceneShown} size={12} />
                  <span className="text-small text-ink2">{previewDay ? 'A preview, not saved' : current.why === 'pinned' ? 'Pinned scene' : 'Today’s scene'}</span>
                </Link>
              </div>
            }
          >
            {/* Previous and next day's scenes, a look only: two paper knobs on the picture's right, between the fades. */}
            <span className="absolute right-3 top-[58px] flex gap-2">
              <Button variant="icon" icon="chevronLeft" className="scene-chip !size-11 !rounded-pill text-ink" label="Preview the previous day's scene" onClick={() => setSceneShift((n) => n - 1)} />
              <Button variant="icon" icon="chevronRight" className="scene-chip !size-11 !rounded-pill text-ink" label="Preview the next day's scene" onClick={() => setSceneShift((n) => n + 1)} />
            </span>
          </ScenePanel>
        ) : art.on ? (
          <ArtPanel slot={todaySlot(art.todayBy, new Date(), item?.track)} aspect="2 / 1" eager alt="" className="mt-[max(0.75rem,env(safe-area-inset-top))]" top={<div className="flex items-center gap-1">{headerRow}</div>} bottom={layout.stats || nowRunning || otherRunning ? hero : undefined} />
        ) : (
          <div className="-mb-1.5 flex items-center gap-1 pt-[max(2.25rem,env(safe-area-inset-top))]">{headerRow}</div>
        )}
        {!isToday && (
          <div className="mt-2 flex">
            <Button size="sm" icon="today" onClick={() => setDate(now)}>
              Back to today
            </Button>
          </div>
        )}
        {!current.scene && !art.on && (
        <div className="mt-4">
          <div className="tile flex flex-col items-center justify-center gap-1.5 px-[18px] py-4 text-center">
            {hero}
          </div>
        </div>
        )}
        {finish && (
          <ArtPanel slot={finish.slot} aspect="5 / 2" className="mt-4" alt={finish.alt} bottom={<p className="text-body font-semibold">{finish.line}</p>} />
        )}
        {/* The week so far: each day shaded by its share of its plan (the heatmap's ramp), today a ring, a dot under a
            day that met its plan or kept the streak. */}
        <nav aria-label="This week: a day is shaded by its share of its plan, today is a ring, a dot marks a day that met its plan or kept the streak" className="tile mt-4 flex justify-between px-2.5 py-2.5">
          {weekDays.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => setDate(d.date)}
              aria-current={d.date === date ? 'date' : undefined}
              className="flex min-w-11 flex-col items-center gap-1"
            >
              {/* The visible "Sat 10" starts the name; the full date and whether it counted follow for screen readers. */}
              <span className="text-small font-semibold text-ink2">{dayName(d.date, true)}</span>
              <span
                className={
                  'grid size-[34px] place-items-center rounded-pill text-label font-semibold ' +
                  (d.date === now ? 'day-ring' : 'day-' + d.level) +
                  (d.date === date && date !== now ? ' outline outline-2 outline-dashed outline-offset-2 outline-blue-deep' : '')
                }
              >
                {Number(d.date.slice(8, 10))}
              </span>
              <span aria-hidden="true" className={'size-1.5 rounded-pill ' + (d.met || d.counted ? 'bg-blue-deep' : 'bg-transparent')} />
              <span className="sr-only">
                {', ' + dateTitle(d.date) + (d.date === now ? ', today' : '') + (d.minutes > 0 ? ', ' + span(d.minutes) + ' logged' : ', nothing logged') + (d.met ? ', plan met' : d.counted ? ', streak kept' : '')}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {outside && <p className="mt-2 text-meta text-ink2">{outside}</p>}

      {sleepAsk && (
        <RowList className="mt-4">
          <Row
            icon={<IconTile icon="moon" tone="ice" />}
            title="How did you sleep?"
            action={
              <Button size="sm" to="/sleep">
                Log sleep
              </Button>
            }
          />
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
                <Row icon={<BlockTile block={next.id} />} title={'Next: ' + blockName(next.id)} meta={row.meta} trailing={<WindowTime text={windowText(next.id)} />} onClick={() => setChosen(next.id)} />
              </ul>
            );
          })()}
        </section>
      ) : !nowBlock ? (
        <section aria-label="Now" className="tile mt-4 flex flex-col gap-1.5 p-[18px]">
          <p className="section-label mb-0">{clock?.kind === 'done' ? 'Day done' : 'Now'}</p>
          <p className="text-card font-semibold">{clock?.kind === 'done' ? 'That was the day.' : 'Every block is done.'}</p>
          <p className="text-meta text-ink2">{span(dayMinutes) + ' of ' + span(plan.targetMinutes) + ' · ' + blocks.filter(reached).length + ' of ' + blocks.length + ' blocks'}</p>
          {isToday && (
            <Button size="sm" icon="blog" className="mt-2 self-start" to="/blog">
              {blogPosted ? 'Blog post · posted ✓' : 'Today’s blog post'}
            </Button>
          )}
        </section>
      ) : (
        <section aria-labelledby="now-title" className={'tile mt-4 flex flex-col gap-1.5 p-[18px]' + (taken && item?.refId === taken.id ? ' taken' : '')}>
          <div className="flex items-center justify-between gap-2">
            <p className="section-label mb-0 flex min-w-0 items-center gap-1.5 uppercase" style={{ color: toneInk(blockTone(nowBlock.id)) }}>
              <BlockIcon block={nowBlock.id} size={18} />
              <span className="truncate">{'Now · ' + (windowOf(nowBlock.id) ? windowText(nowBlock.id) : blockShort(nowBlock.def.name))}</span>
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
            {lessonCounts && item ? (
              <ProgressLine value={lessonCounts.hours > 0 ? lessonCounts.hoursDone / lessonCounts.hours : 0} label={'Progress on ' + nameOf(item)} lane={laneSlot(nowBlock.id)} />
            ) : (
              <ProgressLine value={nowBlock.targetMinutes > 0 ? nowMinutes / nowBlock.targetMinutes : 0} label={'Time on ' + blockShort(nowBlock.def.name) + ' today'} lane={laneSlot(nowBlock.id)} />
            )}
          </div>

          {lessons && item && (
            <div className="mt-3">
              <LessonWindow refId={item.refId} units={lessons} done={unitsDone} onShowAll={() => setSheet('lessons')} />
            </div>
          )}

          {expanded && (
            <div className="mt-4">
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

          {/* Start (the one filled button) and the ice secondary: the tech doc, or the course. */}
          {/* Two equal buttons that never leave the card; on the narrowest phones the second keeps only its icon. */}
          <div className={(expanded ? 'mt-2' : 'mt-3.5') + ' flex items-center gap-3 [&>*]:min-w-0 [&>*]:flex-1'}>
            {primary}
            {isProject && item ? (
              <Button variant="ice" icon="doc" aria-haspopup="dialog" name="Tech doc" onClick={() => setDoc({ id: item.refId, block: nowBlock.id, from: 'now' })}>
                <span className="truncate max-[379px]:sr-only">Tech doc</span>
              </Button>
            ) : lessonNow?.video ? (
              <Button variant="ice" icon="play" onClick={() => playVideo(lessonNow.video!)}>
                <span className="truncate max-[379px]:sr-only">{'Play ' + lessonNow.id}</span>
              </Button>
            ) : item?.url ? (
              <Button variant="ice" icon="external" href={item.url} name={resource?.type === 'book' ? 'Open the book' : 'Open course'}>
                <span className="truncate max-[379px]:sr-only">Open</span>
              </Button>
            ) : null}
          </div>
          {extrasFor(nowBlock.id).length > 0 && <ul className="rows mt-3 border-t-[1.5px] border-dashed border-dash">{extrasFor(nowBlock.id).map(extraRow)}</ul>}
        </section>
      )}

      {!restDay && !nothingPlanned && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="tile flex flex-col items-center gap-1.5 p-3.5">
            <span className="section-label mb-0">Blocks today</span>
            <span className="text-card font-semibold leading-none">
              {tally.done}
              <span className="text-ink2">/{tally.total}</span>
            </span>
            <span aria-hidden="true" className="flex gap-1.5">
              {blocks.map((b) => {
                const state = tally.states.get(b.id);
                return <span key={b.id} className={'size-3 rounded-pill ' + (state === 'done' ? 'fill-blue' : state === 'in-progress' ? 'well half-dot' : 'well rounded-pill')} />;
              })}
            </span>
            <span className="text-meta text-ink2">{tally.inProgress > 0 ? tally.inProgress + ' in progress' : tally.done === tally.total ? 'All done' : 'None under way'}</span>
          </div>
          {/* Slept: the night that ended on this day's morning (SLEEP-LOG); a tap opens the Sleep screen. */}
          <Link to={sleepTo} className="tile flex flex-col items-center gap-1.5 p-3.5">
            <span className="section-label mb-0">Slept</span>
            <span className="text-card font-semibold leading-none tabular-nums">
              {slept ? lengthText(slept.minutes) : <span aria-hidden="true">—</span>}
              {!slept && <span className="sr-only">not logged</span>}
            </span>
            <span className="flex items-center gap-0.5 text-meta text-ink2">
              {slept ? timeOf(slept.bed) + ' → ' + timeOf(slept.wake) : 'Log sleep'}
              <Icon name="chevronRight" size={16} className="text-ink2" />
            </span>
          </Link>
        </div>
      )}

      {!nothingPlanned && layout.later && (upcoming.length > 0 || leadingExtras.length > 0 || showBlogRow) && (
        <RowList label="Later today" className="mt-4" aside={blocks.filter(done).length + ' of ' + blocks.length + ' done'}>
          {blogDue && (
            <Row
              key="blog-due"
              icon={<IconTile icon="blog" tone="ice" />}
              title="Write today’s blog post"
              meta={layout.view === 'compact' ? undefined : 'The day’s outline is ready'}
              action={
                <Button size="sm" to={blogTo}>
                  Open
                </Button>
              }
            />
          )}
          {leadingExtras.map(extraRow)}
          {groups.sessions.flatMap((session) => {
            if (session.upcoming.length === 0) return [];
            const pause = groups.breaks.find((b) => b.before === session.number);
            return [
              // The quiet break between the sessions, while it is still ahead.
              pause && (
                <li key={'break-' + session.number} className="flex min-h-11 items-center gap-3 py-2 text-meta font-semibold text-ink2">
                  <span className="grid w-10 place-items-center">
                    <Icon name="moon" size={18} />
                  </span>
                  {'Break · ' + formatWindow(pause.from, pause.until - pause.from)}
                </li>
              ),
              groups.sessions.length > 1 && (
                <li key={'session-' + session.number} className="flex min-h-11 items-end pb-1 pt-2">
                  <h3 className="section-label mb-0">{'Session ' + session.number + ' · ' + formatWindow(session.from, session.until - session.from)}</h3>
                </li>
              ),
              ...session.upcoming.map((id) => blockRow(blockOf(id))),
            ];
          })}
          {unplaced.map((block) => blockRow(block))}
          {showBlogRow && !blogDue && (
            <Row key="blog" icon={<IconTile icon="blog" tone={blogPosted ? 'ice' : 'neutral'} />} title={blogPosted ? 'Blog post · posted ✓' : 'Blog post · not yet'} meta={layout.view === 'compact' ? undefined : 'Written in your blog'} trailing="any time" to={blogTo} />
          )}
        </RowList>
      )}

      {/* Internships (INTERNSHIPS): while a target has an upcoming apply date, the next role, the gate, the phase and the one thing for today. Under Later today, so the day's list stays above the fold (ui-acceptance). */}
      {isToday && internCard && (
        <section aria-labelledby="intern-card-title" className="tile mt-4 flex flex-col gap-1.5 p-[18px]">
          <p className="section-label mb-0">{'Internships · ' + internCard.name}</p>
          <p id="intern-card-title" className="text-card font-semibold leading-tight">
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
            <Button variant="ice" icon="briefcase" to={'/internships?goal=' + internCard.goal.goal.id}>
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
        <RowList label="Earlier · not finished" className="mt-4">
          {groups.earlier.map((id) => blockRow(blockOf(id), true))}
        </RowList>
      )}

      {!nothingPlanned && layout.later && groups.done.length > 0 && (
        <RowList className="mt-4">
          <li>
            <details>
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-meta font-semibold text-ink2">
                {'Done today (' + groups.done.length + ')'}
                <Icon name="chevronDown" size={18} />
              </summary>
              <ul className="rows">{groups.done.map((id) => blockRow(blockOf(id), true))}</ul>
            </details>
          </li>
        </RowList>
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
