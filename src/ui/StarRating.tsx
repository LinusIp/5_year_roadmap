import { useEffect, useId, useRef, useState } from 'react';

/**
 * The curated rating (ATLAS-STAR-RATING): the audit's `quality`, 1 to 5, as stars. A presentation of the data, never a
 * field of its own; a row with no grade shows none (its sort still counts it as 4). Not the user's own rating, which
 * does not exist: if one is ever added it must look different.
 */
export type Quality = 1 | 2 | 3 | 4 | 5;

export const QUALITY_SCALE: Readonly<Record<Quality, { label: string; tip: string }>> = {
  5: { label: 'Canon', tip: 'Best in class. The classics experts tell you to read.' },
  4: { label: 'Strong', tip: 'Clearly worth your time.' },
  3: { label: 'Useful', tip: 'Correct and useful; better or more central resources exist.' },
  2: { label: 'Limited', tip: 'Thin or dated; kept only because it covers a topic you asked for.' },
  1: { label: 'Minimal', tip: 'Kept for a specific need only.' },
};

export const isQuality = (value: unknown): value is Quality => value === 1 || value === 2 || value === 3 || value === 4 || value === 5;

/** "Quality 4 of 5: Strong". */
export function qualityLabel(value: Quality): string {
  return 'Quality ' + value + ' of 5: ' + QUALITY_SCALE[value].label;
}

/** A type tile's accessible description: "Article, quality 5 of 5: Canon"; the type alone without a grade. */
export function tileDescription(kind: string, value: number | undefined): string {
  return isQuality(value) ? kind + ', quality ' + value + ' of 5: ' + QUALITY_SCALE[value].label : kind;
}

/** xs under a row's type tile (5 stars in its 40 px), sm inline, md on a sheet. */
const SIZES = { xs: { star: 8, gap: 0 }, sm: { star: 12, gap: 1 }, md: { star: 16, gap: 2 } } as const;

/** A five-point star in a 24-unit box. */
const STAR = 'M12 2.6l2.83 6.08 6.67.72-4.98 4.5 1.4 6.56L12 17.12l-5.92 3.34 1.4-6.56L2.5 9.4l6.67-.72z';

/** The stars alone, as one inline SVG: filled up to `filled`, outlined (ink at 25%) after it. */
export function Stars({ filled, total = 5, size }: { filled: number; total?: number; size: keyof typeof SIZES }) {
  const { star, gap } = SIZES[size];
  const width = total * star + (total - 1) * gap;
  return (
    <svg aria-hidden="true" focusable="false" width={width} height={star} viewBox={'0 0 ' + width + ' ' + star} className="block shrink-0" data-stars={filled}>
      {Array.from({ length: total }, (_, i) => (
        <path
          key={i}
          d={STAR}
          transform={'translate(' + i * (star + gap) + ' 0) scale(' + star / 24 + ')'}
          style={{ fill: i < filled ? 'var(--star)' : 'var(--star-empty)' }}
          data-filled={i < filled || undefined}
        />
      ))}
    </svg>
  );
}

/**
 * The rating: five stars with `role="img"` and its label ("Quality 4 of 5: Strong"), and a tooltip with the label and
 * what it means, on hover or a long press. `hidden` leaves it out of the accessibility tree, for a row that carries
 * the same words in its description. Nothing when there is no grade.
 */
export function StarRating({ value, size = 'sm', withLabel = false, hidden = false }: { value: number | undefined; size?: keyof typeof SIZES; withLabel?: boolean; hidden?: boolean }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const tipId = useId();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!isQuality(value)) return null;
  const { label, tip } = QUALITY_SCALE[value];
  const show = (): void => {
    window.clearTimeout(timer.current);
    setOpen(true);
    timer.current = window.setTimeout(() => setOpen(false), 2500);
  };
  return (
    <span
      className="relative inline-flex items-center gap-1.5"
      role={hidden ? undefined : 'img'}
      aria-label={hidden ? undefined : qualityLabel(value)}
      aria-hidden={hidden || undefined}
      data-quality={value}
      onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return;
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(show, 450);
      }}
      onPointerUp={(e) => e.pointerType !== 'mouse' && !open && window.clearTimeout(timer.current)}
      onPointerCancel={() => window.clearTimeout(timer.current)}
    >
      <Stars filled={value} size={size} />
      {withLabel && <span className="text-meta font-semibold text-ink">{label}</span>}
      {open && (
        <span id={tipId} role="tooltip" className="tile pointer-events-none absolute bottom-full left-0 z-30 mb-1.5 w-max max-w-[240px] px-3 py-2 text-left text-small leading-snug text-ink">
          <span className="block font-semibold">{label}</span>
          <span className="block text-ink2">{tip}</span>
        </span>
      )}
    </span>
  );
}
