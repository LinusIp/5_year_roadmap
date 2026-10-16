/**
 * Colour in soft clay (CLAY-STYLE.md): only blue and ice. A block is told apart by its icon, not its colour; its
 * icon is blue or ice. Charts and the heatmap use the ramp.
 */
import type { BlockId } from '../seed/schema.ts';

export type Tone = 'blue' | 'ice';

/** Graphics and projects are ice; languages, the core track and maths are blue. */
const BLOCK_TONE: Record<string, Tone> = { A: 'ice', B: 'blue', C: 'blue', D: 'ice', E: 'blue' };

export function blockTone(id: BlockId | string | undefined): Tone {
  return BLOCK_TONE[id ?? ''] ?? 'blue';
}

/** The text and icon colour of a tone: blue-deep or ice-deep, 4.5:1 or better on the background. */
export function toneInk(tone: Tone): string {
  return tone === 'ice' ? 'var(--ice-deep)' : 'var(--blue-deep)';
}

/** Categorical series in a chart (hours per track): the ramp's steps, darkest first, then blue and ice. */
export const SERIES_COLOURS = ['var(--ramp-4)', 'var(--ice-deep)', 'var(--ramp-2)', 'var(--blue-deep)', 'var(--ice)', 'var(--ramp-3)', 'var(--deco)', 'var(--ramp-1)'] as const;

export function seriesColour(index: number): string {
  return SERIES_COLOURS[index % SERIES_COLOURS.length]!;
}
