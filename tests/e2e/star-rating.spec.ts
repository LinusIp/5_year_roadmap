import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FIRST_DAY, nowCard, open } from './helpers.ts';

/**
 * The curated star rating (ATLAS-STAR-RATING): the audit's `quality` as five stars under each row's type tile, on the
 * sheet with its label, on Today, in search; a minimum-rating control (All, ★3+, ★4+, ★5) with live counts; a tooltip
 * on hover and on a long press.
 */
test.use({ timezoneId: 'Asia/Tashkent' });

const shown = async (page: Page): Promise<number> => Number((await page.getByRole('heading', { name: /^[\d,]+ of [\d,]+$/ }).innerText()).split(' of ')[0]!.replace(/,/g, ''));
const countOf = async (page: Page, name: RegExp): Promise<number> => Number(((await page.getByRole('radiogroup', { name: 'Minimum rating' }).getByRole('radio', { name }).getAttribute('aria-label')) ?? '').replace(/^.*, /, '').replace(/,/g, ''));

test('stars sit under the type tile of the Library\'s rows and of search results, and the row says them', async ({ page }) => {
  await open(page, './#/library?type=book');
  const tile = page.locator('ul.rows [data-type-tile]').first();
  await expect(tile).toBeVisible();
  await expect(tile.locator('[data-quality]')).toHaveCount(1);
  // The stack is hidden from assistive tech; the row describes it ("Book, quality 5 of 5: Canon").
  const first = page.getByRole('list').getByRole('button').first();
  await expect(first).toHaveAccessibleDescription(/^Book, quality [1-5] of 5: (Canon|Strong|Useful|Limited|Minimal)$/);
  // The stars add no more than 4 px to a 60 px row.
  const row = await page.locator('ul.rows > li').first().boundingBox();
  expect(row!.height).toBeLessThanOrEqual(64 + 2 * 8 + 4);
  // Search results have them too.
  await open(page, './#/library');
  await page.getByRole('searchbox', { name: 'Search the library' }).fill('FlashAttention');
  await expect(page.locator('ul.rows [data-type-tile] [data-quality]').first()).toBeVisible();
});

test('the sheet shows the rating in words with the way to how it is rated, and the tooltip opens on hover and on a long press', async ({ page }) => {
  await open(page, './#/library/stanford-cs229');
  const sheet = page.getByRole('dialog');
  const rating = sheet.getByRole('img', { name: 'Quality 5 of 5: Canon' });
  await expect(rating).toBeVisible();
  await expect(rating).toContainText('Canon');
  await expect(sheet.getByText('Best in class. The classics experts tell you to read.')).toBeVisible();
  await rating.hover();
  await expect(page.getByRole('tooltip')).toContainText('Best in class');
  await page.mouse.move(0, 0);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  // A long press (a touch held about half a second) opens it too.
  await rating.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
  await page.waitForTimeout(700);
  await expect(page.getByRole('tooltip')).toContainText('Canon');
  await rating.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true });
  await sheet.getByRole('link', { name: 'How quality is rated' }).click();
  await expect(page).toHaveURL(/#\/settings\?section=quality/);
  await expect(page.getByRole('heading', { name: 'How quality is rated' })).toBeVisible();
});

test('★4+ hides the 3-star rows, the counts follow every other filter, and the old "Canon only" link opens ★5', async ({ page }) => {
  await open(page, './#/library?type=course');
  const all = await shown(page);
  const three = await countOf(page, /^3 stars and up/);
  const four = await countOf(page, /^4 stars and up/);
  const five = await countOf(page, /^5 stars/);
  expect(three).toBeLessThanOrEqual(all);
  expect(four).toBeLessThan(three);
  expect(five).toBeLessThan(four);
  await page.getByRole('radiogroup', { name: 'Minimum rating' }).getByRole('radio', { name: /^4 stars and up/ }).click();
  await expect(page).toHaveURL(/rating=4/);
  await expect.poll(() => shown(page)).toBe(four);
  await expect(page.locator('ul.rows [data-quality="3"], ul.rows [data-quality="2"], ul.rows [data-quality="1"]')).toHaveCount(0);
  // Another filter changes the counts live.
  await page.getByRole('group', { name: 'Level and roadmap' }).getByRole('button', { name: 'Advanced' }).click();
  await expect.poll(() => countOf(page, /^4 stars and up/)).toBeLessThan(four);
  // "Rating (high → low)" from the Sort picker puts the canon rows first.
  await page.getByRole('group', { name: 'Level and roadmap' }).getByRole('button', { name: /^Sort/ }).click();
  await page.getByRole('dialog', { name: 'Sort' }).getByRole('button', { name: /^Rating/ }).click();
  await expect(page).toHaveURL(/sort=rating/);
  await expect(page.locator('ul.rows [data-quality]').first()).toHaveAttribute('data-quality', '5');
  // An address saved with the old toggle opens ★5.
  await open(page, './#/library?type=course&canon=1');
  await expect(page).toHaveURL(/rating=5/);
  await expect(page).not.toHaveURL(/canon=1/);
  await expect(page.getByRole('radiogroup', { name: 'Minimum rating' }).getByRole('radio', { name: /^5 stars/ })).toHaveAttribute('aria-checked', 'true');
});

test('Today shows the rating of the resource the Now block works on', async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
  // At 10:30 Now is the Hugging Face LLM Course, graded 4.
  await page.clock.setFixedTime(new Date('2026-09-21T10:30:00+05:00'));
  await open(page, './');
  await expect(nowCard(page).getByRole('img', { name: 'Quality 4 of 5: Strong' })).toBeVisible();
});

test('at 360 px nothing overflows, the stack is no wider than its tile, and the rating control keeps 44 px targets', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await open(page, './#/library?type=course');
  const tile = page.locator('ul.rows [data-type-tile]').first();
  await expect(tile).toBeVisible();
  const box = await tile.boundingBox();
  const stars = await tile.locator('svg').last().boundingBox();
  expect(stars!.width).toBeLessThanOrEqual(40.5);
  expect(box!.width).toBeLessThanOrEqual(40.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  for (const radio of await page.getByRole('radiogroup', { name: 'Minimum rating' }).getByRole('radio').all()) {
    expect((await radio.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});
