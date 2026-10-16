/**
 * Turns a question from the bank into what one practice screen shows: parameters drawn from a seed, the prompt and
 * solution with `{{…}}` filled in, the options in a shuffled order, and the correct answer of every part.
 *
 * Expressions are mathjs. That is the only maths library the app carries, and it loads with Practice alone.
 *
 * `{{expr}}`          the value: 7, 0.25, a matrix as a LaTeX bmatrix, a 1D array as a column vector
 * `{{frac: expr}}`    an exact fraction in LaTeX, \frac{3}{4} (an integer stays an integer)
 * `{{signed: expr}}`  with its sign spelled out, for "x {{signed: b}}": "+ 3" or "- 3"
 * `{{tex: expr}}`     the expression itself, params substituted and simplified, as LaTeX: 3 x^{2} - 2 x
 * `{{row: expr}}`     an array as a row, (1, 2, 3)
 */
import { all, create } from 'mathjs';
import type { MathNode } from 'mathjs';
import type { BankQuestion, ParamSpec, Question, QuestionPart } from '../../seed/questions.ts';
import { rngFrom } from './rng.ts';
import type { Rng } from './rng.ts';

export const math = create(all!, { number: 'number', precision: 64 });

export type Scope = Record<string, unknown>;
/** What a param can be drawn as. */
export type ParamValue = number | string;

/** A plain-JSON value: what answers become once mathjs types are unwrapped. */
export type Plain = number | string | boolean | Plain[];

export function toPlain(value: unknown): Plain {
  if (math.isMatrix(value)) return toPlain((value as { toArray(): unknown[] }).toArray());
  if (Array.isArray(value)) return value.map(toPlain);
  if (math.isFraction(value)) return math.number(value as never) as number;
  if (math.isBigNumber(value)) return (value as { toNumber(): number }).toNumber();
  if (math.isUnit(value)) return String(value);
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value;
  return String(value);
}

/* ------------------------------------------------------------------ drawing params */

function drawOne(spec: ParamSpec, rng: Rng): ParamValue {
  if ('int' in spec) {
    const [lo, hi] = spec.int;
    const allowed: number[] = [];
    for (let v = lo; v <= hi; v++) if (!spec.not?.includes(v)) allowed.push(v);
    if (allowed.length === 0) throw new Error('no integer in [' + lo + ', ' + hi + '] is allowed');
    return rng.pick(allowed);
  }
  if ('real' in spec) {
    const step = spec.step ?? 0.1;
    const [lo, hi] = spec.real;
    const steps = Math.floor((hi - lo) / step + 1e-9);
    const decimals = (String(step).split('.')[1] ?? '').length + (String(lo).split('.')[1] ?? '').length;
    return Number((lo + rng.int(0, steps) * step).toFixed(Math.min(10, decimals)));
  }
  return rng.pick(spec.choice);
}

export class TemplateError extends Error {}

/**
 * Draws the params of a template and computes its `let` values, retrying until every `require` holds. A fixed
 * question gets an empty scope. Throws a TemplateError when 2,000 draws never satisfy the constraints.
 */
export function drawScope(question: Question, rng: Rng): { params: Record<string, ParamValue>; scope: Scope } {
  if (!question.params) return { params: {}, scope: {} };
  for (let attempt = 0; attempt < 2000; attempt++) {
    const params: Record<string, ParamValue> = {};
    for (const [name, spec] of Object.entries(question.params)) params[name] = drawOne(spec, rng);
    const scope: Scope = { ...params };
    let ok = true;
    try {
      for (const [name, expr] of Object.entries(question.let ?? {})) scope[name] = evaluate(expr, scope);
      for (const condition of question.require ?? []) {
        if (!truthy(math.evaluate(condition, { ...scope }))) {
          ok = false;
          break;
        }
      }
    } catch {
      ok = false;
    }
    if (ok) return { params, scope };
  }
  throw new TemplateError(question.id + ': no draw met the constraints in 2000 tries');
}

function truthy(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return Boolean(v);
}

/** Evaluates an expression (or passes a number through) in a copy of the scope, so mathjs cannot add names to it. */
export function evaluate(expr: number | string, scope: Scope): unknown {
  if (typeof expr === 'number') return expr;
  return math.evaluate(expr, { ...scope });
}

/* ------------------------------------------------------------------ text */

function trimNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  if (!Number.isFinite(n)) return String(n);
  const s = math.format(n, { precision: 6 });
  return s.includes('e') ? s : s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

function texOfValue(value: unknown): string {
  const plain = toPlain(value);
  if (Array.isArray(plain)) {
    const rows = Array.isArray(plain[0]) ? (plain as Plain[][]) : (plain as Plain[]).map((x) => [x]);
    return '\\begin{bmatrix}' + rows.map((r) => r.map((x) => formatValue(x)).join(' & ')).join(' \\\\ ') + '\\end{bmatrix}';
  }
  return formatValue(plain);
}

export function formatValue(value: unknown): string {
  const plain = toPlain(value);
  if (typeof plain === 'number') return trimNumber(plain);
  if (Array.isArray(plain)) return texOfValue(plain);
  return String(plain);
}

/** Substitutes the scope's numbers into an expression and returns the tree, for `tex:` and expression answers. */
export function substitute(expr: string, scope: Scope, keep: readonly string[] = []): MathNode {
  const node = math.parse(expr);
  return node.transform((n) => {
    if (math.isSymbolNode(n) && !keep.includes(n.name) && Object.hasOwn(scope, n.name)) {
      const v = toPlain(scope[n.name]);
      if (typeof v === 'number') return v < 0 ? new math.ParenthesisNode(new math.ConstantNode(v)) : new math.ConstantNode(v);
    }
    return n;
  });
}

function fracTex(value: unknown): string {
  const n = toPlain(value);
  if (typeof n !== 'number') return formatValue(n);
  if (Number.isInteger(n)) return String(n);
  const f = math.fraction(n);
  const sign = Number(f.s) < 0 ? '-' : '';
  return sign + '\\frac{' + String(f.n) + '}{' + String(f.d) + '}';
}

/** Fills every `{{…}}` in a piece of Markdown. */
export function render(text: string, scope: Scope): string {
  if (!text.includes('{{')) return text;
  return text.replace(/\{\{\s*([\s\S]+?)\s*\}\}/g, (_, inner: string) => {
    const m = /^(frac|signed|tex|row):\s*([\s\S]+)$/.exec(inner);
    const mode = m?.[1];
    const expr = m ? m[2]! : inner;
    if (mode === 'tex') return math.simplify(substitute(expr, scope)).toTex({ parenthesis: 'auto', implicit: 'hide' }).replace(/\\cdot\s*/g, ' ');
    const value = evaluate(expr, scope);
    if (mode === 'frac') return fracTex(value);
    if (mode === 'signed') {
      const n = toPlain(value) as number;
      return (n < 0 ? '- ' : '+ ') + trimNumber(Math.abs(n));
    }
    if (mode === 'row') return '(' + (toPlain(value) as Plain[]).map(formatValue).join(', ') + ')';
    return formatValue(value);
  });
}

/* ------------------------------------------------------------------ answers */

/**
 * The correct answer of a question or part, in the scope of its draw:
 *   mc        the index of the correct option (in the order written)
 *   numeric   a number (in `units` when the question has them)
 *   vector    a 1D array; matrix: a 2D array
 *   expression the answer with params substituted, as a mathjs string over `vars`
 */
export function correctAnswer(part: Pick<QuestionPart, 'type' | 'answer' | 'vars'>, scope: Scope): Plain {
  if (part.answer === undefined) throw new TemplateError('no answer');
  if (part.type === 'mc') return typeof part.answer === 'number' ? part.answer : (toPlain(evaluate(part.answer, scope)) as number);
  if (part.type === 'expression') return substitute(String(part.answer), scope, part.vars ?? []).toString();
  return toPlain(evaluate(part.answer, scope));
}

export interface RenderedPart {
  prompt: string;
  type: QuestionPart['type'];
  /** For mc: the options in the order shown, and which one is right in that order. */
  options?: string[];
  answer: Plain;
  tolerance?: QuestionPart['tolerance'];
  units?: string;
  vars?: string[];
  domain?: [number, number];
  upToScale?: boolean;
  factor?: number;
}

export interface RenderedQuestion {
  id: string;
  subject: string;
  topic: string;
  type: Question['type'];
  difficulty: number;
  prompt: string;
  /** One for every question but multipart, which has one per part; a proof has none. */
  parts: RenderedPart[];
  hints: string[];
  solution: string;
  estMinutes: number;
  params: Record<string, ParamValue>;
  /** Kept so a chained part can be re-marked against the user's own earlier answers. */
  scope: Scope;
  /** The source question: chained parts are re-evaluated from it. */
  source: BankQuestion;
}

function renderPart(part: QuestionPart, scope: Scope, rng: Rng, index: number): RenderedPart {
  const out: RenderedPart = { prompt: render(part.prompt, scope), type: part.type, answer: correctAnswer(part, scope) };
  if (part.type === 'mc' && part.options) {
    const order = rng.shuffle(part.options.map((_, i) => i));
    out.options = order.map((i) => render(part.options![i]!, scope));
    out.answer = order.indexOf(out.answer as number);
  }
  if (part.tolerance) out.tolerance = part.tolerance;
  if (part.units) out.units = part.units;
  if (part.vars) out.vars = part.vars;
  if (part.domain) out.domain = part.domain;
  if (part.upToScale) out.upToScale = true;
  if (part.factor !== undefined) out.factor = part.factor;
  // The value of this part, for later parts that build on it.
  scope['part' + (index + 1)] = part.type === 'mc' ? (part.answer as number) : evaluateForChain(part, scope);
  return out;
}

function evaluateForChain(part: QuestionPart, scope: Scope): unknown {
  if (part.type === 'expression') return undefined;
  return evaluate(part.answer!, scope);
}

/** The parts of a question, a single question being one part with its own fields. */
export function partsOf(question: Question): QuestionPart[] {
  if (question.type === 'proof') return [];
  if (question.type === 'multipart') return question.parts ?? [];
  return [{ ...question, type: question.type } as QuestionPart];
}

/** Draws and renders one question. `seed` makes it repeatable: the same seed gives the same screen. */
export function instantiate(question: BankQuestion, seed: string): RenderedQuestion {
  const rng = rngFrom(seed + '|' + question.id);
  const { params, scope } = drawScope(question, rng);
  const parts = partsOf(question).map((part, i) => renderPart(part, scope, rng, i));
  return {
    id: question.id,
    subject: question.subject,
    topic: question.topic,
    type: question.type,
    difficulty: question.difficulty,
    prompt: render(question.prompt, scope),
    parts,
    hints: question.hints.map((h) => render(h, scope)),
    solution: render(question.solution, scope),
    estMinutes: question.estMinutes,
    params,
    scope,
    source: question,
  };
}

/**
 * The answer a chained part should have if the earlier parts were what the user said. `given` holds the user's
 * values for parts 1..n-1. Null when the part does not depend on them (or they cannot be read).
 */
export function chainedAnswer(question: RenderedQuestion, partIndex: number, given: unknown[]): Plain | null {
  const part = partsOf(question.source)[partIndex];
  if (!part || typeof part.answer !== 'string' || !/\bpart\d\b/.test(part.answer)) return null;
  const scope: Scope = { ...question.scope };
  given.forEach((value, i) => {
    if (value !== undefined && value !== null) scope['part' + (i + 1)] = value;
  });
  try {
    return correctAnswer(part, scope);
  } catch {
    return null;
  }
}
