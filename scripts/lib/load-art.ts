/** Reads public/art/art.json and checks it (ATLAS-ART): the schema, and that every file it names is there. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { artManifestProblems, ArtManifestSchema } from '../../src/seed/art.ts';
import type { ArtManifest } from '../../src/seed/art.ts';
import { REPO_ROOT } from './load-seed.ts';

export const ART_DIR = join(REPO_ROOT, 'public', 'art');

export function loadArtManifest(dir: string = ART_DIR): { manifest: ArtManifest | null; errors: string[] } {
  const path = join(dir, 'art.json');
  if (!existsSync(path)) return { manifest: null, errors: ['art.json: missing from ' + dir] };
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    return { manifest: null, errors: ['art.json: not JSON: ' + String(err)] };
  }
  const errors = artManifestProblems(json);
  if (errors.length > 0) return { manifest: null, errors };
  const manifest = ArtManifestSchema.parse(json);
  for (const image of manifest.images) {
    for (const file of [image.file.avif, image.file.webp]) {
      if (!existsSync(join(dir, file))) errors.push('art.json: ' + image.id + ' names ' + file + ', which is not in public/art/');
    }
  }
  return { manifest: errors.length > 0 ? null : manifest, errors };
}
