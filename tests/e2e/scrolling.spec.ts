import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { open } from './helpers.ts';

/**
 * Scrolling in clay (CLAY-STYLE, HIDE-SCROLLBARS): no visible scrollbar anywhere, and the page and strips still
 * scroll; horizontal strips open at the latest item, with a 24 px fade from the background over a side where more
 * is hidden instead of a bar; a card wide enough for the year shows it all; a strip with nothing focusable in it is
 * a labelled region that Tab reaches and the arrow keys scroll.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block', viewport: { width: 412, height: 915 } });

const NOV = new Date('2026-11-18T10:30:00+05:00');
/** A strip's frame says which sides fade: "start end", each true or false. */
const fades = (scroller: Locator) => scroller.evaluate((el) => [el.parentElement!.dataset.fadeStart, el.parentElement!.dataset.fadeEnd].join(' '));
const heatmap = (page: Page) => page.locator('section[aria-labelledby="heatmap-2026"] .fade-strip > div');

test('no scrollbar is drawn on the page or a heatmap, and Today and Activity still scroll to the bottom', async ({ page }) => {
  await page.clock.install({ time: NOV });
  for (const path of ['./', './#/activity']) {
    await open(page, path);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    if (path.includes('activity')) await expect(heatmap(page)).toBeVisible();
    const widths = await page.evaluate(() => [document.documentElement, document.body, ...document.querySelectorAll('.fade-strip > div')].map((el) => getComputedStyle(el).scrollbarWidth));
    expect(new Set(widths)).toEqual(new Set(['none']));
    // No bar takes width from the page, and the wheel still reaches the bottom.
    expect(await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth)).toBe(0);
    await page.mouse.move(200, 400);
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 1)).toBe(true);
  }
});

test('the heatmap opens scrolled to this week, and the left fade shows only while earlier weeks are hidden', async ({ page }) => {
  await page.clock.install({ time: NOV });
  await open(page, './#/activity');
  const strip = heatmap(page);
  await expect(strip).toBeVisible();
  // At its end: scrollLeft is the maximum, and this week is the grid's last column.
  await expect.poll(() => strip.evaluate((el) => Math.abs(el.scrollWidth - el.clientWidth - el.scrollLeft) <= 1 && el.scrollLeft > 0)).toBe(true);
  await expect(strip.locator('rect[data-date="2026-11-18"]')).toBeInViewport();
  await expect(strip.locator('rect[data-date="2026-11-30"]')).toHaveCount(0);
  await expect.poll(() => fades(strip)).toBe('true false');
  const before = await strip.evaluate((el) => getComputedStyle(el.parentElement!, '::before').backgroundImage);
  expect(before).toContain('linear-gradient');
  // Swiped back to January, the left fade goes; scrolled right again, it comes back.
  await strip.evaluate((el) => (el.scrollLeft = 0));
  await expect.poll(() => fades(strip)).toBe('false true');
  await strip.evaluate((el) => (el.scrollLeft = 120));
  await expect.poll(() => fades(strip)).toBe('true true');
});

test('on a screen wide enough for the year, the heatmap shows it all and does not scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.clock.install({ time: NOV });
  await open(page, './#/activity');
  const strip = heatmap(page);
  await expect(strip.locator('rect[data-date="2026-01-01"]')).toBeInViewport();
  expect(await strip.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  expect(await fades(strip)).toBe('false false');
});

test('a chip row opens with the selected chip in view, and fades only on a side with more chips', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await open(page, './#/activity');
  const row = page.getByRole('group', { name: 'Year and track' });
  await expect(row.getByRole('button', { name: '2026', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => fades(row)).toBe('false true');
  await row.evaluate((el) => (el.scrollLeft = el.scrollWidth));
  await expect.poll(() => fades(row)).toBe('true false');
});

test('the phase map opens at the current phase, and is a region that Tab reaches and the arrow keys scroll', async ({ page }) => {
  await page.clock.install({ time: new Date('2027-09-15T10:30:00+05:00') });
  await open(page, './#/plan/map');
  const strip = page.getByRole('region', { name: 'Five-year map, scroll for the other phases' });
  const now = page.locator('li[aria-current="step"]');
  await expect(now).toContainText('Now');
  // Wholly in view across: the card is taller than the screen, so only its width is measured.
  const box = (await now.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(412);
  expect(await fades(strip)).toBe('true true');

  await strip.focus();
  await expect(strip).toBeFocused();
  const outline = await strip.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe('solid');
  const from = await strip.evaluate((el) => el.scrollLeft);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => strip.evaluate((el) => el.scrollLeft)).toBeGreaterThan(from);
});
