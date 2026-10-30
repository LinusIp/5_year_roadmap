import type { Difficulty } from '../seed/catalogue.ts';
import { blockTone, toneInk } from './colors.ts';
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

/** A block's bare icon, 20 px, in its tone's deep colour (the Now card's label). */
export function BlockIcon({ block, size = 20 }: { block: string; size?: number }) {
  return <Icon name={blockIconName(block)} size={size} color={toneInk(blockTone(block))} />;
}

/**
 * A 40 px knob tile with an icon in it: the start of a row in a list group. With a `lane` (ATLAS-DAILY-SCENES) it
 * takes the lane's tint and text colour while a scene is on (index.css .lane-tile).
 */
export function IconTile({ icon, tone = 'blue', size = 40, lane }: { icon: IconName; tone?: 'blue' | 'ice' | 'neutral'; size?: number; lane?: number }) {
  const color = tone === 'neutral' ? 'var(--ink2)' : toneInk(tone);
  return (
    <span aria-hidden="true" className={'knob grid shrink-0 place-items-center' + (lane === undefined ? '' : ' lane-tile lane-' + lane)} style={{ width: size, height: size, color, borderRadius: Math.round(size * 0.35) }}>
      <Icon name={icon} size={size < 40 ? 16 : 20} />
    </span>
  );
}

/** A block's icon in its knob tile, in its lane's colours while a scene is on. */
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
        <span key={i} className={'size-1.5 rounded-pill ' + (i <= n ? 'bg-blue' : 'well')} />
      ))}
    </span>
  );
}

/** Done, in progress, or nothing yet: a check-circle, a circle-dot, or no mark. */
export function StatusIcon({ status, size = 16 }: { status: 'done' | 'active' | 'todo'; size?: number }) {
  if (status === 'todo') return null;
  return <Icon name={status === 'done' ? 'done' : 'inProgress'} size={size} className={status === 'done' ? 'text-blue-deep' : 'text-ice-deep'} />;
}
