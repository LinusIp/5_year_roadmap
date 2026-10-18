import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { open } from './helpers.ts';

/**
 * Scrolling in clay (CLAY-STYLE): no visible scrollbar anywhere; horizontal strips open at the latest item and fade
 * 24 px into the background on a side where more is hidden, never a bar.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });

const fades = (strip: Locator) => strip.evaluate((el) => [el.dataset.fadeStart, el.dataset.fadeEnd].join(' '));

test('no scrollbar is drawn, on the page or a strip, and scrolling still works', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-18T10:30:00+05:00') });
  await open(page, './#/activity');
  // The chip row draws once Activity has its data.
  await expect(page.getByRole('group', { name: 'Year and track' })).toBeVisible();
  const widths = await page.evaluate(() => [document.documentElement, document.body, document.querySelector('[role="group"][aria-label="Year and track"]')!].map((el) => getComputedStyle(el).scrollbarWidth));
  expect(widths).toEqual(['none', 'none', 'none']);
  // The page still scrolls, with no bar taking width from it.
  expect(await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth)).toBe(0);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test('the heatmap opens at this week and fades where the earlier weeks are hidden', async ({ page }) => {
  // The year's last week: this week is at the right edge, the months before it hidden on the left.
  await page.clock.install({ time: new Date('2026-12-30T10:30:00+05:00') });
  await open(page, './#/activity');
  const strip = page.locator('section[aria-labelledby="heatmap-2026"] .edge-fade');
  await expect(strip).toHaveAttribute('data-fade-start', 'true');
  expect(await fades(strip)).toBe('true false');
  const mask = await strip.evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage);
  expect(mask).toContain('linear-gradient');
  // Scrolled to the start, the fade moves to the other side.
  await strip.evaluate((el) => (el.scrollLeft = 0));
  await expect.poll(() => fades(strip)).toBe('false true');
});

test('a chip row opens with the selected chip in view, and fades only on a side with more chips', async ({ page }) => {
  await open(page, './#/activity');
  const row = page.getByRole('group', { name: 'Year and track' });
  await expect(row.getByRole('button', { name: '2026', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => fades(row)).toBe('false true');
  await row.evaluate((el) => (el.scrollLeft = el.scrollWidth));
  await expect.poll(() => fades(row)).toBe('true false');
});

test('the phase map opens with the current phase in view, and fades on the side of the later phases', async ({ page }) => {
  await page.clock.install({ time: new Date('2027-09-15T10:30:00+05:00') });
  await open(page, './#/plan/map');
  const strip = page.locator('main > .edge-fade');
  const now = page.locator('li[aria-current="step"]');
  await expect(now).toContainText('Now');
  // Wholly in view across: the card is taller than the screen, so only its width is measured.
  const box = (await now.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(await fades(strip)).toBe('true true');
});
