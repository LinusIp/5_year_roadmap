/**
 * Registers the service worker that the build generates (scripts/lib/vite-plugin-sw.ts).
 *
 * Only in production: the dev server has no sw.js, and a worker caching dev modules would make every edit
 * look like it had no effect. A new version installs in the background and waits; the page offers a reload
 * rather than swapping code under the user mid-session.
 */
type Listener = () => void;

const listeners = new Set<Listener>();
let waiting: ServiceWorker | null = null;

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

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    // Relative to the page, so it works under /5_year_roadmap/ on GitHub Pages and anywhere else.
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) announce(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          installing?.addEventListener('statechange', () => {
            // "installed" with an existing controller means an update, not the first install.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) announce(installing);
          });
        });
      })
      .catch(() => {
        /* Offline support is a bonus; the app works without it. */
      });
  });
}
