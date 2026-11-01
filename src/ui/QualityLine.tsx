import { Link } from '../router/router.tsx';
import { isQuality, QUALITY_SCALE, StarRating } from './StarRating.tsx';

/**
 * A sheet's rating (ATLAS-STAR-RATING): the stars at md with their label ("★★★★☆ Strong"), the scale's line for it, and
 * the way to Settings › About's note on how quality is rated. Nothing for a resource without a grade.
 */
export function QualityLine({ quality, className = '' }: { quality: number | undefined; className?: string }) {
  if (!isQuality(quality)) return null;
  return (
    <div className={'flex flex-col gap-0.5 ' + className} data-quality-line>
      <StarRating value={quality} size="md" withLabel />
      <p className="text-small text-ink2">
        {QUALITY_SCALE[quality].tip}{' '}
        <Link to="/settings?section=quality" className="inline-flex min-h-11 items-center font-medium text-blue-deep underline-offset-2 hover:underline">
          How quality is rated
        </Link>
      </p>
    </div>
  );
}
