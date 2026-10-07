import type { Atlas } from '../../hooks/useAtlas.ts';
import { forecastPhase } from '../../lib/forecast.ts';
import type { PhaseForecast } from '../../lib/forecast.ts';
import { buildPlanItemView, laneProgress, phaseProgress } from '../../lib/progress.ts';
import type { PhaseProgress, PlanItemView } from '../../lib/progress.ts';
import { laneCapacity } from '../../lib/replan.ts';
import { activePhase, lane as laneItems } from '../../lib/schedule.ts';
import type { Phase, Unit } from '../../seed/schema.ts';
import { partOf, unitShort } from '../parts/text.ts';

export interface PhaseModel {
  phase: Phase;
  progress: PhaseProgress;
  forecast: PhaseForecast;
}

/** Every phase with its five lanes' progress and the forecast at the current pace. */
export function buildModel(atlas: Atlas, asOf: string): PhaseModel[] {
  const { seed, settings, states, logs } = atlas;
  return seed.phases.map((phase) => {
    const lanes = settings.core.blocks.map((block) => {
      const items = laneItems(seed, phase.id, block.id)
        .map((planItem) => buildPlanItemView(planItem, seed, states))
        .filter((v) => v !== null);
      return laneProgress(block.id, items, laneCapacity(settings, block.id, phase.start, phase.end));
    });
    const progress = phaseProgress(phase.id, lanes);
    return { phase, progress, forecast: forecastPhase({ phase, lanes, logs, settings, asOf }) };
  });
}

/** The phase Plan opens on: the one under way, or the first before the plan starts. */
export function currentPhase(atlas: Atlas, asOf: string): Phase | null {
  return activePhase(asOf, atlas.seed.phases) ?? (asOf < atlas.seed.phases[0]!.start ? atlas.seed.phases[0]! : null);
}

export function isOpenItem(item: PlanItemView): boolean {
  return item.status !== 'done' && item.status !== 'dropped';
}

/** "part 1 of 3", or where the checklist stands: "day 19 of 30". */
export function itemDetail(item: PlanItemView, units: Record<string, Unit[]> | undefined, unitsDone: string[]): string | null {
  const part = partOf(item.title);
  if (part) return part;
  const list = units?.[item.refId];
  if (!list || list.length === 0) return null;
  const done = new Set(unitsDone);
  const next = list.findIndex((u) => !done.has(u.id));
  if (next < 0) return 'all ' + list.length + ' done';
  // "Day 19: …" reads as "day 19 of 30"; a title without a numbered head reads by position.
  const title = list[next]!.title;
  const short = unitShort(title);
  return (short !== title ? short : 'unit ' + (next + 1)) + ' of ' + list.length;
}
