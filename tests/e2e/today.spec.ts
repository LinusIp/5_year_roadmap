import { expect, test } from '@playwright/test';
import { FIRST_DAY, laterRow, logTime, makeNow, nowCard, open, reload } from './helpers.ts';

/**
 * The acceptance criteria of the brief for Today, through the real UI against the production build. The
 * clock is pinned to the first day of the plan, in the user's zone.
 */
test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

test('the first unfinished block is Now, and the other four wait in Later today', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await open(page, './');

  await expect(page.getByRole('heading', { level: 1, name: 'Monday 21 September' })).toBeVisible();
  await expect(page.getByText('0 h of 8 h today · no streak yet')).toBeVisible();

  await expect(page.locator('#now-title')).toHaveText('One finished small game');
  await expect(nowCard(page).getByText('Graphics · 0 h of 2 h')).toBeVisible();

  await expect(laterRow(page, /^30 Days of Python Languages · day 1/)).toBeVisible();
  await expect(laterRow(page, /^ML Zoomcamp Core · module 1/)).toBeVisible();
  await expect(laterRow(page, /Weekly build · 0 of \d+ h done/)).toBeVisible();
  await expect(laterRow(page, /^18\.06 Linear Algebra Math · lecture 1, the geometry of linear equations/)).toBeVisible();

  // One filled button on the screen: the primary action.
  await expect(page.locator('[data-variant="filled"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('logs time by hand and keeps it across a reload', async ({ page }) => {
  await open(page, './');
  await logTime(page, '1h30');

  await expect(page.getByText(/^1 h 30 m of 8 h today/)).toBeVisible();
  await expect(nowCard(page).getByText('Graphics · 1 h 30 m of 2 h')).toBeVisible();

  await reload(page);
  await expect(nowCard(page).getByText('Graphics · 1 h 30 m of 2 h')).toBeVisible();
});

test('a timer adds the minutes it ran for', async ({ page }) => {
  await open(page, './');
  await nowCard(page).getByRole('button', { name: 'Start' }).click();
  await expect(nowCard(page).getByText('Now · running')).toBeVisible();

  await page.clock.fastForward('25:00');
  await nowCard(page).getByRole('button', { name: /^Stop/ }).click();

  await expect(nowCard(page).getByText('Graphics · 25 m of 2 h')).toBeVisible();
  await expect(nowCard(page).getByRole('button', { name: 'Start' })).toBeVisible();
});

test('ticking a unit moves the item on to the next one', async ({ page }) => {
  await open(page, './');
  await makeNow(page, /18\.06 Linear Algebra/);
  await page.locator('#now-title').click();

  await nowCard(page).getByRole('checkbox', { name: 'Lecture 1: The geometry of linear equations' }).click();
  await expect(nowCard(page).getByText(/lecture 2, elimination with matrices/)).toBeVisible();
});

test('logs something that is not on the plan', async ({ page }) => {
  await open(page, './');
  await logTime(page, '40', 'Read the Raft paper');
  await expect(page.getByText(/^40 m of 8 h today/)).toBeVisible();

  // The day's entries, on Activity.
  await open(page, './#/activity');
  await page.getByRole('button', { name: /^Today/ }).click();
  await expect(page.getByRole('dialog', { name: 'Monday 21 September' }).getByText('Read the Raft paper')).toBeVisible();
});

test('records a reflection, an energy rating and a freeze day', async ({ page }) => {
  // "How was today?" appears at the end of the day.
  await page.clock.setFixedTime(new Date('2026-09-21T22:30:00+05:00'));
  await open(page, './');
  await page.getByRole('button', { name: 'How was today?' }).click();
  const sheet = page.getByRole('dialog', { name: 'How was today?' });
  await sheet.getByRole('textbox', { name: 'One line about today' }).fill('Linear algebra clicked.');
  await sheet.getByRole('radio', { name: '4 of 5, Good' }).click();
  await sheet.getByRole('switch', { name: 'Use a freeze day' }).click();
  await expect(sheet.getByRole('switch', { name: 'Use a freeze day' })).toHaveAttribute('aria-checked', 'true');

  await reload(page);
  await page.getByRole('button', { name: /How was today\? Energy 4 of 5/ }).click();
  await expect(sheet.getByRole('textbox', { name: 'One line about today' })).toHaveValue('Linear algebra clicked.');
  await expect(sheet.getByRole('radio', { name: '4 of 5, Good' })).toHaveAttribute('aria-checked', 'true');
  await expect(sheet.getByRole('switch', { name: 'Use a freeze day' })).toHaveAttribute('aria-checked', 'true');
});

test('a full day of logging turns the streak on', async ({ page }) => {
  await open(page, './');
  await logTime(page, '480');
  // 480 minutes is over the 60-minute minimum, so today counts towards the streak.
  await expect(page.getByText('8 h of 8 h today · 1-day streak')).toBeVisible();
});

test('marking the block done brings the next one up, and folds the done one away', async ({ page }) => {
  await open(page, './');
  await nowCard(page).getByRole('button', { name: 'Mark done' }).click();
  await expect(page.locator('#now-title')).toHaveText('30 Days of Python');
  await expect(page.getByText('Done today: One finished small game')).toBeVisible();
});

test('Sunday replaces the projects block with the review', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-27T09:00:00+05:00'));
  await open(page, './');
  await expect(laterRow(page, /^Weekly review and paper Projects · close the week/)).toBeVisible();
  // The other blocks still have their work, and the "review on Sunday" line has nothing to point at.
  await expect(laterRow(page, /18\.06 Linear Algebra/)).toBeVisible();
  await expect(page.getByText(/^Weekly review on/)).toHaveCount(0);
});

test('a day outside the five years says so', async ({ page }) => {
  await open(page, './#/?date=2026-09-20');
  await expect(page.getByText(/The plan starts on Monday, 21 September 2026/)).toBeVisible();
  await open(page, './');
  await expect(page.getByText(/The plan starts on/)).toHaveCount(0);
});
