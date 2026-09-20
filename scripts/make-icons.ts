/**
 * node scripts/make-icons.ts
 * Rasterises public/icons/icon.svg into the PNG sizes the web manifest and iOS need.
 * Uses a browser that is already installed (Edge or Chrome) through Playwright, so nothing
 * is downloaded. The PNGs are committed; re-run this only when the icon changes.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import type { Browser } from '@playwright/test';

const ICON_DIR = join(import.meta.dirname, '..', 'public', 'icons');
const svg = readFileSync(join(ICON_DIR, 'icon.svg'), 'utf8');

/** Maskable icons are cropped to a circle or squircle by the OS: full-bleed colour, glyph inside the safe zone. */
const maskable = svg
  .replace(/<rect [^>]*\/>/, '<rect width="512" height="512" fill="#256abf"/>')
  .replace('<path ', '<path transform="translate(256 256) scale(0.72) translate(-256 -256)" ');

const targets: { file: string; size: number; source: string }[] = [
  { file: 'icon-180.png', size: 180, source: maskable },
  { file: 'icon-192.png', size: 192, source: svg },
  { file: 'icon-512.png', size: 512, source: svg },
  { file: 'icon-maskable-512.png', size: 512, source: maskable },
];

async function launch(): Promise<Browser> {
  const failures: string[] = [];
  for (const channel of ['msedge', 'chrome', undefined]) {
    try {
      return await chromium.launch(channel ? { channel } : {});
    } catch (err) {
      failures.push((channel ?? 'bundled chromium') + ': ' + String(err).split('\n')[0]);
    }
  }
  throw new Error('No usable browser found.\n' + failures.join('\n'));
}

const browser = await launch();
try {
  for (const { file, size, source } of targets) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(
      '<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:' + size + 'px;height:' + size + 'px}</style>' + source,
    );
    const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    writeFileSync(join(ICON_DIR, file), png);
    console.log(file.padEnd(24) + size + 'x' + size + '  ' + png.length + ' bytes');
    await page.close();
  }
} finally {
  await browser.close();
}
