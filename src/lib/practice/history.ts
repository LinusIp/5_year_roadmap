/**
 * What the practice log means: which questions come back for review and when, each topic's rating, whether a
 * topic is done, and which roadmap nodes a topic has earned. All of it is worked out from the answers, so it
 * merges across devices with the answers themselves.
 *
 * Pure. Answers are processed in date order, then by id.
 */
import type { PracticeAnswer } from '../../db/types.ts';
import type { PracticeSubject } from '../../seed/questions.ts';
import { addDays } from '../dates.ts';

/** Days until a missed question returns, step by step: a miss starts at 1; each right review steps forward. */
export const INTERVALS = [1, 3, 7, 21, 60] as const;
/** A topic is done after this many questions at this accuracy or better (over the last that many). */
export const TOPIC_DONE = { count: 15, accuracy: 0.8 };
/** A topic's roadmap nodes tick at this accuracy over its last 20 answers. */
export const NODE_TICK = { count: 20, accuracy: 0.85 };
export const START_RATING = 1200;

export function ordered(answers: readonly PracticeAnswer[]): PracticeAnswer[] {
  return [...answers].sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));
}

export function score(a: Pick<PracticeAnswer, 'result' | 'revealed'>): number {
  if (a.revealed) return 0;
  return a.result === 'right' ? 1 : a.result === 'partial' ? 0.5 : 0;
}

export interface ReviewItem {
  questionId: string;
  subject: string;
  topic: string;
  /** The day it is due. */
  due: string;
  /** Index into INTERVALS of the interval it is on. */
  step: number;
}

/**
 * The review queue: every question missed and not yet stepped all the way through the intervals. A miss (or a
 * partial answer, or a revealed solution) puts a question on 1 day; each right answer after that steps it to 3, 7,
 * 21 and 60 days, then it leaves the queue. A question answered right the first time never enters it.
 */
export function reviewQueue(answers: readonly PracticeAnswer[], before?: string): Map<string, ReviewItem> {
  const queue = new Map<string, ReviewItem>();
  for (const a of ordered(answers)) {
    if (before && a.date >= before) continue;
    const item = queue.get(a.questionId);
    if (score(a) < 1) {
      queue.set(a.questionId, { questionId: a.questionId, subject: a.subject, topic: a.topic, due: addDays(a.date, INTERVALS[0]), step: 0 });
    } else if (item) {
      const step = item.step + 1;
      if (step >= INTERVALS.length) queue.delete(a.questionId);
      else queue.set(a.questionId, { ...item, due: addDays(a.date, INTERVALS[step]!), step });
    }
  }
  return queue;
}

/** A question's difficulty as an Elo rating: difficulty 1 is 1050, 5 is 1650. */
export function questionRating(difficulty: number): number {
  return 900 + 150 * difficulty;
}

/** The difficulty level a rating sits at, 1 to 5 (the starting 1200 is level 2). */
export function levelOf(rating: number): number {
  return Math.max(1, Math.min(5, Math.round((rating - 900) / 150)));
}

/** Each topic's Elo rating ("subject/topic"), moved by every answer: K = 32 against the question's rating. */
export function topicRatings(answers: readonly PracticeAnswer[], before?: string): Map<string, number> {
  const ratings = new Map<string, number>();
  for (const a of ordered(answers)) {
    if (before && a.date >= before) continue;
    const key = a.subject + '/' + a.topic;
    const r = ratings.get(key) ?? START_RATING;
    const expected = 1 / (1 + 10 ** ((questionRating(a.difficulty) - r) / 400));
    ratings.set(key, r + 32 * (score(a) - expected));
  }
  return ratings;
}

/** Accuracy over a topic's last `count` answers, and how many there were. */
export function recentAccuracy(answers: readonly PracticeAnswer[], subject: string, topic: string, count: number, before?: string): { accuracy: number; n: number } {
  const mine = ordered(answers).filter((a) => a.subject === subject && a.topic === topic && (!before || a.date < before));
  const last = mine.slice(-count);
  if (last.length === 0) return { accuracy: 0, n: 0 };
  return { accuracy: last.reduce((s, a) => s + score(a), 0) / last.length, n: last.length };
}

export function topicDone(answers: readonly PracticeAnswer[], subject: string, topic: string, before?: string): boolean {
  const { accuracy, n } = recentAccuracy(answers, subject, topic, TOPIC_DONE.count, before);
  return n >= TOPIC_DONE.count && accuracy >= TOPIC_DONE.accuracy;
}

/** Roadmap nodes earned by practice: a topic at 85 % or better over its last 20 answers ticks what it covers. */
export function practiceNodes(subjects: readonly PracticeSubject[], answers: readonly PracticeAnswer[]): Set<string> {
  const nodes = new Set<string>();
  for (const s of subjects) {
    for (const t of s.topics) {
      if (!t.covers?.length) continue;
      const { accuracy, n } = recentAccuracy(answers, s.id, t.id, NODE_TICK.count);
      if (n >= NODE_TICK.count && accuracy >= NODE_TICK.accuracy) for (const c of t.covers) nodes.add(c);
    }
  }
  return nodes;
}

export interface TopicStat {
  subject: string;
  topic: string;
  answered: number;
  accuracy: number;
  rating: number;
  done: boolean;
}

/** Per-topic numbers for Activity › Practice. */
export function topicStats(subjects: readonly PracticeSubject[], answers: readonly PracticeAnswer[]): TopicStat[] {
  const ratings = topicRatings(answers);
  const out: TopicStat[] = [];
  for (const s of subjects) {
    for (const t of s.topics) {
      const mine = answers.filter((a) => a.subject === s.id && a.topic === t.id);
      out.push({
        subject: s.id,
        topic: t.id,
        answered: mine.length,
        accuracy: mine.length ? mine.reduce((sum, a) => sum + score(a), 0) / mine.length : 0,
        rating: ratings.get(s.id + '/' + t.id) ?? START_RATING,
        done: topicDone(answers, s.id, t.id),
      });
    }
  }
  return out;
}
