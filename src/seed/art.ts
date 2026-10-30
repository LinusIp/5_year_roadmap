/**
 * The illustrations' manifest (ATLAS-ART): public/art/art.json names every image the app may show, where it may
 * appear, its alt text, its focal point for cropping, the theme it suits and where it came from. The schema is
 * checked by validate:data, and the app reads the same file at runtime (src/lib/art.ts).
 */
import { z } from 'zod';

/** Every place an illustration can sit. A slot with no image shows the drawn placeholder for it. */
export const ART_SLOTS = [
  'today-morning',
  'today-midday',
  'today-evening',
  'today-night',
  'season-spring',
  'season-summer',
  'season-autumn',
  'season-winter',
  'track-ai',
  'track-inference',
  'track-graphics',
  'track-math',
  'track-engineering',
  'track-languages',
  'track-systems',
  'phase-y1-foundations',
  'phase-y2-building',
  'phase-y3-systems',
  'phase-y4-engineering',
  'phase-y5-engineering',
  'map-river-long',
  'streak-7',
  'streak-30',
  'streak-100',
  'phase-complete',
  'path-complete',
  'empty-state',
  'splash',
  'path-ai',
  'path-inference',
  'path-languages',
  'path-graphics',
  'path-simulation',
  'path-math',
  'path-systems',
  'path-architecture',
  'path-devops',
  'path-engineering',
  'path-robotics',
  'path-hardware',
  'path-quantum',
] as const;
export type ArtSlot = (typeof ART_SLOTS)[number];

const RelativeFile = z.string().regex(/^[a-z0-9][a-z0-9-]*\.(avif|webp)$/, 'a file name in public/art/, lower case, .avif or .webp');

export const ArtImageSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  file: z.strictObject({ avif: RelativeFile, webp: RelativeFile }),
  alt: z.string().min(1).max(200),
  /** Where the eye should rest when the image is cropped: percentages of its width and height. */
  focal: z.strictObject({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }),
  tone: z.enum(['light', 'dark', 'both']),
  slots: z.array(z.enum(ART_SLOTS)).min(1),
  /** Who made it and under what terms: what public/art/CREDITS.md repeats. */
  credit: z.string().min(1),
  /** Its size in pixels, so the layout can reserve the space. */
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type ArtImage = z.infer<typeof ArtImageSchema>;

export const ArtManifestSchema = z.strictObject({
  /** The manifest's own version, for the day its shape changes. */
  version: z.literal(1),
  images: z.array(ArtImageSchema),
});
export type ArtManifest = z.infer<typeof ArtManifestSchema>;

/** The manifest's problems, in words: a bad shape, two images with one id, two light images for one slot. */
export function artManifestProblems(value: unknown): string[] {
  const parsed = ArtManifestSchema.safeParse(value);
  if (!parsed.success) return parsed.error.issues.map((i) => 'art.json: ' + i.path.join('.') + ': ' + i.message);
  const errors: string[] = [];
  const ids = new Set<string>();
  const seen = new Map<string, string>();
  for (const image of parsed.data.images) {
    if (ids.has(image.id)) errors.push('art.json: two images with the id ' + image.id);
    ids.add(image.id);
    for (const slot of image.slots) {
      for (const tone of image.tone === 'both' ? ['light', 'dark'] : [image.tone]) {
        const key = slot + '/' + tone;
        const other = seen.get(key);
        if (other) errors.push('art.json: ' + image.id + ' and ' + other + ' both fill ' + slot + ' in the ' + tone + ' theme');
        seen.set(key, image.id);
      }
    }
  }
  return errors;
}
