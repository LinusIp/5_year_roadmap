/**
 * Choosing the order of today's practice: per-subject progress, resuming mid-subject, minutes logged per subject
 * as each one finishes, the "Start with" suggestion, and a set whose questions do not depend on the order.
 */
import { describe, expect, it } from 'vitest';
import { loadQuestions } from '../../scripts/lib/load-questions.ts';
import type { DayLog, PracticeAnswer } from '../../src/db/types.ts';
import { emptyLog } from '../../src/lib/logs.ts';
import { instantiate } from '../../src/lib/practice/engine.ts';
import { practiceRef, statusText, subjectProgress, subjectsDone, suggestedSubject, withFinishedSubjects } from '../../src/lib/practice/progress.ts';
import { buildDailySet, dailySetId } from '../../src/lib/practice/sets.ts';
import type { SetSlot } from '../../src/lib/practice/sets.ts';
import type { TrackId } from '../../src/seed/schema.ts';

const { bank } = loadQuestions();
if (!bank) throw new Error('the question bank does not load');
const DAY = '2026-10-19';
const SET = dailySetId(DAY);
const slots = buildDailySet({ bank, answers: [], date: DAY, perSubject: 3 });
const trackOf = (subject: string): TrackId => (subject === 'physics' ? 'physics' : 'math');

function answerOf(slot: SetSlot, seconds = 120, date = DAY): PracticeAnswer {
  return { id: SET + '|' + slot.question.id, questionId: slot.question.id, subject: slot.question.subject, topic: slot.question.topic, date, set: SET, role: slot.role, result: 'right', hints: 0, seconds, difficulty: slot.question.difficulty };
}
const of = (subject: string): SetSlot[] => slots.filter((s) => s.question.subject === subject);

describe('per-subject progress', () => {
  it('lists the three subjects in the set’s order, three questions each, none started', () => {
    const progress = subjectProgress(slots, [], SET);
    expect(progress.map((p) => p.subject)).toEqual(['linear-algebra', 'calculus', 'physics']);
    for (const p of progress) {
      expect(p).toMatchObject({ total: 3, answered: 0, status: 'not-started', next: 0 });
      expect(p.estMinutes % 5).toBe(0);
      expect(statusText(p)).toBe('Not started');
    }
  });

  it('counts each subject on its own: physics done, linear algebra two of three, calculus untouched', () => {
    const answers = [...of('physics').map((s) => answerOf(s)), ...of('linear-algebra').slice(0, 2).map((s) => answerOf(s))];
    const progress = subjectProgress(slots, answers, SET);
    const by = Object.fromEntries(progress.map((p) => [p.subject, p]));
    expect(by['physics']).toMatchObject({ status: 'done', answered: 3, next: 3 });
    expect(statusText(by['physics']!)).toBe('Done');
    expect(by['linear-algebra']).toMatchObject({ status: 'partial', answered: 2, next: 2 });
    expect(statusText(by['linear-algebra']!)).toBe('2 of 3');
    expect(by['calculus']).toMatchObject({ status: 'not-started', answered: 0 });
    expect(subjectsDone(progress)).toBe(1);
  });

  it('ignores answers from another set (practice on demand, another day)', () => {
    const other = { ...answerOf(of('calculus')[0]!), set: 'topic:calculus/limits:1' };
    expect(subjectProgress(slots, [other], SET).find((p) => p.subject === 'calculus')!.answered).toBe(0);
  });
});

describe('resuming mid-subject', () => {
  it('resumes at the first question not answered, even when a later one was answered first', () => {
    const calculus = of('calculus');
    const answers = [answerOf(calculus[0]!), answerOf(calculus[2]!)];
    const p = subjectProgress(slots, answers, SET).find((x) => x.subject === 'calculus')!;
    expect(p.status).toBe('partial');
    expect(p.next).toBe(1);
    expect(p.slots[p.next]!.question.id).toBe(calculus[1]!.question.id);
  });

  it('offers the half-done subject first, then "Start with", then the first not started', () => {
    const none = subjectProgress(slots, [], SET);
    expect(suggestedSubject(none)).toBe('linear-algebra');
    expect(suggestedSubject(none, 'physics')).toBe('physics');
    const half = subjectProgress(slots, [answerOf(of('calculus')[0]!)], SET);
    expect(suggestedSubject(half, 'physics')).toBe('calculus');
    const physicsDone = subjectProgress(slots, of('physics').map((s) => answerOf(s)), SET);
    expect(suggestedSubject(physicsDone, 'physics')).toBe('linear-algebra');
    expect(suggestedSubject(subjectProgress(slots, slots.map((s) => answerOf(s)), SET), 'physics')).toBeNull();
  });
});

describe('minutes logged per subject', () => {
  it('a finished subject adds its own minutes to the Practice block, once; the third one marks the block done', () => {
    let log: DayLog = emptyLog(DAY);
    const answers: PracticeAnswer[] = [];
    const finish = (subject: string, seconds: number): void => {
      answers.push(...of(subject).map((s) => answerOf(s, seconds)));
      log = withFinishedSubjects(log, subjectProgress(slots, answers, SET), 'P', trackOf);
    };

    finish('physics', 200);
    expect(log.entries).toEqual([expect.objectContaining({ block: 'P', track: 'physics', minutes: 10, refId: practiceRef('physics') })]);
    expect(log.doneBlocks ?? []).not.toContain('P');

    // Running it again (after any later answer) adds nothing.
    expect(withFinishedSubjects(log, subjectProgress(slots, answers, SET), 'P', trackOf)).toBe(log);

    // Half a subject logs nothing yet.
    answers.push(answerOf(of('calculus')[0]!, 600));
    log = withFinishedSubjects(log, subjectProgress(slots, answers, SET), 'P', trackOf);
    expect(log.entries).toHaveLength(1);

    finish('linear-algebra', 100);
    expect(log.entries.map((e) => [e.refId, e.minutes])).toEqual([
      [practiceRef('physics'), 10],
      [practiceRef('linear-algebra'), 5],
    ]);

    answers.push(...of('calculus').slice(1).map((s) => answerOf(s, 60)));
    log = withFinishedSubjects(log, subjectProgress(slots, answers, SET), 'P', trackOf);
    expect(log.entries.map((e) => [e.refId, e.track, e.minutes])).toEqual([
      [practiceRef('physics'), 'physics', 10],
      [practiceRef('linear-algebra'), 'math', 5],
      [practiceRef('calculus'), 'math', 12],
    ]);
    expect(log.doneBlocks).toEqual(['P']);
    expect(new Set(log.entries.map((e) => e.block))).toEqual(new Set(['P']));
  });

  it('a subject answered in a few seconds still logs a minute', () => {
    const log = withFinishedSubjects(emptyLog(DAY), subjectProgress(slots, of('physics').map((s) => answerOf(s, 5)), SET), 'P', trackOf);
    expect(log.entries[0]!.minutes).toBe(1);
  });
});

describe('the questions do not depend on the order', () => {
  it('the set and every drawn question are the same whichever subject is done first', () => {
    const drawn = (list: SetSlot[]): string[] => list.map((s) => JSON.stringify(instantiate(s.question, SET).parts.map((p) => p.answer)) + instantiate(s.question, SET).prompt);
    const before = drawn(slots);
    // Physics first, then linear algebra: the set is built from answers before today, so today's answers never change it.
    const today = [...of('physics'), ...of('linear-algebra')].map((s) => answerOf(s));
    const again = buildDailySet({ bank, answers: today.filter((a) => a.date < DAY), date: DAY, perSubject: 3 });
    expect(again.map((s) => s.question.id)).toEqual(slots.map((s) => s.question.id));
    expect(drawn(again)).toEqual(before);
    // And each subject's questions come from that subject's own draw: building only one subject's view changes nothing.
    for (const subject of ['physics', 'linear-algebra', 'calculus']) {
      expect(subjectProgress(again, today, SET).find((p) => p.subject === subject)!.slots.map((s) => s.question.id)).toEqual(of(subject).map((s) => s.question.id));
    }
  });
});
