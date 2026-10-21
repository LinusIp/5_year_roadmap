import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { buildServiceWorkerSource } from '../../scripts/lib/vite-plugin-sw.ts';

type Handler = (event: Record<string, unknown>) => void;

class FakeRequest {
  url: string;
  cache: string | undefined;
  constructor(url: string, init?: { cache?: string }) {
    this.url = url;
    this.cache = init?.cache;
  }
}

/** Runs the generated service worker against fakes of `self` and `caches`. */
function boot(files: string[], version: string, existingCaches: string[] = [], answers: Record<string, number[]> = {}) {
  const handlers = new Map<string, Handler>();
  const stored = new Map<string, string[]>(existingCaches.map((name) => [name, []]));
  const modes: string[] = [];
  const attempts: string[] = [];
  let skipped = false;
  const caches = {
    open: async (name: string) => ({
      put: async (url: string, response: { ok: boolean }) => {
        if (!response.ok) throw new Error('put of a failed response');
        stored.set(name, [...(stored.get(name) ?? []), url]);
      },
    }),
    keys: async () => [...stored.keys()],
    delete: async (name: string) => stored.delete(name),
    // Like a host that sends "Vary: Origin": a request carrying an Origin header misses unless Vary is ignored.
    match: async (req: unknown, opts: { cacheName: string; ignoreVary?: boolean }) => {
      const url = typeof req === 'string' ? req : (req as { url: string }).url;
      const origin = typeof req === 'string' ? undefined : (req as { headers?: Record<string, string> }).headers?.origin;
      if (origin && !opts.ignoreVary) return undefined;
      const cached = stored.get(opts.cacheName) ?? [];
      return cached.some((u) => url.endsWith(u.replace(/^\.\//, ''))) ? 'cached:' + url : undefined;
    },
  };
  const told: unknown[] = [];
  const self = {
    location: { origin: 'https://linusip.github.io' },
    clients: { claim: async () => undefined, matchAll: async () => [{ postMessage: (m: unknown) => told.push(m) }] },
    skipWaiting: () => {
      skipped = true;
    },
    addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
  };
  // The install's fetches answer as `answers` says for that URL (a status per attempt, 200 once the list runs out);
  // a page's fetch falls through to the network.
  const fetch = async (r: FakeRequest | { url: string }) => {
    if (!(r instanceof FakeRequest)) return 'network:' + r.url;
    modes.push(r.cache ?? 'default');
    attempts.push(r.url);
    const status = answers[r.url]?.shift() ?? 200;
    return { ok: status >= 200 && status < 300, status, url: r.url };
  };
  vm.runInNewContext(buildServiceWorkerSource(files, version), { self, caches, URL, Promise, Request: FakeRequest, fetch, Error, setTimeout: (fn: () => void) => fn() });
  return { handlers, stored, modes, attempts, told, wasSkipped: () => skipped };
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
    expect([...sw.stored.get('atlas-v1')!].sort()).toEqual(['./', './assets/index-abc.css', './assets/index-abc.js', './index.html', './manifest.webmanifest']);
  });

  it('tries a file that fails again, a few times, so a host\'s hiccup after a deploy cannot leave users on the old build', async () => {
    const sw = boot(files, 'v1', [], { './index.html': [503], './manifest.webmanifest': [503, 500] });
    await dispatch(sw.handlers.get('install'), {});
    expect(sw.stored.get('atlas-v1')).toHaveLength(5);
    expect(sw.attempts.filter((u) => u === './index.html')).toHaveLength(2);
    expect(sw.attempts.filter((u) => u === './manifest.webmanifest')).toHaveLength(3);
    // Three failures are a failed install, as before, and the open pages are told which file, so Settings can say.
    const broken = boot(files, 'v2', [], { './index.html': [503, 503, 503] });
    await expect(dispatch(broken.handlers.get('install'), {})).rejects.toThrow(/answered 503/);
    expect(broken.told).toEqual([{ installFailed: './index.html answered 503' }]);
  });

  it('tells a page its version when asked, over the port the page sends', () => {
    const sw = boot(files, 'v7');
    const answers: unknown[] = [];
    sw.handlers.get('message')!({ data: 'version', ports: [{ postMessage: (m: unknown) => answers.push(m) }] });
    expect(answers).toEqual(['v7']);
    sw.handlers.get('message')!({ data: 'version', ports: [] });
    expect(answers).toEqual(['v7']);
  });

  it('fetches them past the HTTP cache, so a fresh install never stores the old build\'s page', async () => {
    const sw = boot(files, 'v1');
    await dispatch(sw.handlers.get('install'), {});
    expect(sw.modes).toHaveLength(5);
    expect(sw.modes.every((m) => m === 'reload')).toBe(true);
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

  it('serves crossorigin scripts and stylesheets from the cache even when the host varies on Origin', async () => {
    const sw = boot(files, 'v1');
    await dispatch(sw.handlers.get('install'), {});
    const res = (await dispatch(sw.handlers.get('fetch'), {
      request: { method: 'GET', mode: 'cors', url: 'https://linusip.github.io/5_year_roadmap/assets/index-abc.js', headers: { origin: 'https://linusip.github.io' } },
    })) as { value: string };
    expect(res.value).toBe('cached:https://linusip.github.io/5_year_roadmap/assets/index-abc.js');
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
