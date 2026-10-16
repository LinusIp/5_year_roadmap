/**
 * What is left of features that were removed, so the days already logged keep reading well.
 *
 * Practice (block P) was removed in pull request #6. Minutes logged to it stay in their days, the heatmap, Stats and
 * reviews, under its old name; its entries' references (`practice:<subject>`) read as "Practice · <subject>".
 */
import type { BlockId, SettingsDefaults } from '../seed/schema.ts';

/** Blocks that no longer exist, by id, with the name they had. */
export const RETIRED_BLOCKS: Readonly<Record<string, string>> = { P: 'Practice' };

/** A block's name: the current one, a retired block's old one, or "Block X". */
export function blockNameOf(core: Pick<SettingsDefaults, 'blocks'>, id: BlockId): string {
  return core.blocks.find((b) => b.id === id)?.name ?? RETIRED_BLOCKS[id] ?? 'Block ' + id;
}

/** Ids of retired blocks that have minutes in `minutesByBlock`, for lists of hours per block. */
export function retiredWithMinutes(core: Pick<SettingsDefaults, 'blocks'>, minutesByBlock: Readonly<Record<string, number>>): BlockId[] {
  return Object.keys(RETIRED_BLOCKS).filter((id) => !core.blocks.some((b) => b.id === id) && (minutesByBlock[id] ?? 0) > 0);
}

/** The title of a logged entry's reference that no longer names an item: "Practice · calculus". */
export function retiredRefTitle(refId: string): string | undefined {
  if (refId === 'practice') return 'Practice';
  const subject = /^practice:(.+)$/.exec(refId)?.[1];
  return subject ? 'Practice · ' + subject.replace(/-/g, ' ') : undefined;
}
