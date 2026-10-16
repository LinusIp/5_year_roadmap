import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { loadCatalogue } from '../../scripts/lib/load-catalogue.ts';
import { loadDesigns } from '../../scripts/lib/load-designs.ts';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { architectureNodes, nodeCovered } from '../../src/lib/doc-conversion.ts';
import { currentPart, flowNoun, keyNumbers } from '../../src/lib/doc-sections.ts';
import { DOC_SECTIONS, parseDoc } from '../../src/lib/project-doc.ts';
import { checkDesign, DesignSchema, designBucket, flowText } from '../../src/seed/design.ts';
import type { Design } from '../../src/seed/design.ts';
import { planDocModel } from '../../src/screens/parts/PlanDoc.tsx';

const seed = loadSeedOrThrow();
const triage = DesignSchema.parse(parse(readFileSync('data/projects/design/mx-ai-ticket-triage-llm.yaml', 'utf8')));
const copy = (d: Design): Design => structuredClone(d);

describe('the jump bar', () => {
  const tops = [
    { part: 'overview' as const, top: 0 },
    { part: 'design' as const, top: 900 },
    { part: 'build' as const, top: 2600 },
    { part: 'checks' as const, top: 3400 },
  ];
  const at = (top: number, scrollHeight = 4000) => currentPart(tops, { top, height: 700, scrollHeight }, 80);

  it('is on the last part whose heading has reached the line under the bar', () => {
    expect(at(0)).toBe('overview');
    expect(at(819)).toBe('overview');
    expect(at(820)).toBe('design');
    expect(at(2600)).toBe('build');
  });

  it('is on the last part at the very bottom, even when that part is short', () => {
    expect(at(3300)).toBe('checks');
    expect(at(3200, 4000)).toBe('build');
  });
});

describe('the doc text', () => {
  it('stresses the numbers of the situation, not digits inside names', () => {
    const parts = keyNumbers('1,200 tickets a day, p95 < 3 s, under $15 a month on an H100 with 6061-T6.');
    expect(parts.filter((p) => p.number).map((p) => p.text)).toEqual(['1,200', '< 3 s', '$15']);
    expect(parts.map((p) => p.text).join('')).toBe('1,200 tickets a day, p95 < 3 s, under $15 a month on an H100 with 6061-T6.');
  });

  it('names the thing that travels through the system', () => {
    expect(flowNoun([...triage.flow.map((f) => f.text), triage.overview])).toBe('ticket');
    expect(flowNoun(['renders each frame', 'the frame is presented'])).toBe('frame');
    expect(flowNoun(['nothing to see'])).toBe('request');
  });

  it('builds the diagram’s text alternative from the flow, without the marks', () => {
    expect(flowText(triage)).toMatch(/^1\. API: receives POST \/triage/);
    expect(flowText(triage)).not.toMatch(/`|\*\*/);
  });
});

describe('design validation', () => {
  const resources = new Set(seed.resources.map((r) => r.id));

  it('passes the ticket-triage design', () => {
    expect(checkDesign(triage, 'full', resources)).toEqual([]);
  });

  it('catches a flow step, a talksTo or a learn ref that does not resolve', () => {
    const d = copy(triage);
    d.flow[0]!.component = 'nope';
    d.components[0]!.talksTo = ['ghost'];
    d.learn[0]!.ref = 'no-such-resource';
    const errors = checkDesign(d, 'full', resources).join('\n');
    expect(errors).toMatch(/flow step 1 names "nope"/);
    expect(errors).toMatch(/talks to "ghost"/);
    expect(errors).toMatch(/refers to "no-such-resource"/);
  });

  it('wants every core component on the flow, unless it is offline or external', () => {
    const d = copy(triage);
    d.flow = d.flow.filter((f) => f.component !== 'router');
    expect(checkDesign(d, 'full', resources).join('\n')).toMatch(/core component "router" is not on the flow/);
    d.components.find((c) => c.id === 'router')!.kind = 'offline';
    expect(checkDesign(d, 'full', resources).join('\n')).not.toMatch(/router/);
  });

  it('counts components and decisions for the weight, wants an alternative, and no URLs', () => {
    const d = copy(triage);
    d.components = d.components.slice(0, 3);
    d.decisions[0]!.instead = d.decisions[0]!.choice;
    d.watchOut = 'See https://example.com';
    const errors = checkDesign(d, 'full').join('\n');
    expect(errors).toMatch(/components: 3, expected 4 to 8/);
    expect(errors).toMatch(/"instead" repeats the choice/);
    expect(errors).toMatch(/no URLs/);
    expect(checkDesign(triage, 'light').join('\n')).toMatch(/components: 8, expected 2 to 4/);
  });

  it('holds for every case, build and documented plan project, with none missing', () => {
    const { items } = loadCatalogue(seed);
    const { designs, errors } = loadDesigns(seed, items);
    expect(errors).toEqual([]);
    expect(Object.keys(designs)).toHaveLength(items.filter((i) => i.kind === 'case' || i.kind === 'build').length + readdirSync('data/projects/docs').length);
  });

  it('spreads the designs over sixteen chunks, each id always in the same one', () => {
    const ids = readdirSync('data/projects/design').map((f) => f.slice(0, -5));
    const sizes = new Map<number, number>();
    for (const id of ids) sizes.set(designBucket(id), (sizes.get(designBucket(id)) ?? 0) + 1);
    expect(sizes.size).toBe(16);
    expect(Math.max(...sizes.values())).toBeLessThan(ids.length / 8);
    expect(designBucket('mx-ai-ticket-triage-llm')).toBe(designBucket('mx-ai-ticket-triage-llm'));
  });
});

describe('the plan’s docs converted to the new sheet', () => {
  const files = readdirSync('data/projects/docs').filter((f) => f.endsWith('.md'));

  it('keeps every section but Architecture (and Parts and budget, which the sheet shows by the budget)', () => {
    for (const file of files) {
      const id = file.slice(0, -3);
      const { doc } = parseDoc(readFileSync('data/projects/docs/' + file, 'utf8'));
      const project = seed.projects.find((p) => p.id === id)!;
      const model = planDocModel({ seed: seed as never, project, doc: doc!, meta: '' });
      const shown = new Set([...(model.overviewMore ?? []), ...(model.designMore ?? []), ...(model.buildMore ?? []), ...(model.checksMore ?? [])].map((x) => x.title));
      for (const section of DOC_SECTIONS) {
        if (!doc!.sections[section] || section === 'Architecture' || section === 'Parts and budget') continue;
        const where: Record<string, boolean> = {
          Goal: model.situation.length > 0,
          Why: shown.has('Why'),
          Scope: shown.has('Scope'),
          Stack: shown.has('Stack'),
          Milestones: model.steps.units.length === doc!.milestones.length,
          'Done when': shown.has('Done when, in detail'),
          'Measure and report': shown.has('Measure'),
          Pitfalls: shown.has('Pitfalls'),
          References: model.related !== undefined,
          'Write-up': shown.has('Write-up'),
        };
        expect(where[section], id + ' shows its ' + section).toBe(true);
      }
    }
  });

  it('names in the design what the old Architecture section drew', () => {
    let total = 0;
    let named = 0;
    for (const file of files) {
      const id = file.slice(0, -3);
      const { doc } = parseDoc(readFileSync('data/projects/docs/' + file, 'utf8'));
      const design = DesignSchema.parse(parse(readFileSync('data/projects/design/' + id + '.yaml', 'utf8')));
      const nodes = architectureNodes(doc!.sections.Architecture ?? '');
      const covered = nodes.filter((n) => nodeCovered(n, design)).length;
      total += nodes.length;
      named += covered;
      // Every doc's diagram is mostly in its design; the few boxes left out are endpoints (a screen, the internet).
      expect(nodes.length === 0 || covered / nodes.length >= 0.5, id + ': ' + covered + ' of ' + nodes.length).toBe(true);
    }
    expect(total).toBeGreaterThan(900);
    expect(named / total).toBeGreaterThan(0.95);
  });
});
