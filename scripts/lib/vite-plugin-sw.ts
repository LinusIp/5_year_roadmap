/**
 * Writes dist/sw.js after the build: a precache list of every emitted file plus a version
 * derived from their contents. Hand-rolled instead of Workbox to keep the dependency tree small;
 * the whole offline story is the ~40 lines of service worker below.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

function walk(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const abs = join(dir, name);
    const rel = prefix ? prefix + '/' + name : name;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else out.push(rel);
  }
  return out;
}

/** Precached with the build: the manifest and the Today header's set. The other illustrations are cached on first view. */
export function precachedArt(file: string): boolean {
  return !file.startsWith('art/') || file === 'art/art.json' || /^art\/(today|season|track)-/.test(file);
}

/** Scene images (ATLAS-DAILY-SCENES) are never in the build's precache list: the worker picks today's and tomorrow's. */
export function precachedScene(file: string): boolean {
  return !file.startsWith('scenes/');
}

/** The scene ids in the manifest's order (the cycle's order): what the worker's own picker runs over. */
export function sceneIdsFrom(manifest: unknown): string[] {
  return Array.isArray(manifest) ? manifest.map((s: { id?: unknown }) => (typeof s.id === 'string' ? s.id : '')).filter(Boolean) : [];
}

export function buildServiceWorkerSource(files: string[], version: string, sceneIds: string[] = []): string {
  const assets = ['./'].concat(files.filter((f) => precachedArt(f) && precachedScene(f)).map((f) => './' + f));
  return [
    '/* Atlas service worker. Generated at build time: do not edit. */',
    'const VERSION = ' + JSON.stringify(version) + ';',
    "const CACHE = 'atlas-' + VERSION;",
    'const ASSETS = ' + JSON.stringify(assets) + ';',
    '// The daily scenes (ATLAS-DAILY-SCENES), in the cycle\'s order, with the same picker as src/lib/scenes.ts: the',
    '// install caches today\'s and tomorrow\'s files, every other scene is kept once seen, and the page may ask for more.',
    'const SCENES = ' + JSON.stringify(sceneIds) + ';',
    'function sceneIndex(day, n) {',
    '  const doy = Math.round((Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) - Date.UTC(day.getFullYear(), 0, 0)) / 86400000);',
    '  const order = Array.from({ length: n }, (_, i) => i);',
    '  let seed = day.getFullYear() * 97 + Math.floor(doy / n) + 1;',
    '  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };',
    '  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }',
    '  return order[doy % n];',
    '}',
    'function sceneFiles(id) {',
    "  return ['./scenes/' + id + '.avif', './scenes/' + id + '.webp', './scenes/' + id + '-thumb.avif', './scenes/' + id + '-thumb.webp'];",
    '}',
    'function upcomingSceneFiles() {',
    '  if (SCENES.length === 0) return [];',
    '  const now = new Date();',
    '  const ids = new Set();',
    '  for (const shift of [0, 1]) ids.add(SCENES[sceneIndex(new Date(now.getFullYear(), now.getMonth(), now.getDate() + shift), SCENES.length)]);',
    '  return [...ids].flatMap(sceneFiles);',
    '}',
    '// Best effort: a scene that fails to arrive never fails the install.',
    'async function cacheScenes(urls) {',
    '  const cache = await caches.open(CACHE);',
    '  await Promise.all(urls.map((url) => caches.match(url, MATCH).then((hit) => hit || fetch(url).then((r) => (r.ok ? cache.put(url, r) : undefined)).catch(() => undefined))));',
    '}',
    '// Every entry is a build file with a content hash in its name (or the page itself), so the Vary header can be',
    '// ignored. Hosts that send "Vary: Origin" would otherwise miss the cache for every crossorigin script and',
    '// stylesheet Vite emits, which is all of them, and the app would not start offline.',
    "const MATCH = { cacheName: CACHE, ignoreSearch: true, ignoreVary: true };",
    '',
    '// The files are fetched past the browser\'s HTTP cache: GitHub Pages lets it keep a page for ten minutes, so',
    '// a plain fetch in the minutes after a deploy could store the old index.html (and with it the old build) under',
    '// the new version. A file that fails (GitHub Pages answered 503 for one icon in the minute after a deploy, which',
    '// made the whole install fail and left returning users on the old build) is tried three times, a few seconds',
    '// apart, before the install gives up.',
    'const ATTEMPTS = 3;',
    'const RETRY_MS = 2000;',
    'async function fetchFresh(url) {',
    '  for (let attempt = 1; ; attempt++) {',
    '    try {',
    "      const response = await fetch(new Request(url, { cache: 'reload' }));",
    '      if (response.ok) return response;',
    "      if (attempt >= ATTEMPTS) throw new Error(url + ' answered ' + response.status);",
    '    } catch (err) {',
    '      if (attempt >= ATTEMPTS) throw err;',
    '    }',
    '    await new Promise((resolve) => setTimeout(resolve, RETRY_MS * attempt));',
    '  }',
    '}',
    '// A failed install is told to the open pages before the worker is dropped, so Settings can say which file.',
    'async function reportFailure(err) {',
    '  const message = String((err && err.message) || err);',
    '  const clients = await self.clients.matchAll({ includeUncontrolled: true });',
    '  for (const client of clients) client.postMessage({ installFailed: message });',
    '  throw err;',
    '}',
    "self.addEventListener('install', (event) => {",
    '  event.waitUntil(',
    '    caches',
    '      .open(CACHE)',
    '      .then((cache) => Promise.all(ASSETS.map((url) => fetchFresh(url).then((response) => cache.put(url, response)))))',
    '      .then(() => cacheScenes(upcomingSceneFiles()))',
    '      .catch(reportFailure),',
    '  );',
    '});',
    '',
    "self.addEventListener('activate', (event) => {",
    '  event.waitUntil(',
    '    caches.keys()',
    "      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('atlas-') && k !== CACHE).map((k) => caches.delete(k))))",
    '      .then(() => self.clients.claim()),',
    '  );',
    '});',
    '',
    "self.addEventListener('message', (event) => {",
    "  if (event.data === 'skip-waiting') self.skipWaiting();",
    '  // The page asks which build it runs: Settings shows it beside Check for updates.',
    "  if (event.data === 'version' && event.ports[0]) event.ports[0].postMessage(VERSION);",
    '  // The page names scene files to keep (the pinned scene, a preview): cached when they are not already.',
    "  if (event.data && Array.isArray(event.data.cacheScenes)) event.waitUntil(cacheScenes(event.data.cacheScenes.filter((u) => typeof u === 'string' && u.includes('/scenes/'))));",
    '});',
    '',
    "self.addEventListener('fetch', (event) => {",
    '  const request = event.request;',
    "  if (request.method !== 'GET') return;",
    '  const url = new URL(request.url);',
    '  // Cross-origin requests (only the optional GitHub integration makes any) are never touched.',
    '  if (url.origin !== self.location.origin) return;',
    "  if (request.mode === 'navigate') {",
    "    event.respondWith(caches.match('./index.html', MATCH).then((hit) => hit || fetch(request)));",
    '    return;',
    '  }',
    '  // An illustration outside the precached set (ATLAS-ART) or a scene image (ATLAS-DAILY-SCENES): kept once seen,',
    '  // under the same version.',
    "  if (url.pathname.includes('/art/') || url.pathname.includes('/scenes/')) {",
    '    event.respondWith(',
    '      caches.match(request, MATCH).then(',
    '        (hit) =>',
    '          hit ||',
    '          fetch(request).then((response) => {',
    '            if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));',
    '            return response;',
    '          }),',
    '      ),',
    '    );',
    '    return;',
    '  }',
    '  event.respondWith(caches.match(request, MATCH).then((hit) => hit || fetch(request)));',
    '});',
    '',
  ].join('\n');
}

export function atlasServiceWorker(): Plugin {
  let outDir = '';
  let enabled = true;
  return {
    name: 'atlas-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      enabled = !config.build.ssr;
    },
    closeBundle() {
      if (!enabled) return;
      const files = walk(outDir).filter((f) => f !== 'sw.js');
      const hash = createHash('sha256');
      for (const f of files) {
        hash.update(f);
        hash.update(readFileSync(join(outDir, f)));
      }
      const version = hash.digest('hex').slice(0, 12);
      const manifest = join(outDir, 'scenes', 'scenes.json');
      const sceneIds = existsSync(manifest) ? sceneIdsFrom(JSON.parse(readFileSync(manifest, 'utf8'))) : [];
      writeFileSync(join(outDir, 'sw.js'), buildServiceWorkerSource(files, version, sceneIds));
      this.info('service worker: ' + files.length + ' files precached, version ' + version);
    },
  };
}
