/**
 * Registers the service worker that the build generates (scripts/lib/vite-plugin-sw.ts).
 *
 * Only in production: the dev server has no sw.js, and a worker caching dev modules would make every edit
 * look like it had no effect. A new version installs in the background and waits; the page offers a reload
 * rather than swapping code under the user mid-session.
 *
 * The page asks for updates itself (on open, and when it comes back into view) rather than leaving it all to
 * the browser's check on navigation, watches an install that was already under way when the page loaded (the
 * page was reloaded while the files downloaded: `updatefound` fired then, not now), and tries again a little
 * later when an install fails, since a failed install is otherwise only retried on the next navigation. A
 * registration that fails (the app opened from its cache while the network was away, so `register` could not fetch
 * sw.js, though the old worker kept serving) is tried again later too, when the network is back and when the page
 * comes back into view: without that the page never asked for an update again for as long as it stayed open, and a
 * phone fell builds behind. Settings shows the running version, checks on demand (registering first if that failed),
 * and can drop the offline copy when nothing else helps.
 */
type Listener = () => void;

const listeners = new Set<Listener>();
let waiting: ServiceWorker | null = null;
let registration: ServiceWorkerRegistration | null = null;
/** The last install's failure, as the worker reported it before giving up. */
let lastFailure: string | null = null;
let lastCheck = 0;
let retries = 0;
/** A registration under way, so a second ask joins it instead of registering twice. */
let registering: Promise<ServiceWorkerRegistration | null> | null = null;
let registerRetries = 0;
const RETRY_AFTER_MS = [20_000, 60_000, 180_000];
const CHECK_EVERY_MS = 60_000;

function announce(worker: ServiceWorker): void {
  waiting = worker;
  for (const listener of listeners) listener();
}

/** Calls `listener` when an update is ready. Returns an unsubscribe function. */
export function onUpdateReady(listener: Listener): () => void {
  listeners.add(listener);
  if (waiting) listener();
  return () => listeners.delete(listener);
}

export function applyUpdate(): void {
  if (!waiting) {
    window.location.reload();
    return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  waiting.postMessage('skip-waiting');
}

/** What a check for updates found. */
export type UpdateCheck = 'ready' | 'latest' | 'failed' | 'unavailable';

function hasController(): boolean {
  return Boolean(navigator.serviceWorker?.controller);
}

/**
 * Follows a worker through its install: announced once installed behind a running version (a first install
 * is not an update), `onFailed` when it is dropped before it ever got there.
 */
function follow(worker: ServiceWorker, onFailed: () => void): Promise<'ready' | 'failed'> {
  return new Promise((resolve) => {
    let installed = worker.state !== 'installing' && worker.state !== 'parsed';
    if (worker.state === 'installed') {
      if (hasController()) announce(worker);
      resolve('ready');
      return;
    }
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') {
        installed = true;
        if (hasController()) announce(worker);
        resolve('ready');
      } else if (worker.state === 'redundant' && !installed) {
        onFailed();
        resolve('failed');
      }
    });
  });
}

function scheduleRetry(reg: ServiceWorkerRegistration): void {
  const delay = RETRY_AFTER_MS[retries];
  if (delay === undefined) return;
  retries += 1;
  setTimeout(() => void check(reg), delay);
}

function check(reg: ServiceWorkerRegistration): Promise<UpdateCheck> {
  lastCheck = Date.now();
  return reg
    .update()
    .then(() => {
      const worker = reg.installing ?? reg.waiting;
      if (!worker) return 'latest' as const;
      // A first install (no version running yet) is not an update to offer.
      return follow(worker, () => scheduleRetry(reg)).then((result) => (result === 'ready' && !hasController() ? 'latest' : result));
    })
    .catch(() => 'failed' as const);
}

/** Attaches to the registration: an update already waiting or installing, and the ones found from now on. */
export function attach(reg: ServiceWorkerRegistration): void {
  registration = reg;
  if (reg.waiting && hasController()) announce(reg.waiting);
  if (reg.installing) void follow(reg.installing, () => scheduleRetry(reg));
  reg.addEventListener('updatefound', () => {
    if (reg.installing) void follow(reg.installing, () => scheduleRetry(reg));
  });
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    const data: unknown = event.data;
    if (data && typeof data === 'object' && 'installFailed' in data) lastFailure = String((data as { installFailed: unknown }).installFailed);
  });
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - lastCheck > CHECK_EVERY_MS) void check(reg);
    });
  }
  void check(reg);
}

function canRegister(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof navigator.serviceWorker?.register === 'function';
}

/**
 * The registration, made now if the page has none yet: the one the browser already holds for this scope (the worker
 * serving the page), else a fresh `register`, which fetches sw.js and rejects when the site cannot be reached. A
 * rejection keeps the reason for Settings and tries again later: in 20 s, a minute and three minutes, and when the
 * network comes back or the page comes back into view (`attachRetries`).
 */
export function ensureRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (registration) return Promise.resolve(registration);
  if (registering) return registering;
  if (!canRegister()) return Promise.resolve(null);
  const sw = navigator.serviceWorker;
  registering = (typeof sw.getRegistration === 'function' ? sw.getRegistration('./').catch(() => undefined) : Promise.resolve(undefined))
    .then((existing) => existing ?? sw.register('./sw.js', { scope: './' }))
    .then((reg) => {
      lastFailure = null;
      registerRetries = 0;
      attach(reg);
      return reg;
    })
    .catch((error: unknown) => {
      lastFailure = error instanceof Error ? error.message : String(error);
      const delay = RETRY_AFTER_MS[registerRetries];
      if (delay !== undefined) {
        registerRetries += 1;
        setTimeout(() => void ensureRegistration(), delay);
      }
      return null;
    })
    .finally(() => {
      registering = null;
    });
  return registering;
}

/** The network back, or the page back in view, is a reason to try a failed registration again. */
function attachRetries(): void {
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('online', () => void ensureRegistration());
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !registration && !registering) void ensureRegistration();
    });
  }
}

/**
 * Asks the browser for a new version now and says what it found; `failure()` has the reason after 'failed'. Without
 * a registration (it failed when the page opened, or never ran) it registers first; 'unavailable' is a page that
 * cannot register at all, the dev server or a browser without service workers.
 */
export function checkForUpdate(): Promise<UpdateCheck> {
  if (waiting) return Promise.resolve('ready');
  lastFailure = null;
  if (registration) return check(registration);
  if (!canRegister()) return Promise.resolve('unavailable');
  return ensureRegistration().then((reg) => (reg ? (waiting ? 'ready' : check(reg)) : 'failed'));
}

export function failure(): string | null {
  return lastFailure;
}

/** The version of the build the page runs, from the worker serving it; null without one, or on a worker too old to say. */
export function runningVersion(): Promise<string | null> {
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return Promise.resolve(null);
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 2_000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(typeof event.data === 'string' ? event.data : null);
    };
    controller.postMessage('version', [channel.port2]);
  });
}

/**
 * Drops the offline copy (every registration and cache of the app) and loads the page again from the site: the way
 * out when a new version keeps failing to install. The user's data lives in IndexedDB and is not touched. Each step
 * is tried on its own, so a browser that refuses one does not stop the rest, and the page is fetched with a fresh
 * address (`?reset=<time>` before the hash) so the HTTP cache cannot hand back the index.html it already has.
 * Resolves with what went wrong when a step failed, for the screen to show; the navigation follows either way.
 */
export async function resetOfflineCopy(): Promise<string | null> {
  const problems: string[] = [];
  const say = (step: string, error: unknown): void => {
    problems.push(step + ': ' + (error instanceof Error ? error.message : String(error)));
  };
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof navigator.serviceWorker.getRegistrations === 'function') {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch (error) {
      say('unregister', error);
    }
  }
  if ('caches' in globalThis) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('atlas-')).map((k) => caches.delete(k)));
    } catch (error) {
      say('caches', error);
    }
  }
  registration = null;
  waiting = null;
  const { origin, pathname, hash } = window.location;
  window.location.replace(origin + pathname + '?reset=' + Date.now() + hash);
  return problems.length > 0 ? problems.join('; ') : null;
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !canRegister()) return;
  attachRetries();
  // Relative to the page, so it works under /5_year_roadmap/ on GitHub Pages and anywhere else. After `load` so the
  // first paint is not competing with the worker's install; now if the page has already loaded.
  if (document.readyState === 'complete') void ensureRegistration();
  else window.addEventListener('load', () => void ensureRegistration());
}
