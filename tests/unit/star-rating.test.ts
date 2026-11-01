import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { byRating, passesRating, ratingFrom } from '../../src/lib/rating.ts';
import { byFit } from '../../src/lib/library-home.ts';
import { QUALITY_SCALE, qualityLabel, StarRating, tileDescription } from '../../src/ui/StarRating.tsx';
import type { Quality } from '../../src/ui/StarRating.tsx';

/** The curated star rating (ATLAS-STAR-RATING): a presentation of the audit's `quality`, never a field of its own. */
const html = (value: number | undefined, extra: Record<string, unknown> = {}): string => renderToStaticMarkup(createElement(StarRating, { value, ...extra }));
const filled = (markup: string): number => (markup.match(/data-filled="true"/g) ?? []).length;
const stars = (markup: string): number => (markup.match(/<path /g) ?? []).length;

describe('StarRating', () => {
  it('fills as many of the five stars as the grade, and renders nothing without one', () => {
    for (const q of [1, 2, 3, 4, 5]) {
      const markup = html(q);
      expect(stars(markup), String(q)).toBe(5);
      expect(filled(markup), String(q)).toBe(q);
    }
    expect(html(undefined)).toBe('');
    expect(html(0)).toBe('');
    expect(html(3.5)).toBe('');
  });

  it('is one image with its label, the stars hidden; a hidden rating is out of the tree', () => {
    const markup = html(4);
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Quality 4 of 5: Strong"');
    expect(markup).toContain('<svg aria-hidden="true"');
    const hidden = html(5, { hidden: true });
    expect(hidden).not.toContain('role="img"');
    expect(hidden).toContain('aria-hidden="true"');
    expect(html(5, { withLabel: true })).toContain('>Canon</span>');
  });

  it('says the scale in words', () => {
    expect(([5, 4, 3, 2, 1] as Quality[]).map((q) => QUALITY_SCALE[q].label)).toEqual(['Canon', 'Strong', 'Useful', 'Limited', 'Minimal']);
    expect(qualityLabel(5)).toBe('Quality 5 of 5: Canon');
    expect(qualityLabel(3)).toBe('Quality 3 of 5: Useful');
    expect(tileDescription('Article', 5)).toBe('Article, quality 5 of 5: Canon');
    expect(tileDescription('Book', undefined)).toBe('Book');
    expect(QUALITY_SCALE[2].tip).toContain('covers a topic you asked for');
  });
});

describe('the minimum rating and the rating sort', () => {
  it('lets an ungraded row through ★4+ and below, never ★5', () => {
    expect(passesRating(undefined, null)).toBe(true);
    expect(passesRating(undefined, '3')).toBe(true);
    expect(passesRating(undefined, '4')).toBe(true);
    expect(passesRating(undefined, '5')).toBe(false);
    expect(passesRating(3, '4')).toBe(false);
    expect(passesRating(3, '3')).toBe(true);
    expect(passesRating(5, '5')).toBe(true);
    expect(passesRating(1, null)).toBe(true);
  });

  it('turns the old "Canon only" (canon=1) into ★5, and keeps a rating already set', () => {
    expect(ratingFrom(null, '1')).toBe('5');
    expect(ratingFrom('4', '1')).toBe('4');
    expect(ratingFrom('4', null)).toBe('4');
    expect(ratingFrom(null, null)).toBeNull();
    expect(ratingFrom('7', null)).toBeNull();
  });

  it('sorts by rating, high to low (an ungraded row as 4), then by the plan order', () => {
    const items = [
      { id: 'q3-p1', priority: 1, quality: 3 },
      { id: 'none-p1', priority: 1 },
      { id: 'q5-p3', priority: 3, quality: 5 },
      { id: 'q4-p2', priority: 2, quality: 4 },
      { id: 'q5-p1', priority: 1, quality: 5 },
    ];
    expect([...items].sort(byRating).map((i) => i.id)).toEqual(['q5-p1', 'q5-p3', 'none-p1', 'q4-p2', 'q3-p1']);
    // The default order stays priority, then quality.
    expect([...items].sort(byFit).map((i) => i.id)).toEqual(['q5-p1', 'none-p1', 'q3-p1', 'q4-p2', 'q5-p3']);
  });
});

describe('the star tokens', () => {
  const lum = (hex: string): number => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const contrast = (a: string, b: string): number => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const css = readFileSync('src/index.css', 'utf8');
  const block = (theme: string): string => css.slice(css.indexOf(':root[data-theme="' + theme + '"]'), css.indexOf('}', css.indexOf(':root[data-theme="' + theme + '"]')));
  const token = (text: string, name: string): string => text.match(new RegExp('--' + name + ': (#[0-9A-Fa-f]{6})'))![1]!;

  it('fill the stars at 3:1 or more on every card and tile tint, light and dark', () => {
    for (const theme of ['light', 'dark']) {
      const t = block(theme);
      const star = token(t, 'star');
      for (const ground of ['bg', 'hi', 'blue-soft', 'ice-soft']) expect(contrast(star, token(t, ground)), theme + ' on ' + ground).toBeGreaterThanOrEqual(3);
    }
  });
});
