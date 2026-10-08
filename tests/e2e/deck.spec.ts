import { expect, test } from '@playwright/test';
import { FIRST_DAY, laterRow, open, reload } from './helpers.ts';

/** The project deck (section 4.0, Motion): Shuffle, Skip, Take it, and what each leaves behind. */
test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

const topTitle = (page: import('@playwright/test').Page) => page.locator('#deck-top-title');

test('shuffle slows down and lands, skip moves on, take it puts the build into Block D', async ({ page }) => {
  await open(page, './#/plan/pick?from=today');
  await expect(page.getByRole('heading', { level: 1, name: 'Pick a project' })).toBeVisible();
  await expect(page.getByText(/^\d+ weekly projects? fit this phase$/)).toBeVisible();
  // Shuffle is the only filled button on the screen.
  await expect(page.locator('[data-variant="filled"]')).toHaveCount(1);

  const shuffle = page.locator('[data-variant="filled"]');
  await expect(shuffle).toHaveText('Shuffle');
  await shuffle.click();
  await expect(shuffle).toHaveText('Shuffling');
  await page.clock.runFor(2200);
  await expect(shuffle).toHaveText('Shuffle again');

  const before = await topTitle(page).innerText();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.clock.runFor(400);
  await expect(topTitle(page)).not.toHaveText(before);

  const taken = await topTitle(page).innerText();
  await page.getByRole('button', { name: 'Take it' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator('.taken')).toContainText(taken);

  // The pick is stored: after a reload the projects block still carries it.
  await reload(page);
  await expect(laterRow(page, new RegExp(taken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' Weekly build'))).toBeVisible();
});

test('with reduced motion the shuffle lands at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, './#/plan/pick');
  const shuffle = page.locator('[data-variant="filled"]');
  await shuffle.click();
  await expect(shuffle).toHaveText('Shuffle again');
});

test('taking a monthly project makes it the next one in Block D', async ({ page }) => {
  await open(page, './#/plan/pick?cadence=monthly');
  await expect(page.getByText(/monthly projects? fit this phase$/)).toBeVisible();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.clock.runFor(400);
  const taken = await topTitle(page).innerText();
  await page.getByRole('button', { name: 'Take it' }).click();
  await expect(page).toHaveURL(/#\/$/);

  await open(page, './#/plan');
  await expect(page.getByRole('button', { name: new RegExp('Projects · 2 h .*Monthly: ' + taken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeVisible();
});

test("from the Sunday review it picks next week's build and goes back", async ({ page }) => {
  await open(page, './#/plan/pick?week=next&from=reviews');
  await expect(page.getByText("Skip flicks the card away. Take it makes it next week's build.")).toBeVisible();
  await page.getByRole('button', { name: 'Take it' }).click();
  await expect(page).toHaveURL(/#\/reviews$/);
});
