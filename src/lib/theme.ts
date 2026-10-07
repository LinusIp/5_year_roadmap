import type { Theme } from '../db/types.ts';

const STORAGE_KEY = 'atlas.theme';
const CANVAS = { dark: '#121417', light: '#f2f3f1' } as const;

export function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * The setting itself lives in IndexedDB with the rest. It is mirrored to localStorage only because
 * IndexedDB is asynchronous and public/theme-init.js has to pick the theme before first paint.
 */
export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CANVAS[resolved]);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage blocked: the theme still applies for this session */
  }
}

/** Re-applies a "system" theme when the OS switches. Returns an unsubscribe function. */
export function watchSystemTheme(getTheme: () => Theme): () => void {
  const media = window.matchMedia('(prefers-color-scheme: light)');
  const onChange = (): void => {
    if (getTheme() === 'system') applyTheme('system');
  };
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
