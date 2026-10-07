import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FIRST_DAY, logTime, open } from './helpers.ts';

test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

/** Logs a full day against Today's Now item (a Gamedev project), which is how the heatmap gets something to draw. */
async function logEightHours(page: Page): Promise<void> {
  await open(page, './');
  await logTime(page, '480');
  await expect(page.getByText('8 h of 8 h today · 1-day streak')).toBeVisible();
}

test('an empty year says so, with the year chips under the grid', async ({ page }) => {
  await open(page, './#/activity');
  await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeVisible();
  await expect(page.getByText(/^Nothing logged yet/)).toBeVisible();
  await expect(page.getByRole('button', { name: '2026', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '2031', exact: true })).toBeVisible();
});

test('8 hours light the day up at the top step, and the sentence counts it', async ({ page }) => {
  await logEightHours(page);
  await open(page, './#/activity');

  const cell = page.getByRole('button', { name: 'Monday 21 September: 8 h' });
  await expect(cell).toHaveClass(/heat-4/);
  await expect(page.getByText('8 h logged · longest streak 1 day · 2 freezes left this month')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Today 0 of 5 blocks done 8 h$/ })).toBeVisible();
});

test('a day opens in a sheet where its entries can be corrected', async ({ page }) => {
  await logEightHours(page);
  await open(page, './#/activity');

  await page.getByRole('button', { name: 'Monday 21 September: 8 h' }).click();
  const sheet = page.getByRole('dialog', { name: 'Monday 21 September' });
  await expect(sheet.getByText('Block A · Game development')).toBeVisible();
  await sheet.getByRole('button', { name: 'Remove 8 h of Finish a small game' }).click();
  await expect(sheet.getByText('Nothing logged.')).toBeVisible();
});

test('the track filter counts only that track', async ({ page }) => {
  await logEightHours(page);
  await open(page, './#/activity');

  await page.getByRole('button', { name: 'Track', exact: true }).click();
  await page.getByRole('dialog', { name: 'Track' }).getByRole('button', { name: 'Mathematics' }).click();
  await expect(page).toHaveURL(/track=math/);
  await expect(page.getByRole('button', { name: 'Monday 21 September: nothing logged, 8 h on all tracks' })).toBeVisible();

  await page.getByRole('button', { name: 'Mathematics', exact: true }).click();
  await page.getByRole('dialog', { name: 'Track' }).getByRole('button', { name: 'Every track' }).click();
  await expect(page).not.toHaveURL(/track=/);
});

test('the year chips switch the grid to another year', async ({ page }) => {
  await open(page, './#/activity');
  await page.getByRole('button', { name: '2027', exact: true }).click();
  await expect(page).toHaveURL(/year=2027/);
  await expect(page.getByRole('group', { name: 'Time logged in 2027' })).toBeVisible();
});

test('a freeze day is marked on the grid and spends a freeze', async ({ page }) => {
  // 30 minutes is under the 60-minute minimum, so the day does not count on its own: the freeze is what keeps the streak.
  await open(page, './');
  await logTime(page, '30');
  await open(page, './#/activity');
  await page.getByRole('button', { name: 'Monday 21 September: 30 m' }).click();
  const sheet = page.getByRole('dialog', { name: 'Monday 21 September' });
  await sheet.getByRole('switch', { name: 'Use a freeze day' }).click();
  await sheet.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByRole('button', { name: 'Monday 21 September: 30 m, freeze day' })).toBeVisible();
  await expect(page.getByText(/1 freeze left this month/)).toBeVisible();
});
