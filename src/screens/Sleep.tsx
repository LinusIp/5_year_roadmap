import { useId, useState } from 'react';
import { restoreNight, saveNight, useSleep, useSleepSettings } from '../db/sleep.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { dayLayout } from '../lib/calendar.ts';
import { addDays, dayName, monthName, today as todayDate } from '../lib/dates.ts';
import { announceEdit } from '../lib/edit-events.ts';
import {
  CHART_MINUTES, averageMinutes, barHours, bedtimeFor, checkNight, clockText, defaultTimes, lastNights, lengthText, nightOf, stepClock, timeOf, usualBedtime, weekBars,
} from '../lib/sleep.ts';
import type { WeekBar } from '../lib/sleep.ts';
import { useQueryParam } from '../router/router.tsx';
import { Button } from '../ui/Button.tsx';
import { Header } from '../ui/Header.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { dateTitle } from './parts/text.ts';

/** "Sat 17 → Sun 18 Oct": the evening and the morning of a night. */
export function nightSpan(date: string): string {
  const eve = addDays(date, -1);
  const day = (d: string): string => dayName(d, true) + ' ' + Number(d.slice(8, 10));
  const month = (d: string): string => monthName(Number(d.slice(5, 7)) - 1, true);
  return day(eve) + (eve.slice(5, 7) === date.slice(5, 7) ? '' : ' ' + month(eve)) + ' → ' + day(date) + ' ' + month(date);
}

/**
 * A time of day with − and + knobs (15 minutes each) around a sunken time. The time is a native time input lying
 * over the well, unseen: a tap opens the phone's own time picker, and a keyboard types into it, while the well shows
 * the time in 24 hours whatever the browser's locale.
 */
function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (time: string) => void }) {
  const labelId = useId();
  const knob = 'knob !size-11 shrink-0 rounded-knob text-ink';
  return (
    <div className="flex items-center gap-2.5" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="flex-1 text-body font-medium">
        {label}
      </span>
      <Button variant="icon" icon="minus" className={knob} label={label + ' 15 minutes earlier'} onClick={() => onChange(stepClock(value, -15))} />
      <span className="well relative grid h-11 w-[104px] place-items-center rounded-[14px] text-[1.25rem] font-semibold tabular-nums focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-deep">
        <span aria-hidden="true">{value}</span>
        <input
          type="time"
          aria-label={label}
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </span>
      <Button variant="icon" icon="plus" className={knob} label={label + ' 15 minutes later'} onClick={() => onChange(stepClock(value, 15))} />
    </div>
  );
}

/** The entry: the night's length in an ice well, live, the two times, and Save. */
function Entry({ date, initial }: { date: string; initial: { bed: string; wake: string } }) {
  const [bed, setBed] = useState(initial.bed);
  const [wake, setWake] = useState(initial.wake);
  const [confirming, setConfirming] = useState(false);
  const night = nightOf(date, bed, wake);
  const check = checkNight(night);
  const change = (set: (t: string) => void) => (time: string) => {
    set(time);
    setConfirming(false);
  };
  const save = async (): Promise<void> => {
    if (!check.ok) return;
    if (check.confirm && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    const before = await saveNight(night);
    announceEdit({
      group: 'sleep:' + date + ':' + Date.now(),
      label: 'Saved ' + lengthText(night.minutes) + ' for ' + nightSpan(date),
      undo: async () => {
        await restoreNight(date, before);
        return true;
      },
    });
  };
  return (
    <section aria-label="Last night" className="tile mt-[18px] flex flex-col gap-3.5 p-[18px]">
      <output aria-live="polite" className="well-ice self-center rounded-[18px] px-5 py-2 text-[2.25rem] font-semibold leading-tight tabular-nums">
        {lengthText(night.minutes)}
      </output>
      <TimeRow label="Bedtime" value={bed} onChange={change(setBed)} />
      <TimeRow label="Woke up" value={wake} onChange={change(setWake)} />
      <p className="text-center text-meta text-ink2">Steps of 15 minutes · tap a time to type it</p>
      {!check.ok && (
        <p role="alert" className="text-center text-meta text-ink">
          {check.error}
        </p>
      )}
      {check.ok && check.confirm && confirming && (
        <p role="alert" className="text-center text-meta text-ink">
          {check.confirm} Save again to keep it.
        </p>
      )}
      <Button variant="filled" icon="check" className="w-full" onClick={() => void save()} disabled={!check.ok}>
        {confirming ? 'Save anyway' : 'Save'}
      </Button>
    </section>
  );
}

/** "This week": seven sunken bars scaled to 9 h, today's in ice, a dashed line at the goal, each night's hours above. */
function WeekChart({ bars, today, goal }: { bars: WeekBar[]; today: string; goal: number }) {
  const average = averageMinutes(bars);
  const goalTop = (1 - goal / CHART_MINUTES) * 100;
  const alt =
    'This week: ' +
    bars.map((b) => dayName(b.date) + ' ' + (b.minutes === null ? 'not logged' : barHours(b.minutes) + ' hours')).join(', ') +
    '. Goal ' +
    lengthText(goal) +
    '.';
  return (
    <section aria-labelledby="sleep-week" className="tile mt-[18px] flex flex-col gap-3 p-[18px]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="sleep-week" className="section-label mb-0">
          This week
        </h2>
        <span className="text-meta text-ink2">{(average === null ? 'no nights yet' : 'average ' + lengthText(average)) + ' · goal ' + lengthText(goal)}</span>
      </div>
      <div role="img" aria-label={alt} className="grid grid-cols-7 gap-2">
        {bars.map((b) => (
          <div key={b.date} aria-hidden="true" className="flex flex-col items-center gap-1.5">
            <span className="text-small text-ink2 tabular-nums">{b.minutes === null ? '–' : barHours(b.minutes)}</span>
            <span className="well relative h-[116px] w-full max-w-9 overflow-hidden rounded-[12px]">
              {b.minutes !== null && (
                <span
                  className="absolute inset-x-[3px] bottom-[3px] rounded-[9px]"
                  style={{ height: 'calc(' + Math.min(1, b.minutes / CHART_MINUTES) * 100 + '% - 6px)', background: b.date === today ? 'var(--ice)' : 'var(--deco)' }}
                />
              )}
              <span className="absolute inset-x-[3px] border-t-[1.5px] border-dashed border-blue-deep" style={{ top: goalTop + '%' }} />
            </span>
            <span className={'text-small font-semibold ' + (b.date === today ? 'text-ink' : 'text-ink2')}>{dayName(b.date, true)}</span>
          </div>
        ))}
      </div>
      <p className="text-small text-ink2">{'Dashed line: ' + lengthText(goal) + ' goal'}</p>
    </section>
  );
}

function SmallTile({ label, value, meta, blue }: { label: string; value: string; meta: string; blue?: boolean }) {
  return (
    <section aria-label={label} className="tile flex flex-col items-center gap-1 px-3 py-4 text-center">
      <h2 className="section-label mb-0">{label}</h2>
      <p className={'text-card font-semibold tabular-nums ' + (blue ? 'text-blue-deep' : '')}>{value}</p>
      <p className="text-meta text-ink2">{meta}</p>
    </section>
  );
}

/**
 * The Sleep screen (SLEEP-LOG): last night's entry (or the night of `?date=`), this week's chart, the usual bedtime
 * and the bedtime that gives the goal before the first block, and the last 30 nights, each of which can be edited.
 * Neutral facts only.
 */
export function Sleep() {
  const atlas = useAtlas();
  const nights = useSleep();
  const sleepSettings = useSleepSettings();
  const [dateParam, setDateParam] = useQueryParam('date');
  const today = todayDate();
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam <= today ? dateParam : today;
  const title = 'Sleep';
  const back = <Button variant="icon" icon="chevronLeft" label="Back to Today" to="/" />;
  if (!atlas || !nights || !sleepSettings) {
    return (
      <Screen title={title}>
        <Header title={title} back={back} />
        <p className="pt-6 text-meta text-ink2" role="status">
          Loading…
        </p>
      </Screen>
    );
  }
  const existing = nights.find((n) => n.date === date);
  const initial = existing ? { bed: timeOf(existing.bed), wake: timeOf(existing.wake) } : defaultTimes(nights, date, new Date());
  const goal = sleepSettings.goalMinutes;
  // The first block of tomorrow (or today's, on a day with none), for "For 8 h by 06:00".
  const starts = [addDays(today, 1), today].map((d) => dayLayout(d, atlas.settings).map((p) => p.start)).find((s) => s.length > 0) ?? [];
  const firstStart = clockText(starts.length > 0 ? Math.min(...starts) : 6 * 60);
  const usual = usualBedtime(nights, today);
  const history = lastNights(nights, today, 30);

  return (
    <Screen title={title}>
      <Header title={title} back={back} sub={(date === today ? 'Last night · ' : 'The night of ') + nightSpan(date)} />
      <Entry key={date + ':' + (existing?.bed ?? '') + (existing?.wake ?? '')} date={date} initial={initial} />
      <WeekChart bars={weekBars(nights, today, atlas.settings.core.weekStartsOn)} today={today} goal={goal} />
      <div className="mt-4 grid grid-cols-2 gap-4">
        <SmallTile label="Usual bedtime" value={usual ?? '–'} meta="last 7 nights" />
        <SmallTile label={'For ' + lengthText(goal) + ' by ' + firstStart} value={bedtimeFor(goal, firstStart)} meta="bedtime" blue />
      </div>
      {history.length > 0 && (
        <RowList label="History" className="mt-[18px]" aside="last 30 nights">
          {history.map((n) => (
            <Row
              key={n.date}
              height={48}
              title={dateTitle(n.date)}
              meta={timeOf(n.bed) + ' → ' + timeOf(n.wake)}
              trailing={lengthText(n.minutes)}
              onClick={() => {
                setDateParam(n.date === today ? null : n.date);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ))}
        </RowList>
      )}
    </Screen>
  );
}
