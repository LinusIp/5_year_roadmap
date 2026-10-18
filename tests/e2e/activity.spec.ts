import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FIRST_DAY, logTime, open } from './helpers.ts';

test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

/**
 * Logs a full day, the 10 hours of the daily schedule, against Today's Now item (GameDevHQ at 09:00), which is how
 * the heatmap gets something to draw.
 */
async function logFullDay(page: Page): Promise<void> {
  await open(page, './');
  await expect(page.locator('#now-title')).toHaveText('GameDevHQ');
  await logTime(page, '600');
  await expect(page.getByText('10 h of 10 h today · 1-day streak')).toBeVisible();
}

test('an empty year says so, with the year chips under the grid', async ({ page }) => {
  await open(page, './#/activity');
  await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeVisible();
  await expect(page.getByText(/^Nothing logged yet/)).toBeVisible();
  await expect(page.getByRole('button', { name: '2026', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // As in the mockup, the chips reach two years ahead; the rest is under All years.
  await expect(page.getByRole('button', { name: '2028', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '2029', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'All years', exact: true })).toBeVisible();
});

test('a full day of 10 hours lights the day up at the top step, and the sentence counts it', async ({ page }) => {
  await logFullDay(page);
  await open(page, './#/activity');

  const cell = page.getByRole('button', { name: 'Monday 21 September: 10 h' });
  await expect(cell).toHaveClass(/heat-4/);
  await expect(page.getByRole('region', { name: 'Logged' })).toContainText('10 h');
  await expect(page.getByText('Since 21 September · longest streak 1 day')).toBeVisible();
  await expect(page.getByText('2 freezes left this month')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Today 0 of 5 blocks done 10 h$/ })).toBeVisible();
});

test('a day opens in a sheet to look at; corrections are Calendar\'s', async ({ page }) => {
  await logFullDay(page);
  await open(page, './#/activity');

  await page.getByRole('button', { name: 'Monday 21 September: 10 h' }).click();
  const sheet = page.getByRole('dialog', { name: 'Monday 21 September' });
  // The entry names its item, its block and the block's track.
  await expect(sheet.getByText('GameDevHQ: Unity game development course')).toBeVisible();
  await expect(sheet.getByText('Block A · Game development')).toBeVisible();
  await expect(sheet.getByRole('button', { name: /^Remove / })).toHaveCount(0);
  await sheet.getByRole('link', { name: 'Correct it in Calendar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Calendar' })).toBeVisible();
  await page.getByRole('button', { name: /^GameDevHQ ?, \d/ }).click();
  await page.getByRole('dialog', { name: 'GameDevHQ' }).getByRole('button', { name: /^Edit logged time/ }).click();
  const logged = page.getByRole('dialog', { name: /^Logged on / });
  await logged.getByRole('button', { name: 'Remove 10 h of GameDevHQ: Unity game development course' }).click();
  await expect(logged.getByText('Nothing logged.')).toBeVisible();
});

test('the track filter counts only that track', async ({ page }) => {
  await logFullDay(page);
  await open(page, './#/activity');

  await page.getByRole('button', { name: 'By track', exact: true }).click();
  await page.getByRole('dialog', { name: 'Track' }).getByRole('button', { name: 'Mathematics' }).click();
  await expect(page).toHaveURL(/track=math/);
  await expect(page.getByRole('button', { name: 'Monday 21 September: nothing logged, 10 h on all tracks' })).toBeVisible();

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
