/**
 * Reads and validates the practice question bank (data/questions/). Node only: used by `npm run validate:data`, by
 * `npm run verify:questions` and by the Vite plugin that serves the bank to the app as a lazy chunk.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { PracticeSubjectSchema, TopicFileSchema } from '../../src/seed/questions.ts';
import type { BankQuestion, PracticeSubject, QuestionBank } from '../../src/seed/questions.ts';
import { DATA_DIR } from './load-seed.ts';

export interface BankResult {
  bank: QuestionBank | null;
  errors: string[];
  warnings: string[];
  stats: BankStats;
}

export interface BankStats {
  /** Per subject: questions, templates, and per topic the count and the difficulties present. */
  subjects: { id: string; questions: number; templates: number; topics: { id: string; questions: number; difficulties: number[] }[] }[];
}

/** The launch quotas of the practice brief: 200 per subject, 40 % templates, every topic at difficulties 1-4. */
export const QUOTAS = { perSubject: 200, templateShare: 0.4, difficulties: [1, 2, 3, 4] };

function issues(file: string, error: z.ZodError): string[] {
  return error.issues.slice(0, 20).map((i) => file + ': ' + (i.path.join('.') || '(top)') + ' ' + i.message);
}

export function loadQuestions(dataDir: string = DATA_DIR, options: { requireQuotas?: boolean } = {}): BankResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats: BankStats = { subjects: [] };
  const root = join(dataDir, 'questions');
  const topicsFile = join(root, 'topics.yaml');
  if (!existsSync(topicsFile)) return { bank: null, errors: ['data/questions/topics.yaml: file is missing'], warnings, stats };

  const subjectsParsed = z.array(PracticeSubjectSchema).safeParse(parse(readFileSync(topicsFile, 'utf8')));
  if (!subjectsParsed.success) return { bank: null, errors: issues('data/questions/topics.yaml', subjectsParsed.error), warnings, stats };
  const subjects: PracticeSubject[] = subjectsParsed.data;

  const questions: BankQuestion[] = [];
  const seen = new Map<string, string>();
  for (const subject of subjects) {
    const dir = join(root, subject.id);
    const topicIds = new Set(subject.topics.map((t) => t.id));
    const files = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.yaml')).sort() : [];
    const subjectStats = { id: subject.id, questions: 0, templates: 0, topics: subject.topics.map((t) => ({ id: t.id, questions: 0, difficulties: [] as number[] })) };
    for (const name of files) {
      const file = 'data/questions/' + subject.id + '/' + name;
      let raw: unknown;
      try {
        raw = parse(readFileSync(join(dir, name), 'utf8'));
      } catch (err) {
        errors.push(file + ': ' + String(err).split('\n')[0]);
        continue;
      }
      const parsed = TopicFileSchema.safeParse(raw);
      if (!parsed.success) {
        errors.push(...issues(file, parsed.error));
        continue;
      }
      const { subject: subjectId, topic, questions: list } = parsed.data;
      if (subjectId !== subject.id) errors.push(file + ': subject is "' + subjectId + '" but the file is in ' + subject.id + '/');
      if (name !== topic + '.yaml') errors.push(file + ': topic "' + topic + '" must live in ' + topic + '.yaml');
      if (!topicIds.has(topic)) {
        errors.push(file + ': topic "' + topic + '" is not listed for ' + subject.id + ' in topics.yaml');
        continue;
      }
      const topicStats = subjectStats.topics.find((t) => t.id === topic)!;
      for (const q of list) {
        const where = seen.get(q.id);
        if (where) errors.push(file + ': question id "' + q.id + '" is already used in ' + where);
        seen.set(q.id, file);
        questions.push({ ...q, subject: subject.id, topic });
        subjectStats.questions++;
        if (q.params) subjectStats.templates++;
        topicStats.questions++;
        if (!topicStats.difficulties.includes(q.difficulty)) topicStats.difficulties.push(q.difficulty);
      }
    }
    for (const t of subjectStats.topics) t.difficulties.sort();
    stats.subjects.push(subjectStats);

    const quota = (message: string): void => void (options.requireQuotas ? errors : warnings).push(message);
    if (subjectStats.questions < QUOTAS.perSubject) quota(subject.id + ': ' + subjectStats.questions + ' questions, the launch needs ' + QUOTAS.perSubject);
    if (subjectStats.questions > 0 && subjectStats.templates / subjectStats.questions < QUOTAS.templateShare) {
      quota(subject.id + ': ' + Math.round((100 * subjectStats.templates) / subjectStats.questions) + ' % templates, the launch needs ' + QUOTAS.templateShare * 100 + ' %');
    }
    const short = subjectStats.topics
      .map((t) => ({ id: t.id, missing: QUOTAS.difficulties.filter((d) => !t.difficulties.includes(d)) }))
      .filter((t) => t.missing.length > 0);
    if (short.length > 0) {
      quota(subject.id + ': ' + short.length + ' topic' + (short.length === 1 ? '' : 's') + ' without every difficulty 1-4: ' + short.map((t) => t.id + ' (' + t.missing.join(',') + ')').join('; '));
    }
  }
  return { bank: errors.length > 0 ? null : { subjects, questions }, errors, warnings, stats };
}
