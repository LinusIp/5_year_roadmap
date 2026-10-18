import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { open } from './helpers.ts';

/**
 * The heatmaps show the whole year (HEATMAP-FULL-YEAR): 1 January to 31 December with every month named; the days
 * still ahead faint outlines, today ringed in ice, the plan's start marked; the strip opens with this week two thirds
 * across; 2027 all ahead; All years one row of months a year; the Sleep strip marks the nights with no entry.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block', viewport: { width: 412, height: 915 } });

const OCT = new Date('2026-10-18T10:30:00+05:00');
const heatmap = (page: Page, year = 2026): Locator => page.locator('section[aria-labelledby="heatmap-' + year + '"] .fade-strip > div');

test('2026 runs January to December, the days after today faint, today ringed, the plan start marked', async ({ page }) => {
  await page.clock.install({ time: OCT });
  await open(page, './#/activity');
  const strip = heatmap(page);
  await expect(strip.locator('svg text')).toHaveText(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
  await expect(strip.locator('rect[data-date="2026-01-01"]')).toHaveCount(1);
  await expect(strip.locator('rect[data-date="2026-12-31"]')).toHaveCount(1);
  // Every day after 18 October is "not yet": a faint outline, not the empty cell of a day with nothing logged.
  const ahead = await strip.locator('rect').evaluateAll((rects) => rects.filter((r) => (r.getAttribute('data-date') ?? '') > '2026-10-18').map((r) => [r.getAttribute('data-phase'), r.getAttribute('class')!.split(' ')[0]].join(' ')));
  expect(ahead).toHaveLength(74);
  expect(new Set(ahead)).toEqual(new Set(['future heat-future']));
  const futureStyle = await strip.locator('rect[data-date="2026-10-19"]').evaluate((r) => [getComputedStyle(r).fill, getComputedStyle(r).opacity]);
  expect(futureStyle).toEqual(['none', '0.4']);
  expect(await strip.locator('rect[data-date="2026-10-10"]').getAttribute('class')).toMatch(/^heat-0/);
  const todayCell = strip.locator('rect[data-date="2026-10-18"]');
  await expect(todayCell).toHaveAttribute('data-phase', 'today');
  await expect(todayCell).toHaveAttribute('stroke', 'var(--ice-deep)');
  await expect(todayCell).toHaveAttribute('stroke-width', '2');
  await expect(strip.getByRole('img', { name: 'Plan started 21 Sep' })).toHaveCount(1);
});

test('the strip opens with this week about two thirds across, and fades on both sides', async ({ page }) => {
  await page.clock.install({ time: OCT });
  await open(page, './#/activity');
  const strip = heatmap(page);
  const week = strip.locator('rect[data-date="2026-10-18"]');
  await expect(week).toBeInViewport();
  const where = await strip.evaluate((el) => {
    const cell = el.querySelector('rect[data-date="2026-10-18"]')!.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return (cell.left + cell.width / 2 - box.left) / box.width;
  });
  expect(where).toBeGreaterThan(0.6);
  expect(where).toBeLessThan(0.73);
  const frame = strip.locator('..');
  await expect(frame).toHaveAttribute('data-fade-start', 'true');
  await expect(frame).toHaveAttribute('data-fade-end', 'true');
  // Cells stay readable: 10 px with a 3 px gap.
  const [w, next] = await strip.evaluate((el) => {
    const a = el.querySelector('rect[data-date="2026-10-12"]')!.getBoundingClientRect();
    const b = el.querySelector('rect[data-date="2026-10-19"]')!.getBoundingClientRect();
    return [a.width, b.left - a.left];
  });
  expect(w).toBeCloseTo(10, 0);
  expect(next).toBeCloseTo(13, 0);
});

test('on a wide screen the whole year fits without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.clock.install({ time: OCT });
  await open(page, './#/activity');
  const strip = heatmap(page);
  await expect(strip.locator('rect[data-date="2026-12-31"]')).toBeInViewport();
  await expect(strip.locator('rect[data-date="2026-01-01"]')).toBeInViewport();
  expect(await strip.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
});

test('2027 is all ahead, and All years shows a row of months a year that opens its year', async ({ page }) => {
  await page.clock.install({ time: OCT });
  await open(page, './#/activity');
  await page.getByRole('button', { name: '2027', exact: true }).click();
  const strip = heatmap(page, 2027);
  await expect(strip.locator('rect')).toHaveCount(365);
  expect(new Set(await strip.locator('rect').evaluateAll((rects) => rects.map((r) => r.getAttribute('data-phase'))))).toEqual(new Set(['future']));

  await page.getByRole('button', { name: 'All years', exact: true }).click();
  const all = page.locator('section[aria-labelledby="heatmap-all"]');
  await expect(all.getByRole('button')).toHaveCount(6);
  await expect(all.getByRole('button').first()).toHaveAccessibleName(/^2026: /);
  await expect(all.getByRole('button').last()).toHaveAccessibleName(/^2031: 0 h\. Open 2031$/);
  await all.getByRole('button', { name: /^2028: / }).click();
  await expect(page).toHaveURL(/year=2028/);
  await expect(heatmap(page, 2028)).toBeVisible();
});

test("the Sleep strip shows a night with no entry as a faint dash, and says so", async ({ page }) => {
  await page.clock.install({ time: OCT });
  await open(page, './#/sleep');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').getByText(/^Saved /)).toBeVisible();
  await open(page, './#/activity');
  const tile = page.getByRole('link', { name: /^Sleep / });
  await expect(tile).toHaveAccessibleName(/1 of the last 30 nights logged, 29 no entry/);
  await expect(tile.getByText('30 nights ago')).toBeVisible();
  await expect(tile.getByText('last night')).toBeVisible();
});
