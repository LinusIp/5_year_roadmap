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
    '',
    "self.addEventListener('install', (event) => {",
    '  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));',
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
    '});',
    '',
    "self.addEventListener('fetch', (event) => {",
    '  const request = event.request;',
    "  if (request.method !== 'GET') return;",
    '  const url = new URL(request.url);',
    '  // Cross-origin requests (only the optional GitHub integration makes any) are never touched.',
    '  if (url.origin !== self.location.origin) return;',
    "  if (request.mode === 'navigate') {",
    "    event.respondWith(caches.match('./index.html', { cacheName: CACHE }).then((hit) => hit || fetch(request)));",
    '    return;',
    '  }',
    '  event.respondWith(caches.match(request, { cacheName: CACHE, ignoreSearch: true }).then((hit) => hit || fetch(request)));',
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
