import { useEffect, useMemo, useRef, useState } from 'react';
import { useWeekPick } from '../db/state.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { useCatalogueIndex } from '../hooks/useCatalogue.ts';
import { useUnits } from '../hooks/useUnits.ts';
import { dayLayout, withBlockLength, withBlockTime } from '../lib/calendar.ts';
import { busyConflict, busyOn, GRID_END, GRID_START, hm } from '../lib/calendar-layout.ts';
import { addDays, dayName, eachDay, monthName, startOfMonth, startOfWeek, today as todayDate } from '../lib/dates.ts';
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
  const columns = days.map((d) => ({ date: d, blocks: columnFor(d, atlas, ctx, d >= weekStart && d <= weekEnd ? weekPick?.projectId : undefined) }));
  firstStart.current = Math.max(GRID_START, Math.min(GRID_END - 120, ...columns.flatMap((c) => c.blocks.map((b) => b.start)), 24 * 60));
  const dayLog = atlas.logs.find((l) => l.date === date);
  const resolvedDay = view === 'day' ? planForDay({ date, settings, ctx, ...(weekPick?.projectId ? { weeklyPickId: weekPick.projectId } : {}) }) : null;

  return (
    <Screen title="Calendar">
      <Header
        title="Calendar"
        actions={
          <>
            {/* The date range sits on the title's row, between it and the arrows. */}
            <span className="text-meta font-semibold text-ink2">{title}</span>
            <Button variant="icon" icon="chevronLeft" label={view === 'month' ? 'Previous month' : view === 'week' ? 'Previous week' : 'Previous day'} onClick={() => step(-1)} />
            <Button variant="icon" icon="chevronRight" label={view === 'month' ? 'Next month' : view === 'week' ? 'Next week' : 'Next day'} onClick={() => step(1)} />
          </>
        }
      />
      <div className="mt-5 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <SegmentedControl label="View" value={view} options={VIEWS} onChange={(v) => go(date, v)} />
        </div>
        <Button
          size="sm"
          onClick={() => {
            setMonth(startOfMonth(now));
            go(now);
          }}
        >
          Today
        </Button>
      </div>

      {view === 'month' && (
        <>
          <MonthView atlas={atlas} month={month} selected={date} today={now} onPick={(d) => go(d, 'day')} onMonth={(delta) => setMonth(shiftMonth(month, delta))} />
          <div className="mt-[18px] flex flex-wrap gap-3">
            <Button variant="ice" icon="calendar" onClick={() => downloadIcs(atlas, ctx, now)}>
              Add to my calendar
            </Button>
          </div>
          <p className="mt-2 px-1 text-meta text-ink2">The next four weeks of blocks, as a file your calendar app opens.</p>
        </>
      )}

      {view === 'day' && resolvedDay && (
        <section aria-label="Day" className="mt-[18px] flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
          <button type="button" aria-haspopup="dialog" onClick={() => setSheet({ kind: 'template', date })} className="knob min-h-11 rounded-pill px-4 text-meta font-semibold">
            {resolvedDay.resolved.rest ? 'Rest day' : resolvedDay.resolved.templateName}
          </button>
          <p className="min-w-0 flex-1 text-meta text-ink2">
            {span(resolvedDay.targetMinutes) + ' planned · ' + span(totalMinutes(dayLog)) + ' logged'}
          </p>
          {date <= now && (
            // The day's blog post: the facts and outline of that day, and whether it was posted (DAILY-BLOG).
            <Button size="sm" icon="blog" to={'/blog?date=' + date} name={blogPosts?.some((p) => p.date === date && p.posted) ? 'Blog post, posted' : 'Blog post, not yet'}>
              {blogPosts?.some((p) => p.date === date && p.posted) ? 'Blog ✓' : 'Blog'}
            </Button>
          )}
          <Button size="sm" icon="plus" onClick={() => setSheet({ kind: 'add', date, minute: Math.min(22 * 60, Math.ceil(Math.max(date === now ? minute : 0, 8 * 60) / 30) * 30) })}>
            Add
          </Button>
        </section>
      )}

      {view !== 'month' && (
        <>
          <p id="calendar-drag-hint" className="sr-only">
            Drag to move it, drag its bottom edge to change its length, or open it to set its time and length.
          </p>
          {view === 'week' && (
            <div className="mt-[18px] flex pl-11">
              {days.map((d) => (
                <button key={d} type="button" onClick={() => go(d, 'day')} className="flex min-h-11 min-w-0 flex-1 items-center justify-center">
                  {/* One line: "M 19". Today's header is ice. */}
                  <span aria-hidden="true" className={'whitespace-nowrap rounded-pill px-1.5 py-0.5 text-small font-semibold ' + (d === now ? 'fill-ice' : 'text-ink2')}>
                    {dayName(d, true).charAt(0) + ' ' + Number(d.slice(8, 10))}
                  </span>
                  <span className="sr-only">{'Open ' + dateTitle(d) + (d === now ? ', today' : '')}</span>
                </button>
              ))}
            </div>
          )}
          <div ref={scroller} data-calendar-grid className="tile mt-2 overflow-y-auto px-1.5 py-2" style={{ maxHeight: 'calc(100dvh - 19rem)' }}>
            <div className="flex" style={{ height: GRID_HEIGHT }}>
              <div aria-hidden="true" className="relative w-10 shrink-0">
                {Array.from({ length: 18 }, (_, i) => (
                  <span key={i} className="absolute right-1 -translate-y-1/2 text-small font-semibold text-ink2" style={{ top: i * 60 * PX_PER_MIN }}>
                    {i === 0 ? '' : hm(GRID_START + i * 60)}
                  </span>
                ))}
              </div>
              {columns.map(({ date: d, blocks }) => (
                <DayColumn
                  key={d}
                  date={d}
                  compact={view === 'week'}
                  blocks={blocks}
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
