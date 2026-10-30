/** Reads public/scenes/scenes.json and checks it (ATLAS-DAILY-SCENES): the schema, every contrast, every file. */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { sceneFiles, sceneProblems, ScenesSchema } from '../../src/seed/scenes.ts';
import type { Scene } from '../../src/seed/scenes.ts';
import { REPO_ROOT } from './load-seed.ts';

export const SCENES_DIR = join(REPO_ROOT, 'public', 'scenes');
/** Each shipped image file stays under this (the brief). */
export const SCENE_MAX_BYTES = 180 * 1024;

export function loadScenes(dir: string = SCENES_DIR): { scenes: Scene[] | null; errors: string[] } {
  const path = join(dir, 'scenes.json');
  if (!existsSync(path)) return { scenes: null, errors: ['scenes.json: missing from ' + dir] };
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    return { scenes: null, errors: ['scenes.json: not JSON: ' + String(err)] };
  }
  const errors = sceneProblems(json);
  if (errors.length > 0) return { scenes: null, errors };
  const scenes = ScenesSchema.parse(json);
  for (const scene of scenes) {
    for (const file of Object.values(sceneFiles(scene))) {
      const full = join(dir, file);
      if (!existsSync(full)) errors.push('scenes.json: ' + scene.id + ' needs ' + file + ', which is not in public/scenes/');
      else if (statSync(full).size > SCENE_MAX_BYTES) errors.push('scenes.json: ' + file + ' is over ' + SCENE_MAX_BYTES / 1024 + ' KB');
    }
  }
  return { scenes: errors.length > 0 ? null : scenes, errors };
}
