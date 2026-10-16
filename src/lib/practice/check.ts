/**
 * Marking an answer. Everything is read with mathjs, so "7/4", "sqrt(2)/2", "9.81 m/s^2", "2x sin(x)" and
 * "[[1, 2], [3, 4]]" all work. No computer algebra: an expression is right when it agrees with the answer at random
 * points; a vector "up to scale" when it is parallel to the answer.
 */
import { math, toPlain } from './engine.ts';
import type { Plain, RenderedPart, RenderedQuestion } from './engine.ts';
import { chainedAnswer } from './engine.ts';
import { rngFrom } from './rng.ts';

export interface Mark {
  correct: boolean;
  /** A later part marked right because it follows correctly from the user's own wrong earlier answer. */
  followed?: boolean;
  /** Why the input could not be marked, or what is missing: "Add a unit, such as m/s." */
  message?: string;
}

/** Relative 0.1 % or absolute 1e-6, whichever is looser, unless the question sets its own. */
const DEFAULT_TOLERANCE = { rel: 1e-3, abs: 1e-6 };

function within(user: number, answer: number, tolerance: RenderedPart['tolerance']): boolean {
  const t = tolerance ?? DEFAULT_TOLERANCE;
  const abs = t.abs ?? 0;
  const rel = t.rel ?? 0;
  return Math.abs(user - answer) <= Math.max(abs, rel * Math.abs(answer), abs === 0 && rel === 0 ? 1e-9 : 0);
}

const scope = (): Record<string, unknown> => ({ ln: (x: number) => Math.log(x) });

/** Reads a typed number, with or without a unit. Null when it is not a number at all. */
export function readNumber(input: string, units?: string): { value: number } | { message: string } {
  const text = input.trim().replace(/,(?=\d{3}\b)/g, '').replace(/×/g, '*').replace(/−/g, '-');
  if (!text) return { message: 'Type an answer first.' };
  let value: unknown;
  try {
    value = math.evaluate(text, scope());
  } catch {
    return { message: 'That could not be read as a number' + (units ? ' with a unit, such as 12.5 ' + units : '') + '.' };
  }
  if (math.isUnit(value)) {
    if (!units) return { message: 'This answer has no unit: type the number alone.' };
    try {
      return { value: (value as { toNumber(u: string): number }).toNumber(units) };
    } catch {
      return { message: 'That unit does not convert to ' + units + '.' };
    }
  }
  if (units) return { message: 'Add a unit, such as ' + units + '.' };
  const n = typeof value === 'number' ? value : math.isFraction(value) || math.isBigNumber(value) ? Number(value) : NaN;
  if (!Number.isFinite(n)) return { message: 'That could not be read as a number.' };
  return { value: n };
}

/** "1, 2, 3", "(1, 2, 3)" or "[1, 2, 3]". */
export function readVector(input: string): number[] | null {
  const text = input.trim().replace(/^\(|\)$/g, '').replace(/^\[|\]$/g, '');
  if (!text) return null;
  try {
    const value = toPlain(math.evaluate('[' + text + ']', scope()));
    if (!Array.isArray(value)) return null;
    const flat = (value as Plain[]).flat(1) as Plain[];
    const nums = flat.map((x) => (typeof x === 'number' ? x : NaN));
    return nums.every(Number.isFinite) ? nums : null;
  } catch {
    return null;
  }
}

/** "[[1, 2], [3, 4]]", or rows split by ";" with entries by spaces or commas: "1 2; 3 4". */
export function readMatrix(input: string): number[][] | null {
  const text = input.trim();
  if (!text) return null;
  try {
    let value: Plain;
    if (text.startsWith('[[')) value = toPlain(math.evaluate(text, scope()));
    else {
      const rows = text.replace(/^\[|\]$/g, '').split(/;|\n/).map((r) => r.trim()).filter(Boolean);
      value = rows.map((r) => r.split(/[\s,]+/).filter(Boolean).map((x) => toPlain(math.evaluate(x, scope())) as number));
    }
    if (!Array.isArray(value) || !value.every((r) => Array.isArray(r))) return null;
    const m = value as number[][];
    return m.every((r) => r.length === m[0]!.length && r.every((x) => typeof x === 'number' && Number.isFinite(x))) ? m : null;
  } catch {
    return null;
  }
}

function parallel(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  if (a.every((x) => Math.abs(x) < 1e-12) || b.every((x) => Math.abs(x) < 1e-12)) return false;
  const scale = Math.max(...a.map(Math.abs), ...b.map(Math.abs));
  for (let i = 0; i < a.length; i++) {
    for (let j = i + 1; j < a.length; j++) {
      if (Math.abs(a[i]! * b[j]! - a[j]! * b[i]!) > 1e-4 * scale * scale) return false;
    }
  }
  return true;
}

function sameVector(user: number[], answer: number[], part: RenderedPart): boolean {
  if (user.length !== answer.length) return false;
  if (part.upToScale) return parallel(user, answer);
  return user.every((x, i) => within(x, answer[i]!, part.tolerance ?? { abs: 1e-6, rel: 1e-3 }));
}

/** Agreement at random points of the domain; at least four points where both sides are defined. */
export function sameExpression(input: string, answer: string, vars: string[], domain: [number, number] = [-2, 2], seed = 'expr'): boolean | null {
  let user: { evaluate(s: Record<string, unknown>): unknown };
  let ref: { evaluate(s: Record<string, unknown>): unknown };
  try {
    user = math.parse(input.replace(/−/g, '-')).compile();
    ref = math.parse(answer).compile();
  } catch {
    return null;
  }
  const rng = rngFrom(seed + '|' + answer);
  let agreed = 0;
  for (let n = 0; n < 40 && agreed < 8; n++) {
    const point: Record<string, unknown> = scope();
    for (const v of vars) point[v] = domain[0] + rng.next() * (domain[1] - domain[0]);
    let a: unknown;
    let b: unknown;
    try {
      a = user.evaluate({ ...point });
      b = ref.evaluate({ ...point });
    } catch {
      return null;
    }
    if (typeof a !== 'number' || typeof b !== 'number') {
      if (math.isUnit(a) || (typeof a !== 'number' && !math.isComplex(a))) return null;
      continue;
    }
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (Math.abs(a - b) > Math.max(1e-7, 1e-6 * Math.max(Math.abs(a), Math.abs(b)))) return false;
    agreed++;
  }
  return agreed >= 4;
}

/** Marks one part's input against an answer. */
export function markPart(part: RenderedPart, input: string, answer: Plain = part.answer): Mark {
  switch (part.type) {
    case 'mc':
      return { correct: Number(input) === answer };
    case 'numeric':
    case 'estimate': {
      const read = readNumber(input, part.units);
      if ('message' in read) return { correct: false, message: read.message };
      if (part.type === 'estimate') {
        const f = part.factor ?? 2;
        const a = answer as number;
        const ok = a > 0 ? read.value >= a / f && read.value <= a * f : within(read.value, a, { abs: Math.abs(a) });
        return { correct: ok };
      }
      return { correct: within(read.value, answer as number, part.tolerance) };
    }
    case 'vector': {
      const v = readVector(input);
      if (!v) return { correct: false, message: 'Type the entries separated by commas, such as 1, -2, 3.' };
      const a = (Array.isArray(answer) ? (answer as Plain[]).flat(1) : []) as number[];
      return { correct: sameVector(v, a, part) };
    }
    case 'matrix': {
      const m = readMatrix(input);
      if (!m) return { correct: false, message: 'Type the matrix as [[1, 2], [3, 4]], or rows split by ; such as 1 2; 3 4.' };
      const a = answer as number[][];
      if (m.length !== a.length || m[0]!.length !== a[0]!.length) return { correct: false, message: 'The answer is a ' + a.length + ' × ' + a[0]!.length + ' matrix.' };
      return { correct: sameVector(m.flat(), a.flat(), part) };
    }
    case 'expression': {
      const same = sameExpression(input, String(answer), part.vars ?? ['x'], part.domain);
      if (same === null) return { correct: false, message: 'That could not be read as an expression in ' + (part.vars ?? ['x']).join(', ') + '.' };
      return { correct: same };
    }
  }
}

/** The value a user typed for a part, for a later part that builds on it. */
export function valueOf(part: RenderedPart, input: string): unknown {
  if (part.type === 'numeric' || part.type === 'estimate') {
    const read = readNumber(input, part.units);
    return 'value' in read ? read.value : undefined;
  }
  if (part.type === 'vector') return readVector(input) ?? undefined;
  if (part.type === 'matrix') return readMatrix(input) ?? undefined;
  if (part.type === 'mc') return Number(input);
  return undefined;
}

/**
 * Marks every part of a question. A later part that is wrong against the true values is marked right, and
 * flagged, when it is right for the user's own earlier answers.
 */
export function markQuestion(question: RenderedQuestion, inputs: string[]): Mark[] {
  const given: unknown[] = [];
  return question.parts.map((part, i) => {
    let mark = markPart(part, inputs[i] ?? '');
    if (!mark.correct && i > 0 && !mark.message) {
      const alt = chainedAnswer(question, i, given);
      // A wrong earlier answer can make a later one meaningless (a division by zero, a root of a negative): then
      // there is nothing to follow, and the part is simply wrong.
      const usable = alt !== null && !(typeof alt === 'number' && !Number.isFinite(alt)) && !(Array.isArray(alt) && alt.flat().some((x) => typeof x === 'number' && !Number.isFinite(x)));
      if (usable && markPart(part, inputs[i] ?? '', alt).correct) mark = { correct: true, followed: true };
    }
    given.push(valueOf(part, inputs[i] ?? ''));
    return mark;
  });
}
