import { expect, test } from '@playwright/test';

const FIRST_DAY = '2026-09-21T09:00:00+05:00';

test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

/** Logs a full day on Today, which is how the heatmap gets something to draw. */
async function logEightHours(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('./');
  const blockA = page.getByRole('region', { name: 'Gamedev / Graphics / Simulation' });
  await blockA.getByRole('button', { name: /0m/ }).first().click();
  const input = blockA.getByRole('textbox', { name: 'Minutes for this block' });
  await input.fill('480');
  await input.press('Enter');
  await expect(page.getByText('Target met')).toBeVisible();
}

test('an empty heatmap says so rather than showing a blank grid', async ({ page }) => {
  await page.goto('./#/activity');
  await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nothing logged yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: '2026', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '2031', exact: true })).toBeVisible();
});

test('logging 8 hours lights the day up at the top intensity and counts the streak', async ({ page }) => {
  await logEightHours(page);
  await page.goto('./#/activity');

  const cell = page.getByRole('button', { name: /Mon 21 Sep 2026: 8h/ });
  await expect(cell).toBeVisible();
  // Level 4 is the brightest step of the ramp.
  await expect(cell).toHaveAttribute('fill', 'var(--heat-4)');

  await expect(page.getByText('1 day').first()).toBeVisible();
  await expect(page.getByText('8h', { exact: true }).first()).toBeVisible();
});

test('clicking a day opens its detail, and the link edits that day on Today', async ({ page }) => {
  await logEightHours(page);
  await page.goto('./#/activity');

  await page.getByRole('button', { name: /Mon 21 Sep 2026: 8h/ }).click();
  await expect(page.getByRole('heading', { name: 'Monday, 21 September 2026' })).toBeVisible();
  await expect(page.getByText('Block A · 8h')).toBeVisible();
  await expect(page.getByText('Finish a small game (1 of 3)')).toBeVisible();

  await page.getByRole('link', { name: 'Edit this day' }).click();
  await expect(page).toHaveURL(/date=2026-09-21/);
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  await expect(page.getByText('Monday, 21 September 2026')).toBeVisible();
});

test('the track filter counts only that track', async ({ page }) => {
  await logEightHours(page);
  await page.goto('./#/activity');

  // Block A's item is a gamedev project, so filtering to Mathematics empties the day.
  await page.getByRole('button', { name: 'Mathematics' }).click();
  await expect(page).toHaveURL(/track=math/);
  await expect(page.getByRole('button', { name: /Mon 21 Sep 2026: 0m of 8h that day/ })).toBeVisible();

  await page.getByRole('button', { name: 'Game development' }).click();
  await expect(page.getByRole('button', { name: /Mon 21 Sep 2026: 8h/ })).toBeVisible();

  await page.getByRole('button', { name: 'All tracks' }).click();
  await expect(page).not.toHaveURL(/track=/);
});

test('the all-years view stacks one grid per year', async ({ page }) => {
  await logEightHours(page);
  await page.goto('./#/activity');
  await page.getByRole('button', { name: 'All 5 years' }).click();

  for (const year of ['2026', '2027', '2028', '2029', '2030', '2031']) {
    await expect(page.getByRole('heading', { level: 3, name: year })).toBeVisible();
  }
  await expect(page.getByRole('group', { name: 'Activity in 2026' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Activity in 2031' })).toBeVisible();
});

test('a freeze day is marked on the grid', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('checkbox', { name: /freeze day/ }).check();
  await page.goto('./#/activity');

  const cell = page.getByRole('button', { name: /Mon 21 Sep 2026.*freeze day/ });
  await expect(cell).toBeVisible();
  await expect(cell).toHaveAttribute('stroke', 'var(--accent-text)');
  await expect(page.getByText('1 of 2')).toBeVisible(); // freezes used this month
});
