/**
 * The reading cadence: one paper a week from the year the settings name (year 2 by default).
 */
import type { PaperState } from '../db/types.ts';
import type { Paper, Phase, SettingsDefaults } from '../seed/schema.ts';
import { addDays, daysBetween, startOfWeek } from './dates.ts';

export interface CadenceStatus {
  /** False before the cadence starts. */
  active: boolean;
  startsOn: string | null;
  /** Weeks since the cadence started, including this one. */
  weeks: number;
  /** Papers read (or implemented) since the cadence started. */
  read: number;
  expected: number;
  /** Positive when behind. */
  behindBy: number;
  readThisWeek: boolean;
}

export function cadenceStatus(
  phases: Phase[],
  cadence: SettingsDefaults['paperCadence'],
  states: Map<string, PaperState>,
  asOf: string,
  weekStartsOn: 0 | 1,
): CadenceStatus {
  const start = (cadence.fromPhase ? phases.find((p) => p.id === cadence.fromPhase) : phases.find((p) => p.year === cadence.fromYear))?.start ?? null;
  const readDates = [...states.values()]
    .filter((s) => (s.status === 'read' || s.status === 'implemented') && s.readAt)
    .map((s) => s.readAt!);

  if (!start || asOf < start) {
    return { active: false, startsOn: start, weeks: 0, read: 0, expected: 0, behindBy: 0, readThisWeek: false };
  }
  const weeks = Math.floor(daysBetween(startOfWeek(start, weekStartsOn), asOf) / 7) + 1;
  const read = readDates.filter((d) => d >= start).length;
  const expected = Math.floor(weeks * cadence.perWeek);
  const weekStart = startOfWeek(asOf, weekStartsOn);
  const weekEnd = addDays(weekStart, 6);
  return {
    active: true,
    startsOn: start,
    weeks,
    read,
    expected,
    behindBy: Math.max(0, expected - read),
    readThisWeek: readDates.some((d) => d >= weekStart && d <= weekEnd),
  };
}

/** The paper to read next: one being read, else the first queued one, in the seeded order. */
export function nextPaper(papers: Paper[], states: Map<string, PaperState>): Paper | null {
  const reading = papers.find((p) => states.get(p.id)?.status === 'reading');
  if (reading) return reading;
  return papers.find((p) => (states.get(p.id)?.status ?? 'queued') === 'queued') ?? null;
}

/** "Three sentences" is the brief's target, so the summary field counts them. */
export function sentenceCount(text: string): number {
  return (text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? []).length + (/[^.!?\s]\s*$/.test(text.trim()) && text.trim() ? 1 : 0);
}
