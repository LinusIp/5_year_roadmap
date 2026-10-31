import type { Difficulty } from '../seed/catalogue.ts';
import { blockTone } from './colors.ts';
import { laneSlot } from '../lib/scenes.ts';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';

/**
 * The icons that carry meaning (DECISIONS.md, "The icon map"): one per block, blue or ice, one per kind of project
 * with a difficulty mark, and a status. All decorative: a word always says the same.
 */
const BLOCK_ICON: Record<string, IconName> = { A: 'cube', B: 'code', C: 'cpu', D: 'hammer', E: 'sigma', H: 'course' };

export function blockIconName(block: string): IconName {
  return BLOCK_ICON[block] ?? 'layers';
}

/** A block's bare icon, 20 px, in its lane's text colour (the Now card's label). */
export function BlockIcon({ block, size = 20 }: { block: string; size?: number }) {
  return <Icon name={blockIconName(block)} size={size} color={'var(--x' + laneSlot(block) + ')'} />;
}

/** The lane a tone stands for where no block names one: blue is the first lane, ice the second. */
function laneOfTone(tone: 'blue' | 'ice' | 'neutral'): number {
  return tone === 'ice' ? 1 : 0;
}

/**
 * The mockup's .ico: a 40 to 44 px tile with 14 px corners on a lane's tint, the icon in the lane's text colour,
 * flat (no shadow). The start of a row in a list group, the Now card's badge. `neutral` sits on the shadow colour.
 */
export function IconTile({ icon, tone = 'blue', size = 40, lane }: { icon: IconName; tone?: 'blue' | 'ice' | 'neutral'; size?: number; lane?: number }) {
  const slot = lane ?? laneOfTone(tone);
  const neutral = tone === 'neutral' && lane === undefined;
  return (
    <span aria-hidden="true" className={'grid shrink-0 place-items-center ' + (neutral ? 'pill-neutral' : 'lane-tile lane-' + slot)} style={{ width: size, height: size, borderRadius: size >= 36 ? 14 : Math.round(size * 0.35) }}>
      <Icon name={icon} size={size < 36 ? 16 : size >= 44 ? 20 : 18} />
    </span>
  );
}

/** A block's icon in its tile, in its lane's colours. */
export function BlockTile({ block, size = 40 }: { block: string; size?: number }) {
  return <IconTile icon={blockIconName(block)} tone={blockTone(block)} size={size} lane={laneSlot(block)} />;
}

const KIND_ICON: Record<string, IconName> = { challenge: 'puzzle', build: 'wrench', case: 'briefcase' };

export function KindIcon({ kind }: { kind: string }) {
  return <IconTile icon={KIND_ICON[kind] ?? 'wrench'} tone={kind === 'case' ? 'ice' : 'blue'} />;
}

const DOTS: Record<Difficulty, number> = { easy: 1, medium: 2, advanced: 3 };

/** One, two or three dots for easy, medium and advanced, next to the word that says it. */
export function DifficultyDots({ difficulty }: { difficulty: Difficulty }) {
  const n = DOTS[difficulty] ?? 1;
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-0.5 align-middle">
      {[1, 2, 3].map((i) => (
        <span key={i} className={'size-1.5 rounded-pill ' + (i <= n ? 'bg-[var(--l0)]' : 'well')} />
      ))}
    </span>
  );
}

/** Done, in progress, or nothing yet: a check-circle, a circle-dot, or no mark. */
export function StatusIcon({ status, size = 16 }: { status: 'done' | 'active' | 'todo'; size?: number }) {
  if (status === 'todo') return null;
  return <Icon name={status === 'done' ? 'done' : 'inProgress'} size={size} className={status === 'done' ? 'text-blue-deep' : 'text-ice-deep'} />;
}
