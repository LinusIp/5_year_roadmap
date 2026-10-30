/**
 * Which illustration a place shows (ATLAS-ART): the slot for the hour, the season, a track or a phase, and the
 * image the manifest has for it in the theme at hand, or none, in which case the placeholder is drawn. Pure; the
 * manifest comes from the caller (src/hooks/useArt.ts fetches it once).
 */
import type { ArtImage, ArtManifest, ArtSlot } from '../seed/art.ts';
import type { Phase } from '../seed/schema.ts';

export type TodayArtBy = 'time' | 'season' | 'track';

/** Morning until 11, midday until 17, evening until 21, night after. */
export function timeOfDaySlot(hour: number): ArtSlot {
  if (hour < 5) return 'today-night';
  if (hour < 11) return 'today-morning';
  if (hour < 17) return 'today-midday';
  if (hour < 21) return 'today-evening';
  return 'today-night';
}

/** The northern seasons by month: March to May spring, and so on. */
export function seasonSlot(month: number): ArtSlot {
  if (month >= 3 && month <= 5) return 'season-spring';
  if (month >= 6 && month <= 8) return 'season-summer';
  if (month >= 9 && month <= 11) return 'season-autumn';
  return 'season-winter';
}

const TRACK_SLOT: Record<string, ArtSlot> = {
  ai: 'track-ai',
  inference: 'track-inference',
  graphics: 'track-graphics',
  gamedev: 'track-graphics',
  simulation: 'track-graphics',
  math: 'track-math',
  physics: 'track-math',
  chem: 'track-math',
  engineering: 'track-engineering',
  ee: 'track-engineering',
  mech: 'track-engineering',
  embedded: 'track-engineering',
  controls: 'track-engineering',
  robotics: 'track-engineering',
  hardware: 'track-engineering',
  languages: 'track-languages',
  swe: 'track-systems',
  systems: 'track-systems',
  architecture: 'track-systems',
  devops: 'track-systems',
};

/** A block's track to its slot; a track with no landscape of its own falls back to the hour's. */
export function trackSlot(track: string | undefined, hour: number): ArtSlot {
  return (track ? TRACK_SLOT[track] : undefined) ?? timeOfDaySlot(hour);
}

/** The Today header's slot, by the setting: the hour, the season, or the current block's track. */
export function todaySlot(by: TodayArtBy, date: Date, track?: string): ArtSlot {
  if (by === 'season') return seasonSlot(date.getMonth() + 1);
  if (by === 'track') return trackSlot(track, date.getHours());
  return timeOfDaySlot(date.getHours());
}

/** One landscape per year of the plan: the river from its source (year 1) to the sea (year 5). */
export function phaseSlot(phase: Pick<Phase, 'year'>): ArtSlot {
  switch (phase.year) {
    case 1:
      return 'phase-y1-foundations';
    case 2:
      return 'phase-y2-building';
    case 3:
      return 'phase-y3-systems';
    case 4:
      return 'phase-y4-engineering';
    default:
      return 'phase-y5-engineering';
  }
}

/** The streak card's slot on a milestone day, or null on any other. */
export function streakSlot(current: number): ArtSlot | null {
  if (current === 100) return 'streak-100';
  if (current === 30) return 'streak-30';
  if (current === 7) return 'streak-7';
  return null;
}

export function pathSlot(pathId: string): ArtSlot | null {
  const slot = 'path-' + pathId;
  return (['path-ai', 'path-inference', 'path-languages', 'path-graphics', 'path-simulation', 'path-math', 'path-systems', 'path-architecture', 'path-devops', 'path-engineering', 'path-robotics', 'path-hardware', 'path-quantum'] as const).find((s) => s === slot) ?? null;
}

/**
 * The image for a slot in a theme: one made for that theme first, then one for both. In the dark theme an image
 * made for the light one is used only when nothing else fits, dimmed by the panel (`dimmed`).
 */
export function artFor(manifest: ArtManifest | null, slot: ArtSlot, theme: 'light' | 'dark'): { image: ArtImage; dimmed: boolean } | null {
  if (!manifest) return null;
  const inSlot = manifest.images.filter((i) => i.slots.includes(slot));
  const own = inSlot.find((i) => i.tone === theme) ?? inSlot.find((i) => i.tone === 'both');
  if (own) return { image: own, dimmed: false };
  const other = inSlot.find((i) => i.tone !== theme);
  return other && theme === 'dark' ? { image: other, dimmed: true } : null;
}

/** The slots the app shows with no image to show in them: what the user still has to supply. */
export function placeholderSlots(manifest: ArtManifest | null, slots: readonly ArtSlot[]): ArtSlot[] {
  return slots.filter((slot) => artFor(manifest, slot, 'light') === null);
}
