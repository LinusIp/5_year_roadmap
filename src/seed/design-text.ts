/**
 * The parts of src/seed/design.ts the app needs at run time, without zod: the diagram's text alternative and the
 * chunk a design rides in. Keeping them apart keeps the schema library out of the app's main chunk.
 */
import type { Design } from './design.ts';

/** The text alternative of the diagram, built from the flow: "1. API: receives … 2. Redactor: …". */
export function flowText(design: Pick<Design, 'components' | 'flow'>): string {
  const name = (id: string): string => design.components.find((c) => c.id === id)?.name ?? id;
  return design.flow.map((s, i) => i + 1 + '. ' + name(s.component) + ': ' + s.text.replace(/`|\*\*/g, '')).join(' ');
}

/** Designs ride in this many lazy chunks, so opening one doc loads about a sixteenth of them. */
export const DESIGN_BUCKETS = 16;

/** The chunk a design is in: a small stable hash of its id. */
export function designBucket(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % DESIGN_BUCKETS;
}
