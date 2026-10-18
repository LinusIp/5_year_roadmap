/**
 * npm run schedule:shift -- [--base origin/main] [--as-of 2026-10-18] [--days 14]
 *
 * The pace recompute for a schedule change (DAILY-SCHEDULE): each item on the plan is projected the way Plan and
 * Goals project it (src/lib/goals.ts, projectedFinish) under the base ref's curriculum and settings and under the
 * working tree's, and every item whose projected finish moved by more than --days is listed, latest move first.
 *
 * The projection assumes the plan is followed from --as-of on, with nothing done yet: the logs and ticks live in the
 * browser, so a script cannot see them. It only reads; the base ref's data/ folder is unpacked into a temp folder.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { defaultSettings } from '../src/lib/settings.ts';
import { projectedFinish } from '../src/lib/goals.ts';
import { today } from '../src/lib/dates.ts';
import type { AppSeed } from '../src/seed/schema.ts';
import { loadSeedOrThrow, REPO_ROOT } from './lib/load-seed.ts';
import { splitSeed } from './lib/vite-plugin-seed.ts';

const { values } = parseArgs({ options: { base: { type: 'string', default: 'origin/main' }, 'as-of': { type: 'string' }, days: { type: 'string', default: '14' } } });
const asOf = values['as-of'] ?? today();
const limit = Number(values.days);

function projections(app: AppSeed): Map<string, string | null> {
  const settings = defaultSettings(app.settings);
  const out = new Map<string, string | null>();
  for (const item of app.plan) {
    const id = item.resourceId ?? item.projectId!;
    if (!out.has(id)) out.set(id, projectedFinish(app, settings, new Map(), [], id, asOf));
  }
  return out;
}

const dir = mkdtempSync(join(tmpdir(), 'atlas-base-'));
try {
  const archive = execFileSync('git', ['archive', values.base, 'data'], { cwd: REPO_ROOT, maxBuffer: 1 << 28 });
  execFileSync('tar', ['-x', '-C', dir], { input: archive });
  const before = projections(splitSeed(loadSeedOrThrow(join(dir, 'data'))).app as AppSeed);
  const nowSeed = splitSeed(loadSeedOrThrow()).app as AppSeed;
  const after = projections(nowSeed);
  const days = (a: string, b: string): number => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
  const titleOf = (id: string): string => nowSeed.resources.find((r) => r.id === id)?.title ?? nowSeed.projects.find((p) => p.id === id)?.title ?? id;

  const moved: { id: string; from: string | null; to: string | null; delta: number }[] = [];
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const from = before.get(id) ?? null;
    const to = after.get(id) ?? null;
    if (from === to) continue;
    const delta = from && to ? days(from, to) : Number.POSITIVE_INFINITY;
    if (Math.abs(delta) > limit) moved.push({ id, from, to, delta });
  }
  moved.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.id.localeCompare(b.id));

  const line = (m: (typeof moved)[number]): string => {
    const shift = Number.isFinite(m.delta) ? (m.delta > 0 ? '+' : '') + Math.round(m.delta / 7) + ' wk' : '';
    return '  ' + [m.from ?? '—', '→', m.to ?? '—', shift.padStart(8), ' ' + titleOf(m.id) + ' (' + m.id + ')'].join(' ');
  };
  const laneOf = (id: string): string => nowSeed.plan.find((i) => (i.resourceId ?? i.projectId) === id)?.block ?? '?';
  const groups: [string, typeof moved][] = [
    ['Later', moved.filter((m) => Number.isFinite(m.delta) && m.delta > 0)],
    ['Earlier', moved.filter((m) => Number.isFinite(m.delta) && m.delta < 0)],
    ['Newly projected', moved.filter((m) => m.from === null && m.to !== null)],
    ['No projection any more (their lane gets no time in the schedule)', moved.filter((m) => m.from !== null && m.to === null)],
  ];
  console.log('Projected finish, ' + values.base + ' → working tree, from ' + asOf + ', moved by more than ' + limit + ' days: ' + moved.length + ' of ' + after.size + ' items');
  for (const [name, list] of groups) {
    if (list.length === 0) continue;
    const lanes = [...new Set(list.map((m) => laneOf(m.id)))].sort().join(', ');
    console.log('\n' + name + ': ' + list.length + ' (lane ' + lanes + ')');
    for (const m of list) console.log(line(m));
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
