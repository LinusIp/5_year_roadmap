/**
 * The architecture diagram of a tech doc, laid out from a design's components and flow: plain numbers, no React,
 * no DOM, so the layout is tested on its own and the same input always draws the same picture.
 *
 * The scheme, for a 330 px phone column:
 *   - Core components stack top to bottom in a main column on the left (about 58% of the width), in the order the
 *     flow first names them; each is numbered by that flow step ("4 · Router"). Core parts the flow never names
 *     follow, unnumbered.
 *   - External and offline components share one side column on the right. Each sits level with the first core box
 *     it is linked to (either direction); one linked only to another side part sits just under that part; an
 *     unlinked external goes to the top and an unlinked offline part to the bottom. External before offline when
 *     both want the same height, and nothing moves up past the box above it.
 *   - More than 8 components: the core column wraps into two columns (the first half down the left, the rest down
 *     the middle, in rows of equal height), and the side column narrows to a third.
 *   - Arrows, one per talksTo, are axis-aligned polylines from an edge of one box to an edge of the other: straight
 *     down to the next box in the same column; through the gutter between two neighbouring columns (out of the
 *     facing sides); for any other pair in one column, out of the left sides and round through a lane on the left
 *     (the core column) or the gutter to the left; core in the far column to the side column through a gutter,
 *     the gap under its row, then the next gutter. Several arrows on one side of a box spread along it.
 *   - Labels are 12 px and never shrink: they wrap to two lines (estimated at 6.6 px a character) and the box grows;
 *     only a third line is cut, with an ellipsis.
 */
import type { Design } from '../seed/design.ts';

export type DiagramKind = 'core' | 'offline' | 'external';

export interface DiagramBox {
  id: string;
  name: string;
  kind: DiagramKind;
  /** The 1-based flow step that first names a core box. */
  step?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The label, wrapped: ['4 · Router']. */
  lines: string[];
}

export interface DiagramArrow {
  from: string;
  to: string;
  /** A polyline: the first point is on the edge of `from`, the last on the edge of `to`. */
  points: [number, number][];
  /** Either end is offline or external. */
  dashed: boolean;
}

export interface DiagramLayout {
  width: number;
  height: number;
  boxes: DiagramBox[];
  arrows: DiagramArrow[];
  columns: 1 | 2;
}

/** Labels are 12 px Nunito, 700; a character is about 6.6 px wide at that size. */
export const LABEL_PX = 12;
export const CHAR_PX = 6.6;
/** Space between a box's side and its label. */
export const LABEL_PAD_X = 8;
const PAD_Y = 10;
const LINE_H = 16;
const MAX_LINES = 2;

/** Room around the drawing for the boxes' strokes. */
const MARGIN = 2;
/** Between two core boxes, room for an arrow and its head. */
const CORE_GAP = 22;
/** Between two side boxes. */
const SIDE_GAP = 12;
/** Between the core column and the side column (one column), where the arrows turn. */
const GUTTER = 30;
/** Between the two core columns, and between them and the side column (two columns). */
const GUTTER_CORE = 18;
const GUTTER_SIDE = 24;
/** The lane left of the core column, when arrows have to go round core boxes: wider for each (up to three). */
const LANE_BASE = 8;
const LANE_STEP = 4;
/** A turn stays this far from the box it turns into, so the arrowhead has room. */
const HEAD_ROOM = 8;
const CORE_SHARE = 0.58;

/**
 * Wraps a label to fit `maxWidth` at 6.6 px a character: words fill lines greedily, a word longer than a line is
 * broken, and anything beyond two lines ends the second in an ellipsis.
 */
export function wrapLabel(text: string, maxWidth: number): string[] {
  const perLine = Math.max(1, Math.floor(maxWidth / CHAR_PX));
  const lines: string[] = [];
  let line = '';
  for (const raw of text.trim().split(/\s+/)) {
    let word = raw;
    while (word.length > 0) {
      const joined = line ? line + ' ' + word : word;
      if (joined.length <= perLine) {
        line = joined;
        word = '';
      } else if (line) {
        lines.push(line);
        line = '';
      } else {
        // A word longer than a whole line: break it.
        lines.push(word.slice(0, perLine));
        word = word.slice(perLine);
      }
    }
  }
  if (line) lines.push(line);
  if (lines.length <= MAX_LINES) return lines;
  const kept = lines.slice(0, MAX_LINES);
  const last = kept[MAX_LINES - 1]!;
  kept[MAX_LINES - 1] = (last.length + 1 > perLine ? last.slice(0, perLine - 1) : last).trimEnd() + '…';
  return kept;
}

type Side = 'top' | 'bottom' | 'left' | 'right';
type Route =
  | { kind: 'down' }
  | { kind: 'z'; gutter: number }
  | { kind: 'bypass'; gutter: number }
  | { kind: 'channel'; row: number };

interface Placed extends DiagramBox {
  col: number;
  /** Position within its column, top to bottom. */
  index: number;
}

interface Port {
  edge: number;
  end: 'from' | 'to';
  /** Where the box at the other end is, to order the ports along a side and avoid crossings. */
  other: number;
}

const round = (n: number): number => Math.round(n);

export function layoutDiagram(design: Pick<Design, 'components' | 'flow'>, opts: { width?: number } = {}): DiagramLayout {
  const width = opts.width ?? 330;

  // The components, the first of any repeated id winning, and the edges between them.
  const comps: Design['components'] = [];
  const byId = new Map<string, Design['components'][number]>();
  for (const c of design.components) {
    if (byId.has(c.id)) continue;
    byId.set(c.id, c);
    comps.push(c);
  }
  const edges: { from: string; to: string }[] = [];
  const seen = new Set<string>();
  for (const c of comps) {
    for (const t of c.talksTo) {
      const key = c.id + '\u0000' + t;
      if (t === c.id || !byId.has(t) || seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: c.id, to: t });
    }
  }

  // Core in flow order, numbered by the first step that names it; the rest in components order.
  const step = new Map<string, number>();
  design.flow.forEach((s, i) => {
    if (byId.get(s.component)?.kind === 'core' && !step.has(s.component)) step.set(s.component, i + 1);
  });
  const core = [...comps.filter((c) => c.kind === 'core' && step.has(c.id)).sort((a, b) => step.get(a.id)! - step.get(b.id)!), ...comps.filter((c) => c.kind === 'core' && !step.has(c.id))];
  const side = comps.filter((c) => c.kind !== 'core');

  const columns: 1 | 2 = comps.length > 8 ? 2 : 1;
  const perCol = columns === 2 ? Math.ceil(core.length / 2) : Math.max(core.length, 1);
  const coreCol = (i: number): number => (i < perCol ? 0 : 1);
  const coreRow = (i: number): number => (i < perCol ? i : i - perCol);
  const sideCol = columns;
  const coreIndex = new Map(core.map((c, i) => [c.id, i]));

  // The left lane is there only when an arrow between core boxes of the first column has to go round.
  const roundabout = edges.filter((e) => {
    const a = coreIndex.get(e.from);
    const b = coreIndex.get(e.to);
    return a !== undefined && b !== undefined && coreCol(a) === 0 && coreCol(b) === 0 && b !== a + 1;
  }).length;
  const lane = roundabout ? LANE_BASE + LANE_STEP * Math.min(roundabout, 3) : 0;

  // Column x and widths.
  const colX: number[] = [];
  const colW: number[] = [];
  /** Gutter g runs between column g and column g + 1: [left, right]. */
  const gutters: [number, number][] = [];
  const left = MARGIN + lane;
  if (columns === 1) {
    const avail = width - 2 * MARGIN - lane - GUTTER;
    const coreW = Math.round(avail * CORE_SHARE);
    colX.push(left, left + coreW + GUTTER);
    colW.push(coreW, avail - coreW);
    gutters.push([left + coreW, left + coreW + GUTTER]);
  } else {
    const avail = width - 2 * MARGIN - lane - GUTTER_CORE - GUTTER_SIDE;
    const third = Math.floor(avail / 3);
    colX.push(left, left + third + GUTTER_CORE, left + 2 * third + GUTTER_CORE + GUTTER_SIDE);
    colW.push(third, third, avail - 2 * third);
    gutters.push([left + third, left + third + GUTTER_CORE], [left + 2 * third + GUTTER_CORE, left + 2 * third + GUTTER_CORE + GUTTER_SIDE]);
  }

  const makeBox = (c: Design['components'][number], col: number, index: number): Placed => {
    const n = step.get(c.id);
    const label = c.kind === 'core' && n !== undefined ? n + ' · ' + c.name : c.name;
    const w = colW[col]!;
    const lines = wrapLabel(label, w - 2 * LABEL_PAD_X);
    return { id: c.id, name: c.name, kind: c.kind, ...(c.kind === 'core' && n !== undefined ? { step: n } : {}), x: colX[col]!, y: 0, w, h: lines.length * LINE_H + 2 * PAD_Y, lines, col, index };
  };

  // Core boxes: rows of equal height, top-aligned (one column is simply one box a row).
  const coreBoxes = core.map((c, i) => makeBox(c, coreCol(i), coreRow(i)));
  const rows = columns === 2 ? perCol : coreBoxes.length;
  const rowTop: number[] = [];
  const rowH: number[] = [];
  let y = MARGIN;
  for (let r = 0; r < rows; r++) {
    const h = Math.max(0, ...coreBoxes.filter((b) => b.index === r).map((b) => b.h));
    rowTop.push(y);
    rowH.push(h);
    y += h + CORE_GAP;
  }
  for (const b of coreBoxes) b.y = rowTop[b.index]!;

  // Side boxes: each wants the height of the first core box it is linked to; a part linked only to other side
  // parts comes right under them.
  const linked = (a: string, b: string): boolean => edges.some((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));
  type Key = [number, number];
  const key = new Map<string, Key>();
  for (const c of side) {
    const tops = coreBoxes.filter((b) => linked(c.id, b.id)).map((b) => b.y);
    if (tops.length) key.set(c.id, [Math.min(...tops), 0]);
  }
  const less = (a: Key, b: Key): boolean => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  for (let pass = 0; pass < side.length; pass++) {
    for (const c of side) {
      for (const o of side) {
        const k = key.get(o.id);
        if (o === c || !k || !linked(c.id, o.id)) continue;
        const next: Key = [k[0], k[1] + 1];
        const mine = key.get(c.id);
        if (!mine || less(next, mine)) key.set(c.id, next);
      }
    }
  }
  const sideKey = (c: Design['components'][number]): Key => key.get(c.id) ?? (c.kind === 'external' ? [-1, 0] : [Infinity, 0]);
  const sideOrder = side
    .map((c, i) => ({ c, i, k: sideKey(c) }))
    .sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || (a.c.kind === b.c.kind ? 0 : a.c.kind === 'external' ? -1 : 1) || a.i - b.i);
  let below = MARGIN - SIDE_GAP;
  const sideBoxes = sideOrder.map(({ c, k }, index) => {
    const b = makeBox(c, sideCol, index);
    b.y = Math.max(Number.isFinite(k[0]) && k[0] > 0 ? k[0] : MARGIN, below + SIDE_GAP);
    below = b.y + b.h;
    return b;
  });

  const placed = new Map<string, Placed>([...coreBoxes, ...sideBoxes].map((b) => [b.id, b]));
  const columnOf = (col: number): Placed[] => [...placed.values()].filter((b) => b.col === col).sort((a, b) => a.index - b.index);

  // How each arrow goes, and the ports it needs.
  const routes: Route[] = [];
  const ports = new Map<string, Port[]>();
  const want = (box: Placed, side: Side, port: Port): void => {
    const k = box.id + '|' + side;
    ports.set(k, [...(ports.get(k) ?? []), port]);
  };
  const cy = (b: Placed): number => b.y + b.h / 2;
  edges.forEach((e, i) => {
    const s = placed.get(e.from)!;
    const t = placed.get(e.to)!;
    if (s.col === t.col) {
      if (t.index === s.index + 1) {
        routes.push({ kind: 'down' });
        want(s, 'bottom', { edge: i, end: 'from', other: t.x + t.w / 2 });
        want(t, 'top', { edge: i, end: 'to', other: s.x + s.w / 2 });
      } else {
        routes.push({ kind: 'bypass', gutter: s.col - 1 });
        want(s, 'left', { edge: i, end: 'from', other: cy(t) });
        want(t, 'left', { edge: i, end: 'to', other: cy(s) });
      }
    } else if (Math.abs(s.col - t.col) === 1) {
      routes.push({ kind: 'z', gutter: Math.min(s.col, t.col) });
      want(s, s.col < t.col ? 'right' : 'left', { edge: i, end: 'from', other: cy(t) });
      want(t, s.col < t.col ? 'left' : 'right', { edge: i, end: 'to', other: cy(s) });
    } else {
      // The far core column and the side column: under the core box's row, across the middle column.
      const coreEnd = s.col === 0 ? s : t;
      routes.push({ kind: 'channel', row: coreEnd.index });
      want(s, s.col < t.col ? 'right' : 'left', { edge: i, end: 'from', other: cy(t) });
      want(t, s.col < t.col ? 'left' : 'right', { edge: i, end: 'to', other: cy(s) });
    }
  });

  // Ports spread evenly along a side, ordered by where the other end is.
  const at = new Map<string, [number, number]>();
  for (const [k, list] of ports) {
    const [id, side] = k.split('|') as [string, Side];
    const b = placed.get(id)!;
    const sorted = [...list].sort((p, q) => p.other - q.other || p.edge - q.edge || (p.end === q.end ? 0 : p.end === 'from' ? -1 : 1));
    sorted.forEach((p, j) => {
      const f = (j + 1) / (sorted.length + 1);
      const point: [number, number] =
        side === 'top' ? [round(b.x + b.w * f), b.y] : side === 'bottom' ? [round(b.x + b.w * f), b.y + b.h] : side === 'left' ? [b.x, round(b.y + b.h * f)] : [b.x + b.w, round(b.y + b.h * f)];
      at.set(p.edge + p.end, point);
    });
  }

  // Lanes: every vertical run in a gutter (or the left lane, gutter -1) gets an x of its own.
  const laneUsers = new Map<number, number[]>();
  const useLane = (gutter: number, edge: number): void => {
    laneUsers.set(gutter, [...(laneUsers.get(gutter) ?? []), edge]);
  };
  routes.forEach((r, i) => {
    const a = at.get(i + 'from')!;
    const b = at.get(i + 'to')!;
    if (r.kind === 'bypass') useLane(r.gutter, i);
    if (r.kind === 'z' && a[1] !== b[1]) useLane(r.gutter, i);
    if (r.kind === 'channel') {
      useLane(0, i);
      useLane(1, i);
    }
  });
  const laneX = (gutter: number, edge: number): number => {
    const users = laneUsers.get(gutter)!;
    const [lo, hi] = gutter < 0 ? [MARGIN, colX[0]! - HEAD_ROOM] : [gutters[gutter]![0] + HEAD_ROOM, gutters[gutter]![1] - HEAD_ROOM];
    return round(lo + ((hi - lo) * (users.indexOf(edge) + 0.5)) / users.length);
  };
  // Channels share the gap under a row: spread across it.
  const channelUsers = new Map<number, number[]>();
  routes.forEach((r, i) => {
    if (r.kind === 'channel') channelUsers.set(r.row, [...(channelUsers.get(r.row) ?? []), i]);
  });
  const channelY = (row: number, edge: number): number => {
    const users = channelUsers.get(row)!;
    const top = rowTop[row]! + rowH[row]! + 4;
    return round(top + ((CORE_GAP - 8) * (users.indexOf(edge) + 0.5)) / users.length);
  };

  const arrows: DiagramArrow[] = edges.map((e, i) => {
    const r = routes[i]!;
    const a = at.get(i + 'from')!;
    const b = at.get(i + 'to')!;
    let points: [number, number][];
    if (r.kind === 'down') points = [a, b];
    else if (r.kind === 'z') {
      if (a[1] === b[1]) points = [a, b];
      else {
        const x = laneX(r.gutter, i);
        points = [a, [x, a[1]], [x, b[1]], b];
      }
    } else if (r.kind === 'bypass') {
      const x = laneX(r.gutter, i);
      points = [a, [x, a[1]], [x, b[1]], b];
    } else {
      const fromCore = placed.get(e.from)!.col === 0;
      const [g1, g2] = fromCore ? [0, 1] : [1, 0];
      const x1 = laneX(g1, i);
      const x2 = laneX(g2, i);
      const yc = channelY(r.row, i);
      points = [a, [x1, a[1]], [x1, yc], [x2, yc], [x2, b[1]], b];
    }
    const dashed = byId.get(e.from)!.kind !== 'core' || byId.get(e.to)!.kind !== 'core';
    return { from: e.from, to: e.to, points: simplify(points), dashed };
  });

  const bottom = Math.max(MARGIN, ...[...placed.values()].map((b) => b.y + b.h), ...arrows.flatMap((a) => a.points.map((p) => p[1])));
  const boxes: DiagramBox[] = [...columnOf(0), ...(columns === 2 ? columnOf(1) : []), ...columnOf(sideCol)].map(({ col: _c, index: _i, ...box }) => box);
  return { width, height: bottom + MARGIN, boxes, arrows, columns };
}

/** Drops repeated points and the middle of three in a line, keeping both ends. */
function simplify(points: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && last[0] === p[0] && last[1] === p[1]) continue;
    const prev = out[out.length - 2];
    if (prev && last && ((prev[0] === last[0] && last[0] === p[0]) || (prev[1] === last[1] && last[1] === p[1]))) out.pop();
    out.push(p);
  }
  return out;
}
