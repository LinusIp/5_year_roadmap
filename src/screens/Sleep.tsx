import { useId, useState } from 'react';
import { restoreNight, saveNight, useSleep, useSleepSettings } from '../db/sleep.ts';
import type { SleepNight } from '../db/types.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { dayLayout } from '../lib/calendar.ts';
import { addDays, dayName, monthName, today as todayDate } from '../lib/dates.ts';
import { announceEdit } from '../lib/edit-events.ts';
import { totalMinutes } from '../lib/logs.ts';
import {
  CHART_MINUTES, averageMinutes, barHours, bedtimeFor, checkNight, clockText, defaultTimes, lastNights, lengthText, nightOf, stepClock, timeOf, weekBars,
} from '../lib/sleep.ts';
import type { WeekBar } from '../lib/sleep.ts';
import { useQueryParam } from '../router/router.tsx';
import { Button } from '../ui/Button.tsx';
import { Header } from '../ui/Header.tsx';
import { Icon } from '../ui/Icon.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { ScenePanel } from '../ui/ScenePanel.tsx';
import { Screen } from '../ui/Screen.tsx';
import { dateTitle, span } from './parts/text.ts';

/** "Sat 17 → Sun 18 Oct": the evening and the morning of a night. */
export function nightSpan(date: string): string {
  const eve = addDays(date, -1);
  const day = (d: string): string => dayName(d, true) + ' ' + Number(d.slice(8, 10));
  const month = (d: string): string => monthName(Number(d.slice(5, 7)) - 1, true);
  return day(eve) + (eve.slice(5, 7) === date.slice(5, 7) ? '' : ' ' + month(eve)) + ' → ' + day(date) + ' ' + month(date);
}

/** "How rested do you feel?": the five answers, worst first. */
const RESTED = ['Awful', 'Tired', 'OK', 'Good', 'Great'] as const;

/**
 * A time of day with − and + knobs (15 minutes each, in the second lane's tint) around the time in 22/900, as the
 * mockup draws it. The time is a native time input lying over the figure, unseen: a tap opens the phone's own time
 * picker, and a keyboard types into it, while the figure shows the time in 24 hours whatever the browser's locale.
 */
function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (time: string) => void }) {
  const labelId = useId();
  const knob = 'lane-tile lane-1 grid size-11 shrink-0 place-items-center rounded-pill text-[20px] font-black';
  return (
    <div className="flex items-center gap-2.5" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="flex-1 text-body font-medium">
        {label}
      </span>
      <button type="button" className={knob} aria-label={label + ' 15 minutes earlier'} onClick={() => onChange(stepClock(value, -15))}>
        −
      </button>
      <span className="relative grid h-11 min-w-[74px] place-items-center rounded-[14px] text-[22px] font-black tabular-nums focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--x1)]">
        <span aria-hidden="true">{value}</span>
        <input
          type="time"
          aria-label={label}
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </span>
      <button type="button" className={knob} aria-label={label + ' 15 minutes later'} onClick={() => onChange(stepClock(value, 15))}>
        +
      </button>
    </div>
  );
}

/**
 * The night (the mockup's): the scene with "LAST NIGHT" and the night's length live on it, then the "LOG A NIGHT" tile
 * with the two times, how rested, and Save night.
 */
function Entry({ date, initial, isToday, goal }: { date: string; initial: { bed: string; wake: string; rested?: SleepNight['rested'] }; isToday: boolean; goal: number }) {
  const [bed, setBed] = useState(initial.bed);
  const [wake, setWake] = useState(initial.wake);
  const [rested, setRested] = useState<SleepNight['rested']>(initial.rested);
  const [confirming, setConfirming] = useState(false);
  const [saved, setSaved] = useState(false);
  const night = nightOf(date, bed, wake);
  const check = checkNight(night);
  const change = (set: (t: string) => void) => (time: string) => {
    set(time);
    setConfirming(false);
    setSaved(false);
  };
  const save = async (): Promise<void> => {
    if (!check.ok) return;
    if (check.confirm && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    const before = await saveNight({ ...night, rested });
    setSaved(true);
    announceEdit({
      group: 'sleep:' + date + ':' + Date.now(),
      label: 'Saved ' + lengthText(night.minutes) + ' for ' + nightSpan(date),
      undo: async () => {
        await restoreNight(date, before);
        return true;
      },
    });
  };
  const diff = night.minutes - goal;
  return (
    <>
      <ScenePanel
        slot="sleep"
        className="mt-4 h-[150px]"
        focal="50% 25%"
        decorative
        fallback={
          <section className="tile mt-4 flex flex-col px-[18px] py-5" aria-label={isToday ? 'Last night' : 'The night'}>
            <span className="section-label mb-0 uppercase text-[var(--x1)]">{isToday ? 'Last night' : 'The night'}</span>
            <output aria-live="polite" className="text-[38px] font-black leading-[1.05] tabular-nums">
              {lengthText(night.minutes)}
            </output>
            <span className="text-label text-ink2">{timeOf(night.bed) + ' → ' + timeOf(night.wake) + ' · ' + (diff >= 0 ? 'target met' : span(-diff) + ' short of target')}</span>
          </section>
        }
      >
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,var(--bg)_28%,rgba(0,0,0,0)_82%)]" />
        <section className="absolute left-[18px] top-6 flex flex-col" aria-label={isToday ? 'Last night' : 'The night'}>
          <span className="section-label mb-0 uppercase text-[var(--x1)]">{isToday ? 'Last night' : 'The night'}</span>
          <output aria-live="polite" className="text-[38px] font-black leading-[1.05] tabular-nums">
            {lengthText(night.minutes)}
          </output>
          <span className="text-label text-ink2">{timeOf(night.bed) + ' → ' + timeOf(night.wake) + ' · ' + (diff >= 0 ? 'target met' : span(-diff) + ' short of target')}</span>
        </section>
      </ScenePanel>

      <section aria-label="Log a night" className="tile mt-4 flex flex-col gap-3.5 px-[18px] py-4">
        <h2 className="section-label mb-0 uppercase">Log a night</h2>
        <TimeRow label="Went to bed" value={bed} onChange={change(setBed)} />
        <TimeRow label="Woke up" value={wake} onChange={change(setWake)} />
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="How rested do you feel?">
          <span className="text-body font-medium">How rested do you feel?</span>
          <div className="flex gap-1.5">
            {RESTED.map((label, i) => {
              const on = rested === i;
              return (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={'Rested: ' + label}
                  onClick={() => {
                    setRested(i as SleepNight['rested']);
                    setSaved(false);
                  }}
                  className={'min-h-11 flex-1 rounded-[14px] text-meta font-semibold ' + (on ? 'lane-fill lane-1 text-[var(--on-lane)]' : 'well !rounded-[14px] text-ink2')}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        {!check.ok && (
          <p role="alert" className="text-meta text-ink">
            {check.error}
          </p>
        )}
        {check.ok && check.confirm && confirming && (
          <p role="alert" className="text-meta text-ink">
            {check.confirm} Save again to keep it.
          </p>
        )}
        <Button variant="filled" lane={1} className="w-full" onClick={() => void save()} disabled={!check.ok}>
          {confirming ? 'Save anyway' : saved ? 'Saved ✓' : 'Save night'}
        </Button>
        <p className="text-small text-ink2">Steps of 15 minutes · tap a time to type it</p>
      </section>
    </>
  );
}

/**
 * "Last 7 nights" (the mockup's): seven bars scaled to 9 h, a night that met the target in the lane's fill, one under
 * it in its deco, last night ringed, a dashed line at the target.
 */
function WeekChart({ bars, today, goal }: { bars: WeekBar[]; today: string; goal: number }) {
  const average = averageMinutes(bars);
  const alt =
    'Last 7 nights: ' +
    bars.map((b) => dayName(b.date) + ' ' + (b.minutes === null ? 'not logged' : barHours(b.minutes) + ' hours')).join(', ') +
    '. Target ' +
    lengthText(goal) +
    '.';
  const height = 130;
  const px = (minutes: number): number => Math.min(height - 2, Math.round((minutes / CHART_MINUTES) * height));
  return (
    <section aria-labelledby="sleep-week" className="tile mt-4 flex flex-col gap-3 px-[18px] py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="sleep-week" className="section-label mb-0 uppercase">
          Last 7 nights
        </h2>
        <span className="text-small text-ink2">{(average === null ? 'no nights yet' : 'avg ' + lengthText(average)) + ' · target ' + lengthText(goal)}</span>
      </div>
      <div role="img" aria-label={alt} className="relative flex items-end gap-2" style={{ height }}>
        <div aria-hidden="true" className="absolute inset-x-0 border-t-2 border-dashed border-[var(--d1)]" style={{ bottom: px(goal) }} />
        {bars.map((b) => (
          <div key={b.date} aria-hidden="true" className={'flex flex-1 flex-col items-center gap-1.5 text-[11px] font-semibold ' + (b.date === today ? 'text-[var(--x1)]' : 'text-ink2')}>
            <b
              className={'block w-full rounded-[10px_10px_4px_4px] ' + (b.date === today && b.minutes !== null ? 'shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--l1)]' : '')}
              style={{ height: b.minutes === null ? 3 : px(b.minutes), background: b.minutes === null ? 'var(--sd)' : b.minutes >= goal ? 'var(--l1)' : 'var(--d1)' }}
            />
            {dayName(b.date, true)}
          </div>
        ))}
      </div>
      <p className="text-small text-ink2">{'Dashed line: your ' + lengthText(goal) + ' target. Darker bars met it.'}</p>
    </section>
  );
}

/** What the nights say about the next day's study, once there are three nights of each kind to compare. */
function insightText(nights: readonly SleepNight[], studyOn: (date: string) => number, goal: number): string | null {
  const long = nights.filter((n) => n.minutes >= goal).map((n) => studyOn(n.date));
  const short = nights.filter((n) => n.minutes < goal).map((n) => studyOn(n.date));
  if (long.length < 3 || short.length < 3) return null;
  const avg = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;
  const diff = Math.round(avg(long) - avg(short));
  const hours = lengthText(goal);
  if (Math.abs(diff) < 10) return 'On nights of ' + hours + ' or more you log about the same study the next day.';
  return 'On nights of ' + hours + ' or more you log about ' + span(Math.abs(diff)) + (diff > 0 ? ' more' : ' less') + ' study the next day.';
}

/**
 * The Sleep screen (SLEEP-LOG, redrawn to the redesign mockup): last night on the scene (or the night of `?date=`),
 * the entry with how rested, the last 7 nights, what the nights say about study, and the last 30 nights, each of
 * which can be edited. Neutral facts only.
 */
export function Sleep() {
  const atlas = useAtlas();
  const nights = useSleep();
  const sleepSettings = useSleepSettings();
  const [dateParam, setDateParam] = useQueryParam('date');
  const today = todayDate();
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam <= today ? dateParam : today;
  const title = 'Sleep';
  if (!atlas || !nights || !sleepSettings) {
    return (
      <Screen title={title}>
        <Header title={title} backTo="/" backLabel="Back to Today" />
        <p className="pt-6 text-meta text-ink2" role="status">
          Loading…
        </p>
      </Screen>
    );
  }
  const existing = nights.find((n) => n.date === date);
  const initial = existing ? { bed: timeOf(existing.bed), wake: timeOf(existing.wake), rested: existing.rested } : defaultTimes(nights, date, new Date());
  const goal = sleepSettings.goalMinutes;
  // The first block of tomorrow (or today's, on a day with none), for "bed by 22:30".
  const starts = [addDays(today, 1), today].map((d) => dayLayout(d, atlas.settings).map((p) => p.start)).find((s) => s.length > 0) ?? [];
  const firstStart = clockText(starts.length > 0 ? Math.min(...starts) : 6 * 60);
  const history = lastNights(nights, today, 30);
  const studyOn = (d: string): number => totalMinutes(atlas.logs.find((l) => l.date === d));
  const insight = insightText(nights, studyOn, goal);

  return (
    <Screen title={title}>
      <Header title={title} backTo="/" backLabel="Back to Today" sub={'Target ' + lengthText(goal) + ' · bed by ' + bedtimeFor(goal, firstStart) + ' · ' + nightSpan(date)} />
      <Entry key={date + ':' + (existing?.bed ?? '') + (existing?.wake ?? '')} date={date} initial={initial} isToday={date === today} goal={goal} />
      <WeekChart bars={weekBars(nights, today, atlas.settings.core.weekStartsOn)} today={today} goal={goal} />
      <section className="tile mt-4 flex items-center gap-3 px-[18px] py-3.5" aria-label="What the nights say">
        <span className="lane-tile lane-4 grid size-11 shrink-0 place-items-center rounded-[14px]" aria-hidden="true">
          <Icon name="stats" size={18} />
        </span>
        <p className="text-meta">{insight ?? 'Log a few more nights and Atlas will say how your sleep and the next day’s study go together.'}</p>
      </section>
      {history.length > 0 && (
        <RowList label="History" className="mt-4" aside="last 30 nights">
          {history.map((n) => {
            const rested = nights.find((x) => x.date === n.date)?.rested;
            return (
            <Row
              key={n.date}
              height={48}
              title={dateTitle(n.date)}
              meta={timeOf(n.bed) + ' → ' + timeOf(n.wake) + (rested !== undefined ? ' · ' + RESTED[rested].toLowerCase() : '')}
              trailing={lengthText(n.minutes)}
              onClick={() => {
                setDateParam(n.date === today ? null : n.date);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
            );
          })}
        </RowList>
      )}
    </Screen>
  );
}
