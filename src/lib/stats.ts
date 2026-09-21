/**
 * Aggregates for the Stats page. Tracks are grouped into their colour families (eight at most), because
 * sixteen series in one chart cannot be told apart; each family keeps its validated categorical slot.
 */
import type { DayLog, UserItemState } from '../db/types.ts';
import type { AppSeed, Track } from '../seed/schema.ts';
import { addDays, monthKey, startOfMonth } from './dates.ts';
import { itemProgress } from './progress.ts';

export interface Family {
  name: string;
  slot: number;
  tracks: string[];
}

/** Families in slot order: the fixed order that keeps colours in the same place in every chart. */
export function families(tracks: Track[]): Family[] {
  const bySlot = new Map<number, Family>();
  for (const track of tracks) {
    const existing = bySlot.get(track.slot);
    if (existing) existing.tracks.push(track.id);
    else bySlot.set(track.slot, { name: track.family, slot: track.slot, tracks: [track.id] });
  }
  return [...bySlot.values()].sort((a, b) => a.slot - b.slot);
}

export interface MonthBucket {
  month: string;
  /** Minutes per family slot. */
  bySlot: Record<number, number>;
  total: number;
}

/** Minutes per family per month, from the first month with a log (or `from`) to `to`, oldest first. */
export function hoursByFamilyPerMonth(logs: DayLog[], tracks: Track[], from: string, to: string): MonthBucket[] {
  const slotOf = new Map(tracks.map((t) => [t.id, t.slot]));
  const buckets = new Map<string, MonthBucket>();
  for (let m = startOfMonth(from); m <= to; m = startOfMonth(addDays(m, 32))) {
    buckets.set(monthKey(m), { month: monthKey(m), bySlot: {}, total: 0 });
  }
  for (const log of logs) {
    const bucket = buckets.get(monthKey(log.date));
    if (!bucket) continue;
    for (const entry of log.entries) {
      const slot = slotOf.get(entry.track) ?? 8;
      bucket.bySlot[slot] = (bucket.bySlot[slot] ?? 0) + entry.minutes;
      bucket.total += entry.minutes;
    }
  }
  return [...buckets.values()];
}

export interface YearCompletion {
  year: number;
  plannedHours: number;
  doneHours: number;
  fraction: number;
  itemsDone: number;
  itemsTotal: number;
}

/** How much of each plan year's work is done, by estimated hours. */
export function completionByYear(seed: AppSeed, states: Map<string, UserItemState>): YearCompletion[] {
  return [1, 2, 3, 4, 5].map((year) => {
    const phaseIds = new Set(seed.phases.filter((p) => p.year === year).map((p) => p.id));
    let planned = 0;
    let remaining = 0;
    let itemsDone = 0;
    let itemsTotal = 0;
    for (const item of seed.plan) {
      if (!phaseIds.has(item.phaseId)) continue;
      const refId = item.resourceId ?? item.projectId!;
      const resource = item.resourceId ? seed.resources.find((r) => r.id === item.resourceId) : undefined;
      const project = item.projectId ? seed.projects.find((p) => p.id === item.projectId) : undefined;
      const estHours = item.hours ?? resource?.estHours ?? project?.estHours ?? 0;
      const progress = itemProgress({ refId, estHours, unitCount: resource?.unitCount ?? project?.acceptance.length ?? 0, state: states.get(refId) });
      planned += estHours;
      remaining += progress.remainingHours;
      itemsTotal++;
      if (progress.status === 'done') itemsDone++;
    }
    return { year, plannedHours: planned, doneHours: planned - remaining, fraction: planned > 0 ? (planned - remaining) / planned : 0, itemsDone, itemsTotal };
  });
}

/** A "nice" axis maximum and tick step for a value, so gridlines land on round numbers. */
export function niceScale(max: number, ticks = 4): { max: number; step: number } {
  if (max <= 0) return { max: ticks, step: 1 };
  const rough = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const nice = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;
  const step = nice * magnitude;
  return { max: Math.ceil(max / step) * step, step };
}
