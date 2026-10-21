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
 * later when an install fails, since a failed install is otherwise only retried on the next navigation.
 * Settings shows the running version, checks on demand, and can drop the offline copy when nothing else helps.
 */
type Listener = () => void;

const listeners = new Set<Listener>();
let waiting: ServiceWorker | null = null;
let registration: ServiceWorkerRegistration | null = null;
/** The last install's failure, as the worker reported it before giving up. */
let lastFailure: string | null = null;
let lastCheck = 0;
let retries = 0;
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

/** Asks the browser for a new version now and says what it found; `failure()` has the reason after 'failed'. */
export function checkForUpdate(): Promise<UpdateCheck> {
  if (!registration) return Promise.resolve('unavailable');
  if (waiting) return Promise.resolve('ready');
  lastFailure = null;
  return check(registration);
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
 * Drops the offline copy (every registration and cache of the app) and reloads from the site: the way out when a
 * new version keeps failing to install. The user's data lives in IndexedDB and is not touched.
 */
export async function resetOfflineCopy(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
  if ('caches' in globalThis) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('atlas-')).map((k) => caches.delete(k)));
  }
  window.location.reload();
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    // Relative to the page, so it works under /5_year_roadmap/ on GitHub Pages and anywhere else.
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then(attach)
      .catch(() => {
        /* Offline support is a bonus; the app works without it. */
      });
  });
}
