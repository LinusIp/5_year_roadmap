import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { CHAR_PX, LABEL_PAD_X, layoutDiagram } from '../../src/lib/diagram.ts';
import type { DiagramBox, DiagramLayout } from '../../src/lib/diagram.ts';
import { DesignSchema } from '../../src/seed/design.ts';
import type { Design } from '../../src/seed/design.ts';

const DIR = join(import.meta.dirname, '../../data/projects/design');
const designs: [string, Design][] = readdirSync(DIR)
  .filter((f) => f.endsWith('.yaml'))
  .sort()
  .map((f) => [f, DesignSchema.parse(parse(readFileSync(join(DIR, f), 'utf8')))]);
const layouts: [string, DiagramLayout][] = designs.map(([f, d]) => [f, layoutDiagram(d, { width: 330 })]);

const GAP = 8;
const TOLERANCE = 0.5;

function apart(a: DiagramBox, b: DiagramBox): boolean {
  return a.x + a.w + GAP <= b.x || b.x + b.w + GAP <= a.x || a.y + a.h + GAP <= b.y || b.y + b.h + GAP <= a.y;
}

function onBoundary([x, y]: [number, number], b: DiagramBox): boolean {
  const inside = x >= b.x - TOLERANCE && x <= b.x + b.w + TOLERANCE && y >= b.y - TOLERANCE && y <= b.y + b.h + TOLERANCE;
  const onEdge = Math.abs(x - b.x) <= TOLERANCE || Math.abs(x - b.x - b.w) <= TOLERANCE || Math.abs(y - b.y) <= TOLERANCE || Math.abs(y - b.y - b.h) <= TOLERANCE;
  return inside && onEdge;
}

function core(n: number): Pick<Design, 'components' | 'flow'> {
  const ids = Array.from({ length: n }, (_, i) => 'part-' + i);
  return {
    components: ids.map((id, i) => ({ id, name: 'Part ' + i, role: 'Does a thing.', tech: 'Go', talksTo: i + 1 < n ? [ids[i + 1]!] : [], kind: 'core' as const })),
    flow: ids.map((id) => ({ component: id, text: 'handles it.' })),
  };
}

describe('the architecture diagram', () => {
  it('is laid out for every design in the data', () => {
    expect(layouts.length).toBeGreaterThan(600);
  });

  it('never overlaps two boxes and keeps every box inside the drawing', () => {
    const problems: string[] = [];
    for (const [f, l] of layouts) {
      expect(l.width).toBe(330);
      for (const [i, a] of l.boxes.entries()) {
        if (a.x < 0 || a.y < 0 || a.x + a.w > l.width || a.y + a.h > l.height) problems.push(f + ': ' + a.id + ' is outside');
        for (const b of l.boxes.slice(i + 1)) if (!apart(a, b)) problems.push(f + ': ' + a.id + ' and ' + b.id + ' overlap');
      }
      for (const a of l.arrows) for (const [x, y] of a.points) if (x < 0 || y < 0 || x > l.width || y > l.height) problems.push(f + ': arrow ' + a.from + '→' + a.to + ' leaves the drawing');
    }
    expect(problems).toEqual([]);
  });

  it('starts every arrow on the edge of its source and ends it on the edge of its target', () => {
    const problems: string[] = [];
    for (const [f, l] of layouts) {
      const box = new Map(l.boxes.map((b) => [b.id, b]));
      for (const a of l.arrows) {
        const first = a.points[0]!;
        const last = a.points[a.points.length - 1]!;
        if (a.points.length < 2) problems.push(f + ': ' + a.from + '→' + a.to + ' has one point');
        if (!onBoundary(first, box.get(a.from)!)) problems.push(f + ': ' + a.from + '→' + a.to + ' starts off its source');
        if (!onBoundary(last, box.get(a.to)!)) problems.push(f + ': ' + a.from + '→' + a.to + ' ends off its target');
      }
    }
    expect(problems).toEqual([]);
  });

  it('draws one arrow per talksTo, dashed when an end is offline or external', () => {
    for (const [i, [, d]] of designs.entries()) {
      const l = layouts[i]![1];
      const kind = new Map(d.components.map((c) => [c.id, c.kind]));
      expect(l.arrows.map((a) => a.from + '→' + a.to)).toEqual(d.components.flatMap((c) => c.talksTo.map((t) => c.id + '→' + t)));
      for (const a of l.arrows) expect(a.dashed).toBe(kind.get(a.from) !== 'core' || kind.get(a.to) !== 'core');
    }
  });

  it('wraps labels instead of shrinking them: every line fits its box at 12 px', () => {
    const problems: string[] = [];
    for (const [f, l] of [...layouts, ['ten parts', layoutDiagram(core(10))] as const]) {
      for (const b of l.boxes) {
        if (b.lines.length < 1 || b.lines.length > 2) problems.push(f + ': ' + b.id + ' has ' + b.lines.length + ' lines');
        for (const line of b.lines) if (line.length * CHAR_PX > b.w - 2 * LABEL_PAD_X) problems.push(f + ': "' + line + '" overflows ' + b.id);
      }
    }
    expect(problems).toEqual([]);
  });

  it('gives the same layout for the same input', () => {
    for (const [, d] of designs.slice(0, 50)) expect(layoutDiagram(d)).toEqual(layoutDiagram(d));
    expect(layoutDiagram(core(10))).toEqual(layoutDiagram(core(10)));
  });

  it('wraps the core into two columns past 8 components', () => {
    expect(layoutDiagram(core(8)).columns).toBe(1);
    const l = layoutDiagram(core(10));
    expect(l.columns).toBe(2);
    expect(new Set(l.boxes.map((b) => b.x)).size).toBe(2);
    for (const [i, a] of l.boxes.entries()) {
      expect(a.x + a.w).toBeLessThanOrEqual(330);
      for (const b of l.boxes.slice(i + 1)) expect(apart(a, b)).toBe(true);
    }
  });

  it('numbers the core boxes by the flow step that first names them', () => {
    const triage = designs.find(([f]) => f === 'mx-ai-ticket-triage-llm.yaml')![1];
    const l = layoutDiagram(triage);
    const core = l.boxes.filter((b) => b.kind === 'core');
    expect(core.map((b) => [b.id, b.step])).toEqual([
      ['api', 1],
      ['redactor', 2],
      ['worker', 3],
      ['router', 4],
    ]);
    expect(core[3]!.lines).toEqual(['4 · Router']);
    // Top to bottom in flow order.
    expect(core.map((b) => b.y)).toEqual([...core.map((b) => b.y)].sort((a, b) => a - b));
    expect(l.boxes.find((b) => b.id === 'llm')!.step).toBeUndefined();
  });
});
