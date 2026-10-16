/**
 * Colours of blocks. Each lane keeps one colour, as in the mockup and the five-year map; a block can be given
 * another colour from the track palette in Settings.
 */
import type { BlockDef, BlockId, SeedTrackId } from '../seed/schema.ts';

export const LANE_COLOR: Record<string, string> = {
  A: 'var(--track-gamedev)',
  B: 'var(--track-languages)',
  C: 'var(--track-ai)',
  D: 'var(--track-systems)',
  E: 'var(--track-math)',
  P: 'var(--track-physics)',
};

/**
 * The track colours a block may take: those at 3:1 or more against the card surface in both themes (WCAG 1.4.11
 * for a non-text mark), measured from src/index.css. Gamedev, EE, chemistry and career fall short in one theme.
 */
export const BLOCK_COLOURS: readonly SeedTrackId[] = ['ai', 'swe', 'systems', 'graphics', 'simulation', 'languages', 'math', 'physics', 'embedded', 'controls', 'mech', 'robotics'];

export function blockColor(def: Pick<BlockDef, 'id' | 'colour'> | undefined, id?: BlockId): string {
  if (def?.colour) return 'var(--track-' + def.colour + ')';
  return LANE_COLOR[def?.id ?? id ?? ''] ?? 'var(--track-mech)';
}
