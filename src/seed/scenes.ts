/**
 * The daily scenes' manifest (ATLAS-DAILY-SCENES): public/scenes/scenes.json lists every scene image with the
 * palette the build drew from it (scripts/scenes.ts). validate:data checks the shape and re-checks every contrast
 * ratio the palette promises; the app reads the same file at runtime (src/hooks/useScenes.ts).
 */
import { z } from 'zod';
import { contrast } from '../lib/color.ts';

const Hex = z.string().regex(/^#[0-9A-F]{6}$/, 'a colour as #RRGGBB');
const Five = z.tuple([Hex, Hex, Hex, Hex, Hex]);

/** The contrast each pair of a scene's palette must reach (the brief's table). */
export const SCENE_CONTRAST = {
  'ink/paper': 12,
  'ink2/paper': 5,
  'white/lanes': 4.5,
  'tintText/tint': 5,
  'darkText2/surface': 5,
} as const;

export const SceneSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1).max(60),
  /** The large WebP in public/scenes/; the AVIF and the 300 px thumbnails share its stem (sceneFiles). */
  image: z.string().regex(/^[a-z0-9][a-z0-9-]*\.webp$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Where the eye should rest when a slot crops the image, as percentages; each slot has its own default. */
  focal: z.strictObject({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).optional(),
  /** Who made it and under what terms: what public/scenes/CREDITS.md repeats. */
  credit: z.string().min(1).optional(),
  paper: Hex,
  shadowDark: Hex,
  shadowLight: Hex,
  ink: Hex,
  ink2: Hex,
  primary: Hex,
  lanes: Five,
  tints: Five,
  tintText: Five,
  deco: Five,
  dark: z.strictObject({ bg: Hex, surface: Hex, text: Hex, text2: Hex, accent: Hex }),
  checks: z.record(z.string(), z.number()),
});
export type Scene = z.infer<typeof SceneSchema>;

export const ScenesSchema = z.array(SceneSchema).min(1);

/** The files a scene ships: the large image and its thumbnail, each as AVIF and WebP. */
export function sceneFiles(scene: Pick<Scene, 'image'>): { avif: string; webp: string; thumbAvif: string; thumbWebp: string } {
  const stem = scene.image.replace(/\.webp$/, '');
  return { avif: stem + '.avif', webp: stem + '.webp', thumbAvif: stem + '-thumb.avif', thumbWebp: stem + '-thumb.webp' };
}

/** Every contrast pair of a palette, measured now: what validate:data and the unit test check against the table. */
export function sceneContrasts(scene: Scene): { pair: keyof typeof SCENE_CONTRAST; ratio: number; need: number }[] {
  const min = (values: number[]): number => Math.min(...values);
  return [
    { pair: 'ink/paper', ratio: contrast(scene.ink, scene.paper), need: SCENE_CONTRAST['ink/paper'] },
    { pair: 'ink2/paper', ratio: contrast(scene.ink2, scene.paper), need: SCENE_CONTRAST['ink2/paper'] },
    { pair: 'white/lanes', ratio: min(scene.lanes.map((l) => contrast('#FFFFFF', l))), need: SCENE_CONTRAST['white/lanes'] },
    { pair: 'tintText/tint', ratio: min(scene.tints.map((t, i) => contrast(scene.tintText[i]!, t))), need: SCENE_CONTRAST['tintText/tint'] },
    { pair: 'darkText2/surface', ratio: contrast(scene.dark.text2, scene.dark.surface), need: SCENE_CONTRAST['darkText2/surface'] },
  ];
}

/** The manifest's problems, in words: a bad shape, two scenes with one id, a contrast promise broken. */
export function sceneProblems(value: unknown): string[] {
  const parsed = ScenesSchema.safeParse(value);
  if (!parsed.success) return parsed.error.issues.map((i) => 'scenes.json: ' + i.path.join('.') + ': ' + i.message);
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const scene of parsed.data) {
    if (ids.has(scene.id)) errors.push('scenes.json: two scenes with the id ' + scene.id);
    ids.add(scene.id);
    if (scene.primary !== scene.lanes[0]) errors.push('scenes.json: ' + scene.id + ': primary is not the first lane colour');
    for (const c of sceneContrasts(scene)) {
      if (c.ratio < c.need) errors.push('scenes.json: ' + scene.id + ': ' + c.pair + ' is ' + c.ratio.toFixed(2) + ', under ' + c.need);
    }
  }
  return errors;
}
