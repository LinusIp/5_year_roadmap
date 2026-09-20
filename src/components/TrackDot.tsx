import type { Track, TrackId } from '../seed/schema.ts';

/**
 * A track's colour. Sixteen tracks share eight validated categorical slots, so the dot is never the only
 * thing distinguishing two tracks: it always sits next to the track's name.
 */
export function trackColor(slot: number): string {
  return 'var(--series-' + slot + ')';
}

export function trackOf(tracks: Track[], id: TrackId): Track | undefined {
  return tracks.find((t) => t.id === id);
}

interface TrackDotProps {
  track: Track | undefined;
  size?: number;
}

export function TrackDot({ track, size = 8 }: TrackDotProps) {
  if (!track) return null;
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: trackColor(track.slot) }}
    />
  );
}

export function TrackChip({ track }: { track: Track | undefined }) {
  if (!track) return null;
  return (
    <span className="chip px-2">
      <TrackDot track={track} />
      {track.name}
    </span>
  );
}
