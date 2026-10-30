/**
 * The daily scenes (ATLAS-DAILY-SCENES): which scene a day gets, and the CSS tokens its palette sets.
 *
 * The order is the mockup's: for each cycle of N days the scenes are shuffled (Fisher–Yates over a Park–Miller
 * stream seeded by year × 97 + cycle + 1), so no scene repeats until every one has shown, and the day's index is
 * order[dayOfYear mod N]. Pure: the hooks (src/hooks/useScenes.ts) feed it the date and the preferences.
 */
import { contrast, fitHex, mix, withAlpha } from './color.ts';
import type { Scene } from '../seed/scenes.ts';

export interface ScenePrefs {
  /** The daily scene at all (off: the fixed clay theme). On unless switched off. */
  on: boolean;
  /** Keep this one scene until unpinned. */
  pinned?: string;
  /** "Skip today's scene": on this date, `steps` places further along the order. */
  skipped?: { date: string; steps: number };
  /** Starred scenes; with `favouritesOnly` the rotation runs through them alone. */
  favourites: string[];
  favouritesOnly: boolean;
}

export const DEFAULT_SCENE_PREFS: ScenePrefs = { on: true, favourites: [], favouritesOnly: false };

/** The day of the year, 1 on 1 January, from a local date. */
export function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((day - start) / 86400000);
}

/** The shuffled order of `n` scenes for the cycle that holds `date` (the mockup's exact code). */
export function sceneOrder(date: Date, n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  if (n <= 1) return order;
  const doy = dayOfYear(date);
  let seed = date.getFullYear() * 97 + Math.floor(doy / n) + 1;
  const rnd = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = order[i]!;
    order[i] = order[j]!;
    order[j] = t;
  }
  return order;
}

/** The index of the day's scene among `n`, `steps` further along the order when today's was skipped. */
export function sceneIndex(date: Date, n: number, steps = 0): number {
  if (n <= 0) return 0;
  const order = sceneOrder(date, n);
  const position = dayOfYear(date) % n;
  return order[(position + steps) % n]!;
}

/** YYYY-MM-DD of a local date. */
export function isoOf(date: Date): string {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

export function shiftDate(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export type SceneWhy = 'pinned' | 'skipped' | 'favourite' | 'daily';

/** The scenes the rotation runs through: the starred ones with Favourites only, else all. */
export function rotation(scenes: Scene[], prefs: ScenePrefs): Scene[] {
  if (!prefs.favouritesOnly) return scenes;
  const starred = scenes.filter((s) => prefs.favourites.includes(s.id));
  return starred.length > 0 ? starred : scenes;
}

/** The scene for a date: the pinned one, else the day's (moved along by a skip on that date). */
export function pickScene(scenes: Scene[], date: Date, prefs: ScenePrefs = DEFAULT_SCENE_PREFS): { scene: Scene; why: SceneWhy } | null {
  if (scenes.length === 0) return null;
  const pinned = prefs.pinned ? scenes.find((s) => s.id === prefs.pinned) : undefined;
  if (pinned) return { scene: pinned, why: 'pinned' };
  const pool = rotation(scenes, prefs);
  const skipped = prefs.skipped && prefs.skipped.date === isoOf(date) ? prefs.skipped.steps : 0;
  const scene = pool[sceneIndex(date, pool.length, skipped)]!;
  return { scene, why: skipped > 0 ? 'skipped' : pool !== scenes ? 'favourite' : 'daily' };
}

/** For each scene, the first day from `from` (0 = today) it shows within `days`, pins and skips aside. */
export function upcoming(scenes: Scene[], from: Date, prefs: ScenePrefs = DEFAULT_SCENE_PREFS, days = 30): Map<string, number> {
  const pool = rotation(scenes, prefs);
  const map = new Map<string, number>();
  for (let d = 0; d <= days; d++) {
    const scene = pool[sceneIndex(shiftDate(from, d), pool.length)]!;
    if (!map.has(scene.id)) map.set(scene.id, d);
  }
  return map;
}

/** "Today", "Tomorrow", "In 5 days", or "Later this cycle". */
export function whenText(days: number | undefined): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days !== undefined) return 'In ' + days + ' days';
  return 'Later this cycle';
}

/* ------------------------------------------------------------------ lanes */

/**
 * The lane slot of a block (the brief's table): 0 ML / AI, 1 coding and inference, 2 game development, 3 Hugging
 * Face and LLMs, 4 maths and physics. The curriculum's ids are fixed (C, B, A, H, E; D, the project block, builds
 * what B teaches); any other block takes its place in the plan's order.
 */
const LANE_OF: Record<string, number> = { C: 0, B: 1, A: 2, H: 3, E: 4, D: 1 };

export function laneSlot(block: string | undefined, blocks: { id: string }[] = []): number {
  if (!block) return 0;
  const fixed = LANE_OF[block];
  if (fixed !== undefined) return fixed;
  const index = blocks.findIndex((b) => b.id === block);
  return index < 0 ? 0 : index % 5;
}

/* ------------------------------------------------------------------ tokens */

export type SceneTheme = 'light' | 'dark';

/**
 * Every CSS custom property a scene sets, for one theme: the brief's names (--paper, --sd, --ink, --ink2, --l0…4,
 * --t0…4, --x0…4, --d0…4, --dbg, --dsf, --dtx, --dtx2, --dac) and the app's own tokens swapped onto them. Each
 * text pairing the fixed themes promise is kept by moving lightness at run time (color.ts fit), never hue.
 */
export function sceneTokens(scene: Scene, theme: SceneTheme): Record<string, string> {
  const vars: Record<string, string> = {
    '--paper': scene.paper,
    '--sd': scene.shadowDark,
    '--dbg': scene.dark.bg,
    '--dsf': scene.dark.surface,
    '--dtx': scene.dark.text,
    '--dtx2': scene.dark.text2,
    '--dac': scene.dark.accent,
  };
  const dark = theme === 'dark';
  const bg = dark ? scene.dark.bg : scene.paper;
  const surface = dark ? scene.dark.surface : scene.paper;
  const ink = dark ? scene.dark.text : scene.ink;
  const ink2 = dark ? scene.dark.text2 : scene.ink2;
  for (let i = 0; i < 5; i++) {
    const lane = scene.lanes[i]!;
    const tint = dark ? mix(surface, lane, 0.3) : scene.tints[i]!;
    const text = dark ? fitHex(scene.deco[i]!, tint, 4.5, true) : scene.tintText[i]!;
    vars['--l' + i] = lane;
    vars['--t' + i] = tint;
    vars['--x' + i] = text;
    vars['--d' + i] = scene.deco[i]!;
  }
  vars['--bg'] = bg;
  vars['--ink'] = ink;
  vars['--ink2'] = ink2;
  vars['--ink3'] = mix(ink2, bg, 0.45);
  vars['--deco'] = scene.deco[0]!;
  vars['--gloss'] = dark ? 'rgba(255, 255, 255, .18)' : 'rgba(255, 255, 255, .35)';
  if (!dark) {
    vars['--hi'] = scene.shadowLight;
    vars['--lo'] = scene.shadowDark;
    vars['--edge'] = 'rgba(255, 255, 255, .6)';
    vars['--blue'] = scene.lanes[0]!;
    vars['--blue-deep'] = scene.tintText[0]!;
    vars['--blue-soft'] = scene.tints[0]!;
    vars['--on-blue'] = '#FFFFFF';
    const ice = fitHex(mix(scene.tints[1]!, scene.lanes[1]!, 0.3), ink, 4.5, true);
    vars['--ice'] = ice;
    vars['--ice-top'] = mix(ice, '#FFFFFF', 0.45);
    vars['--ice-soft'] = scene.tints[1]!;
    vars['--ice-deep'] = scene.tintText[1]!;
    vars['--on-ice'] = ink;
    vars['--dash'] = mix(scene.shadowDark, bg, 0.3);
    vars['--ramp-0'] = mix(scene.shadowDark, bg, 0.45);
    vars['--ramp-1'] = scene.tints[0]!;
    vars['--ramp-2'] = fitHex(scene.deco[0]!, ink, 4.5, true);
    vars['--ramp-3'] = scene.lanes[0]!;
    vars['--ramp-4'] = scene.tintText[0]!;
    vars['--scrim'] = withAlpha(scene.ink, 0.35);
  } else {
    vars['--hi'] = mix(surface, '#FFFFFF', 0.06);
    vars['--lo'] = mix(bg, '#000000', 0.45);
    vars['--edge'] = 'rgba(255, 255, 255, .05)';
    const onBlue = mix(bg, '#000000', 0.3);
    const blueSoft = mix(surface, scene.lanes[0]!, 0.35);
    const blue = fitHex(scene.dark.accent, onBlue, 4.5, true);
    vars['--blue'] = blue;
    vars['--blue-deep'] = fitHex(blue, blueSoft, 4.5, true);
    vars['--blue-soft'] = blueSoft;
    vars['--on-blue'] = onBlue;
    const iceSoft = mix(surface, scene.lanes[1]!, 0.35);
    const ice = fitHex(scene.deco[1]!, onBlue, 4.5, true);
    vars['--ice'] = ice;
    vars['--ice-top'] = mix(ice, '#FFFFFF', 0.3);
    vars['--ice-soft'] = iceSoft;
    vars['--ice-deep'] = fitHex(scene.deco[1]!, iceSoft, 4.5, true);
    vars['--on-ice'] = onBlue;
    vars['--dash'] = mix(surface, scene.dark.text2, 0.2);
    vars['--ramp-0'] = mix(bg, '#000000', 0.2);
    vars['--ramp-1'] = blueSoft;
    vars['--ramp-2'] = fitHex(scene.lanes[0]!, ink, 4.5, false);
    vars['--ramp-3'] = fitHex(scene.deco[0]!, bg, 4.5, true);
    vars['--ramp-4'] = vars['--blue-deep']!;
    vars['--scrim'] = 'rgba(0, 0, 0, .45)';
  }
  return vars;
}

/** The colour the phone's status bar takes: the paper, or the dark ground. */
export function sceneCanvas(scene: Scene, theme: SceneTheme): string {
  return theme === 'dark' ? scene.dark.bg : scene.paper;
}

/** The text pairings the tokens promise at 4.5:1 or better, measured: what the unit test checks on every scene. */
export function tokenPairs(vars: Record<string, string>): { pair: string; ratio: number }[] {
  const c = (a: string, b: string): number => contrast(vars[a]!, vars[b]!);
  const pairs: [string, string][] = [
    ['--ink', '--bg'],
    ['--ink2', '--bg'],
    ['--blue-deep', '--bg'],
    ['--ice-deep', '--bg'],
    ['--on-blue', '--blue'],
    ['--on-blue', '--blue-deep'],
    ['--on-ice', '--ice'],
    ['--ink', '--blue-soft'],
    ['--ink2', '--blue-soft'],
    ['--blue-deep', '--blue-soft'],
    ['--ink', '--ice-soft'],
    ['--ink2', '--ice-soft'],
    ['--ice-deep', '--ice-soft'],
    ['--ink', '--ramp-1'],
    ['--ink', '--ramp-2'],
    ['--on-blue', '--ramp-3'],
    ['--on-blue', '--ramp-4'],
    ['--x0', '--t0'],
    ['--x1', '--t1'],
    ['--x2', '--t2'],
    ['--x3', '--t3'],
    ['--x4', '--t4'],
    ['--ink', '--t0'],
    ['--ink', '--t1'],
    ['--ink', '--t2'],
    ['--ink', '--t3'],
    ['--ink', '--t4'],
  ];
  return pairs.map(([a, b]) => ({ pair: a + ' on ' + b, ratio: c(a, b) }));
}
