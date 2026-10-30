/**
 * ATLAS-FORECAST-FIX: the pace window starts where tracking started, a verdict waits for a week of logs, a plan
 * that does not fit the days left is said as that, and a long delay is said as a month, not a count of weeks.
 */
import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';
import { defaultSettings } from '../../src/db/settings.ts';
import type { DayLog } from '../../src/db/types.ts';
import { addDays, daysBetween } from '../../src/lib/dates.ts';
import { plannedOver } from '../../src/lib/day-plan.ts';
import { CLAMP_WEEKS, describeVerdict, forecastPhase, paceWindow, verdictTone } from '../../src/lib/forecast.ts';
import type { LaneProgress } from '../../src/lib/progress.ts';
import type { AppSeed } from '../../src/seed/schema.ts';

const seed = splitSeed(loadSeedOrThrow()).app as AppSeed;
const settings = defaultSettings(seed.settings);
const phase = seed.phases.find((p) => p.id === 'y1-p0')!; // 2026-09-21 → 2027-01-31
const WINDOW = settings.core.forecast.paceWindowDays; // 28

const lane = (block: string, remaining: number, done = 0): LaneProgress => ({
  block: block as LaneProgress['block'],
  items: [],
  totalHours: remaining + done,
  remainingHours: remaining,
  doneHours: done,
  fraction: done / (remaining + done || 1),
  budgetHours: 266,
});
const log = (date: string, block: string, minutes: number): DayLog => ({ date, entries: [{ block: block as never, track: 'ai', minutes }] });
/** Full days on block A (the plan's 120 minutes), `from` to `to` inclusive. */
const fullDays = (from: string, to: string, block = 'A'): DayLog[] => {
  const out: DayLog[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(log(d, block, 120));
  return out;
};
const capacity = (from: string, block = 'A'): number => plannedOver(settings, from, phase.end, block) / 60;

describe('the pace window', () => {
  it('starts at the latest of 28 days back, the phase start and the first log', () => {
    // Deep in the phase with months of logs: the plain 28 days.
    expect(paceWindow(fullDays('2026-09-21', '2026-12-31'), phase.start, '2026-12-31', WINDOW)).toMatchObject({ from: '2026-12-04', days: 28, loggedDays: 28 });
    // Ten days into the phase: the phase start, not 18 days before it.
    expect(paceWindow(fullDays('2026-09-21', '2026-09-30'), phase.start, '2026-09-30', WINDOW)).toMatchObject({ from: '2026-09-21', days: 10, loggedDays: 10 });
    // Tracking began six days ago: the first log, not the phase start.
    expect(paceWindow(fullDays('2026-10-24', '2026-10-30'), phase.start, '2026-10-30', WINDOW)).toMatchObject({ from: '2026-10-24', days: 7, loggedDays: 7 });
    // Nothing logged yet: the window is the phase so far, with no logged days.
    expect(paceWindow([], phase.start, '2026-09-23', WINDOW)).toMatchObject({ from: '2026-09-21', days: 3, loggedDays: 0 });
  });

  it('keeps a user who started six days ago at full pace on track, instead of dozens of weeks behind', () => {
    const asOf = '2026-10-30';
    const logs = fullDays('2026-10-24', asOf);
    // Exactly the hours the schedule holds from today to the phase end: at the plan's pace it lands on the last day.
    const forecast = forecastPhase({ phase, lanes: [lane('A', capacity(asOf))], logs, settings, asOf });
    expect(forecast.window).toMatchObject({ from: '2026-10-24', days: 7, loggedDays: 7 });
    expect(forecast.lanes[0]!.paceHoursPerDay).toBeCloseTo(2);
    expect(forecast.lanes[0]!.projectedEnd).toBe(phase.end);
    expect(forecast.lanes[0]!.verdict).toBe('on-track');
    expect(forecast.verdict).toBe('on-track');
  });

  it('also clamps to the phase start, so the days before the phase do not count as missed', () => {
    // Nine days into the phase at full pace, with exactly the remaining capacity: on track.
    const asOf = '2026-09-29';
    const forecast = forecastPhase({ phase, lanes: [lane('A', capacity(asOf))], logs: fullDays(phase.start, asOf), settings, asOf });
    expect(forecast.window.from).toBe(phase.start);
    expect(forecast.lanes[0]!.verdict).toBe('on-track');
  });
});

describe('too early to tell', () => {
  it('gives no verdict under seven days of window', () => {
    const asOf = '2026-10-30';
    const forecast = forecastPhase({ phase, lanes: [lane('A', 100)], logs: fullDays('2026-10-28', asOf), settings, asOf });
    expect(forecast.window.days).toBe(3);
    expect(forecast.lanes[0]!.verdict).toBe('early');
    expect(forecast.verdict).toBe('early');
    expect(describeVerdict('early', null)).toBe('Too early to tell');
    expect(verdictTone('early')).toBe('muted');
  });

  it('gives no verdict under three logged days, however long the window', () => {
    const asOf = '2026-10-30';
    const logs = [log('2026-10-20', 'A', 120), log('2026-10-29', 'A', 120)];
    const forecast = forecastPhase({ phase, lanes: [lane('A', 100)], logs, settings, asOf });
    expect(forecast.window).toMatchObject({ from: '2026-10-20', days: 11, loggedDays: 2 });
    expect(forecast.lanes[0]!.verdict).toBe('early');
  });

  it('counts logged days on any block, and judges once there are three in a week', () => {
    const asOf = '2026-10-30';
    const logs = [log('2026-10-24', 'E', 120), log('2026-10-26', 'E', 120), log('2026-10-28', 'A', 60)];
    const forecast = forecastPhase({ phase, lanes: [lane('A', 100), lane('E', 100)], logs, settings, asOf });
    expect(forecast.window).toMatchObject({ days: 7, loggedDays: 3 });
    expect(forecast.lanes.map((l) => l.verdict)).toEqual(['behind', 'behind']);
  });

  it('still says not started before anything at all is logged', () => {
    const forecast = forecastPhase({ phase, lanes: [lane('A', 100)], logs: [], settings, asOf: '2026-09-23' });
    expect(forecast.lanes[0]!.verdict).toBe('not-started');
  });
});

describe('a plan that overflows the phase', () => {
  const asOf = '2026-11-18';
  const logs = fullDays('2026-10-01', asOf); // the plan's pace, every day

  it('says the plan is too full, not that the lane is behind, even at 100% pace', () => {
    const fits = capacity(asOf);
    const forecast = forecastPhase({ phase, lanes: [lane('A', fits + 40)], logs, settings, asOf });
    const a = forecast.lanes[0]!;
    expect(a.paceHoursPerDay).toBeCloseTo(2);
    expect(a.capacityHours).toBeCloseTo(fits);
    expect(a.overflowHours).toBeCloseTo(40);
    expect(a.verdict).toBe('over-planned');
    expect(describeVerdict(a.verdict, a.weeksLate, { overflowHours: a.overflowHours })).toBe('Plan too full by 40 h');
    expect(verdictTone('over-planned')).toBe('warning');
    // The projected end is still there for the sheet to show.
    expect(a.projectedEnd).not.toBeNull();
    expect(a.projectedEnd! > phase.end).toBe(true);
  });

  it('is said at the phase level as a count of lanes, not as weeks behind', () => {
    const fits = capacity(asOf);
    const forecast = forecastPhase({ phase, lanes: [lane('A', fits + 40), lane('E', 10)], logs: [...logs, ...fullDays('2026-10-01', asOf, 'E')], settings, asOf });
    expect(forecast.overPlanned).toBe(1);
    expect(forecast.verdict).toBe('over-planned');
    expect(describeVerdict(forecast.verdict, forecast.weeksLate, { lanesOver: forecast.overPlanned })).toBe('1 lane over-planned');
    expect(describeVerdict('over-planned', null, { lanesOver: 2 })).toBe('2 lanes over-planned');
    // The phase's own date comes from the lanes whose plan fits.
    expect(forecast.projectedEnd! <= phase.end).toBe(true);
  });

  it('leaves a lane that fits to its pace verdict', () => {
    const forecast = forecastPhase({ phase, lanes: [lane('A', capacity(asOf) - 1)], logs, settings, asOf });
    expect(forecast.lanes[0]!.verdict).toBe('on-track');
  });
});

describe('the wording of a long delay', () => {
  it('names the month past twelve weeks, and counts weeks up to it', () => {
    expect(describeVerdict('behind', CLAMP_WEEKS, { projectedEnd: '2027-04-25' })).toBe('12 weeks behind');
    expect(describeVerdict('behind', 13, { projectedEnd: '2027-05-02' })).toBe('Finishes ~May 2027 (3 months late)');
    expect(describeVerdict('behind', 57, { projectedEnd: '2028-03-10' })).toBe('Finishes ~Mar 2028 (13 months late)');
    expect(describeVerdict('behind', 1, { projectedEnd: '2027-02-07' })).toBe('1 week behind');
    // Without a date to name, the count stays.
    expect(describeVerdict('behind', 57)).toBe('57 weeks behind');
  });
});

describe('exam weeks and pauses', () => {
  it('move the projected end by exactly their length', () => {
    const asOf = '2026-10-30';
    const logs = fullDays('2026-10-01', asOf);
    const lanes = [lane('A', 100)];
    const normal = forecastPhase({ phase, lanes, logs, settings, asOf });
    const exam = structuredClone(settings);
    exam.schedule.overrides.push({ id: 'e', from: '2026-11-02', to: '2026-11-15', template: 'exam' });
    const during = forecastPhase({ phase, lanes, logs, settings: exam, asOf });
    expect(normal.lanes[0]!.verdict).toBe('ahead'); // 100 h at two hours a day: fifty days
    expect(daysBetween(normal.lanes[0]!.projectedEnd!, during.lanes[0]!.projectedEnd!)).toBe(14);
  });
});
