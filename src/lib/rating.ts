import { byFit, UNGRADED } from './library-home.ts';
import type { Fit } from './library-home.ts';

/**
 * The Library's minimum-rating filter and rating sort (ATLAS-STAR-RATING), over the audit's `quality`. A row without a
 * grade counts as 4, as the default sort does: it passes ★4+ and below, never ★5.
 */
export const MIN_RATINGS = ['3', '4', '5'] as const;
export type MinRating = (typeof MIN_RATINGS)[number];

export const isMinRating = (value: string | null | undefined): value is MinRating => value === '3' || value === '4' || value === '5';

export function passesRating(quality: number | undefined, min: MinRating | null): boolean {
  return min === null || (quality ?? UNGRADED) >= Number(min);
}

/**
 * The URL's rating: `rating=` when it holds one, else the "Canon only" toggle it replaced (`canon=1`) as ★5, so an old
 * link or a saved address keeps its list.
 */
export function ratingFrom(rating: string | null | undefined, canon: string | null | undefined): MinRating | null {
  if (isMinRating(rating)) return rating;
  return canon === '1' ? '5' : null;
}

/** "Rating (high → low)": the grade first (an ungraded row as 4), then the plan's order. */
export function byRating(a: Fit, b: Fit): number {
  return (b.quality ?? UNGRADED) - (a.quality ?? UNGRADED) || byFit(a, b);
}
