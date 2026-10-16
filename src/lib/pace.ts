/**
 * Pace and catch-up (flexibility brief, section 3).
 *
 * Unfinished planned minutes never pile onto tomorrow. Each lane keeps one figure instead, how far behind (or
 * ahead) it is in the current phase: minutes the schedule planned for it so far against minutes logged to it.
 * Catching up is opt-in and capped: "add up to 30 min a day to this lane until caught up".
 */
import type { DayLog, StoredSettings } from '../db/types.ts';
import type { AppSeed, BlockId, Phase } from '../seed/schema.ts';
import { addDays, daysBetween } from './dates.ts';
import { plannedOver } from './day-plan.ts';

export interface LaneBalance {
  block: BlockId;
  planned: number;
  logged: number;
  /** Positive: behind by this many minutes. Negative: ahead. */
  behind: number;
  /** `behind` in days of the lane's average plan; 0 when it plans nothing. */
  behindDays: number;
}

/** Planned against logged minutes for a lane from `from` to the day before `asOf` (today is still under way). */
export function laneBalance(settings: StoredSettings, logs: DayLog[], block: BlockId, from: string, asOf: string): LaneBalance {
  const to = addDays(asOf, -1);
  const planned = to < from ? 0 : plannedOver(settings, from, to, block);
  let logged = 0;
  for (const log of logs) {
    if (log.date < from || log.date > to) continue;
    for (const e of log.entries) if (e.block === block) logged += e.minutes;
  }
  const behind = planned - logged;
  const days = to < from ? 0 : daysBetween(from, to) + 1;
  const perDay = days > 0 ? planned / days : 0;
  return { block, planned, logged, behind, behindDays: perDay > 0 ? behind / perDay : 0 };
}

/** The balance of every block of the settings, over the phase that holds `asOf` (from its start). */
export function balances(settings: StoredSettings, logs: DayLog[], phase: Phase | null, asOf: string): LaneBalance[] {
  const from = phase ? phase.start : asOf;
  return settings.core.blocks.map((b) => laneBalance(settings, logs, b.id, from, asOf));
}

/** Today's extra minutes for a lane that opted into catch-up: at most the cap, never more than it is behind. */
export function catchUpMinutes(settings: StoredSettings, balance: LaneBalance | undefined): number {
  const cap = balance ? settings.catchUp[balance.block]?.capMinutes : undefined;
  if (!cap || !balance || balance.behind <= 0) return 0;
  return Math.min(cap, Math.round(balance.behind));
}

/** Tracks that stand for a roadmap when an item covers no node: AI is inference's, software architecture's, graphics'. */
const TRACK_PRIORITY: Partial<Record<string, number>> = { ai: 1, swe: 2, systems: 2, graphics: 3, gamedev: 3, simulation: 3 };

/**
 * An item's priority, from the roadmaps it teaches: inference and AI engineering first, then architecture, then
 * graphics (the brief's order, `priority` in data/roadmaps.yaml). Without covered nodes, its tracks stand in;
 * anything else is 4.
 */
export function itemPriority(seed: AppSeed, refId: string): number {
  const ranks = new Map<string, number>(seed.roadmaps.map((r) => [r.id, r.priority]));
  const ref = seed.resources.find((r) => r.id === refId) ?? seed.projects.find((p) => p.id === refId);
  let best = 4;
  for (const node of ref?.covers ?? []) best = Math.min(best, ranks.get(node.split('/')[0]!) ?? 4);
  if (best === 4) for (const t of ref?.tracks ?? []) best = Math.min(best, TRACK_PRIORITY[t] ?? 4);
  return best;
}

/** A lane's priority: the best of its items' in the phase. Lanes with none come after, in block order. */
export function lanePriority(seed: AppSeed, phaseId: string | null, block: BlockId): number {
  let best = 4;
  for (const item of seed.plan) {
    if (item.block !== block || (phaseId && item.phaseId !== phaseId)) continue;
    best = Math.min(best, itemPriority(seed, item.resourceId ?? item.projectId!));
  }
  return best;
}

/** Where a paused lane's minutes go by default: the highest-priority lane that is not itself paused. */
export function defaultPauseTarget(seed: AppSeed, settings: StoredSettings, phaseId: string | null, block: BlockId, date: string): BlockId | 'free' {
  const order = settings.core.blocks.map((b) => b.id);
  const candidates = order.filter((id) => id !== block && !settings.pauses.some((p) => p.block === id && p.from <= date && (p.until === null || date <= p.until)));
  candidates.sort((a, b) => lanePriority(seed, phaseId, a) - lanePriority(seed, phaseId, b) || order.indexOf(a) - order.indexOf(b));
  return candidates[0] ?? 'free';
}

/**
 * The one pace suggestion of the Sunday review: the lane furthest behind, when it is at least a week behind,
 * and how many weeks stretching the current phase would take. Null when nothing is that far behind.
 */
export function paceSuggestion(settings: StoredSettings, logs: DayLog[], phase: Phase | null, asOf: string): { block: BlockId; days: number; weeks: number } | null {
  if (!phase) return null;
  const worst = balances(settings, logs, phase, asOf).sort((a, b) => b.behindDays - a.behindDays)[0];
  if (!worst || worst.behindDays < 7) return null;
  const days = Math.round(worst.behindDays);
  return { block: worst.block, days, weeks: Math.max(1, Math.round(days / 7)) };
}
