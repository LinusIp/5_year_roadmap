import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';
import { defaultSettings } from '../../src/db/settings.ts';
import { credentialRows } from '../../src/lib/credentials.ts';
import { replan, replanToPatches } from '../../src/lib/replan.ts';
import { resolveSeed } from '../../src/lib/plan.ts';
import { quarterOf, quarterRange, quartersSoFar } from '../../src/lib/reviews.ts';
import { roadmapCoverage, roadmapStateId } from '../../src/lib/roadmaps.ts';
import type { AppSeed } from '../../src/seed/schema.ts';
import type { CertState, MilestoneState, UserItemState } from '../../src/db/types.ts';

const seed = splitSeed(loadSeedOrThrow()).app as AppSeed;
const done = (refId: string): UserItemState => ({ refId, status: 'done', unitsDone: [], doneAt: '2028-10-01' });

function coverageOf(id: string, states: UserItemState[], certs: CertState[] = [], milestones: MilestoneState[] = []) {
  const itemStates = new Map(states.map((s) => [s.refId, s]));
  const rows = credentialRows(seed, new Map(certs.map((c) => [c.refId, c])), new Map(milestones.map((m) => [m.refId, m])), itemStates);
  return roadmapCoverage(seed, itemStates, rows).find((c) => c.roadmap.id === id)!;
}

describe('roadmap.sh coverage', () => {
  it('lists the five roadmaps in the order of the brief, inference first', () => {
    const all = roadmapCoverage(seed, new Map(), credentialRows(seed, new Map(), new Map(), new Map()));
    expect(all.map((c) => c.roadmap.id)).toEqual(['inference-engineering', 'ai-engineer', 'ai-agents', 'software-architect', 'game-developer']);
    for (const c of all) {
      expect(c.percent).toBe(0);
      expect(c.required).toBeGreaterThan(0);
      expect(c.mastered).toBe(false);
    }
  });

  it('ticks the nodes a finished resource covers, and only those', () => {
    const c = coverageOf('inference-engineering', [done('vllm-docs')]);
    expect([...c.checked].sort()).toEqual(['continuous-batching', 'pagedattention', 'vllm']);
    expect(c.coveredBy.get('vllm')).toEqual(['vLLM documentation and source']);
    // An unfinished one ticks nothing.
    expect(coverageOf('inference-engineering', [{ refId: 'vllm-docs', status: 'active', unitsDone: [] }]).checked.size).toBe(0);
  });

  it('adds nodes ticked by hand, and leaves optional ones out of the percent', () => {
    const roadmap = seed.roadmaps.find((r) => r.id === 'software-architect')!;
    const nodes = roadmap.sections.flatMap((s) => s.nodes);
    const optional = nodes.find((n) => n.optional)!;
    const required = nodes.filter((n) => !n.optional);
    const c = coverageOf('software-architect', [{ refId: roadmapStateId(roadmap.id), status: 'todo', unitsDone: [optional.id, required[0]!.id] }]);
    expect(c.checked.has(optional.id)).toBe(true);
    expect(c.requiredChecked).toBe(1);
    expect(c.required).toBe(required.length);
    expect(c.percent).toBe(Math.floor((1 / required.length) * 100));
  });

  it('is mastered at 90 % of the required nodes with the credential row done, and not before', () => {
    const roadmap = seed.roadmaps.find((r) => r.id === 'software-architect')!;
    const required = roadmap.sections.flatMap((s) => s.nodes).filter((n) => !n.optional);
    const enough = Math.ceil(required.length * 0.9);
    const ticks = (n: number): UserItemState => ({ refId: roadmapStateId(roadmap.id), status: 'todo', unitsDone: required.slice(0, n).map((x) => x.id) });
    const subject = seed.subjects.find((s) => s.id === roadmap.subject)!;
    const earned: CertState[] = subject.certs.slice(0, 1).map((refId) => ({ refId, status: 'earned' }));
    const allMilestones: MilestoneState[] = subject.milestones.map((m) => ({ refId: m.id, status: 'done' }));

    // Nodes alone are not enough.
    expect(coverageOf(roadmap.id, [ticks(required.length)]).mastered).toBe(false);
    // One node short of 90 %, with the row done.
    expect(coverageOf(roadmap.id, [ticks(enough - 1)], earned, allMilestones).mastered).toBe(false);
    // 90 % with an earned certificate, or with every milestone done.
    if (earned.length) expect(coverageOf(roadmap.id, [ticks(enough)], earned).mastered).toBe(true);
    expect(coverageOf(roadmap.id, [ticks(enough)], [], allMilestones).mastered).toBe(true);
  });
});

describe('quarters for the research review', () => {
  it('names and bounds a quarter', () => {
    expect(quarterOf('2027-02-14')).toBe('2027-Q1');
    expect(quarterOf('2027-12-31')).toBe('2027-Q4');
    expect(quarterRange('2027-08-09')).toEqual({ start: '2027-07-01', end: '2027-09-30' });
    expect(quarterRange('2028-01-01')).toEqual({ start: '2028-01-01', end: '2028-03-31' });
  });

  it('lists the quarters so far, newest first', () => {
    expect(quartersSoFar('2026-09-21', '2027-04-02')).toEqual(['2027-04-01', '2027-01-01', '2026-10-01', '2026-07-01']);
  });
});

describe('re-planning around items that stay put', () => {
  it('never numbers a moved item onto a finished one', () => {
    const settings = defaultSettings(seed.settings);
    const states = new Map([['kr-c', done('kr-c')]]);
    const result = replan({ seed, settings, states, asOf: '2026-09-21' });
    const applied = resolveSeed(seed, replanToPatches(result).map((p) => ({ kind: 'planItem' as const, id: p.id, patch: p.patch })), []);
    const seen = new Set<string>();
    for (const item of applied.plan) {
      const key = item.phaseId + '/' + item.block + '/' + item.order;
      expect(seen.has(key), 'two items at ' + key).toBe(false);
      seen.add(key);
    }
  });
});
