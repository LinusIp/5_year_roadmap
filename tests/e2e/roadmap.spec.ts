import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FIRST_DAY, laterRow, logTime, makeNow, nowCard, open, pickStatus } from './helpers.ts';

test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

/** A lane row on the Timeline, by its block's short name ("Math · 1 h"). */
function lane(page: Page, name: string) {
  return page.getByRole('button', { name: new RegExp('^' + name + ' · \\d') }).first();
}

test('the current phase shows its five lanes, and the other phases open in place', async ({ page }) => {
  await open(page, './#/plan');
  await expect(page.getByText('Year 1 · In flight · ends 31 January 2027')).toBeVisible();
  for (const name of ['Gamedev', 'Languages', 'Core', 'Projects', 'Math']) await expect(lane(page, name)).toBeVisible();
  await expect(lane(page, 'Math')).toContainText('MIT 18.06 Linear Algebra, lecture 1 of 35');

  const later = page.getByRole('button', { name: /^Electrical engineering/ });
  await expect(later).toHaveAttribute('aria-expanded', 'false');
  await later.click();
  await expect(later).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: /^Gamedev · 2 h/ })).toHaveCount(2);
});

test('ticking units in an item updates the lane and drives Today', async ({ page }) => {
  await open(page, './#/plan');
  await lane(page, 'Math').click();
  const laneSheet = page.getByRole('dialog', { name: /^Block E · Math/ });
  await laneSheet.getByRole('button', { name: /^MIT 18\.06 Linear Algebra/ }).click();

  const item = page.getByRole('dialog', { name: /MIT 18\.06 Linear Algebra/ });
  for (const title of ['Lecture 1: The geometry of linear equations', 'Lecture 2: Elimination with matrices', 'Lecture 3: Multiplication and inverse matrices']) {
    await item.getByRole('checkbox', { name: title }).click();
  }
  await item.getByRole('button', { name: 'Close' }).click();
  await expect(laneSheet.getByRole('button', { name: /^MIT 18\.06 Linear Algebra .*lecture 4 of 35/ })).toBeVisible();

  await open(page, './');
  await expect(laterRow(page, /MIT 18\.06 Linear Algebra Math · lecture 4, factorization into A = LU/)).toBeVisible();
});

test('marking an item done moves Today on to the next item in the lane', async ({ page }) => {
  await open(page, './#/plan?lane=y1-p0.E');
  const laneSheet = page.getByRole('dialog', { name: /^Block E · Math/ });
  await pickStatus(page, laneSheet.getByRole('button', { name: /^Status of MIT 18\.06/ }), 'Done');

  await open(page, './');
  await expect(laterRow(page, /algorithms and data structures/i)).toBeVisible();
});

test('the forecast reads as a verdict once the lane has hours and progress', async ({ page }) => {
  await open(page, './#/plan');
  await expect(lane(page, 'Math')).toContainText('Not started');

  await open(page, './');
  await makeNow(page, /MIT 18\.06 Linear Algebra/);
  await logTime(page, '60');
  await page.locator('#now-title').click();
  await nowCard(page).getByRole('checkbox', { name: 'Lecture 1: The geometry of linear equations' }).click();

  await open(page, './#/plan');
  await expect(lane(page, 'Math')).toContainText(/On track|weeks? (behind|early)|No hours logged lately/);
});

test('re-plan shows a diff first, applies only when asked, and is then a no-op', async ({ page }) => {
  await open(page, './#/plan');
  await page.getByRole('button', { name: 'Re-plan' }).click();
  const sheet = page.getByRole('dialog', { name: 'Re-plan from today' });
  await expect(sheet.getByText(/Nothing is dropped/)).toBeVisible();
  // The seed runs some lanes over budget, so there is something to move.
  await expect(sheet.getByRole('button', { name: /^Apply \d+ moves?$/ })).toBeVisible();

  // Closing changes nothing.
  await sheet.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Re-plan' }).click();
  await sheet.getByRole('button', { name: /^Apply \d+ moves?$/ }).click();
  await expect(sheet).toBeHidden();

  await page.getByRole('button', { name: 'Re-plan' }).click();
  await expect(sheet.getByText('Everything already fits. Nothing would move.')).toBeVisible();
});

test('reorders a lane with the arrows and keeps the order', async ({ page }) => {
  await open(page, './#/plan?lane=y1-p0.D');
  const sheet = page.getByRole('dialog', { name: /^Block D · Projects/ });
  const first = sheet.getByRole('listitem').first();
  await expect(first).toContainText(/Zoomcamp midterm/);

  await sheet.getByRole('button', { name: 'Edit' }).click();
  await sheet.getByRole('button', { name: /Move .*CLI expense or habit tracker.* up/ }).click();
  await expect(first).toContainText(/CLI expense or habit tracker/);

  await page.reload();
  await expect(sheet.getByRole('listitem').first()).toContainText(/CLI expense or habit tracker/);
});

test('an item of your own added to a lane reaches Today', async ({ page }) => {
  await open(page, './#/plan?lane=y1-p0.C');
  const laneSheet = page.getByRole('dialog', { name: /^Block C · Core/ });
  await laneSheet.getByRole('button', { name: 'Add to this lane' }).click();

  const add = page.getByRole('dialog', { name: /^Add to Block C/ });
  await add.getByRole('radio', { name: 'Something new' }).click();
  await add.getByRole('textbox', { name: 'Title' }).fill('Distributed systems reading group');
  await add.getByRole('textbox', { name: 'Estimated hours' }).fill('12');
  await add.getByRole('button', { name: 'Add to the lane' }).click();
  await expect(add).toBeHidden();
  await expect(laneSheet.getByRole('button', { name: /^Distributed systems reading group/ })).toBeVisible();

  // Finish everything ahead of it in lane C, and Today's block C is on the new item.
  for (const title of ['Machine Learning Zoomcamp', 'Hugging Face LLM Course', 'Hugging Face AI Agents Course']) {
    await pickStatus(page, laneSheet.getByRole('button', { name: new RegExp('^Status of .*' + title) }), 'Done');
  }
  await open(page, './');
  await expect(laterRow(page, /^Distributed systems reading group Core/)).toBeVisible();
});

test('taking an item off the plan keeps it in the library', async ({ page }) => {
  await open(page, './#/plan?lane=y1-p0.B');
  const laneSheet = page.getByRole('dialog', { name: /^Block B · Languages/ });
  await laneSheet.getByRole('button', { name: 'Edit' }).click();
  await laneSheet.getByRole('button', { name: /^Take freeCodeCamp: Scientific Computing with Python.* off the plan/ }).click();
  await expect(laneSheet.getByRole('button', { name: /^freeCodeCamp: Scientific Computing/ })).toHaveCount(0);

  await laneSheet.getByRole('button', { name: 'Add to this lane' }).click();
  const add = page.getByRole('dialog', { name: /^Add to Block B/ });
  await add.getByRole('searchbox', { name: 'Search' }).fill('Scientific Computing');
  await expect(add.getByRole('button', { name: /^freeCodeCamp: Scientific Computing with Python/ })).toBeVisible();
});
