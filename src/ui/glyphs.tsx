import type { Difficulty } from '../seed/catalogue.ts';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';

/**
 * The icons that carry meaning (DECISIONS.md, "The icon map"): one per block in its track's colour, one per practice
 * subject, one per kind of project with a difficulty mark, and a status. All decorative: a word always says the same.
 */
const BLOCK_ICON: Record<string, IconName> = { A: 'cube', B: 'code', C: 'cpu', D: 'hammer', E: 'sigma', P: 'pencil' };

/** A block's icon at 20 px in its colour (3:1 or better on surface and canvas, both themes). */
export function BlockIcon({ block }: { block: string }) {
  const name = BLOCK_ICON[block];
  if (!name) return <span aria-hidden="true" className="inline-block size-5 shrink-0" />;
  return <Icon name={name} size={20} color={'var(--block-' + block + ')'} />;
}

const SUBJECT_ICON: Record<string, IconName> = { 'linear-algebra': 'grid', calculus: 'function', physics: 'atom' };

export function SubjectIcon({ subject }: { subject: string }) {
  return <Icon name={SUBJECT_ICON[subject] ?? 'sigma'} size={20} className="text-ink2" />;
}

const KIND_ICON: Record<string, IconName> = { challenge: 'puzzle', build: 'wrench', case: 'briefcase' };

export function KindIcon({ kind }: { kind: string }) {
  return <Icon name={KIND_ICON[kind] ?? 'wrench'} size={20} className="text-ink2" />;
}

const DOTS: Record<Difficulty, number> = { easy: 1, medium: 2, advanced: 3 };

/** One, two or three dots for easy, medium and advanced, next to the word that says it. */
export function DifficultyDots({ difficulty }: { difficulty: Difficulty }) {
  const n = DOTS[difficulty] ?? 1;
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-0.5 align-middle">
      {[1, 2, 3].map((i) => (
        <span key={i} className={'size-1.5 rounded-pill ' + (i <= n ? 'bg-ink2' : 'border border-ink2')} />
      ))}
    </span>
  );
}

/** Done, in progress, or nothing yet: a check-circle, a circle-dot, or no mark. */
export function StatusIcon({ status, size = 16 }: { status: 'done' | 'active' | 'todo'; size?: number }) {
  if (status === 'todo') return null;
  return <Icon name={status === 'done' ? 'done' : 'inProgress'} size={size} className={status === 'done' ? 'text-accent' : 'text-ink2'} />;
}
