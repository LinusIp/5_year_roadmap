/**
 * Daily practice (the brief of 2026-10-16): the set builder, spaced repetition and ratings, the answer checkers,
 * the templates, the roadmap ticks practice earns, and the project tech docs.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadDocs } from '../../scripts/lib/load-docs.ts';
import { loadQuestions } from '../../scripts/lib/load-questions.ts';
import { DATA_DIR, loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import type { PracticeAnswer } from '../../src/db/types.ts';
import { addDays } from '../../src/lib/dates.ts';
import { resolveDay } from '../../src/lib/day-plan.ts';
import { markPart, markQuestion, readNumber, sameExpression } from '../../src/lib/practice/check.ts';
import { correctAnswer, drawScope, instantiate, partsOf, toPlain } from '../../src/lib/practice/engine.ts';
import type { RenderedPart } from '../../src/lib/practice/engine.ts';
import { INTERVALS, levelOf, practiceNodes, questionRating, reviewQueue, START_RATING, topicDone, topicRatings } from '../../src/lib/practice/history.ts';
import { rngFrom } from '../../src/lib/practice/rng.ts';
import { buildDailySet, buildTopicSet, currentTopics, dailySetId } from '../../src/lib/practice/sets.ts';
import { parseDoc, readmeSkeleton } from '../../src/lib/project-doc.ts';
import { projectUnitCount } from '../../src/lib/progress.ts';
import { roadmapCoverage } from '../../src/lib/roadmaps.ts';
import type { BankQuestion } from '../../src/seed/questions.ts';
import { defaultSettings } from '../../src/lib/settings.ts';

const { bank } = loadQuestions();
if (!bank) throw new Error('the question bank does not load');
const DAY = '2026-10-19';

let counter = 0;
function answer(q: BankQuestion, date: string, result: PracticeAnswer['result'], extra: Partial<PracticeAnswer> = {}): PracticeAnswer {
  counter++;
  return { id: 'a' + String(counter).padStart(6, '0'), questionId: q.id, subject: q.subject, topic: q.topic, date, set: dailySetId(date), role: 'new', result, hints: 0, seconds: 60, difficulty: q.difficulty, ...extra };
}
const ofTopic = (subject: string, topic: string): BankQuestion[] => bank.questions.filter((q) => q.subject === subject && q.topic === topic);

describe('the bank', () => {
  it('has at least 200 questions a subject, 40 % of them templates, every topic at difficulties 1 to 4', () => {
    for (const s of bank.subjects) {
      const qs = bank.questions.filter((q) => q.subject === s.id);
      expect(qs.length, s.id).toBeGreaterThanOrEqual(200);
      expect(qs.filter((q) => q.params).length / qs.length, s.id).toBeGreaterThanOrEqual(0.4);
      for (const t of s.topics) {
        const levels = new Set(qs.filter((q) => q.topic === t.id).map((q) => q.difficulty));
        for (const d of [1, 2, 3, 4] as const) expect(levels.has(d), s.id + '/' + t.id + ' difficulty ' + d).toBe(true);
      }
    }
  });

  it('draws every template within its constraints, the same way for the same seed', () => {
    for (const q of bank.questions.filter((x) => x.params)) {
      for (let i = 0; i < 5; i++) {
        // drawScope only returns a draw that meets every `require`, and throws after 2000 tries.
        const { scope } = drawScope(q, rngFrom('t' + i + q.id));
        partsOf(q).forEach((part, k) => {
          const a = correctAnswer(part, scope);
          if (typeof a === 'number') expect(Number.isFinite(a), q.id).toBe(true);
          scope['part' + (k + 1)] = part.type === 'mc' || part.type === 'expression' ? a : toPlain(a);
        });
      }
      expect(instantiate(q, 'same').prompt).toBe(instantiate(q, 'same').prompt);
    }
  });
});

describe('the daily set', () => {
  const input = { bank, answers: [] as PracticeAnswer[], date: DAY, perSubject: 3 };

  it('is the same for the same date and history, and differs from day to day', () => {
    const a = buildDailySet(input).map((s) => s.question.id);
    expect(buildDailySet(input).map((s) => s.question.id)).toEqual(a);
    expect(buildDailySet({ ...input, date: addDays(DAY, 1) }).map((s) => s.question.id)).not.toEqual(a);
  });

  it('runs linear algebra, then calculus, then physics, three each', () => {
    const set = buildDailySet(input);
    expect(set).toHaveLength(9);
    expect(set.map((s) => s.question.subject)).toEqual(['linear-algebra', 'linear-algebra', 'linear-algebra', 'calculus', 'calculus', 'calculus', 'physics', 'physics', 'physics']);
    expect(new Set(set.map((s) => s.question.id)).size).toBe(9);
  });

  it('takes up to five a subject', () => {
    expect(buildDailySet({ ...input, perSubject: 5 })).toHaveLength(15);
  });

  it('is two new and one review once a question is due', () => {
    const missed = buildDailySet(input).find((s) => s.question.subject === 'calculus')!.question;
    const answers = [answer(missed, DAY, 'wrong')];
    const next = buildDailySet({ ...input, answers, date: addDays(DAY, 1) });
    const calculus = next.filter((s) => s.question.subject === 'calculus');
    expect(calculus.map((s) => s.role)).toEqual(['new', 'new', 'review']);
    expect(calculus[2]!.question.id).toBe(missed.id);
  });

  it('ignores answers given on the day itself, so a set does not change while it is answered', () => {
    const set = buildDailySet(input);
    const answers = set.map((s) => answer(s.question, DAY, 'wrong'));
    expect(buildDailySet({ ...input, answers }).map((s) => s.question.id)).toEqual(set.map((s) => s.question.id));
  });

  it('starts at the first topic and moves on once it is done (15 answers at 80 %)', () => {
    const physics = bank.subjects.find((s) => s.id === 'physics')!;
    expect(currentTopics(physics, [], DAY)).toEqual([{ topic: physics.topics[0]!.id, weight: 1 }]);
    const qs = ofTopic('physics', physics.topics[0]!.id);
    const answers = Array.from({ length: 15 }, (_, i) => answer(qs[i % qs.length]!, addDays(DAY, -20 + i), 'right'));
    expect(topicDone(answers, 'physics', physics.topics[0]!.id)).toBe(true);
    expect(currentTopics(physics, answers, DAY)[0]!.topic).toBe(physics.topics[1]!.id);
  });

  it('follows 18.06: linear algebra draws on the lectures reached so far, the latest most', () => {
    const la = bank.subjects.find((s) => s.id === 'linear-algebra')!;
    const units = la.topics.flatMap((t) => t.units ?? []).filter((u, i, all) => all.indexOf(u) === i);
    const topics = currentTopics(la, [], DAY, { units, done: units.slice(0, 3) });
    expect(topics.length).toBeGreaterThan(1);
    const weights = topics.map((t) => t.weight);
    expect(weights).toEqual([...weights].sort((a, b) => a - b));
    const reachable = new Set(la.topics.filter((t) => (t.units ?? []).some((u) => units.indexOf(u) <= 3)).map((t) => t.id));
    for (const t of topics) expect(reachable.has(t.topic), t.topic).toBe(true);
  });

  it('keeps new questions within one level of the topic rating', () => {
    const topic = bank.subjects[0]!.topics[0]!;
    const level = levelOf(START_RATING);
    const picked = buildTopicSet(bank, [], 'linear-algebra', topic.id, 6, 'seed');
    const available = new Set(ofTopic('linear-algebra', topic.id).map((q) => q.difficulty));
    const near = [...available].filter((d) => Math.abs(d - level) <= 1).length > 0;
    if (near) for (const s of picked.slice(0, 3)) expect(Math.abs(s.question.difficulty - level)).toBeLessThanOrEqual(1);
  });

  it('is gone from the schedule after the practice period ends', () => {
    const settings = defaultSettings(loadSeedOrThrow().settings);
    const p = settings.core.blocks.find((b) => b.role === 'practice')?.id ?? 'P';
    expect(resolveDay('2027-01-31', settings).blocks.map((b) => b.id)).toContain(p);
    expect(resolveDay('2027-02-01', settings).blocks.map((b) => b.id)).not.toContain(p);
  });
});

describe('spaced repetition and ratings', () => {
  const q = bank.questions[0]!;

  it('brings a miss back after 1, 3, 7, 21 and 60 days, then lets it go', () => {
    expect([...INTERVALS]).toEqual([1, 3, 7, 21, 60]);
    let date = DAY;
    const answers = [answer(q, date, 'wrong')];
    for (const gap of INTERVALS) {
      const due = reviewQueue(answers).get(q.id)!.due;
      expect(due).toBe(addDays(date, gap));
      date = due;
      answers.push(answer(q, date, 'right'));
    }
    expect(reviewQueue(answers).has(q.id)).toBe(false);
  });

  it('treats a shown solution as a miss, and a later miss restarts at one day', () => {
    const answers = [answer(q, DAY, 'right', { revealed: true })];
    expect(reviewQueue(answers).get(q.id)!.due).toBe(addDays(DAY, 1));
    answers.push(answer(q, addDays(DAY, 1), 'right'), answer(q, addDays(DAY, 4), 'wrong'));
    expect(reviewQueue(answers).get(q.id)).toMatchObject({ step: 0, due: addDays(DAY, 5) });
  });

  it('never queues a question answered right the first time', () => {
    expect(reviewQueue([answer(q, DAY, 'right')]).size).toBe(0);
  });

  it('moves a topic rating by Elo, K = 32, from 1200', () => {
    const hard: BankQuestion = { ...q, difficulty: 4 };
    expect(questionRating(4)).toBe(1500);
    const up = topicRatings([answer(hard, DAY, 'right')]).get(q.subject + '/' + q.topic)!;
    const expected = 1 / (1 + 10 ** ((1500 - 1200) / 400));
    expect(up).toBeCloseTo(1200 + 32 * (1 - expected), 6);
    const down = topicRatings([answer(hard, DAY, 'wrong')]).get(q.subject + '/' + q.topic)!;
    expect(down).toBeLessThan(1200);
    expect(levelOf(1200)).toBe(2);
  });
});

const part = (p: Partial<RenderedPart> & Pick<RenderedPart, 'type' | 'answer'>): RenderedPart => ({ prompt: '', ...p });

describe('checkers', () => {
  it('reads numbers, fractions and units', () => {
    expect(readNumber('7/4')).toEqual({ value: 1.75 });
    expect(markPart(part({ type: 'numeric', answer: 1.75 }), '7/4').correct).toBe(true);
    expect(markPart(part({ type: 'numeric', answer: 0.7071067 }), 'sqrt(2)/2').correct).toBe(true);
    expect(markPart(part({ type: 'numeric', answer: 2.5, units: 'm/s' }), '9 km/h').correct).toBe(true);
    expect(markPart(part({ type: 'numeric', answer: 2.5, units: 'm/s' }), '2.5').message).toMatch(/unit/);
    expect(markPart(part({ type: 'numeric', answer: 2.5 }), 'banana(').message).toBeDefined();
  });

  it('accepts an estimate within its factor', () => {
    const p = part({ type: 'estimate', answer: 1000, factor: 3 });
    expect(markPart(p, '400').correct).toBe(true);
    expect(markPart(p, '200').correct).toBe(false);
  });

  it('marks vectors exactly or up to scale', () => {
    expect(markPart(part({ type: 'vector', answer: [1, -2, 3] }), '1, -2, 3').correct).toBe(true);
    expect(markPart(part({ type: 'vector', answer: [1, -2, 3] }), '(2, -4, 6)').correct).toBe(false);
    expect(markPart(part({ type: 'vector', answer: [1, -2, 3], upToScale: true }), '[-2, 4, -6]').correct).toBe(true);
    expect(markPart(part({ type: 'vector', answer: [1, -2, 3], upToScale: true }), '0, 0, 0').correct).toBe(false);
  });

  it('marks matrices written either way, and says the size when it is wrong', () => {
    const p = part({ type: 'matrix', answer: [[1, 2], [3, 4]] });
    expect(markPart(p, '1 2; 3 4').correct).toBe(true);
    expect(markPart(p, '[[1, 2], [3, 4]]').correct).toBe(true);
    expect(markPart(p, '1 2 3').message).toMatch(/2 × 2/);
  });

  it('marks expressions by agreement at random points', () => {
    expect(sameExpression('2x*sin(x) + x^2*cos(x)', 'x^2*cos(x) + 2*x*sin(x)', ['x'])).toBe(true);
    expect(sameExpression('2x', 'x^2', ['x'])).toBe(false);
    expect(markPart(part({ type: 'expression', answer: 'exp(2*x)/2', vars: ['x'] }), 'e^(2x)/2').correct).toBe(true);
  });

  it('marks multiple choice by the option shown', () => {
    expect(markPart(part({ type: 'mc', answer: 2, options: ['a', 'b', 'c'] }), '2').correct).toBe(true);
    expect(markPart(part({ type: 'mc', answer: 2, options: ['a', 'b', 'c'] }), '1').correct).toBe(false);
  });

  it('follows a wrong earlier part into a chained later part', () => {
    const chained = bank.questions.find((q) => q.type === 'multipart' && partsOf(q).slice(1).some((p) => typeof p.answer === 'string' && /\bpart1\b/.test(p.answer) && p.type === 'numeric') && partsOf(q)[0]!.type === 'numeric');
    expect(chained, 'a chained multipart question').toBeDefined();
    const r = instantiate(chained!, 'chain');
    const k = partsOf(chained!).findIndex((p, i) => i > 0 && typeof p.answer === 'string' && /\bpart1\b/.test(p.answer));
    const wrong = (r.parts[0]!.answer as number) + 1;
    // What part k would be had part 1 been `wrong`.
    const scope = { ...r.scope, part1: wrong };
    const followed = correctAnswer(partsOf(chained!)[k]!, scope);
    if (typeof followed !== 'number' || !Number.isFinite(followed) || Math.abs(followed - (r.parts[k]!.answer as number)) < 1e-6) return;
    const inputs = r.parts.map((p) => String(p.answer));
    inputs[0] = String(wrong);
    inputs[k] = String(followed) + (r.parts[k]!.units ? ' ' + r.parts[k]!.units : '');
    if (r.parts[0]!.units) inputs[0] += ' ' + r.parts[0]!.units;
    const marks = markQuestion(r, inputs);
    expect(marks[0]!.correct).toBe(false);
    expect(marks[k]).toMatchObject({ correct: true, followed: true });
  });
});

describe('roadmap ticks from practice', () => {
  const topic = bank.subjects.flatMap((s) => s.topics.map((t) => ({ s, t }))).find((x) => (x.t.covers ?? []).length > 0)!;
  const qs = ofTopic(topic.s.id, topic.t.id);
  const run = (right: number): PracticeAnswer[] => Array.from({ length: 20 }, (_, i) => answer(qs[i % qs.length]!, addDays(DAY, i), i < right ? 'right' : 'wrong'));

  it('ticks a topic’s nodes at 85 % over its last 20 answers, and not below', () => {
    expect(practiceNodes(bank.subjects, run(17)).has(topic.t.covers![0]!)).toBe(true);
    expect(practiceNodes(bank.subjects, run(16)).has(topic.t.covers![0]!)).toBe(false);
    expect(practiceNodes(bank.subjects, run(20).slice(0, 19)).size).toBe(0);
  });

  it('shows them as covered by Practice on the roadmap', () => {
    const seed = loadSeedOrThrow();
    const nodes = practiceNodes(bank.subjects, run(20));
    const coverage = roadmapCoverage(seed as never, new Map(), [], nodes);
    const [roadmapId, nodeId] = topic.t.covers![0]!.split('/') as [string, string];
    const rm = coverage.find((c) => c.roadmap.id === roadmapId)!;
    expect(rm.checked.has(nodeId)).toBe(true);
    expect(rm.coveredBy.get(nodeId)).toEqual(['Practice']);
  });
});

describe('project tech docs', () => {
  const seed = loadSeedOrThrow();
  const { docs } = loadDocs(seed);
  const exemplar = readFileSync(join(DATA_DIR, 'projects', 'docs', 'm-inference-server.md'), 'utf8');

  it('parse into the template’s sections, with milestones that add up to the project’s hours', () => {
    const { doc, errors } = parseDoc(exemplar);
    expect(errors).toEqual([]);
    expect(doc!.milestones.map((m) => m.id)).toEqual(['milestone-1', 'milestone-2', 'milestone-3', 'milestone-4', 'milestone-5', 'milestone-6']);
    const project = seed.projects.find((p) => p.id === 'm-inference-server')!;
    expect(doc!.milestones.reduce((s, m) => s + m.hours, 0)).toBe(project.estHours);
    expect(Object.keys(docs).length).toBeGreaterThanOrEqual(110);
  });

  it('count their milestones toward the project’s progress', () => {
    const project = seed.projects.find((p) => p.id === 'm-inference-server')!;
    const { doc } = parseDoc(exemplar);
    expect(projectUnitCount({ acceptance: project.acceptance, milestoneCount: doc!.milestones.length })).toBe(project.acceptance.length + 6);
    expect(projectUnitCount(project)).toBe(project.acceptance.length);
  });

  it('turn into a README skeleton: title, goal, architecture, stack, done when, results', () => {
    const md = readmeSkeleton(parseDoc(exemplar).doc!);
    expect(md.startsWith('# Inference server from scratch\n')).toBe(true);
    for (const h of ['## Architecture', '## Stack', '## Done when', '## Results']) expect(md).toContain(h);
  });

  it('report a doc whose milestones do not add up', () => {
    const broken = exemplar.replace('Total 40 h.', 'Total 41 h.');
    expect(parseDoc(broken).errors.join()).toMatch(/add up to 40 h/);
  });
});
