import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FIRST_DAY, laterRow, logTime, makeNow, nowCard, open, pickStatus, reload } from './helpers.ts';

test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

/** A lane row of the current phase on the Timeline, by its block name ("Math and physics Not started 20:00–22:00 · …"). */
function lane(page: Page, name: string) {
  return page.getByRole('button', { name: new RegExp('^' + name + ' .*\\d\\d:\\d\\d–\\d\\d:\\d\\d · ') });
}

test('the current phase shows its five lanes, and the other phases open in place', async ({ page }) => {
  await open(page, './#/plan');
  // The phase's end is under a year away, so it drops the year.
  await expect(page.getByText('Year 1 · Foundations I — in flight · ends 31 January')).toBeVisible();
  // The fixed day: five 2-hour blocks at their times. Projects is not one of them.
  const day = [
    ['ML Zoomcamp', '06:00–08:00'],
    ['GameDevHQ', '08:00–10:00'],
    ['Hugging Face', '10:00–12:00'],
    ['Coding lessons', '18:00–20:00'],
    ['Math and physics', '20:00–22:00'],
  ];
  for (const [name, time] of day) await expect(lane(page, name!)).toContainText(time!);
  await expect(page.getByRole('button', { name: /^Projects / })).toHaveCount(0);
  await expect(lane(page, 'Math and physics')).toContainText('18.06 Linear Algebra, lecture 1 of 35');

  const later = page.getByRole('button', { name: /^Electrical engineering/ });
  await expect(later).toHaveAttribute('aria-expanded', 'false');
  await later.click();
  await expect(later).toHaveAttribute('aria-expanded', 'true');
  // The opened phase lists its own lanes, without times, next to the current phase's.
  await expect(page.getByRole('button', { name: /^GameDevHQ · 2 h/ })).toHaveCount(1);
  await expect(lane(page, 'GameDevHQ')).toBeVisible();
});

test('ticking units in an item updates the lane and drives Today', async ({ page }) => {
  await open(page, './#/plan');
  await lane(page, 'Math and physics').click();
  const laneSheet = page.getByRole('dialog', { name: /^Block E · Math/ });
  await laneSheet.getByRole('button', { name: /^18\.06 Linear Algebra/ }).click();

  const item = page.getByRole('dialog', { name: /MIT 18\.06 Linear Algebra/ });
  for (const title of ['Lecture 1: The geometry of linear equations', 'Lecture 2: Elimination with matrices', 'Lecture 3: Multiplication and inverse matrices']) {
    await item.getByRole('checkbox', { name: title }).click();
  }
  await item.getByRole('button', { name: 'Close' }).click();
  await expect(laneSheet.getByRole('button', { name: /^18\.06 Linear Algebra .*lecture 4 of 35/ })).toBeVisible();

  await open(page, './');
  await expect(laterRow(page, /^Math and physics 18\.06 Linear Algebra · lecture 4, factorization into A = LU/)).toBeVisible();
});

test('marking an item done moves Today on to the next item in the lane', async ({ page }) => {
  await open(page, './#/plan?lane=y1-p0.E');
  const laneSheet = page.getByRole('dialog', { name: /^Block E · Math/ });
  await pickStatus(page, laneSheet.getByRole('button', { name: /^Status of MIT 18\.06/ }), 'Done');

  await open(page, './');
  await expect(laterRow(page, /^Math and physics .*(Current DSA Course|algorithms and data structures)/i)).toBeVisible();
});

test('the forecast reads as a verdict once the lane has hours and progress', async ({ page }) => {
  await open(page, './#/plan');
  await expect(lane(page, 'Math and physics')).toContainText('Not started');

  await open(page, './');
  await makeNow(page, /^Math and physics/);
  await expect(nowCard(page)).toContainText('18.06 Linear Algebra');
  await logTime(page, '60');
  await page.locator('#now-title').click();
  await nowCard(page).getByRole('checkbox', { name: 'Lecture 1: The geometry of linear equations' }).click();

  await open(page, './#/plan');
  await expect(lane(page, 'Math and physics')).toContainText(/On track|weeks? (behind|early)|No hours logged lately/);
});

test('re-plan shows a diff first, applies only when asked, and is then a no-op', async ({ page }) => {
  await open(page, './#/plan');
  await page.getByRole('button', { name: 'Re-plan' }).click();
  const sheet = page.getByRole('dialog', { name: 'Re-plan from today' });
  await sheet.getByRole('radio', { name: 'Defer or drop' }).click();
  await expect(sheet.getByText(/stretch items go first/)).toBeVisible();
  // The seed runs some lanes over budget, so there is something to move.
  await expect(sheet.getByRole('button', { name: /^Apply \d+ changes?$/ })).toBeVisible();

  // Closing changes nothing.
  await sheet.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Re-plan' }).click();
  await sheet.getByRole('radio', { name: 'Defer or drop' }).click();
  await sheet.getByRole('button', { name: /^Apply \d+ changes?$/ }).click();
  await expect(sheet).toBeHidden();

  await page.getByRole('button', { name: 'Re-plan' }).click();
  await sheet.getByRole('radio', { name: 'Defer or drop' }).click();
  await expect(sheet.getByText('Everything already fits. Nothing would change.')).toBeVisible();
});

test('reorders a lane with the arrows and keeps the order', async ({ page }) => {
  await open(page, './#/plan?lane=y1-p0.D');
  const sheet = page.getByRole('dialog', { name: /^Block D · Projects/ });
  const first = sheet.getByRole('listitem').first();
  await expect(first).toContainText(/Zoomcamp midterm/);

  await sheet.getByRole('button', { name: 'Edit' }).click();
  await sheet.getByRole('button', { name: /Move .*CLI habit tracker.* up/ }).click();
  await expect(first).toContainText(/CLI habit tracker/);

  await reload(page);
  await expect(sheet.getByRole('listitem').first()).toContainText(/CLI habit tracker/);
});

test('an item of your own added to a lane reaches Today', async ({ page }) => {
  await open(page, './#/plan?lane=y1-p0.C');
  const laneSheet = page.getByRole('dialog', { name: /^Block C · ML Zoomcamp/ });
  await laneSheet.getByRole('button', { name: 'Add to this lane' }).click();

  const add = page.getByRole('dialog', { name: /^Add to Block C/ });
  await add.getByRole('radio', { name: 'Something new' }).click();
  await add.getByRole('textbox', { name: 'Title' }).fill('Distributed systems reading group');
  await add.getByRole('textbox', { name: 'Estimated hours' }).fill('12');
  await add.getByRole('button', { name: 'Add to the lane' }).click();
  await expect(add).toBeHidden();
  await expect(laneSheet.getByRole('button', { name: /^Distributed systems reading group/ })).toBeVisible();

  // Finish what is ahead of it in lane C (ML Zoomcamp alone, now that Hugging Face has lane H), and Today's block C is on the new item.
  await pickStatus(page, laneSheet.getByRole('button', { name: /^Status of .*Machine Learning Zoomcamp/ }), 'Done');
  await open(page, './');
  await expect(laterRow(page, /^ML Zoomcamp .*Distributed systems reading group/)).toBeVisible();
});

test('taking an item off the plan keeps it in the library', async ({ page }) => {
  await open(page, './#/plan?lane=y1-p0.B');
  const laneSheet = page.getByRole('dialog', { name: /^Block B · Coding lessons/ });
  await laneSheet.getByRole('button', { name: 'Edit' }).click();
  await laneSheet.getByRole('button', { name: /^Take Automate the Boring Stuff.* off the plan/ }).click();
  await expect(laneSheet.getByRole('button', { name: /^Automate the Boring Stuff/ })).toHaveCount(0);

  await laneSheet.getByRole('button', { name: 'Add to this lane' }).click();
  const add = page.getByRole('dialog', { name: /^Add to Block B/ });
  await add.getByRole('searchbox', { name: 'Search' }).fill('Automate the Boring');
  await expect(add.getByRole('button', { name: /^Automate the Boring Stuff/ })).toBeVisible();
});
