import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { buildServiceWorkerSource } from '../../scripts/lib/vite-plugin-sw.ts';

type Handler = (event: Record<string, unknown>) => void;

/** Runs the generated service worker against fakes of `self` and `caches`. */
function boot(files: string[], version: string, existingCaches: string[] = []) {
  const handlers = new Map<string, Handler>();
  const stored = new Map<string, string[]>(existingCaches.map((name) => [name, []]));
  let skipped = false;
  const caches = {
    open: async (name: string) => ({
      addAll: async (urls: string[]) => {
        stored.set(name, urls);
      },
    }),
    keys: async () => [...stored.keys()],
    delete: async (name: string) => stored.delete(name),
    match: async (req: unknown, opts: { cacheName: string }) => {
      const url = typeof req === 'string' ? req : (req as { url: string }).url;
      const cached = stored.get(opts.cacheName) ?? [];
      return cached.some((u) => url.endsWith(u.replace(/^\.\//, ''))) ? 'cached:' + url : undefined;
    },
  };
  const self = {
    location: { origin: 'https://linusip.github.io' },
    clients: { claim: async () => undefined },
    skipWaiting: () => {
      skipped = true;
    },
    addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
  };
  vm.runInNewContext(buildServiceWorkerSource(files, version), { self, caches, URL, Promise, fetch: async (r: { url: string }) => 'network:' + r.url });
  return { handlers, stored, wasSkipped: () => skipped };
}

async function dispatch(handler: Handler | undefined, event: Record<string, unknown>): Promise<unknown> {
  let result: unknown;
  let responded = false;
  handler!({
    ...event,
    waitUntil: (p: Promise<unknown>) => {
      result = p;
    },
    respondWith: (p: Promise<unknown>) => {
      responded = true;
      result = p;
    },
  });
  return { value: await result, responded };
}

describe('generated service worker', () => {
  const files = ['assets/index-abc.js', 'assets/index-abc.css', 'index.html', 'manifest.webmanifest'];

  it('precaches every built file, relative to its own location', async () => {
    const sw = boot(files, 'v1');
    await dispatch(sw.handlers.get('install'), {});
    expect(sw.stored.get('atlas-v1')).toEqual(['./', './assets/index-abc.js', './assets/index-abc.css', './index.html', './manifest.webmanifest']);
  });

  it('drops caches of older versions on activate, and leaves foreign caches alone', async () => {
    const sw = boot(files, 'v2', ['atlas-v1', 'someone-else']);
    await dispatch(sw.handlers.get('install'), {});
    await dispatch(sw.handlers.get('activate'), {});
    expect([...sw.stored.keys()].sort()).toEqual(['atlas-v2', 'someone-else']);
  });

  it('serves the app shell for navigations, so deep links work offline', async () => {
    const sw = boot(files, 'v1');
    await dispatch(sw.handlers.get('install'), {});
    const res = (await dispatch(sw.handlers.get('fetch'), {
      request: { method: 'GET', mode: 'navigate', url: 'https://linusip.github.io/5_year_roadmap/' },
    })) as { value: string; responded: boolean };
    expect(res.responded).toBe(true);
    expect(res.value).toBe('cached:./index.html');
  });

  it('never intercepts cross-origin requests (the optional GitHub API call) or non-GET requests', async () => {
    const sw = boot(files, 'v1');
    const cross = (await dispatch(sw.handlers.get('fetch'), {
      request: { method: 'GET', mode: 'cors', url: 'https://api.github.com/graphql' },
    })) as { responded: boolean };
    const post = (await dispatch(sw.handlers.get('fetch'), {
      request: { method: 'POST', mode: 'cors', url: 'https://linusip.github.io/5_year_roadmap/x' },
    })) as { responded: boolean };
    expect(cross.responded).toBe(false);
    expect(post.responded).toBe(false);
  });

  it('only skips waiting when the page asks for it', () => {
    const sw = boot(files, 'v1');
    sw.handlers.get('message')!({ data: 'something-else' });
    expect(sw.wasSkipped()).toBe(false);
    sw.handlers.get('message')!({ data: 'skip-waiting' });
    expect(sw.wasSkipped()).toBe(true);
  });
});
