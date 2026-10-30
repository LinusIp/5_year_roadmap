/**
 * npm run art:build
 *
 * Writes public/art/<slot>.avif and .webp from the originals in art-src/ (ATLAS-ART), each at twice its slot's
 * size and under 150 KB as AVIF (the quality steps down until it fits), and adds a row for each to
 * public/art/art.json when it has none (alt, focal point, tone and credit to be filled in by hand; the row is
 * refused by validate:data until the credit says where the image came from). Needs `sharp`, which is not a
 * dependency of the app: `npm i -D sharp` once, on the machine that holds the originals.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { ART_SLOTS } from '../src/seed/art.ts';
import type { ArtManifest, ArtSlot } from '../src/seed/art.ts';
import { REPO_ROOT } from './lib/load-seed.ts';

const SRC = join(REPO_ROOT, 'art-src');
const OUT = join(REPO_ROOT, 'public', 'art');
const MAX_BYTES = 150 * 1024;

/** Width and height of each slot at 2x. */
function sizeOf(slot: ArtSlot): [number, number] {
  if (slot.startsWith('today-') || slot.startsWith('season-') || slot.startsWith('track-')) return [1560, 624]; // 5:2, the header
  if (slot.startsWith('phase-') && slot !== 'phase-complete') return [1040, 780]; // 4:3
  if (slot === 'map-river-long') return [600, 1800]; // 1:3
  if (slot.startsWith('streak-') || slot === 'phase-complete' || slot === 'path-complete' || slot === 'empty-state') return [800, 1000]; // 4:5
  if (slot === 'splash') return [1024, 1024];
  return [400, 400]; // the paths' thumbnails
}

type Sharp = (input: string) => {
  resize: (w: number, h: number, o: { fit: 'cover'; position: string }) => Sharp extends (i: string) => infer R ? R : never;
  avif: (o: { quality: number }) => { toBuffer: () => Promise<Buffer> };
  webp: (o: { quality: number }) => { toBuffer: () => Promise<Buffer> };
};

async function main(): Promise<void> {
  let sharp: Sharp;
  try {
    // Resolved at run time: sharp is not a dependency of the app, so the typecheck must not look for it.
    const name = 'sharp';
    sharp = ((await import(name)) as { default: Sharp }).default;
  } catch {
    console.error('art:build needs sharp: npm i -D sharp (it is not a dependency of the app).');
    process.exit(1);
  }
  if (!existsSync(SRC)) {
    console.error('No art-src/ folder: put the originals there, named after their slot (today-morning.png, …).');
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  const manifestPath = join(OUT, 'art.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ArtManifest;
  const files = readdirSync(SRC).filter((f) => /\.(png|jpe?g|webp|avif|tiff?)$/i.test(f) && statSync(join(SRC, f)).isFile());
  let written = 0;
  for (const file of files) {
    const slot = basename(file, extname(file)) as ArtSlot;
    if (!ART_SLOTS.includes(slot)) {
      console.warn('skipped ' + file + ': not a slot (' + ART_SLOTS.join(', ') + ')');
      continue;
    }
    const [width, height] = sizeOf(slot);
    const source = join(SRC, file);
    let quality = 60;
    let avif = await sharp(source).resize(width, height, { fit: 'cover', position: 'attention' }).avif({ quality }).toBuffer();
    while (avif.length > MAX_BYTES && quality > 24) {
      quality -= 6;
      avif = await sharp(source).resize(width, height, { fit: 'cover', position: 'attention' }).avif({ quality }).toBuffer();
    }
    const webp = await sharp(source).resize(width, height, { fit: 'cover', position: 'attention' }).webp({ quality: 78 }).toBuffer();
    writeFileSync(join(OUT, slot + '.avif'), avif);
    writeFileSync(join(OUT, slot + '.webp'), webp);
    console.log(slot + ': ' + Math.round(avif.length / 1024) + ' KB avif (q' + quality + '), ' + Math.round(webp.length / 1024) + ' KB webp');
    if (!manifest.images.some((i) => i.id === slot)) {
      manifest.images.push({
        id: slot,
        file: { avif: slot + '.avif', webp: slot + '.webp' },
        alt: 'TODO: describe the picture in one line',
        focal: { x: 50, y: 50 },
        tone: slot === 'today-night' ? 'both' : 'light',
        slots: [slot],
        credit: 'TODO: who made it, under what licence',
        width,
        height,
      });
    }
    written++;
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(written + ' slot' + (written === 1 ? '' : 's') + ' written; fill in alt, focal and credit in public/art/art.json and CREDITS.md, then npm run validate:data.');
}

void main();
