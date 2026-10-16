/**
 * The practice question bank (data/questions/), validated like the rest of the seed. The format is documented for
 * people in data/questions/SCHEMA.md; this file is what enforces it.
 *
 * A question is either fixed or a template. A template declares `params` (drawn from a seed per date), `let`
 * (values computed from them) and `require` (constraints the draw must meet); its prompt, options, answer and
 * solution may then use `{{expression}}` and refer to those names. Answers are mathjs expressions evaluated by the
 * app, and `verify` is an independent SymPy/Python expression that `npm run verify:questions` checks them against.
 */
import { z } from 'zod';
import { Slug, Text, TrackIdSchema } from './schema.ts';

export const QUESTION_TYPES = ['mc', 'numeric', 'expression', 'vector', 'matrix', 'multipart', 'proof', 'estimate'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** A name a template can use: a param or a let value. */
const Name = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'must be an identifier: a letter, then letters, digits or _');

/** An expression the app evaluates with mathjs: a number, or a string such as "a*d - b*c". */
const Expr = z.union([z.number(), z.string().trim().min(1)]);

export const ParamSchema = z.union([
  /** An integer drawn uniformly from [lo, hi], skipping any value in `not`. */
  z.strictObject({ int: z.tuple([z.number().int(), z.number().int()]), not: z.array(z.number()).optional() }),
  /** A decimal in [lo, hi] on a grid of `step` (default 0.1). */
  z.strictObject({ real: z.tuple([z.number(), z.number()]), step: z.number().positive().optional() }),
  /** One of a list of values. */
  z.strictObject({ choice: z.array(z.union([z.number(), z.string()])).min(1) }),
]);
export type ParamSpec = z.infer<typeof ParamSchema>;

export const ToleranceSchema = z
  .strictObject({ abs: z.number().nonnegative().optional(), rel: z.number().nonnegative().optional() })
  .refine((t) => t.abs !== undefined || t.rel !== undefined, 'needs abs or rel');
export type Tolerance = z.infer<typeof ToleranceSchema>;

/** The fields that say what a correct answer is. Shared by a question and by each part of a multipart one. */
const answerFields = {
  /** mc: the 0-based index of the correct option, in the order written. Otherwise an expression. */
  answer: Expr.optional(),
  /** mc only: the options, shuffled per set. */
  options: z.array(Text).min(2).max(6).optional(),
  tolerance: ToleranceSchema.optional(),
  /** numeric and estimate: the unit the answer is in ("m/s^2"). The user must give a unit; any compatible one is converted. */
  units: Text.optional(),
  /** expression: the variables of the answer, and the interval random checking points are drawn from. */
  vars: z.array(Name).min(1).optional(),
  domain: z.tuple([z.number(), z.number()]).optional(),
  /** vector and matrix: accept any non-zero multiple (eigenvectors). */
  upToScale: z.boolean().optional(),
  /** estimate: correct within this factor of the answer, either way. */
  factor: z.number().min(1).optional(),
  /** Independent check, a Python expression over the params (SymPy names imported). Required except for proofs. */
  verify: z.string().trim().min(1).optional(),
};

export const PartSchema = z.strictObject({
  prompt: Text,
  type: z.enum(['mc', 'numeric', 'expression', 'vector', 'matrix', 'estimate']),
  ...answerFields,
});
export type QuestionPart = z.infer<typeof PartSchema>;

export const QuestionSchema = z
  .strictObject({
    id: Slug,
    difficulty: z.literal([1, 2, 3, 4, 5]),
    type: z.enum(QUESTION_TYPES),
    /** Markdown with KaTeX ($…$ and $$…$$). */
    prompt: Text,
    params: z.record(Name, ParamSchema).optional(),
    let: z.record(Name, Expr).optional(),
    require: z.array(z.string().trim().min(1)).optional(),
    ...answerFields,
    parts: z.array(PartSchema).min(2).max(4).optional(),
    hints: z.array(Text).min(1).max(3),
    /** Full worked steps, Markdown + KaTeX, optionally an inline <svg> diagram. */
    solution: Text,
    /** Resource unit ids ("mit-18-06/lecture-21") and roadmap nodes ("game-developer/matrix"). */
    covers: z.array(z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/)).default([]),
    source: Text,
    license: Text,
    estMinutes: z.number().min(1).max(30),
  })
  .superRefine((q, ctx) => {
    const issue = (path: string, message: string): void => ctx.addIssue({ code: 'custom', path: [path], message });
    checkAnswerFields(q.type, q, issue);
    if (q.type === 'multipart') {
      if (!q.parts) issue('parts', 'a multipart question needs parts');
      q.parts?.forEach((part, i) => checkAnswerFields(part.type, part, (p, m) => issue('parts', 'part ' + (i + 1) + ': ' + p + ' ' + m)));
    } else if (q.parts) {
      issue('parts', 'only a multipart question has parts');
    }
    if (q.require && !q.params) issue('require', 'needs params');
    if (q.let && !q.params) issue('let', 'needs params');
    const names = [...Object.keys(q.params ?? {}), ...Object.keys(q.let ?? {})];
    if (new Set(names).size !== names.length) issue('let', 'a let name repeats a param name');
  });
export type Question = z.infer<typeof QuestionSchema>;

type AnswerFields = { [K in keyof typeof answerFields]?: z.infer<(typeof answerFields)[K]> };

function checkAnswerFields(type: QuestionType, q: AnswerFields, issue: (path: string, message: string) => void): void {
  if (type === 'proof') {
    if (q.answer !== undefined) issue('answer', 'a proof is self-graded and has no answer');
    return;
  }
  if (type === 'multipart') return;
  if (q.answer === undefined) issue('answer', 'is required for a ' + type + ' question');
  if (q.verify === undefined) issue('verify', 'is required: every answer is machine-checked');
  if (type === 'mc') {
    if (!q.options) issue('options', 'a multiple-choice question needs options');
    else if (typeof q.answer !== 'number' || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) issue('answer', 'must be the index of one of the options');
  } else if (q.options) {
    issue('options', 'only multiple-choice questions have options');
  }
  if (type === 'expression' && !q.vars) issue('vars', 'an expression answer needs its variables');
  if (type !== 'expression' && (q.vars || q.domain)) issue('vars', 'only expression answers have vars and a domain');
  if (type === 'estimate' && q.factor === undefined) issue('factor', 'an estimate needs the factor it must be within');
  if (type !== 'estimate' && q.factor !== undefined) issue('factor', 'only estimates have a factor');
  if (q.upToScale && type !== 'vector' && type !== 'matrix') issue('upToScale', 'only vector and matrix answers can be up to scale');
  if (q.units && type !== 'numeric' && type !== 'estimate') issue('units', 'only numeric answers and estimates have units');
}

/** One file: data/questions/<subject>/<topic>.yaml. */
export const TopicFileSchema = z.strictObject({
  subject: Slug,
  topic: Slug,
  questions: z.array(QuestionSchema).min(1),
});
export type TopicFile = z.infer<typeof TopicFileSchema>;

export const PracticeTopicSchema = z.strictObject({
  id: Slug,
  title: Text,
  /** 18.06 lectures that teach it (unit ids of the subject's `follows` resource). */
  units: z.array(Slug).optional(),
  covers: z.array(z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/)).optional(),
});

export const PracticeSubjectSchema = z.strictObject({
  id: Slug,
  title: Text,
  short: Text,
  level: Text,
  /** A resource whose unit progress steers the subject's new questions (18.06 for linear algebra). */
  follows: Slug.optional(),
  tracks: z.array(TrackIdSchema).min(1),
  topics: z.array(PracticeTopicSchema).min(1),
});
export type PracticeSubject = z.infer<typeof PracticeSubjectSchema>;

/** A question with where it lives, as the app sees it. */
export type BankQuestion = Question & { subject: string; topic: string };

export interface QuestionBank {
  subjects: PracticeSubject[];
  questions: BankQuestion[];
}
