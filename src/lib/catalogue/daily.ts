/**
 * The catalogue's challenges over time: the daily easy challenge in Block B, the weekly medium challenge in Block D,
 * the cycles through each pool ("solve in another language"), and the daily-challenge streak.
 *
 * Everything is worked out from the challenge log (ChallengeEvent), so two devices with the same log agree, and a
 * pick depends only on the date and on what happened before it: solving today's challenge does not change it.
 *
 * Pure.
 */
import type { ChallengeEvent } from '../../db/types.ts';
import type { CatalogueEntry, Difficulty } from '../../seed/catalogue.ts';
import { addDays } from '../dates.ts';
import { rngFrom } from '../practice/rng.ts';

export const SKIPS_PER_DAY = 3;
/** The languages offered, in the order "another language" tries them. */
export const LANGUAGES = ['Python', 'C++', 'C', 'Rust', 'Go'] as const;

export interface Pick {
  challenge: CatalogueEntry;
  /** 0 the first time through the pool, 1 once every challenge is solved, and so on. */
  cycle: number;
  /** Solved today (or this week, for the weekly challenge). */
  solved: boolean;
  /** Skips left today (daily only). */
  skipsLeft: number;
  /** The language to suggest: Block B's, or on a later cycle one this challenge has not been solved in yet. */
  language: string;
  /** "Solve it in another language": a later cycle. */
  anotherLanguage: boolean;
}

/** How many times each challenge has been solved, counting events before `before`. */
export function solveCounts(events: readonly ChallengeEvent[], before?: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of events) if (e.event === 'solved' && (!before || e.date < before)) counts.set(e.challengeId, (counts.get(e.challengeId) ?? 0) + 1);
  return counts;
}

/** The languages a challenge has been solved in. */
export function languagesUsed(events: readonly ChallengeEvent[], challengeId: string): string[] {
  return [...new Set(events.filter((e) => e.event === 'solved' && e.challengeId === challengeId && e.language).map((e) => e.language!))];
}

/** The language a Block B item teaches, from its id or title: learncpp is C++, 30-days-of-python Python. */
export function languageOf(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const t = text.toLowerCase();
  if (/c\+\+|\bcpp\b|learncpp|tour-of-cpp|-cpp\b/.test(t)) return 'C++';
  if (/\brust\b|rustlings|rust-/.test(t)) return 'Rust';
  if (/\bgo\b|golang|tour-of-go|-go-/.test(t)) return 'Go';
  if (/python/.test(t)) return 'Python';
  if (/\bc\b|beej-c|kr-c|modern-c|\bk&r\b/.test(t)) return 'C';
  return undefined;
}

/** The language to suggest: Block B's on the first cycle; later, the first one this challenge was not solved in. */
export function suggestLanguage(blockLanguage: string | undefined, used: readonly string[], cycle: number): string {
  const first = blockLanguage ?? 'Python';
  if (cycle === 0) return first;
  return [first, ...LANGUAGES].find((l) => !used.includes(l)) ?? first;
}

function poolOf(entries: readonly CatalogueEntry[], difficulty: Difficulty): CatalogueEntry[] {
  return entries.filter((e) => e.kind === 'challenge' && e.difficulty === difficulty).sort((a, b) => a.id.localeCompare(b.id));
}

/** The pool for the current cycle: the challenges solved fewest times, and that count. */
function openPool(pool: CatalogueEntry[], counts: Map<string, number>): { open: CatalogueEntry[]; cycle: number } {
  if (pool.length === 0) return { open: [], cycle: 0 };
  const cycle = Math.min(...pool.map((c) => counts.get(c.id) ?? 0));
  return { open: pool.filter((c) => (counts.get(c.id) ?? 0) === cycle), cycle };
}

export interface DailyInput {
  entries: readonly CatalogueEntry[];
  events: readonly ChallengeEvent[];
  date: string;
  /** The language of Block B's current item, when it teaches one. */
  blockLanguage?: string;
}

/**
 * Today's easy challenge, or null when it is hidden for the day or the pool is empty.
 *
 * Topics rotate: the day starts at the topic after the one last solved, and each Skip moves on to the next topic that
 * still has an open challenge. Within a topic the pick is drawn from the open challenges with the date as the seed.
 * A challenge solved today stays today's pick, marked solved.
 */
export function dailyChallenge({ entries, events, date, blockLanguage }: DailyInput): Pick | null {
  const today = events.filter((e) => e.date === date && e.daily);
  if (today.some((e) => e.event === 'hidden')) return null;
  const pool = poolOf(entries, 'easy');
  const counts = solveCounts(events, date);
  const { open, cycle } = openPool(pool, counts);
  const finish = (challenge: CatalogueEntry, solved: boolean, skips: number): Pick => ({
    challenge,
    cycle,
    solved,
    skipsLeft: Math.max(0, SKIPS_PER_DAY - skips),
    language: suggestLanguage(blockLanguage, languagesUsed(events.filter((e) => e.date < date), challenge.id), cycle),
    anotherLanguage: cycle > 0,
  });

  const solvedToday = today.find((e) => e.event === 'solved');
  const skipped = today.filter((e) => e.event === 'skipped');
  if (solvedToday) {
    const challenge = pool.find((c) => c.id === solvedToday.challengeId);
    if (challenge) return finish(challenge, true, skipped.length);
  }
  if (open.length === 0) return null;

  const topics = [...new Set(pool.map((c) => c.group))].sort();
  const lastSolved = events
    .filter((e) => e.event === 'solved' && e.date < date && pool.some((c) => c.id === e.challengeId))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .at(-1);
  const lastTopic = lastSolved ? pool.find((c) => c.id === lastSolved.challengeId)?.group : undefined;
  const start = lastTopic ? (topics.indexOf(lastTopic) + 1) % topics.length : 0;
  const skippedIds = new Set(skipped.map((e) => e.challengeId));
  const openTopics = Array.from({ length: topics.length }, (_, k) => topics[(start + k) % topics.length]!).filter((t) => open.some((c) => c.group === t));
  const skips = Math.min(skipped.length, SKIPS_PER_DAY);
  const topic = openTopics[skips % openTopics.length]!;
  const candidates = open.filter((c) => c.group === topic && !skippedIds.has(c.id));
  const choices = candidates.length > 0 ? candidates : open.filter((c) => !skippedIds.has(c.id));
  if (choices.length === 0) return null;
  const rng = rngFrom('daily|' + date + '|' + cycle + '|' + topic);
  return finish(choices[Math.floor(rng.next() * choices.length)]!, false, skips);
}

/**
 * The week's medium challenge, for Block D's weekly slot: drawn from the open medium challenges with the week as
 * the seed, or the one already solved this week.
 */
export function weeklyChallenge({ entries, events, weekStart, blockLanguage }: { entries: readonly CatalogueEntry[]; events: readonly ChallengeEvent[]; weekStart: string; blockLanguage?: string }): Pick | null {
  const pool = poolOf(entries, 'medium');
  const weekEnd = addDays(weekStart, 7);
  const solvedThisWeek = events.find((e) => e.event === 'solved' && e.date >= weekStart && e.date < weekEnd && pool.some((c) => c.id === e.challengeId));
  const { open, cycle } = openPool(pool, solveCounts(events, weekStart));
  const challenge = solvedThisWeek ? pool.find((c) => c.id === solvedThisWeek.challengeId)! : open.length > 0 ? open[Math.floor(rngFrom('weekly|' + weekStart + '|' + cycle).next() * open.length)]! : null;
  if (!challenge) return null;
  return {
    challenge,
    cycle,
    solved: Boolean(solvedThisWeek),
    skipsLeft: 0,
    language: suggestLanguage(blockLanguage, languagesUsed(events.filter((e) => e.date < weekStart), challenge.id), cycle),
    anotherLanguage: cycle > 0,
  };
}

/** Whether a date is one of the weekly slot's weekdays (0 = Sunday). */
export function isSlotDay(date: string, weeklyDays: readonly number[]): boolean {
  return weeklyDays.includes(new Date(date + 'T12:00:00Z').getUTCDay());
}

/**
 * The daily-challenge streak, kept apart from the study streak: days in a row with the day's challenge solved.
 * Today does not break it before it is solved.
 */
export function challengeStreak(events: readonly ChallengeEvent[], today: string): { current: number; longest: number } {
  const days = new Set(events.filter((e) => e.event === 'solved' && e.daily).map((e) => e.date));
  let current = 0;
  for (let d = days.has(today) ? today : addDays(today, -1); days.has(d); d = addDays(d, -1)) current++;
  let longest = 0;
  for (const d of days) {
    if (days.has(addDays(d, -1))) continue;
    let run = 0;
    for (let x = d; days.has(x); x = addDays(x, 1)) run++;
    longest = Math.max(longest, run);
  }
  return { current, longest };
}

/** A new event's id: unique per day, event and challenge, and the nth such event that day. */
export function eventId(date: string, event: ChallengeEvent['event'], challengeId: string, existing: readonly ChallengeEvent[]): string {
  const base = date + '|' + event + '|' + challengeId;
  const n = existing.filter((e) => e.id.startsWith(base + '|')).length;
  return base + '|' + (n + 1);
}
