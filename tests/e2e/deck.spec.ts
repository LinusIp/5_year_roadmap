import { expect, test } from '@playwright/test';
import { FIRST_DAY, open, reload } from './helpers.ts';

/** The project deck (section 4.0, Motion): Shuffle, Skip, Take it, and what each leaves behind. */
test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

const topTitle = (page: import('@playwright/test').Page) => page.locator('#deck-top-title');
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('shuffle slows down and lands, skip moves on, take it makes it this week’s build', async ({ page }) => {
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
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.clock.runFor(400);
  await expect(topTitle(page)).not.toHaveText(before);

  const taken = await topTitle(page).innerText();
  await page.getByRole('button', { name: 'Take it', exact: true }).click();
  await expect(page).toHaveURL(/#\/$/);

  // Today's fixed day has no projects block, so the build shows in Plan › Projects as this week's build.
  await open(page, './#/plan?view=projects');
  const slot = page.getByRole('main').getByRole('button', { name: new RegExp('^' + escape(taken) + ' Weekly build') });
  await expect(slot).toBeVisible();

  // The pick is stored: after a reload the week still carries it.
  await reload(page);
  await expect(slot).toBeVisible();
});

test('with reduced motion the shuffle lands at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, './#/plan/pick');
  const shuffle = page.locator('[data-variant="filled"]');
  await shuffle.click();
  await expect(shuffle).toHaveText('Shuffle again');
});

test('taking a monthly project makes it the next one in Block D', async ({ page }) => {
  // Block D is not in Today's day; Plan › Projects says which monthly project is next in it.
  await open(page, './#/plan?view=projects');
  const thisMonth = page.getByRole('main').locator('section').filter({ has: page.getByRole('heading', { name: 'This month' }) }).last();
  const nextBefore = (await thisMonth.getByRole('button', { name: / Next in Block D · / }).innerText()).split('\n')[0]!.trim();

  await open(page, './#/plan/pick?cadence=monthly');
  await expect(page.getByText(/monthly projects? fit this phase$/)).toBeVisible();
  // Skip at least once, and past the project that is already next, so the take has something to change.
  do {
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await page.clock.runFor(400);
  } while ((await topTitle(page).innerText()).trim() === nextBefore);
  const taken = (await topTitle(page).innerText()).trim();
  await page.getByRole('button', { name: 'Take it', exact: true }).click();
  await expect(page).toHaveURL(/#\/$/);

  await open(page, './#/plan?view=projects');
  await expect(thisMonth.getByRole('button', { name: new RegExp('^' + escape(taken) + ' Next in Block D · ') })).toBeVisible();
  await expect(thisMonth.getByRole('button', { name: new RegExp('^' + escape(nextBefore) + ' Next in Block D') })).toHaveCount(0);
});

test("from the Sunday review it picks next week's build and goes back", async ({ page }) => {
  await open(page, './#/plan/pick?week=next&from=reviews');
  await expect(page.getByText("Skip flicks the card away. Take it makes it next week's build.")).toBeVisible();
  await page.getByRole('button', { name: 'Take it', exact: true }).click();
  await expect(page).toHaveURL(/#\/reviews$/);
});
