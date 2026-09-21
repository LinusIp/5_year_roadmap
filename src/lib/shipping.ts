/**
 * "Every week a mini-build, every month a project, every year a capstone": how well is that holding?
 *
 * A project counts as shipped in the week, month or year of its `doneAt` date. The brief's rule that a
 * project is only done with a repository link means every shipped project here has one.
 */
import type { UserItemState } from '../db/types.ts';
import type { Project } from '../seed/schema.ts';
import { addDays, daysBetween, monthKey, startOfWeek } from './dates.ts';

export interface CadenceAdherence {
  cadence: Project['cadence'];
  /** Periods (weeks, months or plan years) elapsed since the plan started, including the current one. */
  periods: number;
  /** Periods in which at least one project of this cadence was finished. */
  hit: number;
  shipped: number;
  /** Whether the current period already has one. */
  currentHit: boolean;
}

function periodKey(cadence: Project['cadence'], date: string, planStart: string, weekStartsOn: 0 | 1): string {
  if (cadence === 'weekly') return startOfWeek(date, weekStartsOn);
  if (cadence === 'monthly') return monthKey(date);
  // Plan years run from the plan's start date, not calendar years.
  return String(Math.floor(daysBetween(planStart, date) / 365.25));
}

function periodsElapsed(cadence: Project['cadence'], planStart: string, asOf: string, weekStartsOn: 0 | 1): number {
  if (asOf < planStart) return 0;
  if (cadence === 'weekly') return Math.floor(daysBetween(startOfWeek(planStart, weekStartsOn), asOf) / 7) + 1;
  if (cadence === 'monthly') {
    const [y1, m1] = planStart.split('-').map(Number) as [number, number];
    const [y2, m2] = asOf.split('-').map(Number) as [number, number];
    return (y2 - y1) * 12 + (m2 - m1) + 1;
  }
  return Math.floor(daysBetween(planStart, asOf) / 365.25) + 1;
}

export function adherence(
  projects: Project[],
  states: Map<string, UserItemState>,
  cadence: Project['cadence'],
  planStart: string,
  asOf: string,
  weekStartsOn: 0 | 1,
): CadenceAdherence {
  const done = projects
    .filter((p) => p.cadence === cadence)
    .map((p) => states.get(p.id))
    .filter((s): s is UserItemState => s?.status === 'done' && Boolean(s.doneAt) && s.doneAt! >= planStart && s.doneAt! <= asOf);
  const keys = new Set(done.map((s) => periodKey(cadence, s.doneAt!, planStart, weekStartsOn)));
  return {
    cadence,
    periods: periodsElapsed(cadence, planStart, asOf, weekStartsOn),
    hit: keys.size,
    shipped: done.length,
    currentHit: keys.has(periodKey(cadence, asOf, planStart, weekStartsOn)),
  };
}

/** The weeks of the plan so far, oldest first, each with what was shipped in it: the shipping strip. */
export function weeklyStrip(
  projects: Project[],
  states: Map<string, UserItemState>,
  planStart: string,
  asOf: string,
  weekStartsOn: 0 | 1,
  weeks = 12,
): { weekStart: string; shipped: string[] }[] {
  const out: { weekStart: string; shipped: string[] }[] = [];
  const thisWeek = startOfWeek(asOf, weekStartsOn);
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = addDays(thisWeek, -7 * i);
    if (addDays(weekStart, 6) < planStart) continue;
    const weekEnd = addDays(weekStart, 6);
    const shipped = projects
      .filter((p) => p.cadence === 'weekly')
      .filter((p) => {
        const s = states.get(p.id);
        return s?.status === 'done' && s.doneAt !== undefined && s.doneAt >= weekStart && s.doneAt <= weekEnd;
      })
      .map((p) => p.id);
    out.push({ weekStart, shipped });
  }
  return out;
}
