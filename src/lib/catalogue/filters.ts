/**
 * Finding things in the catalogue: the Deck's tier, group and phase-scope chips, and the Library's filters.
 *
 * Pure.
 */
import type { ChallengeEvent, UserItemState } from '../../db/types.ts';
import type { CatalogueCadence, CatalogueEntry, CatalogueKind, Difficulty } from '../../seed/catalogue.ts';
import type { Phase } from '../../seed/schema.ts';

export type Scope = 'phase' | 'earlier' | 'all';

/** Phase position, so "earlier" can compare: y1-p0 < y1-p1 < y2 < … */
function phaseIndex(phases: readonly Phase[], id: string | undefined): number {
  return id ? phases.findIndex((p) => p.id === id) : -1;
}

/**
 * Whether an entry is in scope for the current phase: "This phase" is its own phase, "Earlier" the phases before
 * it, "Everything" any. Challenges belong to no phase and are always in scope.
 */
export function inScope(entry: CatalogueEntry, scope: Scope, phases: readonly Phase[], current: Phase | null): boolean {
  if (scope === 'all' || entry.kind === 'challenge' || !current) return true;
  const at = phaseIndex(phases, entry.phaseId);
  const now = phaseIndex(phases, current.id);
  return scope === 'phase' ? at === now : at >= 0 && at < now;
}

/** Not finished yet: a challenge never solved, a build or case not done or dropped. */
export function isOpenEntry(entry: CatalogueEntry, states: Map<string, UserItemState>, solved: ReadonlySet<string>): boolean {
  if (entry.kind === 'challenge') return !solved.has(entry.id);
  const status = states.get(entry.id)?.status ?? 'todo';
  return status !== 'done' && status !== 'dropped';
}

export function solvedSet(events: readonly ChallengeEvent[]): Set<string> {
  return new Set(events.filter((e) => e.event === 'solved').map((e) => e.challengeId));
}

export interface DeckFilter {
  tier: CatalogueCadence;
  /** A challenge topic or a build or case domain. */
  group?: string | null;
  scope: Scope;
}

/**
 * The Deck's catalogue cards for a tier, group and scope, open ones only, in a stable order. Daily is the easy
 * challenges, Monthly the cases, and Weekly the builds only: taking a weekly card puts it into Block D, which only a
 * build can fill; the week's medium challenge comes with the weekly slot, and every challenge is in the Library.
 */
export function deckEntries(entries: readonly CatalogueEntry[], filter: DeckFilter, ctx: { phases: readonly Phase[]; current: Phase | null; states: Map<string, UserItemState>; solved: ReadonlySet<string> }): CatalogueEntry[] {
  return entries
    .filter((e) => e.cadence === filter.tier && !(filter.tier === 'weekly' && e.kind === 'challenge') && (!filter.group || e.group === filter.group) && inScope(e, filter.scope, ctx.phases, ctx.current) && isOpenEntry(e, ctx.states, ctx.solved))
    .sort((a, b) => (a.kind === b.kind ? a.id.localeCompare(b.id) : a.kind === 'build' || (a.kind === 'case' && b.kind === 'challenge') ? -1 : 1));
}

/** The groups a tier offers, for its chips: topics for challenges, domains for builds and cases. */
export function groupsOf(entries: readonly CatalogueEntry[], tier: CatalogueCadence): string[] {
  return [...new Set(entries.filter((e) => e.cadence === tier && !(tier === 'weekly' && e.kind === 'challenge')).map((e) => e.group))].sort();
}

export const HOUR_BUCKETS = [
  { key: 'short', label: 'Under 1 h', min: 0, max: 1 },
  { key: 'evening', label: '1 to 5 h', min: 1, max: 5 },
  { key: 'week', label: '5 to 20 h', min: 5, max: 20 },
  { key: 'month', label: '20 h or more', min: 20, max: Infinity },
] as const;
export type HourBucket = (typeof HOUR_BUCKETS)[number]['key'];

export interface LibraryFilter {
  /** A catalogue kind, or `curriculum` for the curriculum's own projects. */
  kind?: CatalogueKind | 'curriculum' | null;
  difficulty?: Difficulty | null;
  group?: string | null;
  track?: string | null;
  phaseId?: string | null;
  level?: number | null;
  hours?: HourBucket | null;
}

/** Library › Projects: every filter that is set must match. */
export type Filterable = Pick<CatalogueEntry, 'group' | 'tracks' | 'hours' | 'phaseId' | 'level'> & { kind: CatalogueKind | 'curriculum'; difficulty?: Difficulty };

export function matchesFilter(entry: Filterable, f: LibraryFilter): boolean {
  if (f.kind && entry.kind !== f.kind) return false;
  if (f.difficulty && entry.difficulty !== f.difficulty) return false;
  if (f.group && entry.group !== f.group) return false;
  if (f.track && !entry.tracks.includes(f.track as never)) return false;
  if (f.phaseId && entry.phaseId !== f.phaseId) return false;
  if (f.level && entry.level !== f.level) return false;
  if (f.hours) {
    const bucket = HOUR_BUCKETS.find((b) => b.key === f.hours)!;
    if (entry.hours < bucket.min || entry.hours >= bucket.max) return false;
  }
  return true;
}

/** "arrays" as "Arrays", "systems-networking" as "Systems and networking", "devops-architecture-security" spelled out. */
export function groupLabel(group: string): string {
  const special: Record<string, string> = {
    'systems-networking': 'Systems and networking',
    'devops-architecture-security': 'DevOps, architecture and security',
    'low-level': 'Low level',
    ai: 'AI',
    dp: 'Dynamic programming',
    bst: 'Binary search trees',
    bits: 'Bit manipulation',
  };
  if (special[group]) return special[group];
  const words = group.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const KIND_LABEL: Record<CatalogueKind, string> = { challenge: 'Challenge', build: 'Build', case: 'Case' };
export const TIER_LABEL: Record<CatalogueCadence, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
