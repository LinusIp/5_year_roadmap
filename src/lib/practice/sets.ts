/**
 * Building practice sets.
 *
 * The daily set: every subject in its order (linear algebra, calculus, physics), each with `perSubject` questions,
 * one of them a review when one is due and the rest new. It depends only on the date and on answers from before
 * that date, so two devices with the same log build the same set, and a set does not change while it is answered.
 *
 * New questions come from the subject's current topic: the first topic not yet done (15 answers at 80 %), or, for a
 * subject that follows a course (linear algebra follows 18.06), from the topics of the lectures reached so far,
 * weighted towards the latest. Within a topic, questions within one level of its rating come first, then the
 * ones never answered, then the ones answered longest ago.
 */
import type { PracticeAnswer } from '../../db/types.ts';
import type { BankQuestion, PracticeSubject, QuestionBank } from '../../seed/questions.ts';
import { levelOf, ordered, reviewQueue, START_RATING, topicDone, topicRatings } from './history.ts';
import { rngFrom } from './rng.ts';
import type { Rng } from './rng.ts';

export interface SetSlot {
  question: BankQuestion;
  role: 'new' | 'review';
}

export interface DailySetInput {
  bank: QuestionBank;
  answers: readonly PracticeAnswer[];
  date: string;
  perSubject: number;
  /** For a subject that follows a course: the course's units in order, and the ids ticked off. */
  follows?: Record<string, { units: string[]; done: string[] }>;
}

function weightedPick<T>(items: T[], weights: number[], rng: Rng): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r < 0) return items[i]!;
  }
  return items.at(-1)!;
}

/** The topics new questions are drawn from today, with their weights. */
export function currentTopics(subject: PracticeSubject, answers: readonly PracticeAnswer[], date: string, follows?: { units: string[]; done: string[] }): { topic: string; weight: number }[] {
  if (follows && follows.done.length > 0) {
    const reached = Math.max(...follows.done.map((u) => follows.units.indexOf(u)));
    const open = subject.topics
      .map((t, i) => ({ t, i, first: Math.min(...(t.units ?? []).map((u) => follows.units.indexOf(u)).filter((n) => n >= 0)) }))
      .filter((x) => Number.isFinite(x.first) && x.first <= reached + 1);
    if (open.length > 0) return open.map((x, k) => ({ topic: x.t.id, weight: (k + 1) ** 2 }));
  }
  const current = subject.topics.find((t) => !topicDone(answers, subject.id, t.id, date)) ?? subject.topics.at(-1)!;
  return [{ topic: current.id, weight: 1 }];
}

/**
 * Picks `n` questions from a topic: within one level of its rating first (the nearest levels when none are),
 * then never answered, then answered longest ago; the rng breaks ties, so the pick is the same for the same seed.
 */
export function pickFromTopic(bank: QuestionBank, answers: readonly PracticeAnswer[], subject: string, topic: string, n: number, rng: Rng, exclude: Set<string>, before?: string): BankQuestion[] {
  const pool = bank.questions.filter((q) => q.subject === subject && q.topic === topic && !exclude.has(q.id));
  if (pool.length === 0) return [];
  const rating = topicRatings(answers, before).get(subject + '/' + topic) ?? START_RATING;
  const level = levelOf(rating);
  const lastSeen = new Map<string, string>();
  for (const a of ordered(answers)) if (!before || a.date < before) lastSeen.set(a.questionId, a.date);
  const shuffled = rng.shuffle(pool);
  const key = (q: BankQuestion): [number, number, string] => [Math.max(0, Math.abs(q.difficulty - level) - 1), lastSeen.has(q.id) ? 1 : 0, lastSeen.get(q.id) ?? ''];
  return [...shuffled]
    .sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2]);
    })
    .slice(0, n);
}

export function buildDailySet({ bank, answers, date, perSubject, follows }: DailySetInput): SetSlot[] {
  const slots: SetSlot[] = [];
  const queue = reviewQueue(answers, date);
  const history = answers.filter((a) => a.date < date);
  for (const subject of bank.subjects) {
    const rng = rngFrom('set|' + date + '|' + subject.id);
    const chosen = new Set<string>();
    const due = [...queue.values()].filter((r) => r.subject === subject.id && r.due <= date).sort((a, b) => a.due.localeCompare(b.due) || a.questionId.localeCompare(b.questionId));
    const review = due.map((r) => bank.questions.find((q) => q.id === r.questionId)).find((q) => q !== undefined);
    const fresh = review ? perSubject - 1 : perSubject;
    const topics = currentTopics(subject, history, date, follows?.[subject.id]);
    const picked: BankQuestion[] = [];
    for (let i = 0; i < fresh * 4 && picked.length < fresh; i++) {
      const topic = weightedPick(topics.map((t) => t.topic), topics.map((t) => t.weight), rng);
      const [q] = pickFromTopic(bank, history, subject.id, topic, 1, rng, new Set([...chosen, ...(review ? [review.id] : [])]), date);
      if (q) {
        picked.push(q);
        chosen.add(q.id);
      }
    }
    // Picked questions keep the topic order; the review comes last in its subject.
    for (const q of picked) slots.push({ question: q, role: 'new' });
    if (review) slots.push({ question: review, role: 'review' });
  }
  return slots;
}

/** Practice on demand, from Library › Practice: `n` questions on one topic. */
export function buildTopicSet(bank: QuestionBank, answers: readonly PracticeAnswer[], subject: string, topic: string, n: number, seed: string): SetSlot[] {
  return pickFromTopic(bank, answers, subject, topic, n, rngFrom('topic|' + seed), new Set()).map((question) => ({ question, role: 'new' as const }));
}

/** The daily set's id, which every answer in it carries. */
export function dailySetId(date: string): string {
  return 'daily:' + date;
}
