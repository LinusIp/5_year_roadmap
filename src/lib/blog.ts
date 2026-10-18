/**
 * The daily blog helper (DAILY-BLOG). The post is written in the user's own blog through Pages CMS, never in Atlas:
 * this works out the day's facts to start from, the outline built from them, the writing streak and when Today
 * reminds. Pure: the screens pass the day log, the ticks and the blog records in.
 */
import type { BlogPost, DayLog } from '../db/types.ts';
import { addDays, daysBetween } from './dates.ts';
import type { Slot } from './clock-plan.ts';

/** The plan's first day: day 1 of "day N". */
export const BLOG_PLAN_START = '2026-09-21';

/** Pages CMS, where the posts are written. The user can paste their posts collection's own link in Settings › Blog. */
export const DEFAULT_EDITOR_LINK = 'https://app.pagescms.org';

/** "day 28" on 18 October 2026: days since the plan started, the first day being day 1. */
export function blogDayNumber(date: string, start: string = BLOG_PLAN_START): number {
  return daysBetween(start, date) + 1;
}

/** Something ticked on the day: a unit or milestone ("Module 3: deployment"), or a whole item finished. */
export interface DayTick {
  refId: string;
  /** What the outline says. */
  label: string;
  /** The block it belongs to, when known (the lane it is planned in, or the block whose time was logged on it). */
  block?: string;
}

export interface BlogBlockFacts {
  id: string;
  name: string;
  minutes: number;
  ticked: string[];
}

export interface BlogFacts {
  blocks: BlogBlockFacts[];
  totalMinutes: number;
}

/**
 * What the day holds, block by block in the order given (the day's own order): the time logged on each and what was
 * ticked in it. Only blocks with time logged are listed; a tick whose block has no time goes with the block of the
 * same item's time, else it is left out of the blocks (the outline is about the day's study).
 */
export function blogFacts(log: DayLog | undefined, blocks: readonly { id: string; name: string }[], ticks: readonly DayTick[]): BlogFacts {
  const minutes = new Map<string, number>();
  const blockOfRef = new Map<string, string>();
  for (const entry of log?.entries ?? []) {
    minutes.set(entry.block, (minutes.get(entry.block) ?? 0) + entry.minutes);
    if (entry.refId && entry.minutes > 0 && !blockOfRef.has(entry.refId)) blockOfRef.set(entry.refId, entry.block);
  }
  const order = [...blocks.map((b) => b.id), ...[...minutes.keys()].filter((id) => !blocks.some((b) => b.id === id))];
  const out: BlogBlockFacts[] = [];
  for (const id of order) {
    const m = minutes.get(id) ?? 0;
    if (m <= 0) continue;
    const ticked = ticks.filter((t) => (blockOfRef.get(t.refId) ?? t.block) === id).map((t) => t.label);
    out.push({ id, name: blocks.find((b) => b.id === id)?.name ?? 'Block ' + id, minutes: m, ticked: [...new Set(ticked)] });
  }
  return { blocks: out, totalMinutes: out.reduce((sum, b) => sum + b.minutes, 0) };
}

/**
 * The Markdown outline to start the post from: one "##" heading per block with its time, the ticked items as
 * bullets, then empty "What I learned:" and "Stuck on:" lines to fill in.
 */
export function blogOutline(facts: BlogFacts, heading: string, span: (minutes: number) => string): string {
  const lines = ['# ' + heading, ''];
  for (const block of facts.blocks) {
    lines.push('## ' + block.name + ' · ' + span(block.minutes), '');
    for (const item of block.ticked) lines.push('- ' + item);
    if (block.ticked.length > 0) lines.push('');
    lines.push('What I learned:', '', 'Stuck on:', '');
  }
  if (facts.blocks.length === 0) lines.push('What I learned:', '', 'Stuck on:', '');
  return lines.join('\n').trimEnd() + '\n';
}

/**
 * Days in a row with a post marked, ending today, or yesterday while today's is still to write. A day with no study
 * logged and no post neither counts nor breaks it (there was nothing to write about); any other day without a post
 * ends it. Undo clears a day's mark, so the day no longer counts.
 */
export function writingStreak(posts: readonly BlogPost[], studied: (date: string) => boolean, today: string, start: string = BLOG_PLAN_START): number {
  const posted = new Set(posts.filter((p) => p.posted).map((p) => p.date));
  let date = posted.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (date >= start) {
    if (posted.has(date)) count++;
    else if (studied(date)) break;
    date = addDays(date, -1);
  }
  return count;
}

/**
 * Whether Today shows "Write today's blog post": not once it is posted; otherwise from the moment the day's last block
 * is marked done or its timer stopped (time logged on it, no timer running on it), or from the end of the last block
 * (22:00), whichever comes first.
 */
export function blogReminderDue(input: { slots: readonly Slot[]; minute: number; log: DayLog | undefined; runningBlock: string | null | undefined; posted: boolean }): boolean {
  if (input.posted || input.slots.length === 0) return false;
  const last = [...input.slots].sort((a, b) => a.start - b.start).at(-1)!;
  if (input.minute >= last.start + last.minutes) return true;
  if (input.log?.doneBlocks?.includes(last.id)) return true;
  const logged = (input.log?.entries ?? []).some((e) => e.block === last.id && e.minutes > 0);
  return logged && input.runningBlock !== last.id;
}
