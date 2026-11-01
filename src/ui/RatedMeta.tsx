import { StarRating } from './StarRating.tsx';

/** A row's meta line with the item's rating at its end (ATLAS-STAR-RATING), for a row with no type tile. */
export function RatedMeta({ text, quality }: { text: string; quality: number | undefined }) {
  if (quality === undefined) return <>{text}</>;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
      <span className="truncate">{text}</span>
      <StarRating value={quality} size="sm" />
    </span>
  );
}
