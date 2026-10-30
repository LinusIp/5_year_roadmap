/**
 * The daily scene as the app sees it (ATLAS-DAILY-SCENES): the manifest is bundled from public/scenes/scenes.json
 * (so the palette is known before the first paint of the app, and the tests are deterministic); the preferences
 * live in the settings; the day's scene is picked by src/lib/scenes.ts and re-picked at local midnight.
 */
import { useEffect, useState } from 'react';
import { useSettings } from '../db/settings.ts';
import { seed } from '../seed/index.ts';
import { ScenesSchema, sceneFiles } from '../seed/scenes.ts';
import type { Scene } from '../seed/scenes.ts';
import { DEFAULT_SCENE_PREFS, pickScene } from '../lib/scenes.ts';
import type { ScenePrefs, SceneWhy } from '../lib/scenes.ts';
import manifest from '../../public/scenes/scenes.json';

/** Every scene the build shipped, in the cycle's order. */
export const SCENES: Scene[] = ScenesSchema.parse(manifest);

export function sceneUrl(file: string): string {
  return import.meta.env.BASE_URL + 'scenes/' + file;
}

/** The large image's sources and the thumbnail's, as URLs. */
export function sceneSources(scene: Scene): { avif: string; webp: string; thumbAvif: string; thumbWebp: string } {
  const f = sceneFiles(scene);
  return { avif: sceneUrl(f.avif), webp: sceneUrl(f.webp), thumbAvif: sceneUrl(f.thumbAvif), thumbWebp: sceneUrl(f.thumbWebp) };
}

export function useScenePrefs(): ScenePrefs {
  const settings = useSettings(seed.settings);
  return settings?.scenes ?? DEFAULT_SCENE_PREFS;
}

/** A date that moves on at local midnight, so the scene changes with the day while the app stays open. */
export function useLocalDay(): Date {
  const [day, setDay] = useState(() => startOfDay(new Date()));
  useEffect(() => {
    const check = (): void => {
      const now = startOfDay(new Date());
      setDay((d) => (d.getTime() === now.getTime() ? d : now));
    };
    const id = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return day;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export interface CurrentScene {
  /** Null with the daily scene off (the fixed theme), or when no scene shipped. */
  scene: Scene | null;
  why: SceneWhy | null;
  prefs: ScenePrefs;
  day: Date;
}

/** Today's scene, or null with the daily scene switched off. */
export function useCurrentScene(): CurrentScene {
  const prefs = useScenePrefs();
  const day = useLocalDay();
  if (!prefs.on) return { scene: null, why: null, prefs, day };
  const picked = pickScene(SCENES, day, prefs);
  return { scene: picked?.scene ?? null, why: picked?.why ?? null, prefs, day };
}
