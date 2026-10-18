/**
 * The fixed daily schedule read against the clock (DAILY-SCHEDULE): which block is Now, when the day is on its
 * break, when it is done, where Later today's break falls, and when a running timer should offer to move on.
 * Pure: Today passes the day's placed blocks (src/lib/calendar.ts, dayLayout) and the minute of the day.
 */
export interface Slot {
  id: string;
  /** Minutes since midnight. */
  start: number;
  minutes: number;
}

/** A gap this long between two blocks is a break (12:00–18:00); a shorter one is just the walk to the next block. */
export const BREAK_MINUTES = 60;

export type ClockNow = { kind: 'block'; id: string } | { kind: 'break'; from: number; until: number; next: string } | { kind: 'done'; at: number } | { kind: 'empty' };

const ordered = (slots: readonly Slot[]): Slot[] => [...slots].sort((a, b) => a.start - b.start);

/**
 * Now, by the clock: the block whose window holds `minute`; before the first block, the first; in a break of an hour
 * or more, the break with the block after it; in a shorter gap, the next block; after the last, the day is done.
 */
export function clockNow(slots: readonly Slot[], minute: number): ClockNow {
  const list = ordered(slots);
  if (list.length === 0) return { kind: 'empty' };
  if (minute < list[0]!.start) return { kind: 'block', id: list[0]!.id };
  for (const [i, slot] of list.entries()) {
    const end = slot.start + slot.minutes;
    if (minute < end && minute >= slot.start) return { kind: 'block', id: slot.id };
    const next = list[i + 1];
    if (next && minute >= end && minute < next.start) {
      return next.start - end >= BREAK_MINUTES ? { kind: 'break', from: end, until: next.start, next: next.id } : { kind: 'block', id: next.id };
    }
  }
  const last = list.at(-1)!;
  return { kind: 'done', at: last.start + last.minutes };
}

/** The breaks of the day (gaps of an hour or more), each placed after the block it follows: Later today's divider. */
export function breaksOf(slots: readonly Slot[]): { after: string; from: number; until: number }[] {
  const list = ordered(slots);
  const out: { after: string; from: number; until: number }[] = [];
  for (let i = 0; i + 1 < list.length; i++) {
    const end = list[i]!.start + list[i]!.minutes;
    if (list[i + 1]!.start - end >= BREAK_MINUTES) out.push({ after: list[i]!.id, from: end, until: list[i + 1]!.start });
  }
  return out;
}

export interface SwitchPrompt {
  /** The block whose time is up and whose timer still runs. */
  from: string;
  /** The block that starts now, or null when the day's last block has ended. */
  to: string | null;
  /** The minute the running block ended: what "Keep going" is remembered against. */
  at: number;
}

/**
 * When a running timer's block has ended and the next one starts right then (08:00, 10:00, 20:00), or the day's last
 * block has ended (22:00): a quiet offer to move on. Nothing at a break (12:00), nothing before the end, and nothing
 * once "Keep going" was chosen for that end.
 */
export function switchPrompt(slots: readonly Slot[], runningBlock: string | null | undefined, minute: number, dismissed: ReadonlySet<string> = new Set()): SwitchPrompt | null {
  if (!runningBlock) return null;
  const list = ordered(slots);
  const i = list.findIndex((s) => s.id === runningBlock);
  if (i < 0) return null;
  const end = list[i]!.start + list[i]!.minutes;
  if (minute < end || dismissed.has(runningBlock + '@' + end)) return null;
  const next = list[i + 1];
  if (!next) return { from: runningBlock, to: null, at: end };
  if (next.start !== end || minute >= next.start + next.minutes) return null;
  return { from: runningBlock, to: next.id, at: end };
}

/** "06:00" from minutes since midnight. */
function clockOf(minute: number): string {
  const m = ((minute % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

/** A block's window, "06:00–08:00": an en dash, no spaces (SCHEDULE-TIMES). */
export function formatWindow(start: number, minutes: number): string {
  return clockOf(start) + '–' + clockOf(start + minutes);
}

export interface DaySession {
  /** 1, 2, …: the sessions in the order of the day, split by the breaks. */
  number: number;
  from: number;
  until: number;
  /** Its blocks still to come today (not Now, not done, not over), in order. */
  upcoming: string[];
}

export interface DayGroups {
  sessions: DaySession[];
  /** The break before each session but the first that is still ahead (at the minute given). */
  breaks: { before: number; from: number; until: number }[];
  /** Blocks whose window is over and that are not done: "Earlier · not finished". */
  earlier: string[];
  /** Blocks done today, in the order of the day. */
  done: string[];
}

/**
 * Today's blocks grouped against the clock (SCHEDULE-TIMES): each session's blocks still to come, the breaks between
 * sessions that are still ahead, the blocks whose window passed unfinished, and the blocks done. `now` (the Now card's
 * block) is in none of the first three; a done block is only in `done`, whatever the time.
 */
export function groupDay(slots: readonly Slot[], minute: number, now: string | null, isDone: (id: string) => boolean): DayGroups {
  const list = ordered(slots);
  const sessions: DaySession[] = [];
  const breaks: DayGroups['breaks'] = [];
  const earlier: string[] = [];
  const done: string[] = [];
  for (const [i, slot] of list.entries()) {
    const prev = list[i - 1];
    const end = slot.start + slot.minutes;
    const gap = prev ? slot.start - (prev.start + prev.minutes) : 0;
    if (!prev || gap >= BREAK_MINUTES) {
      if (prev && minute < slot.start - gap) breaks.push({ before: sessions.length + 1, from: prev.start + prev.minutes, until: slot.start });
      sessions.push({ number: sessions.length + 1, from: slot.start, until: end, upcoming: [] });
    }
    const session = sessions.at(-1)!;
    session.until = Math.max(session.until, end);
    if (isDone(slot.id)) done.push(slot.id);
    else if (slot.id === now) continue;
    else if (end <= minute) earlier.push(slot.id);
    else session.upcoming.push(slot.id);
  }
  return { sessions, breaks, earlier, done };
}
