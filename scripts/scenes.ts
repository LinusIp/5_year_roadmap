/**
 * npm run scenes
 *
 * The daily scenes' build (ATLAS-DAILY-SCENES), a port of the brief's extract_palette.py. For each image in
 * scenes-src/ it writes public/scenes/<id>.avif and .webp (900 px wide at most, never enlarged) and <id>-thumb.*
 * (300 px wide), each under 180 KB, and one entry in public/scenes/scenes.json: a palette drawn from the image by
 * k-means (k = 8) in Lab space, with every text colour moved in lightness, never hue, until it reads:
 *
 *   ink on paper 12 · ink2 on paper 5 · white on every lane colour 4.5 · tint text on its tint 5 · dark text2 on
 *   the dark surface 5
 *
 * The build fails when a palette misses one. An entry already in scenes.json keeps its name, focal point and
 * credit; a new image is named after its file until the name is edited by hand.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { contrast, fit, hueDistance, labToLch, lchToHex, rgbToLab } from '../src/lib/color.ts';
import type { Lab, Lch } from '../src/lib/color.ts';
import { sceneContrasts, sceneFiles, sceneProblems } from '../src/seed/scenes.ts';
import type { Scene } from '../src/seed/scenes.ts';
import { REPO_ROOT } from './lib/load-seed.ts';
import { SCENE_MAX_BYTES, SCENES_DIR } from './lib/load-scenes.ts';

const SRC = join(REPO_ROOT, 'scenes-src');
const LARGE = 900;
const THUMB = 300;
const K = 8;
const INITS = 4;

/* ------------------------------------------------------------------ k-means in Lab */

/** Park–Miller, so the clustering is the same on every machine. */
function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function dist2(a: Lab, b: Lab): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

/** k-means++ seeding, then Lloyd's iterations until the centres settle. */
function kmeansOnce(points: Lab[], k: number, random: () => number): { centres: Lab[]; labels: Int32Array; inertia: number } {
  const centres: Lab[] = [points[Math.floor(random() * points.length)]!];
  const nearest = new Float64Array(points.length).fill(Infinity);
  while (centres.length < k) {
    const last = centres[centres.length - 1]!;
    let total = 0;
    for (let i = 0; i < points.length; i++) {
      const d = dist2(points[i]!, last);
      if (d < nearest[i]!) nearest[i] = d;
      total += nearest[i]!;
    }
    let r = random() * total;
    let pick = points.length - 1;
    for (let i = 0; i < points.length; i++) {
      r -= nearest[i]!;
      if (r <= 0) {
        pick = i;
        break;
      }
    }
    centres.push([...points[pick]!] as Lab);
  }
  const labels = new Int32Array(points.length);
  let inertia = 0;
  for (let iter = 0; iter < 300; iter++) {
    inertia = 0;
    for (let i = 0; i < points.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = dist2(points[i]!, centres[c]!);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      labels[i] = best;
      inertia += bestD;
    }
    const sums: Lab[] = centres.map(() => [0, 0, 0]);
    const counts = new Int32Array(k);
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      const s = sums[labels[i]!]!;
      s[0] += p[0];
      s[1] += p[1];
      s[2] += p[2];
      counts[labels[i]!]!++;
    }
    let moved = 0;
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) continue;
      const next: Lab = [sums[c]![0] / counts[c]!, sums[c]![1] / counts[c]!, sums[c]![2] / counts[c]!];
      moved += dist2(next, centres[c]!);
      centres[c] = next;
    }
    if (moved < 1e-6) break;
  }
  return { centres, labels, inertia };
}

function kmeans(points: Lab[], k: number): { centres: Lab[]; weights: number[] } {
  let best: ReturnType<typeof kmeansOnce> | null = null;
  for (let init = 0; init < INITS; init++) {
    const run = kmeansOnce(points, k, rng(1 + init));
    if (!best || run.inertia < best.inertia) best = run;
  }
  const counts = new Int32Array(k);
  for (const label of best!.labels) counts[label]!++;
  return { centres: best!.centres, weights: [...counts].map((n) => n / points.length) };
}

/* ------------------------------------------------------------------ the palette */

type Cluster = { lch: Lch; weight: number };

export function paletteOf(clusters: Cluster[]): Omit<Scene, 'id' | 'name' | 'image' | 'width' | 'height' | 'focal' | 'credit'> {
  // Paper: from the lightest substantial cluster, kept very light and calm.
  const light = clusters.reduce((a, b) => (b.lch[0] + 30 * b.weight > a.lch[0] + 30 * a.weight ? b : a));
  const [, Cp, Hp] = light.lch;
  const paper = lchToHex([93.5, Math.min(Cp * 0.35, 6), Hp]);
  const shadowDark = lchToHex([82, Math.min(Cp * 0.45, 8), Hp]);

  // Accents: the most colourful clusters (weight a little), hues at least 28° apart, nothing near black.
  const acc: Lch[] = [];
  for (const { lch } of [...clusters].sort((a, b) => b.lch[1] * b.weight ** 0.25 - a.lch[1] * a.weight ** 0.25)) {
    const [L, C, H] = lch;
    if (C < 8 || L < 14) continue;
    if (acc.every((other) => hueDistance(H, other[2]) > 28)) acc.push(lch);
  }
  const darkest = clusters.reduce((a, b) => (b.lch[0] < a.lch[0] ? b : a)).lch;
  // A monochrome image (snow, a grey sketch): the darkest hue, gently tinted.
  if (acc.length === 0) acc.push([45, Math.max(darkest[1], 14), darkest[2]]);
  const base = acc[0]!;
  while (acc.length < 5) {
    // Fill with analogous and complementary hues of the main accent.
    const step = [35, -35, 180, 70, -70][acc.length - 1]!;
    acc.push([base[0], Math.max(base[1], 22) * 0.85, (base[2] + step) % 360]);
  }
  const accents = acc.slice(0, 5);

  const lanes: string[] = [];
  const tints: string[] = [];
  const deco: string[] = [];
  for (const [L, C, H] of accents) {
    const Cc = Math.min(Math.max(C, 20), 60);
    lanes.push(fit(Math.min(Math.max(L, 46), 56), Math.max(Cc, 28), H, '#FFFFFF', 4.6).hex);
    tints.push(lchToHex([90, Math.min(Cc * 0.3, 16), H]));
    deco.push(lchToHex([Math.min(Math.max(L, 55), 72), Cc, H]));
  }
  const tintText = accents.map(([, C, H], i) => fit(35, Math.min(Math.max(C, 20), 50), H, tints[i]!, 5.0).hex);

  const [, Cd, Hd] = darkest;
  const ink = fit(22, Math.min(Cd, 14), Hd, paper, 12).hex;
  const ink2 = fit(44, Math.min(Cd, 12), Hd, paper, 5.2).hex;
  const darkBg = lchToHex([13, Math.min(Cd + 6, 16), Hd]);
  const darkSurface = lchToHex([19, Math.min(Cd + 6, 16), Hd]);
  const darkText = lchToHex([94, 4, Hp]);
  const darkText2 = fit(76, 8, Hd, darkSurface, 5, true).hex;

  const five = (list: string[]): [string, string, string, string, string] => list as [string, string, string, string, string];
  const round = (n: number): number => Math.round(n * 100) / 100;
  return {
    paper,
    shadowDark,
    shadowLight: '#FFFFFF',
    ink,
    ink2,
    primary: lanes[0]!,
    lanes: five(lanes),
    tints: five(tints),
    tintText: five(tintText),
    deco: five(deco),
    dark: { bg: darkBg, surface: darkSurface, text: darkText, text2: darkText2, accent: deco[0]! },
    checks: {
      'ink/paper': round(contrast(ink, paper)),
      'ink2/paper': round(contrast(ink2, paper)),
      'white/primary': round(contrast('#FFFFFF', lanes[0]!)),
      'minWhite/lanes': round(Math.min(...lanes.map((l) => contrast('#FFFFFF', l)))),
      'minTintText': round(Math.min(...tintText.map((t, i) => contrast(t, tints[i]!)))),
      darkText2: round(contrast(darkText2, darkSurface)),
    },
  };
}

/** The clusters of an image, from its pixels as sharp gives them (RGB, 8 bits each). */
export function clustersOf(rgb: Uint8Array | Buffer, k: number = K): Cluster[] {
  const points: Lab[] = [];
  for (let i = 0; i + 2 < rgb.length; i += 3) points.push(rgbToLab([rgb[i]! / 255, rgb[i + 1]! / 255, rgb[i + 2]! / 255]));
  const { centres, weights } = kmeans(points, k);
  return centres.map((c, i) => ({ lch: labToLch(c), weight: weights[i]! }));
}

/* ------------------------------------------------------------------ the files */

function titleOf(stem: string): string {
  return stem.replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

async function main(): Promise<void> {
  const { default: sharp } = await import('sharp');
  if (!existsSync(SRC)) {
    console.error('No scenes-src/ folder: put the scene images there (jpg, png or webp), one per scene.');
    process.exit(1);
  }
  mkdirSync(SCENES_DIR, { recursive: true });
  const manifestPath = join(SCENES_DIR, 'scenes.json');
  const existing: Scene[] = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as Scene[]) : [];
  const files = readdirSync(SRC)
    .filter((f) => /\.(png|jpe?g|webp|avif|tiff?)$/i.test(f) && statSync(join(SRC, f)).isFile())
    .sort();
  if (files.length === 0) {
    console.error('scenes-src/ holds no images.');
    process.exit(1);
  }
  const scenes: Scene[] = [];
  for (const file of files) {
    const id = basename(file, extname(file)).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const source = join(SRC, file);
    const image = sharp(source).rotate();
    const meta = await image.metadata();
    const large = await image.clone().resize({ width: LARGE, withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
    const files = sceneFiles({ image: id + '.webp' });
    const write = async (name: string, width: number, kind: 'avif' | 'webp'): Promise<number> => {
      let quality = kind === 'avif' ? 60 : 82;
      let out = await encode(sharp(source).rotate().resize({ width, withoutEnlargement: true }), kind, quality);
      while (out.length > SCENE_MAX_BYTES && quality > 24) {
        quality -= 6;
        out = await encode(sharp(source).rotate().resize({ width, withoutEnlargement: true }), kind, quality);
      }
      if (out.length > SCENE_MAX_BYTES) throw new Error(name + ' is ' + Math.round(out.length / 1024) + ' KB even at quality ' + quality);
      writeFileSync(join(SCENES_DIR, name), out);
      return out.length;
    };
    const sizes = [await write(files.avif, LARGE, 'avif'), await write(files.webp, LARGE, 'webp'), await write(files.thumbAvif, THUMB, 'avif'), await write(files.thumbWebp, THUMB, 'webp')];

    // The palette: a 120 px wide copy, as the original did, so a stray pixel weighs nothing.
    const small = await image
      .clone()
      .resize({ width: 120 })
      .removeAlpha()
      .raw()
      .toBuffer();
    const palette = paletteOf(clustersOf(small));
    const kept = existing.find((s) => s.id === id);
    const scene: Scene = {
      id,
      name: kept?.name ?? titleOf(id),
      image: files.webp,
      width: large.info.width,
      height: large.info.height,
      ...(kept?.focal ? { focal: kept.focal } : {}),
      ...(kept?.credit ? { credit: kept.credit } : {}),
      ...palette,
    };
    const broken = sceneContrasts(scene).filter((c) => c.ratio < c.need);
    if (broken.length > 0) {
      console.error(id + ': ' + broken.map((c) => c.pair + ' ' + c.ratio.toFixed(2) + ' < ' + c.need).join(', '));
      process.exit(1);
    }
    scenes.push(scene);
    console.log(
      id.padEnd(12) + scene.paper + ' ' + scene.ink + ' ' + scene.lanes.join(' ') + '  ' + sizes.map((n) => Math.round(n / 1024) + 'K').join('/') + '  ' + (meta.width ?? '?') + 'x' + (meta.height ?? '?'),
    );
  }
  // The manifest's order is the cycle's order (src/lib/scenes.ts), so a scene keeps its place: entries already
  // listed stay where they were and new images join at the end.
  const place = (s: Scene): number => {
    const i = existing.findIndex((e) => e.id === s.id);
    return i < 0 ? existing.length + files.findIndex((f) => f.startsWith(s.id)) : i;
  };
  scenes.sort((a, b) => place(a) - place(b));
  const problems = sceneProblems(scenes);
  if (problems.length > 0) {
    for (const p of problems) console.error(p);
    process.exit(1);
  }
  writeFileSync(manifestPath, JSON.stringify(scenes, null, 1) + '\n');
  console.log(scenes.length + ' scenes written to public/scenes/');
}

async function encode(pipeline: import('sharp').Sharp, kind: 'avif' | 'webp', quality: number): Promise<Buffer> {
  return kind === 'avif' ? pipeline.avif({ quality, effort: 6 }).toBuffer() : pipeline.webp({ quality, effort: 5 }).toBuffer();
}

if (process.argv[1] && /scenes\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
