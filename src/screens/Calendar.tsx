import { useEffect, useMemo, useRef, useState } from 'react';
import { useWeekPick } from '../db/state.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { useCatalogueIndex } from '../hooks/useCatalogue.ts';
import { useUnits } from '../hooks/useUnits.ts';
import { dayLayout, withBlockLength, withBlockTime } from '../lib/calendar.ts';
import { busyConflict, busyOn, GRID_END, GRID_START, hm } from '../lib/calendar-layout.ts';
import { addDays, dayName, eachDay, monthName, startOfMonth, startOfWeek, today as todayDate } from '../lib/dates.ts';
import { laneSlot } from '../lib/scenes.ts';
import { isBlockDone } from '../lib/logs.ts';
import { useRunningTimer } from '../db/timer.ts';
import { totalMinutes } from '../lib/logs.ts';
import { planForDay } from '../lib/schedule.ts';
import type { ScheduleContext } from '../lib/schedule.ts';
import { useQueryParam } from '../router/router.tsx';
import { Button } from '../ui/Button.tsx';
import { useBlogPosts } from '../db/blog.ts';
import { Header } from '../ui/Header.tsx';
import { Screen } from '../ui/Screen.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import { AddSheet, BlockSheet, BusySheet, ConflictSheet, TemplateSheet } from './calendar/CalendarSheets.tsx';
import { columnFor } from './calendar/model.ts';
import { DayColumn, GRID_HEIGHT, PX_PER_MIN } from './calendar/DayColumn.tsx';
import { calendarEdit } from './calendar/edit.ts';
import { downloadIcs } from './calendar/export.ts';
import { MonthView, shiftMonth } from './calendar/MonthView.tsx';
import { blockShort, dateTitle, span } from './parts/text.ts';

type View = 'month' | 'week' | 'day';
const VIEWS: { value: View; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
];

export type CalendarSheet =
  | { kind: 'block'; date: string; block: string }
  | { kind: 'add'; date: string; minute: number }
  | { kind: 'busy'; date: string; id: string }
  | { kind: 'conflict'; date: string; block: string; start: number }
  | { kind: 'template'; date: string }
  | null;

function nowMinute(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Calendar: a month to look over, and a day (or a week) to change, like a calendar app. A date opens its day: a
 * time grid from 06:00 to 24:00 with the day's blocks at their times, busy events, and the current time. Blocks are
 * dragged to move and resized by their bottom edge; a tap opens a block's sheet, a tap on an empty slot adds a
 * block, a busy event or a rest day. Every change is the schedule's (one date, or every such weekday), with Undo.
 */
export function Calendar() {
  const atlas = useAtlas();
  const units = useUnits();
  const catalogue = useCatalogueIndex();
  const blogPosts = useBlogPosts();
  const timer = useRunningTimer();
  const now = todayDate();
  const [viewParam, setView] = useQueryParam('view');
  const [dateParam, setDate] = useQueryParam('date');
  // A phone opens on the day; a wider screen on the month. Week is a tap away on both.
  const narrow = typeof window !== 'undefined' && window.innerWidth < 600;
  const view: View = viewParam === 'week' || viewParam === 'day' || viewParam === 'month' ? viewParam : narrow ? 'day' : 'month';
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : now;
  const [month, setMonth] = useState(() => startOfMonth(date));
  const [sheet, setSheet] = useState<CalendarSheet>(null);
  const [minute, setMinute] = useState(nowMinute);
  const scroller = useRef<HTMLDivElement>(null);
  // Where the grid opens: the first block of the days shown (set while rendering, read once it is drawn).
  const firstStart = useRef(GRID_START);
  const weekStartsOn = atlas?.settings.core.weekStartsOn ?? 1;
  const weekStart = startOfWeek(date, weekStartsOn);
  const weekPick = useWeekPick(weekStart);
  const ctx = useMemo<ScheduleContext | null>(() => (atlas ? { seed: atlas.seed, states: atlas.states, units, ...(catalogue ? { catalogue } : {}) } : null), [atlas, units, catalogue]);

  useEffect(() => setMonth(startOfMonth(date)), [date]);
  useEffect(() => {
    const id = setInterval(() => setMinute(nowMinute()), 60_000);
    return () => clearInterval(id);
  }, []);
  // The grid opens on the first block of the days shown, or around the current time on today.
  useEffect(() => {
    if (view === 'month' || !scroller.current) return;
    const at = date === now ? Math.max(firstStart.current, minute - 90) : firstStart.current;
    scroller.current.scrollTop = (at - GRID_START) * PX_PER_MIN;
    // Only when the day or view changes (or the data first arrives and the grid is drawn), not every minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, date, Boolean(atlas && ctx)]);

  if (!atlas || !ctx) {
    return (
      <Screen title="Calendar">
        <Header title="Calendar" />
      </Screen>
    );
  }

  const { settings } = atlas;
  const core = settings.core;
  const busyAll = settings.schedule.busy ?? [];
  const go = (next: string, nextView: View = view): void => {
    setDate(next === now ? null : next, { replace: true });
    setView(nextView === (narrow ? 'day' : 'month') ? null : nextView, { replace: true });
  };
  const days = view === 'week' ? eachDay(weekStart, addDays(weekStart, 6)) : [date];
  const step = (delta: number): void => {
    if (view === 'month') setMonth(shiftMonth(month, delta));
    else go(addDays(date, delta * (view === 'week' ? 7 : 1)));
  };

  const move = (d: string, block: string, start: number): void => {
    const placed = dayLayout(d, settings).find((b) => b.id === block);
    if (placed && busyConflict(busyAll, d, start, placed.minutes)) {
      setSheet({ kind: 'conflict', date: d, block, start });
      return;
    }
    const name = blockShort(core.blocks.find((b) => b.id === block)?.name ?? block);
    void calendarEdit(core, 'Moved ' + name + ' to ' + hm(start), (s) => withBlockTime(s, d, block, start));
  };
  const resize = (d: string, block: string, minutes: number): void => {
    const name = blockShort(core.blocks.find((b) => b.id === block)?.name ?? block);
    void calendarEdit(core, name + ' is now ' + span(minutes), (s) => withBlockLength(s, d, block, minutes));
  };

  const short = (d: string): string => Number(d.slice(8, 10)) + ' ' + monthName(Number(d.slice(5, 7)) - 1, true);
  const weekEnd = addDays(weekStart, 6);
  const title =
    view === 'month'
      ? monthName(Number(month.slice(5, 7)) - 1) + ' ' + month.slice(0, 4)
      : view === 'week'
        ? (weekStart.slice(5, 7) === weekEnd.slice(5, 7) ? Number(weekStart.slice(8, 10)) : short(weekStart)) + '–' + short(weekEnd)
        : dayName(date, true) + ' ' + short(date);
  // The header's line (the mockup's): the month and the ISO week of the date in view.
  const shownMonth = view === 'month' ? month : date;
  const isoWeek = (d: string): number => {
    const t = new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))));
    const dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
    return Math.ceil(((t.getTime() - yearStart) / 86400000 + 1) / 7);
  };
  const headerLine = monthName(Number(shownMonth.slice(5, 7)) - 1) + ' ' + shownMonth.slice(0, 4) + ' · week ' + isoWeek(view === 'month' ? month : date);
  const columns = days.map((d) => ({ date: d, blocks: columnFor(d, atlas, ctx, d >= weekStart && d <= weekEnd ? weekPick?.projectId : undefined) }));
  firstStart.current = Math.max(GRID_START, Math.min(GRID_END - 120, ...columns.flatMap((c) => c.blocks.map((b) => b.start)), 24 * 60));
  const dayLog = atlas.logs.find((l) => l.date === date);
  const resolvedDay = view === 'day' ? planForDay({ date, settings, ctx, ...(weekPick?.projectId ? { weeklyPickId: weekPick.projectId } : {}) }) : null;
  const weekDays = eachDay(weekStart, weekEnd);
  const addAt = (): void => setSheet({ kind: 'add', date, minute: Math.min(22 * 60, Math.ceil(Math.max(date === now ? minute : 0, 8 * 60) / 30) * 30) });

  return (
    <Screen title="Calendar">
      {/* The mockup's header: the title over the month and week, and Add time (the screen's one filled button). */}
      <Header
        title="Calendar"
        sub={headerLine}
        actions={
          <Button variant="filled" size="sm" icon="plus" onClick={addAt}>
            Add time
          </Button>
        }
      />
      <div className="mt-4 flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <SegmentedControl label="View" value={view} options={VIEWS} onChange={(v) => go(date, v)} />
        </div>
        <Button variant="icon" icon="chevronLeft" className="!size-11" label={view === 'month' ? 'Previous month' : view === 'week' ? 'Previous week' : 'Previous day'} onClick={() => step(-1)} />
        <Button variant="icon" icon="chevronRight" className="!size-11" label={view === 'month' ? 'Next month' : view === 'week' ? 'Next week' : 'Next day'} onClick={() => step(1)} />
      </div>

      {view === 'month' && (
        <>
          <MonthView atlas={atlas} month={month} selected={date} today={now} onPick={(d) => go(d, 'day')} onMonth={(delta) => setMonth(shiftMonth(month, delta))} />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="ice" icon="calendar" onClick={() => downloadIcs(atlas, ctx, now)}>
              Add to my calendar
            </Button>
            {date !== now && (
              <Button
                onClick={() => {
                  setMonth(startOfMonth(now));
                  go(now);
                }}
              >
                Today
              </Button>
            )}
          </div>
          <p className="mt-2 px-1 text-meta text-ink2">The next four weeks of blocks, as a file your calendar app opens.</p>
        </>
      )}

      {view === 'day' && (
        // The week strip (the mockup's): the seven days of the week, the one in view filled.
        <nav aria-label="This week" className="tile mt-4 flex gap-1 p-2">
          {weekDays.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => go(d, 'day')}
              aria-current={d === date ? 'date' : undefined}
              className={'flex min-h-11 min-w-0 flex-1 flex-col items-center gap-1 rounded-knob py-2 text-small font-semibold ' + (d === date ? 'bg-[var(--l0)] text-[var(--on-lane)]' : 'text-ink2')}
            >
              <span aria-hidden="true">{dayName(d, true)}</span>
              <b className={'text-body font-semibold ' + (d === date ? '' : 'text-ink')}>{Number(d.slice(8, 10))}</b>
              <span className="sr-only">{dateTitle(d) + (d === now ? ', today' : '')}</span>
            </button>
          ))}
        </nav>
      )}

      {view === 'day' && resolvedDay && (
        // The day's line (the mockup's): its hours against the plan, and the legend; the template and the blog on the right.
        <section aria-label="Day" className="tile mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <p className="min-w-0 flex-1 text-label font-semibold">
            <span>{title}</span>
            {resolvedDay.resolved.rest ? ' · rest day · ' + span(totalMinutes(dayLog)) + ' logged' : ' · ' + span(totalMinutes(dayLog)) + ' of ' + span(resolvedDay.targetMinutes) + (resolvedDay.resolved.templateId !== 'full' ? ' · ' + resolvedDay.resolved.templateName : '')}
          </p>
          <span className="flex items-center gap-1.5 text-small font-semibold text-ink2" aria-hidden="true">
            <i className="size-2.5 rounded-[3px] bg-[var(--l0)]" />
            Done
          </span>
          <span className="flex items-center gap-1.5 text-small font-semibold text-ink2" aria-hidden="true">
            <i className="size-2.5 rounded-[3px] bg-[var(--t0)] outline-dashed outline-2 outline-[var(--d0)]" />
            Planned
          </span>
          <span className="flex basis-full flex-wrap gap-2">
            <button type="button" aria-haspopup="dialog" onClick={() => setSheet({ kind: 'template', date })} className="knob min-h-11 rounded-pill px-3.5 text-meta font-semibold">
              {resolvedDay.resolved.rest ? 'Rest day' : resolvedDay.resolved.templateName}
            </button>
            {date <= now && (
              // The day's blog post: the facts and outline of that day, and whether it was posted (DAILY-BLOG).
              <Button size="sm" icon="blog" to={'/blog?date=' + date} name={blogPosts?.some((p) => p.date === date && p.posted) ? 'Blog post, posted' : 'Blog post, not yet'}>
                {blogPosts?.some((p) => p.date === date && p.posted) ? 'Blog ✓' : 'Blog'}
              </Button>
            )}
            {date !== now && (
              <Button
                size="sm"
                onClick={() => {
                  setMonth(startOfMonth(now));
                  go(now);
                }}
              >
                Today
              </Button>
            )}
          </span>
        </section>
      )}

      {view !== 'month' && (
        <>
          <p id="calendar-drag-hint" className="sr-only">
            Drag to move it, drag its bottom edge to change its length, or open it to set its time and length.
          </p>
          {view === 'week' && (
            <div className="mt-4 flex pl-11">
              {days.map((d) => (
                <button key={d} type="button" onClick={() => go(d, 'day')} className="flex min-h-11 min-w-0 flex-1 items-center justify-center">
                  {/* One line: "M 19". Today's header is the first lane's fill. */}
                  <span aria-hidden="true" className={'whitespace-nowrap rounded-pill px-1.5 py-0.5 text-small font-semibold ' + (d === now ? 'bg-[var(--l0)] text-[var(--on-lane)]' : 'text-ink2')}>
                    {dayName(d, true).charAt(0) + ' ' + Number(d.slice(8, 10))}
                  </span>
                  <span className="sr-only">{'Open ' + dateTitle(d) + (d === now ? ', today' : '')}</span>
                </button>
              ))}
              {date !== now && (
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setMonth(startOfMonth(now));
                    go(now);
                  }}
                >
                  Today
                </Button>
              )}
            </div>
          )}
          {/* The time grid (the mockup's): a line and a label every two hours; the blocks in their lanes' colours. */}
          <div ref={scroller} data-calendar-grid className={'mt-4 overflow-y-auto ' + (view === 'week' ? 'tile px-1.5 py-2' : 'px-0.5')} style={{ maxHeight: 'calc(100dvh - 21rem)' }}>
            <div className="flex" style={{ height: GRID_HEIGHT }}>
              <div aria-hidden="true" className="relative w-12 shrink-0">
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} className="absolute left-0 -translate-y-1/2 text-[11px] font-semibold text-ink2" style={{ top: i * 120 * PX_PER_MIN }}>
                    {hm(GRID_START + i * 120)}
                  </span>
                ))}
              </div>
              {columns.map(({ date: d, blocks }) => (
                <DayColumn
                  key={d}
                  date={d}
                  compact={view === 'week'}
                  blocks={blocks.map((b) => ({ ...b, lane: laneSlot(b.id), done: isBlockDone(atlas.logs.find((l) => l.date === d), b.id), running: d === now && timer?.block === b.id }))}
                  busy={busyOn(busyAll, d)}
                  {...(d === now ? { nowMinute: minute } : {})}
                  onOpenBlock={(block) => setSheet({ kind: 'block', date: d, block })}
                  onOpenBusy={(id) => setSheet({ kind: 'busy', date: d, id })}
                  onEmpty={(m) => setSheet({ kind: 'add', date: d, minute: m })}
                  onMove={(block, start) => move(d, block, start)}
                  onResize={(block, minutes) => resize(d, block, minutes)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <BlockSheet atlas={atlas} ctx={ctx} sheet={sheet?.kind === 'block' ? sheet : null} today={now} onClose={() => setSheet(null)} />
      <AddSheet atlas={atlas} sheet={sheet?.kind === 'add' ? sheet : null} onClose={() => setSheet(null)} />
      <BusySheet atlas={atlas} sheet={sheet?.kind === 'busy' ? sheet : null} onClose={() => setSheet(null)} />
      <ConflictSheet atlas={atlas} sheet={sheet?.kind === 'conflict' ? sheet : null} onClose={() => setSheet(null)} />
      <TemplateSheet atlas={atlas} sheet={sheet?.kind === 'template' ? sheet : null} onClose={() => setSheet(null)} />
    </Screen>
  );
}
