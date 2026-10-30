/**
 * ATLAS-ART: the manifest's rules, which slot a moment picks, and the placeholder when a slot has no image.
 */
import { describe, expect, it } from 'vitest';
import { precachedArt } from '../../scripts/lib/vite-plugin-sw.ts';
import { loadArtManifest } from '../../scripts/lib/load-art.ts';
import { ART_SLOTS, artManifestProblems } from '../../src/seed/art.ts';
import type { ArtManifest } from '../../src/seed/art.ts';
import { artFor, pathSlot, phaseSlot, placeholderSlots, seasonSlot, streakSlot, timeOfDaySlot, todaySlot, trackSlot } from '../../src/lib/art.ts';
import { motifOf } from '../../src/ui/ArtPlaceholder.tsx';

const image = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  file: { avif: id + '.avif', webp: id + '.webp' },
  alt: 'Misty mountains at dawn',
  focal: { x: 50, y: 40 },
  tone: 'light',
  slots: ['today-morning'],
  credit: 'Made by the user',
  width: 1560,
  height: 624,
  ...extra,
});

describe('the manifest', () => {
  it('accepts a well-formed file, and the committed one', () => {
    expect(artManifestProblems({ version: 1, images: [image('morning')] })).toEqual([]);
    const committed = loadArtManifest();
    expect(committed.errors).toEqual([]);
    expect(committed.manifest?.images).toEqual([]);
  });

  it('names what is wrong: a bad shape, a file outside public/art, two images for one slot and theme', () => {
    expect(artManifestProblems({ version: 2, images: [] })[0]).toMatch(/version/);
    expect(artManifestProblems({ version: 1, images: [image('a', { tone: 'sepia' })] })[0]).toMatch(/tone/);
    expect(artManifestProblems({ version: 1, images: [image('a', { file: { avif: '../x.avif', webp: 'x.webp' } })] })[0]).toMatch(/file\.avif/);
    expect(artManifestProblems({ version: 1, images: [image('a', { slots: ['today-dusk'] })] })[0]).toMatch(/slots/);
    expect(artManifestProblems({ version: 1, images: [image('a'), image('a')] })).toContain('art.json: two images with the id a');
    expect(artManifestProblems({ version: 1, images: [image('a'), image('b')] })).toContain('art.json: b and a both fill today-morning in the light theme');
    // One for each theme is fine; "both" clashes with either.
    expect(artManifestProblems({ version: 1, images: [image('a'), image('b', { tone: 'dark' })] })).toEqual([]);
    expect(artManifestProblems({ version: 1, images: [image('a'), image('b', { tone: 'both' })] })).toHaveLength(1);
  });
});

describe('which slot a moment picks', () => {
  it('follows the hour', () => {
    expect([4, 5, 10, 11, 16, 17, 20, 21, 23].map(timeOfDaySlot)).toEqual(['today-night', 'today-morning', 'today-morning', 'today-midday', 'today-midday', 'today-evening', 'today-evening', 'today-night', 'today-night']);
  });

  it('follows the season, or the block\'s track with the hour as the fallback', () => {
    expect([1, 3, 5, 6, 8, 9, 11, 12].map(seasonSlot)).toEqual(['season-winter', 'season-spring', 'season-spring', 'season-summer', 'season-summer', 'season-autumn', 'season-autumn', 'season-winter']);
    expect(trackSlot('ai', 9)).toBe('track-ai');
    expect(trackSlot('gamedev', 9)).toBe('track-graphics');
    expect(trackSlot('career', 9)).toBe('today-morning');
    expect(trackSlot(undefined, 22)).toBe('today-night');
    const morning = new Date('2026-10-30T08:30:00');
    expect(todaySlot('time', morning)).toBe('today-morning');
    expect(todaySlot('season', morning)).toBe('season-autumn');
    expect(todaySlot('track', morning, 'math')).toBe('track-math');
  });

  it('gives each year of the plan its stretch of the river, and the milestones their cards', () => {
    expect(([1, 2, 3, 4, 5] as const).map((year) => phaseSlot({ year }))).toEqual(['phase-y1-foundations', 'phase-y2-building', 'phase-y3-systems', 'phase-y4-engineering', 'phase-y5-engineering']);
    expect([6, 7, 8, 29, 30, 99, 100, 101].map(streakSlot)).toEqual([null, 'streak-7', null, null, 'streak-30', null, 'streak-100', null]);
    expect(pathSlot('ai')).toBe('path-ai');
    expect(pathSlot('research')).toBeNull();
  });
});

describe('the image for a slot', () => {
  const manifest: ArtManifest = {
    version: 1,
    images: [image('light', { slots: ['today-morning', 'phase-y1-foundations'] }), image('dark', { tone: 'dark', slots: ['today-morning'] }), image('both', { tone: 'both', slots: ['today-night'] })] as ArtManifest['images'],
  };

  it('is the one for the theme, then one for both, then (in the dark only) the light one dimmed', () => {
    expect(artFor(manifest, 'today-morning', 'light')?.image.id).toBe('light');
    expect(artFor(manifest, 'today-morning', 'dark')).toMatchObject({ image: { id: 'dark' }, dimmed: false });
    expect(artFor(manifest, 'today-night', 'light')?.image.id).toBe('both');
    expect(artFor(manifest, 'today-night', 'dark')?.image.id).toBe('both');
    expect(artFor(manifest, 'phase-y1-foundations', 'dark')).toMatchObject({ image: { id: 'light' }, dimmed: true });
    // A dark-only image is never shown in the light theme.
    expect(artFor({ version: 1, images: [image('d', { tone: 'dark' })] as ArtManifest['images'] }, 'today-morning', 'light')).toBeNull();
  });

  it('falls back to the placeholder when the slot has no image, and lists those slots', () => {
    expect(artFor(manifest, 'streak-7', 'light')).toBeNull();
    expect(artFor(null, 'today-morning', 'light')).toBeNull();
    expect(placeholderSlots(manifest, ['today-morning', 'today-night', 'streak-7'])).toEqual(['streak-7']);
    expect(placeholderSlots({ version: 1, images: [] }, ART_SLOTS)).toHaveLength(ART_SLOTS.length);
  });

  it('has a drawn motif for every slot', () => {
    for (const slot of ART_SLOTS) expect(typeof motifOf(slot)).toBe('string');
    expect(motifOf('today-night')).toBe('night');
    expect(motifOf('map-river-long')).toBe('tall-river');
    expect(motifOf('path-quantum')).toBe('wash');
  });
});

describe('the service worker', () => {
  it('precaches the manifest and the Today set, and leaves the rest to the first view', () => {
    expect(precachedArt('art/art.json')).toBe(true);
    expect(precachedArt('art/today-morning.avif')).toBe(true);
    expect(precachedArt('art/season-autumn.webp')).toBe(true);
    expect(precachedArt('art/phase-y2-building.avif')).toBe(false);
    expect(precachedArt('assets/index-abc.js')).toBe(true);
  });
});
