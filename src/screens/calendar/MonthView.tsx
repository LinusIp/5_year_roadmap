import { useRef } from 'react';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { shortTemplateLabel } from '../../lib/calendar.ts';
import { dayName, eachDay, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from '../../lib/dates.ts';
import { resolveDay } from '../../lib/day-plan.ts';
import { totalMinutes } from '../../lib/logs.ts';
import { minutesToCount, relativeLevel } from '../../lib/streaks.ts';
import { blockTone } from '../../ui/colors.ts';
import { Icon } from '../../ui/Icon.tsx';
import { dateTitle, span } from '../parts/text.ts';

export interface DayMarker {
  kind: 'phase' | 'goal' | 'project';
  label: string;
}

/**
 * The markers of the plan on a date: a phase starting, a goal's date (a milestone), and the last day of a month
 * with a monthly project in progress (when it is due).
 */
export function markersOn(date: string, atlas: Atlas): DayMarker[] {
  const out: DayMarker[] = [];
  for (const p of atlas.seed.phases) if (p.start === date) out.push({ kind: 'phase', label: p.title + ' starts' });
  for (const g of atlas.seed.goals ?? []) if (g.date === date) out.push({ kind: 'goal', label: g.title });
  if (endOfMonth(date) === date) {
    const monthly = atlas.seed.projects.filter((p) => p.cadence === 'monthly' && atlas.states.get(p.id)?.status === 'active');
    for (const p of monthly) out.push({ kind: 'project', label: p.title + ' due' });
  }
  return out;
}

/**
 * A month as a grid from the week's first day, its dates as 34 px circles like Today's week strip: a past day that
 * counted is blue, one that should have had time and has none is pressed in, today is ice. Under a past date, a
 * small pill in the heatmap's colour shows how much was logged; under a future one, a dot per planned block. A day
 * on another template carries its short name ("Uni", "Exam", "Rest"), and a flag marks a phase start, a goal or a
 * project due. Arrows or a swipe change the month.
 */
export function MonthView({ atlas, month, selected, today, onPick, onMonth }: { atlas: Atlas; month: string; selected: string; today: string; onPick: (date: string) => void; onMonth: (delta: number) => void }) {
  const { settings, logs } = atlas;
  const weekStartsOn = settings.core.weekStartsOn;
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const days = eachDay(startOfWeek(first, weekStartsOn), endOfWeek(last, weekStartsOn));
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const defaultTemplate = settings.core.templates[0]?.id;
  const logOf = new Map(logs.map((l) => [l.date, l]));

  return (
    <section
      aria-label={'Month of ' + dateTitle(first).split(' ').slice(2).join(' ')}
      className="tile mt-[18px] px-2.5 pb-3 pt-3.5"
      onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const s = swipe.current;
        swipe.current = null;
        if (!s) return;
        const dx = e.clientX - s.x;
        if (Math.abs(dx) > 60 && Math.abs(e.clientY - s.y) < 40) onMonth(dx > 0 ? -1 : 1);
      }}
    >
      <div aria-hidden="true" className="mb-1 grid grid-cols-7 text-center text-small font-semibold text-ink2">
        {days.slice(0, 7).map((d) => (
          <span key={d}>{dayName(d, true)}</span>
        ))}
      </div>
      <div role="grid" aria-label="Days" className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: days.length / 7 }, (_, row) => (
          <div role="row" key={row} className="contents">
            {days.slice(row * 7, row * 7 + 7).map((date) => {
              const inMonth = date >= first && date <= last;
              const resolved = resolveDay(date, settings);
              const minutes = totalMinutes(logOf.get(date));
              const past = date < today;
              const level = past && minutes > 0 ? relativeLevel(minutes, resolved.planned, settings.core.heatmapThresholds) : 0;
              const missed = past && minutes === 0 && resolved.planned > 0 && !logOf.get(date)?.frozen;
              const counted = past && minutes > 0 && minutes >= minutesToCount(resolved.planned, settings.core.streak);
              const label = resolved.rest ? 'Rest' : resolved.templateId !== defaultTemplate ? shortTemplateLabel(resolved.templateName) : null;
              const markers = markersOn(date, atlas);
              const circle =
                date === today
                  ? 'fill-ice'
                  : counted
                    ? 'fill-blue'
                    : missed
                      ? 'well text-ink2'
                      : '';
              const describe = [
                dateTitle(date) + (date === today ? ', today' : ''),
                past ? (minutes > 0 ? span(minutes) + ' logged' : missed ? 'nothing logged' : null) : resolved.blocks.length > 0 ? resolved.blocks.length + ' blocks planned' : null,
                label ? resolved.templateName : null,
                ...markers.map((m) => m.label),
              ]
                .filter(Boolean)
                .join(', ');
              return (
                <div role="gridcell" key={date} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => onPick(date)}
                    aria-label={describe}
                    aria-current={date === today ? 'date' : undefined}
                    aria-pressed={date === selected}
                    className={'relative flex min-h-[60px] w-11 flex-col items-center gap-0.5 pt-1' + (inMonth ? '' : ' opacity-45')}
                  >
                    <span
                      aria-hidden="true"
                      className={
                        'grid size-[34px] place-items-center rounded-pill text-label font-semibold ' +
                        circle +
                        (date === selected ? ' outline outline-2 outline-offset-2 outline-blue-deep' : '')
                      }
                    >
                      {Number(date.slice(8, 10))}
                    </span>
                    {level > 0 && <span aria-hidden="true" className={'h-[5px] w-5 rounded-pill heat-bg-' + level} />}
                    {!past && resolved.blocks.length > 0 && (
                      <span aria-hidden="true" className="flex gap-[2px]">
                        {resolved.blocks.slice(0, 6).map((b) => (
                          <span key={b.id} className={'size-[5px] rounded-pill ' + (blockTone(b.id) === 'ice' ? 'bg-ice-deep' : 'bg-blue')} />
                        ))}
                      </span>
                    )}
                    {label && (
                      <span aria-hidden="true" className="text-small font-semibold leading-none text-ink2">
                        {label}
                      </span>
                    )}
                    {markers.length > 0 && (
                      <span aria-hidden="true" className="absolute right-0 top-0 text-ice-deep">
                        <Icon name="flag" size={12} />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

/** The months either side, for the header's arrows. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1 + delta, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
}
