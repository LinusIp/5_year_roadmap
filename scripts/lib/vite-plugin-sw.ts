/**
 * Writes dist/sw.js after the build: a precache list of every emitted file plus a version
 * derived from their contents. Hand-rolled instead of Workbox to keep the dependency tree small;
 * the whole offline story is the ~40 lines of service worker below.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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

export function buildServiceWorkerSource(files: string[], version: string): string {
  const assets = ['./'].concat(files.map((f) => './' + f));
  return [
    '/* Atlas service worker. Generated at build time: do not edit. */',
    'const VERSION = ' + JSON.stringify(version) + ';',
    "const CACHE = 'atlas-' + VERSION;",
    'const ASSETS = ' + JSON.stringify(assets) + ';',
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
      writeFileSync(join(outDir, 'sw.js'), buildServiceWorkerSource(files, version));
      this.info('service worker: ' + files.length + ' files precached, version ' + version);
    },
  };
}
