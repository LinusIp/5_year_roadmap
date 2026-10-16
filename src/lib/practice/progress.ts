/**
 * The daily set, subject by subject. The set itself does not change (sets.ts builds it from the date and the
 * answers before it); this is how far each subject of it has got, which subject to offer first, and what a
 * finished subject adds to the day's log.
 *
 * Subjects are done in any order and separately across the day. A subject is finished once every question of it
 * is answered; its minutes go to the Practice block at that moment, once, under `practice:<subject>`. When every
 * subject is finished the block is done.
 *
 * Pure: shared by Practice, Today and the tests.
 */
import type { DayLog, PracticeAnswer } from '../../db/types.ts';
import type { BlockId, TrackId } from '../../seed/schema.ts';
import { addEntry, isBlockDone, toggleBlockDone } from '../logs.ts';
import type { SetSlot } from './sets.ts';

export type SubjectStatus = 'not-started' | 'partial' | 'done';

export interface SubjectProgress {
  subject: string;
  /** The subject's questions, in the order of the set. */
  slots: SetSlot[];
  answered: number;
  total: number;
  status: SubjectStatus;
  /** Index into `slots` of the first question not answered yet; `total` when the subject is finished. */
  next: number;
  /** Seconds spent on the subject's answered questions. */
  seconds: number;
  /** The questions' own estimates, added up and rounded up to five minutes. */
  estMinutes: number;
}

/** The log entry a finished subject writes: one per subject and day. */
export function practiceRef(subject: string): string {
  return 'practice:' + subject;
}

/** Every subject of the set, in the set's order, with its progress in the answers of `setId`. */
export function subjectProgress(slots: readonly SetSlot[], answers: readonly PracticeAnswer[], setId: string): SubjectProgress[] {
  const mine = new Map(answers.filter((a) => a.set === setId).map((a) => [a.questionId, a]));
  const order: string[] = [];
  for (const s of slots) if (!order.includes(s.question.subject)) order.push(s.question.subject);
  return order.map((subject) => {
    const own = slots.filter((s) => s.question.subject === subject);
    const done = own.map((s) => mine.get(s.question.id));
    const answered = done.filter(Boolean).length;
    const next = done.findIndex((a) => !a);
    const minutes = own.reduce((sum, s) => sum + s.question.estMinutes, 0);
    return {
      subject,
      slots: own,
      answered,
      total: own.length,
      status: answered === 0 ? 'not-started' : answered === own.length ? 'done' : 'partial',
      next: next < 0 ? own.length : next,
      seconds: done.reduce((sum, a) => sum + (a?.seconds ?? 0), 0),
      estMinutes: Math.max(5, Math.ceil(minutes / 5) * 5),
    };
  });
}

/** "2 of 3", "done", "not started": a subject's status in words. */
export function statusText(p: Pick<SubjectProgress, 'status' | 'answered' | 'total'>): string {
  if (p.status === 'done') return 'Done';
  if (p.status === 'partial') return p.answered + ' of ' + p.total;
  return 'Not started';
}

/**
 * The subject the start screen offers first: one already begun, then the "Start with" subject of Settings ›
 * Practice, then the first not started in the set's order. Null when every subject is finished. It only suggests:
 * any subject can be opened.
 */
export function suggestedSubject(progress: readonly SubjectProgress[], startWith?: string): string | null {
  const partial = progress.find((p) => p.status === 'partial');
  if (partial) return partial.subject;
  const preferred = startWith ? progress.find((p) => p.subject === startWith && p.status !== 'done') : undefined;
  if (preferred) return preferred.subject;
  return progress.find((p) => p.status !== 'done')?.subject ?? null;
}

export function subjectsDone(progress: readonly SubjectProgress[]): number {
  return progress.filter((p) => p.status === 'done').length;
}

/**
 * The day's log once the finished subjects are in it: each finished subject not logged yet adds its minutes to
 * the Practice block (at least one), on the subject's track; when every subject is finished the block is marked
 * done. Running it again changes nothing, so it can run after every answer.
 */
export function withFinishedSubjects(log: DayLog, progress: readonly SubjectProgress[], block: BlockId, trackOf: (subject: string) => TrackId): DayLog {
  let next = log;
  for (const p of progress) {
    if (p.status !== 'done') continue;
    const ref = practiceRef(p.subject);
    if (next.entries.some((e) => e.block === block && e.refId === ref)) continue;
    next = addEntry(next, { block, track: trackOf(p.subject), minutes: Math.max(1, Math.round(p.seconds / 60)), refId: ref });
  }
  if (progress.length > 0 && progress.every((p) => p.status === 'done') && !isBlockDone(next, block)) next = toggleBlockDone(next, block);
  return next;
}
