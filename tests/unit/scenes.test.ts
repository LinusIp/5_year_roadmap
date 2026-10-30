/**
 * ATLAS-DAILY-SCENES: the day's scene (a permutation per cycle, stable for a date, the mockup's exact numbers),
 * pin, skip and favourites, every shipped palette's contrast, the tokens a scene sets, the lane slots, the
 * service worker's own picker, and the palette build's rules.
 */
import vm from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { contrast, fit, hexToLch, lchToHex } from '../../src/lib/color.ts';
import { DEFAULT_SCENE_PREFS, dayOfYear, laneSlot, pickScene, rotation, sceneCanvas, sceneIndex, sceneOrder, sceneTokens, tokenPairs, upcoming, whenText } from '../../src/lib/scenes.ts';
import { applyScene } from '../../src/lib/theme.ts';
import { SCENE_CONTRAST, sceneContrasts, sceneFiles, sceneProblems } from '../../src/seed/scenes.ts';
import type { Scene } from '../../src/seed/scenes.ts';
import { loadScenes } from '../../scripts/lib/load-scenes.ts';
import { paletteOf } from '../../scripts/scenes.ts';
import { buildServiceWorkerSource, sceneIdsFrom } from '../../scripts/lib/vite-plugin-sw.ts';

const shipped = loadScenes();
const SCENES = shipped.scenes ?? [];

/** A scene with a sound palette, for the picker tests. */
function scene(id: string, extra: Partial<Scene> = {}): Scene {
  const base = SCENES[0]!;
  return { ...base, id, name: id, image: id + '.webp', ...extra };
}
const ten = Array.from({ length: 10 }, (_, i) => scene('s' + i));

describe('the order', () => {
  it('is a permutation that repeats no scene within a cycle and reshuffles for the next', () => {
    const n = 17;
    const first = new Date(2027, 0, 1); // day 1 of 2027: cycle 0 holds days 1 to 16, cycle 1 starts on day 17
    const order = sceneOrder(first, n);
    expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
    const cycle = new Set<number>();
    for (let d = 0; d < 16; d++) cycle.add(sceneIndex(new Date(2027, 0, 1 + d), n));
    expect(cycle.size).toBe(16);
    expect(sceneOrder(new Date(2027, 0, 17), n)).not.toEqual(order);
  });

  it('is stable for a date and the same whatever the hour', () => {
    expect(sceneOrder(new Date(2026, 9, 30, 0, 1), 17)).toEqual(sceneOrder(new Date(2026, 9, 30, 23, 59), 17));
    expect(sceneIndex(new Date(2026, 9, 30, 7), 17)).toBe(sceneIndex(new Date(2026, 9, 30, 22), 17));
  });

  it('is the mockup’s exact code: 30 October 2026 is day 303 and picks the eleventh of seventeen', () => {
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
    expect(dayOfYear(new Date(2026, 11, 31))).toBe(365);
    expect(dayOfYear(new Date(2026, 9, 30))).toBe(303);
    // The order the mockup's Today artboard computes for that day (seed 2026 × 97 + 17 + 1).
    expect(sceneOrder(new Date(2026, 9, 30), 17)).toEqual([11, 5, 14, 15, 7, 16, 3, 4, 8, 12, 13, 2, 0, 1, 10, 6, 9]);
    expect(sceneIndex(new Date(2026, 9, 30), 17)).toBe(10);
    expect(SCENES[10]?.id).toBe('snowtree');
  });

  it('copes with one scene and with none', () => {
    expect(sceneOrder(new Date(2026, 9, 30), 1)).toEqual([0]);
    expect(sceneIndex(new Date(2026, 9, 30), 1)).toBe(0);
    expect(sceneIndex(new Date(2026, 9, 30), 0)).toBe(0);
    expect(pickScene([], new Date())).toBeNull();
  });
});

describe('pin, skip and favourites', () => {
  const day = new Date(2026, 9, 30);
  const daily = pickScene(ten, day)!;

  it('picks the day’s scene by default', () => {
    expect(daily.why).toBe('daily');
    expect(daily.scene.id).toBe('s' + sceneIndex(day, 10));
  });

  it('keeps a pinned scene whatever the day, and ignores a pin to a scene that is gone', () => {
    expect(pickScene(ten, day, { ...DEFAULT_SCENE_PREFS, pinned: 's3' })).toEqual({ scene: ten[3], why: 'pinned' });
    expect(pickScene(ten, new Date(2027, 3, 4), { ...DEFAULT_SCENE_PREFS, pinned: 's3' })!.scene.id).toBe('s3');
    expect(pickScene(ten, day, { ...DEFAULT_SCENE_PREFS, pinned: 'gone' })).toEqual(daily);
  });

  it('skips to the next in the order for that day only', () => {
    const order = sceneOrder(day, 10);
    const position = dayOfYear(day) % 10;
    const skipped = pickScene(ten, day, { ...DEFAULT_SCENE_PREFS, skipped: { date: '2026-10-30', steps: 1 } })!;
    expect(skipped.why).toBe('skipped');
    expect(skipped.scene.id).toBe('s' + order[(position + 1) % 10]);
    expect(pickScene(ten, day, { ...DEFAULT_SCENE_PREFS, skipped: { date: '2026-10-30', steps: 2 } })!.scene.id).toBe('s' + order[(position + 2) % 10]);
    // Another day: the skip no longer applies.
    expect(pickScene(ten, new Date(2026, 9, 31), { ...DEFAULT_SCENE_PREFS, skipped: { date: '2026-10-30', steps: 1 } })!.why).toBe('daily');
    // A pin wins over a skip.
    expect(pickScene(ten, day, { ...DEFAULT_SCENE_PREFS, pinned: 's7', skipped: { date: '2026-10-30', steps: 1 } })!.scene.id).toBe('s7');
  });

  it('rotates through the starred scenes alone with Favourites only, and through all when none is starred', () => {
    const prefs = { ...DEFAULT_SCENE_PREFS, favourites: ['s2', 's5', 's8'], favouritesOnly: true };
    expect(rotation(ten, prefs).map((s) => s.id)).toEqual(['s2', 's5', 's8']);
    const seen = new Set<string>();
    for (let d = 0; d < 30; d++) {
      const picked = pickScene(ten, new Date(2026, 9, 1 + d), prefs)!;
      expect(picked.why).toBe('favourite');
      seen.add(picked.scene.id);
    }
    expect([...seen].sort()).toEqual(['s2', 's5', 's8']);
    expect(rotation(ten, { ...prefs, favourites: [] })).toBe(ten);
    expect(rotation(ten, { ...prefs, favouritesOnly: false })).toBe(ten);
    expect(pickScene(ten, day, { ...prefs, favourites: ['gone'] })!.why).toBe('daily');
  });

  it('says when each scene next shows', () => {
    const next = upcoming(ten, day);
    expect(next.get(daily.scene.id)).toBe(0);
    expect(next.size).toBe(10);
    expect([...next.values()].every((d) => d >= 0 && d <= 30)).toBe(true);
    expect(whenText(0)).toBe('Today');
    expect(whenText(1)).toBe('Tomorrow');
    expect(whenText(5)).toBe('In 5 days');
    expect(whenText(undefined)).toBe('Later this cycle');
  });
});

describe('the shipped palettes', () => {
  it('load, with the images beside them, and every scene keeps every promise of the table', () => {
    expect(shipped.errors).toEqual([]);
    expect(SCENES.length).toBeGreaterThanOrEqual(1);
    for (const s of SCENES) {
      for (const c of sceneContrasts(s)) expect(c.ratio, s.id + ' ' + c.pair).toBeGreaterThanOrEqual(c.need);
      expect(s.primary).toBe(s.lanes[0]);
      expect(sceneFiles(s)).toEqual({ avif: s.id + '.avif', webp: s.id + '.webp', thumbAvif: s.id + '-thumb.avif', thumbWebp: s.id + '-thumb.webp' });
    }
    expect(SCENE_CONTRAST['ink/paper']).toBe(12);
  });

  it('names what is wrong: a bad shape, a duplicate id, a broken promise', () => {
    expect(sceneProblems([])[0]).toMatch(/scenes\.json/);
    expect(sceneProblems([{ ...SCENES[0], paper: 'white' }])[0]).toMatch(/paper/);
    expect(sceneProblems([SCENES[0], SCENES[0]])).toContain('scenes.json: two scenes with the id ' + SCENES[0]!.id);
    const faded = { ...SCENES[0]!, ink: '#9A9A9A' };
    expect(sceneProblems([faded]).some((p) => /ink\/paper is [\d.]+, under 12/.test(p))).toBe(true);
  });
});

describe('the tokens', () => {
  it('set the brief’s names and the app’s own, and every text pairing reads at 4.5:1 or better in both themes', () => {
    for (const s of SCENES) {
      for (const theme of ['light', 'dark'] as const) {
        const vars = sceneTokens(s, theme);
        for (const name of ['--paper', '--sd', '--ink', '--ink2', '--l0', '--l4', '--t0', '--t4', '--x0', '--x4', '--d0', '--d4', '--dbg', '--dsf', '--dtx', '--dtx2', '--dac', '--bg', '--blue', '--blue-deep', '--ice-deep', '--ramp-4']) {
          expect(vars[name], s.id + ' ' + theme + ' ' + name).toMatch(/^#[0-9A-F]{6}$/);
        }
        for (const p of tokenPairs(vars)) expect(p.ratio, s.id + ' ' + theme + ' ' + p.pair).toBeGreaterThanOrEqual(4.5);
      }
      const light = sceneTokens(s, 'light');
      expect(light['--bg']).toBe(s.paper);
      expect(light['--lo']).toBe(s.shadowDark);
      expect(light['--ink']).toBe(s.ink);
      expect(light['--blue']).toBe(s.lanes[0]);
      const dark = sceneTokens(s, 'dark');
      expect(dark['--bg']).toBe(s.dark.bg);
      expect(dark['--ink']).toBe(s.dark.text);
      expect(dark['--ink2']).toBe(s.dark.text2);
      expect(sceneCanvas(s, 'light')).toBe(s.paper);
      expect(sceneCanvas(s, 'dark')).toBe(s.dark.bg);
    }
  });

  it('maps the blocks to the brief’s lane slots, and any other block to its place in the plan', () => {
    expect(['C', 'B', 'A', 'H', 'E', 'D'].map((b) => laneSlot(b))).toEqual([0, 1, 2, 3, 4, 1]);
    expect(laneSlot(undefined)).toBe(0);
    expect(laneSlot('Z', [{ id: 'X' }, { id: 'Z' }])).toBe(1);
    expect(laneSlot('Z', [])).toBe(0);
  });
});

describe('applying a scene', () => {
  const set = new Map<string, string>();
  const meta = { content: '', setAttribute: (_n: string, v: string) => void (meta.content = v) };
  const classes = new Set<string>();
  const root = {
    style: { setProperty: (k: string, v: string) => void set.set(k, v), removeProperty: (k: string) => void set.delete(k) },
    dataset: {} as Record<string, string | undefined>,
    classList: { add: (c: string) => void classes.add(c), remove: (c: string) => void classes.delete(c) },
  };
  const stored = new Map<string, string>();
  afterEach(() => vi.unstubAllGlobals());

  it('writes the custom properties on the root, the status bar colour and a copy for the first paint; null clears them', () => {
    vi.stubGlobal('document', { documentElement: root, querySelector: () => meta });
    vi.stubGlobal('localStorage', { setItem: (k: string, v: string) => void stored.set(k, v), removeItem: (k: string) => void stored.delete(k) });
    const s = SCENES[0]!;
    applyScene(s, 'light');
    expect(set.get('--bg')).toBe(s.paper);
    expect(set.get('--l0')).toBe(s.lanes[0]);
    expect(root.dataset.scene).toBe(s.id);
    expect(meta.content).toBe(s.paper);
    const copy = JSON.parse(stored.get('atlas.scene')!) as { id: string; light: Record<string, string>; dark: Record<string, string>; canvas: { light: string; dark: string } };
    expect(copy.id).toBe(s.id);
    expect(copy.dark['--bg']).toBe(s.dark.bg);
    expect(copy.canvas.dark).toBe(s.dark.bg);
    // The dark theme: the dark set.
    applyScene(s, 'dark');
    expect(set.get('--bg')).toBe(s.dark.bg);
    expect(meta.content).toBe(s.dark.bg);
    // A second scene fades in.
    expect(classes.has('scene-fade')).toBe(false);
    applyScene(SCENES[1] ?? scene('other'), 'dark');
    expect(classes.has('scene-fade')).toBe(true);
    // Off: the fixed theme's colour and no properties left.
    applyScene(null, 'light');
    expect(set.size).toBe(0);
    expect(root.dataset.scene).toBeUndefined();
    expect(meta.content).toBe('#E6EAE7');
    expect(stored.has('atlas.scene')).toBe(false);
  });
});

describe('the service worker', () => {
  it('reads the ids in the manifest’s order and picks the same scene as the app for every day of two years', () => {
    const ids = sceneIdsFrom(SCENES);
    expect(ids).toEqual(SCENES.map((s) => s.id));
    const source = buildServiceWorkerSource(['index.html', 'scenes/lakehouse.webp', 'scenes/lakehouse-thumb.webp'], 'v1', ids);
    expect(source).toContain('const SCENES = ' + JSON.stringify(ids));
    // Scene files are never in the install list; the worker caches today's and tomorrow's itself.
    expect(source).not.toMatch(/ASSETS = \[[^\]]*scenes\//);
    expect(source).toContain('cacheScenes(upcomingSceneFiles())');
    expect(source).toContain("url.pathname.includes('/scenes/')");
    const body = /function sceneIndex\(day, n\) \{[\s\S]*?\n\}/.exec(source)![0];
    const worker = vm.runInNewContext(body + '; sceneIndex', {}) as (d: Date, n: number) => number;
    for (let d = 0; d < 730; d++) {
      const day = new Date(2026, 0, 1 + d);
      expect(worker(day, ids.length), day.toDateString()).toBe(sceneIndex(day, ids.length));
    }
  });
});

describe('the palette build', () => {
  const cluster = (L: number, C: number, H: number, weight: number) => ({ lch: [L, C, H] as [number, number, number], weight });

  it('picks the most colourful clusters with hues at least 28° apart, skips near-black ones, and keeps every promise', () => {
    const p = paletteOf([cluster(92, 4, 220, 0.4), cluster(50, 45, 100, 0.2), cluster(48, 40, 110, 0.1), cluster(45, 38, 220, 0.15), cluster(10, 30, 30, 0.05), cluster(55, 30, 330, 0.1)]);
    const hues = p.lanes.map((l) => hexToLch(l)[2]);
    // The 110° cluster is within 28° of the 100° one, so it is not a lane; the near-black 30° one is skipped.
    expect(Math.round(hues[0]!)).toBeGreaterThan(90);
    expect(Math.round(hues[0]!)).toBeLessThan(110);
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) expect(Math.min(Math.abs(hues[i]! - hues[j]!), 360 - Math.abs(hues[i]! - hues[j]!))).toBeGreaterThan(20);
    const checked = sceneContrasts({ ...scene('t'), ...p });
    for (const c of checked) expect(c.ratio, c.pair).toBeGreaterThanOrEqual(c.need);
    expect(p.checks['ink/paper']).toBeGreaterThanOrEqual(12);
  });

  it('gives a monochrome image a gently tinted palette from its darkest hue', () => {
    const p = paletteOf([cluster(90, 2, 250, 0.6), cluster(60, 3, 250, 0.3), cluster(20, 4, 250, 0.1)]);
    expect(p.lanes).toHaveLength(5);
    expect(new Set(p.lanes).size).toBe(5);
    expect(hexToLch(p.lanes[0]!)[1]).toBeGreaterThan(20);
    for (const c of sceneContrasts({ ...scene('m'), ...p })) expect(c.ratio, c.pair).toBeGreaterThanOrEqual(c.need);
  });

  it('fit moves lightness, never hue', () => {
    const { hex } = fit(60, 40, 100, '#FFFFFF', 4.6);
    expect(contrast(hex, '#FFFFFF')).toBeGreaterThanOrEqual(4.6);
    expect(Math.abs(hexToLch(hex)[2] - 100)).toBeLessThan(3);
    expect(lchToHex(hexToLch('#7C7720'))).toBe('#7C7720');
  });
});
