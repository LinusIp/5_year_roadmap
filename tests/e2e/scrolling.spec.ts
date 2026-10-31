import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { open } from './helpers.ts';

/**
 * Scrolling in clay (CLAY-STYLE, HIDE-SCROLLBARS): no visible scrollbar anywhere, and the page and strips still
 * scroll; horizontal strips open at the latest item (the heatmap with this week two thirds across, HEATMAP-FULL-YEAR), with a 24 px fade from the background over a side where more
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
  for (const path of ['./', './#/activity?year=2026']) {
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

test('the heatmap opens with this week in view, and fades on whichever side has more', async ({ page }) => {
  await page.clock.install({ time: NOV });
  await open(page, './#/activity?year=2026');
  const strip = heatmap(page);
  await expect(strip).toBeVisible();
  await expect(strip.locator('rect[data-date="2026-11-18"]')).toBeInViewport();
  // In November two thirds across would pass December's end: the strip stops there, the earlier months hidden.
  await expect.poll(() => fades(strip)).toBe('true false');
  const before = await strip.evaluate((el) => getComputedStyle(el.parentElement!, '::before').backgroundImage);
  expect(before).toContain('linear-gradient');
  // Swiped back to January, the fade moves to the other side.
  await strip.evaluate((el) => (el.scrollLeft = 0));
  await expect.poll(() => fades(strip)).toBe('false true');
});

test('on a screen wide enough for the year, the heatmap shows it all and does not scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.clock.install({ time: NOV });
  await open(page, './#/activity?year=2026');
  const strip = heatmap(page);
  await expect(strip.locator('rect[data-date="2026-01-01"]')).toBeInViewport();
  expect(await strip.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  expect(await fades(strip)).toBe('false false');
});

test('a chip row opens with the selected chip in view, and fades only on a side with more chips', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await open(page, './#/activity?year=2026');
  const row = page.getByRole('group', { name: 'Year and track' });
  await expect(row.getByRole('button', { name: '2026', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => fades(row)).toBe('false true');
  await row.evaluate((el) => (el.scrollLeft = el.scrollWidth));
  await expect.poll(() => fades(row)).toBe('true false');
});

test('the phase map opens at the current phase, whose card is wholly on the screen', async ({ page }) => {
  // The redesign's map is one vertical route down the page: the page scrolls, and it opens with the current phase's
  // card in the middle of the screen (the route runs on above and below it).
  await page.clock.install({ time: new Date('2027-09-15T10:30:00+05:00') });
  await open(page, './#/plan/map');
  const now = page.locator('li[aria-current="step"] > div');
  await expect(now).toContainText(/you are here/i);
  await expect.poll(async () => {
    const box = (await now.boundingBox())!;
    return box.x >= 0 && box.x + box.width <= 412 && box.y >= 0 && box.y + box.height <= 915;
  }).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});
