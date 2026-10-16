/**
 * The plan's tech docs (data/projects/docs/*.md) kept every section but Architecture, which the designs
 * (data/projects/design/*.yaml) replace. What the old section drew is checked against the design, so the
 * conversion loses nothing: each box of its ASCII diagram, and each bullet's lead term, must be named somewhere in
 * the design. Pure: the unit test runs it over every doc.
 */
import type { Design } from '../seed/design.ts';

const STOP = new Set(['with', 'from', 'into', 'over', 'each', 'then', 'that', 'this', 'when', 'only', 'per', 'the', 'and', 'for', 'one', 'two']);

/** The boxes of an architecture section's diagram, and the lead terms of its bullet lines. */
export function architectureNodes(section: string): string[] {
  const nodes = new Set<string>();
  const fence = /```[a-z]*\n([\s\S]*?)```/g;
  for (const m of section.matchAll(fence)) {
    for (const line of m[1]!.split('\n')) {
      for (const raw of line.split(/[─━▶◀▲▼│┘┐└┌├┤┬┴┼⇄→←↑↓|<>=]+|\s{2,}/)) {
        const node = raw.replace(/[()[\]{},:;]/g, ' ').replace(/\s+/g, ' ').trim();
        if (/[a-z]{3,}/i.test(node)) nodes.add(node.toLowerCase());
      }
    }
  }
  for (const m of section.replace(fence, '').matchAll(/^\s*[-*]\s+\*\*([^*]+)\*\*/gm)) nodes.add(m[1]!.trim().toLowerCase());
  return [...nodes];
}

/** The words of a design, lower case, for matching. */
function designWords(design: Design): string {
  return JSON.stringify(design).toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

/** A box is named in the design when one of its words of four letters or more (or its only word) appears there. */
export function nodeCovered(node: string, design: Design): boolean {
  const text = ' ' + designWords(design) + ' ';
  const words = node.split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));
  if (words.length === 0) return true;
  // A word matches whole or as a stem: "renderer" names "render", "trajectories" names "trajectory".
  return words.some((w) => text.includes(' ' + w) || (w.length > 5 && text.includes(' ' + w.slice(0, -2))));
}
