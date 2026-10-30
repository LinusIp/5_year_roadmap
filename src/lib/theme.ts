import type { Theme } from '../db/types.ts';
import type { Scene } from '../seed/scenes.ts';
import { sceneCanvas, sceneTokens } from './scenes.ts';

const STORAGE_KEY = 'atlas.theme';
/** The last palette applied, for public/theme-init.js to set before first paint (ATLAS-DAILY-SCENES). */
const SCENE_KEY = 'atlas.scene';
/** The browser bar's colour: the clay --bg of each theme (index.html and the manifest carry the light one). */
const CANVAS = { dark: '#2B2F36', light: '#E6EAE7' } as const;
/** Every token a scene may set, so a switch back to the fixed theme clears them all. */
const SCENE_TOKENS = [
  '--paper', '--sd', '--dbg', '--dsf', '--dtx', '--dtx2', '--dac',
  '--l0', '--l1', '--l2', '--l3', '--l4', '--t0', '--t1', '--t2', '--t3', '--t4', '--x0', '--x1', '--x2', '--x3', '--x4', '--d0', '--d1', '--d2', '--d3', '--d4',
  '--bg', '--hi', '--lo', '--edge', '--ink', '--ink2', '--ink3', '--blue', '--blue-deep', '--blue-soft', '--ice', '--ice-top', '--ice-deep', '--ice-soft', '--on-blue', '--on-ice',
  '--deco', '--dash', '--ramp-0', '--ramp-1', '--ramp-2', '--ramp-3', '--ramp-4', '--gloss', '--scrim',
];

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
  const scene = document.documentElement.dataset.scene;
  if (!scene) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CANVAS[resolved]);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage blocked: the theme still applies for this session */
  }
}

let fadeTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Lays a scene's palette over the fixed theme as inline custom properties on <html> (ATLAS-DAILY-SCENES), for
 * the theme in force, and tells the status bar. A later scene fades in over 300 ms (none with reduced motion:
 * index.css zeroes every transition). `null` clears them: the fixed clay theme returns.
 */
export function applyScene(scene: Scene | null, theme: 'light' | 'dark'): void {
  const root = document.documentElement;
  const before = root.dataset.scene;
  if (scene && before && before !== scene.id) {
    root.classList.add('scene-fade');
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => root.classList.remove('scene-fade'), 350);
  }
  if (!scene) {
    for (const token of SCENE_TOKENS) root.style.removeProperty(token);
    delete root.dataset.scene;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CANVAS[theme]);
    try {
      localStorage.removeItem(SCENE_KEY);
    } catch {
      /* storage blocked */
    }
    return;
  }
  const tokens = sceneTokens(scene, theme);
  for (const [token, value] of Object.entries(tokens)) root.style.setProperty(token, value);
  root.dataset.scene = scene.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', sceneCanvas(scene, theme));
  try {
    // Both themes' tokens, so the first paint after a reload is right whichever theme theme-init.js picks.
    localStorage.setItem(SCENE_KEY, JSON.stringify({ id: scene.id, light: sceneTokens(scene, 'light'), dark: sceneTokens(scene, 'dark'), canvas: { light: scene.paper, dark: scene.dark.bg } }));
  } catch {
    /* storage blocked */
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
