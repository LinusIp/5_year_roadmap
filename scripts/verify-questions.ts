/**
 * npm run verify:questions — every answer in the practice bank, machine-checked.
 *
 *   1. Loads and validates data/questions/ (the same checks as validate:data).
 *   2. For each question, draws params the way the app does (200 draws for a template, one for a fixed question),
 *      renders the prompt, options, hints and solution, checks every $…$ with KaTeX, and computes the answer of
 *      every part with the app's own engine.
 *   3. Hands those draws to scripts/verify-questions.py, which recomputes each answer from the question's
 *      independent `verify` expression with SymPy and NumPy and fails on any mismatch.
 *
 * Options: --only <id-prefix> checks a subset; --draws <n> changes the 200; --quotas fails on the launch quotas too.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import katex from 'katex';
import { loadQuestions } from './lib/load-questions.ts';
import { REPO_ROOT } from './lib/load-seed.ts';
import { correctAnswer, drawScope, partsOf, render, toPlain } from '../src/lib/practice/engine.ts';
import { rngFrom } from '../src/lib/practice/rng.ts';
import type { BankQuestion } from '../src/seed/questions.ts';

const args = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = arg('--only');
const draws = Number(arg('--draws') ?? 200);
const requireQuotas = args.includes('--quotas');

const { bank, errors, warnings, stats } = loadQuestions(undefined, { requireQuotas });
for (const w of warnings) console.warn('warning: ' + w);
if (!bank) {
  console.error('The question bank is invalid:\n  - ' + errors.join('\n  - '));
  process.exit(1);
}

/** Every $…$ and $$…$$ in a piece of Markdown, checked with KaTeX the way the app renders it. */
function katexProblems(text: string): string[] {
  const problems: string[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const tex = m[1] ?? m[2]!;
    try {
      katex.renderToString(tex, { throwOnError: true, displayMode: m[1] !== undefined, strict: 'ignore' });
    } catch (err) {
      problems.push('KaTeX: ' + String((err as Error).message).split('\n')[0] + ' in "' + tex.slice(0, 80) + '"');
    }
  }
  if (/\{\{|\}\}/.test(text.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, ''))) problems.push('an unfilled {{…}} outside maths');
  return problems;
}

interface DrawOut {
  params: Record<string, unknown>;
  answers: unknown[];
}

const out: { id: string; type: string; parts: { type: string; verify?: string; upToScale?: boolean; units?: string }[]; draws: DrawOut[] }[] = [];
const problems: string[] = [];
const selected = bank.questions.filter((q) => !only || q.id.startsWith(only));

for (const q of selected as BankQuestion[]) {
  const parts = partsOf(q);
  const n = q.params ? draws : 1;
  const record = { id: q.id, type: q.type, parts: parts.map((p) => ({ type: p.type, verify: p.verify, upToScale: p.upToScale, units: p.units })), draws: [] as DrawOut[] };
  const rng = rngFrom('verify|' + q.id);
  let failed = false;
  for (let i = 0; i < n && !failed; i++) {
    try {
      const { params, scope } = drawScope(q, rng);
      const texts = [q.prompt, q.solution, ...q.hints, ...parts.flatMap((p) => [p.prompt === q.prompt ? '' : p.prompt, ...(p.options ?? [])])];
      for (const t of texts) {
        if (!t) continue;
        const rendered = render(t, scope);
        // KaTeX is slow; check the text of the first few draws only, which covers every branch of a format.
        if (i < 3) for (const p of katexProblems(rendered)) problems.push(q.id + ': ' + p);
      }
      const answers: unknown[] = [];
      parts.forEach((part, k) => {
        const answer = correctAnswer(part, scope);
        answers.push(answer);
        scope['part' + (k + 1)] = part.type === 'mc' || part.type === 'expression' ? answer : (toPlain(answer) as unknown);
        if (typeof answer === 'number' && !Number.isFinite(answer)) problems.push(q.id + ': part ' + (k + 1) + ' is not finite for ' + JSON.stringify(params));
      });
      record.draws.push({ params, answers });
    } catch (err) {
      problems.push(q.id + ': ' + String((err as Error).message ?? err));
      failed = true;
    }
  }
  out.push(record);
}

const dir = join(REPO_ROOT, 'node_modules', '.cache', 'atlas');
mkdirSync(dir, { recursive: true });
const file = join(dir, 'question-draws.json');
writeFileSync(file, JSON.stringify(out));

const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const result = spawnSync(python, [join(REPO_ROOT, 'scripts', 'verify-questions.py'), file], { stdio: 'inherit' });
if (result.error) {
  console.error('Could not run ' + python + ': ' + result.error.message + '. Install Python 3 with sympy and numpy (pip install sympy numpy).');
  process.exit(1);
}

for (const s of stats.subjects) {
  const share = s.questions ? Math.round((100 * s.templates) / s.questions) : 0;
  console.log('  ' + s.id.padEnd(16) + String(s.questions).padStart(4) + ' questions, ' + s.templates + ' templates (' + share + ' %)');
}
if (problems.length > 0) {
  console.error('\n' + problems.length + ' rendering problem' + (problems.length === 1 ? '' : 's') + ':\n  - ' + problems.slice(0, 60).join('\n  - '));
}
process.exit(problems.length > 0 || result.status !== 0 ? 1 : 0);
