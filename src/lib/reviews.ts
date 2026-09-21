/**
 * The numbers a review starts from, worked out from the logs so the user only writes the reflection.
 */
import type { DayLog, StoredSettings, UserItemState } from '../db/types.ts';
import type { AppSeed, BlockId } from '../seed/schema.ts';
import { addDays, endOfMonth, startOfMonth, startOfWeek } from './dates.ts';

export interface PeriodSummary {
  start: string;
  end: string;
  totalMinutes: number;
  targetMinutes: number;
  minutesByBlock: Record<BlockId, number>;
  /** Days that met the streak minimum. */
  daysCounted: number;
  days: number;
  /** Ids of resources and projects finished in the period (by their doneAt date). */
  itemsFinished: string[];
  /** Projects finished in the period, by cadence. */
  shipped: { weekly: string[]; monthly: string[]; capstone: string[] };
  averageEnergy: number | null;
}

function emptyBlocks(): Record<BlockId, number> {
  return { A: 0, B: 0, C: 0, D: 0, E: 0 };
}

export function summarise(
  start: string,
  end: string,
  logs: DayLog[],
  seed: AppSeed,
  states: Map<string, UserItemState>,
  settings: StoredSettings,
): PeriodSummary {
  const minutesByBlock = emptyBlocks();
  let totalMinutes = 0;
  let daysCounted = 0;
  const energies: number[] = [];
  for (const log of logs) {
    if (log.date < start || log.date > end) continue;
    let dayMinutes = 0;
    for (const entry of log.entries) {
      minutesByBlock[entry.block] += entry.minutes;
      dayMinutes += entry.minutes;
    }
    totalMinutes += dayMinutes;
    if (dayMinutes >= settings.core.streak.minMinutes) daysCounted++;
    if (log.energy) energies.push(log.energy);
  }

  const days = Math.round((new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86_400_000) + 1;
  let targetMinutes = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const weekday = new Date(d + 'T00:00:00').getDay();
    for (const block of settings.core.blocks) if (block.days.includes(weekday)) targetMinutes += block.minutes;
  }

  const itemsFinished: string[] = [];
  const shipped: PeriodSummary['shipped'] = { weekly: [], monthly: [], capstone: [] };
  for (const [refId, state] of states) {
    if (state.status !== 'done' || !state.doneAt || state.doneAt < start || state.doneAt > end) continue;
    itemsFinished.push(refId);
    const project = seed.projects.find((p) => p.id === refId);
    if (project) shipped[project.cadence].push(refId);
  }
  itemsFinished.sort();

  return {
    start,
    end,
    totalMinutes,
    targetMinutes,
    minutesByBlock,
    daysCounted,
    days,
    itemsFinished,
    shipped,
    averageEnergy: energies.length ? energies.reduce((a, b) => a + b, 0) / energies.length : null,
  };
}

export function weekRange(date: string, weekStartsOn: 0 | 1): { start: string; end: string } {
  const start = startOfWeek(date, weekStartsOn);
  return { start, end: addDays(start, 6) };
}

export function monthRange(date: string): { start: string; end: string } {
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

/** The weeks from the plan's start (or the first log) to `asOf`, newest first, for the review list. */
export function weeksSoFar(from: string, asOf: string, weekStartsOn: 0 | 1, limit = 26): string[] {
  const out: string[] = [];
  let week = startOfWeek(asOf, weekStartsOn);
  const first = startOfWeek(from, weekStartsOn);
  while (week >= first && out.length < limit) {
    out.push(week);
    week = addDays(week, -7);
  }
  return out;
}

export function monthsSoFar(from: string, asOf: string, limit = 12): string[] {
  const out: string[] = [];
  let month = startOfMonth(asOf);
  const first = startOfMonth(from);
  while (month >= first && out.length < limit) {
    out.push(month);
    month = startOfMonth(addDays(month, -1));
  }
  return out;
}

/** The three prompts of the weekly review, as the brief words them. */
export const WEEKLY_PROMPTS = [
  { key: 'worked', label: 'What worked', placeholder: 'What went well this week, and why.' },
  { key: 'didnt', label: "What didn't", placeholder: 'What got in the way.' },
  { key: 'changes', label: 'What changes next week', placeholder: 'One or two concrete changes.' },
] as const;
