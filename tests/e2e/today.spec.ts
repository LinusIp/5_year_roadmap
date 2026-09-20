import { expect, test } from '@playwright/test';

/**
 * The acceptance criteria of the brief for Today, driven through the real UI against the production build.
 * The clock is pinned to the first day of the plan, in the user's zone, so the tests read the same
 * schedule the brief describes.
 */
const FIRST_DAY = '2026-09-21T09:00:00+05:00';

test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

test('shows the five blocks with the exact item each is on', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('./');

  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  await expect(page.getByText('Monday, 21 September 2026')).toBeVisible();

  const blockA = page.getByRole('region', { name: 'Gamedev / Graphics / Simulation' });
  const blockB = page.getByRole('region', { name: 'Languages' });
  const blockC = page.getByRole('region', { name: 'Core track' });
  const blockD = page.getByRole('region', { name: 'Projects / hands-on' });
  const blockE = page.getByRole('region', { name: 'Math & physics' });

  await expect(blockA.getByRole('link', { name: /Finish a small game/ })).toBeVisible();
  await expect(blockB.getByRole('link', { name: /30 Days of Python/ })).toBeVisible();
  await expect(blockB.getByText(/Day 1/)).toBeVisible();
  await expect(blockC.getByRole('link', { name: /Machine Learning Zoomcamp/ })).toBeVisible();
  await expect(blockD.getByText("This week's mini-build")).toBeVisible();
  await expect(blockE.getByRole('link', { name: /18\.06 Linear Algebra/ })).toBeVisible();
  await expect(blockE.getByText('Lecture 1: The geometry of linear equations')).toBeVisible();

  // The 8-hour budget, and every block's own share of it.
  await expect(page.getByText('8h to go')).toBeVisible();
  await expect(blockE.getByText('0m / 1h')).toBeVisible();
  expect(errors).toEqual([]);
});

test('logs time by hand and keeps it across a reload', async ({ page }) => {
  await page.goto('./');
  const blockE = page.getByRole('region', { name: 'Math & physics' });

  await blockE.getByRole('button', { name: /on this item today|0m/ }).first().click();
  const input = blockE.getByRole('textbox', { name: 'Minutes for this block' });
  await input.fill('1h30');
  await input.press('Enter');

  await expect(blockE.getByText('1h 30m / 1h')).toBeVisible();
  await expect(page.getByText('6h 30m to go')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Logged today/ })).toBeVisible();

  await page.reload();
  await expect(blockE.getByText('1h 30m / 1h')).toBeVisible();
});

test('a timer adds the minutes it ran for', async ({ page }) => {
  await page.goto('./');
  const blockB = page.getByRole('region', { name: 'Languages' });

  await blockB.getByRole('button', { name: 'Start' }).click();
  await expect(blockB.getByRole('button', { name: /Stop/ })).toBeVisible();

  // Only one timer at a time: the other blocks' Start buttons are disabled while it runs.
  await expect(page.getByRole('region', { name: 'Core track' }).getByRole('button', { name: 'Start' })).toBeDisabled();

  await page.clock.fastForward('25:00');
  await blockB.getByRole('button', { name: /Stop/ }).click();

  await expect(blockB.getByText('25m / 1h')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Core track' }).getByRole('button', { name: 'Start' })).toBeEnabled();
});

test('ticking a unit moves the block to the next one', async ({ page }) => {
  await page.goto('./');
  const blockE = page.getByRole('region', { name: 'Math & physics' });

  await expect(blockE.getByText('0/35')).toBeVisible();
  await blockE.getByRole('button', { name: 'Unit done' }).click();

  await expect(blockE.getByText('Lecture 2: Elimination with matrices')).toBeVisible();
  await expect(blockE.getByText('1/35')).toBeVisible();
});

test('logs something that is not on the plan', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'I did something else' }).click();
  await page.getByLabel('What did you do?').fill('Read the Raft paper');
  await page.getByLabel('Minutes').fill('40');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByText('Read the Raft paper')).toBeVisible();
  await expect(page.getByText('40m', { exact: true }).first()).toBeVisible();
});

test('records a reflection, an energy rating and a freeze day', async ({ page }) => {
  await page.goto('./');

  await page.getByPlaceholder('What moved today?').fill('Linear algebra clicked.');
  await page.getByRole('button', { name: /4\s*Good/ }).click();
  await page.getByRole('checkbox', { name: /freeze day/ }).check();

  await page.reload();
  await expect(page.getByPlaceholder('What moved today?')).toHaveValue('Linear algebra clicked.');
  await expect(page.getByRole('button', { name: /4\s*Good/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('checkbox', { name: /freeze day/ })).toBeChecked();
});

test('a full day of logging turns the streak on', async ({ page }) => {
  await page.goto('./');
  const blockA = page.getByRole('region', { name: 'Gamedev / Graphics / Simulation' });

  await blockA.getByRole('button', { name: /0m/ }).first().click();
  const input = blockA.getByRole('textbox', { name: 'Minutes for this block' });
  await input.fill('480');
  await input.press('Enter');

  await expect(page.getByText('Target met')).toBeVisible();
  // 480 minutes is above the 60-minute minimum, so today counts towards the streak.
  await expect(page.getByText('1 day', { exact: true })).toBeVisible();
});

test('Sunday replaces the projects block with the review', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-27T09:00:00+05:00'));
  await page.goto('./');

  const blockD = page.getByRole('region', { name: 'Projects / hands-on' });
  await expect(blockD.getByText('Weekly review and paper reading')).toBeVisible();
  await expect(page.getByText('Review day')).toBeVisible();
  // The other blocks still have their work.
  await expect(page.getByRole('region', { name: 'Math & physics' }).getByRole('link', { name: /18\.06/ })).toBeVisible();
});
