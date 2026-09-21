import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const FIRST_DAY = '2026-09-21T09:00:00+05:00';

test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

function phase(page: Page, title: string) {
  return page.getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

function lane(page: Page, block: string) {
  return page.getByRole('region', { name: new RegExp('^Block ' + block + ':') });
}

test('shows both stages, all six phases, and opens the current one', async ({ page }) => {
  await page.goto('./#/roadmap');
  await expect(page.getByRole('heading', { name: 'Stage 1 · Software' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Stage 2 · Electrical and mechanical' })).toBeVisible();

  for (const title of ['In flight', 'Fluency + CS core', 'Systems + rendering', 'Scalable systems + AI engineering + engines', 'Electrical engineering', 'Mechanical engineering + mechatronics']) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }

  // The phase containing today is open, with its five lanes.
  const current = phase(page, 'In flight');
  await expect(current.getByText('Now')).toBeVisible();
  for (const block of ['A', 'B', 'C', 'D', 'E']) await expect(lane(page, block)).toBeVisible();
  await expect(lane(page, 'E').getByRole('button', { name: /MIT 18\.06 Linear Algebra/ })).toBeVisible();
});

test('ticking units updates the item, the lane and the phase', async ({ page }) => {
  await page.goto('./#/roadmap');
  const current = phase(page, 'In flight');
  await expect(current.getByText('0 of 16 items done')).toBeVisible();

  // Open 18.06 and tick its first three lectures.
  await lane(page, 'E').getByRole('button', { name: /MIT 18\.06 Linear Algebra/ }).click();
  for (const title of ['Lecture 1: The geometry of linear equations', 'Lecture 2: Elimination with matrices', 'Lecture 3: Multiplication and inverse matrices']) {
    await page.getByRole('checkbox', { name: title }).check();
  }

  await expect(lane(page, 'E').getByText('3/35')).toBeVisible();
  // 3 of 35 lectures of a 120 h course is about 10 h of the lane's 160 h: the lane moves off 0%.
  await expect(lane(page, 'E').getByRole('progressbar', { name: 'Block E progress' })).not.toHaveAttribute('aria-valuenow', '0');
  await expect(current.getByRole('progressbar', { name: 'In flight progress' })).not.toHaveAttribute('aria-valuenow', '0');

  // The same ticks drive Today: block E is now on lecture 4.
  await page.goto('./');
  await expect(page.getByText('Lecture 4: Factorization into A = LU')).toBeVisible();
});

test('marking an item done counts it, and Today moves on to the next item in the lane', async ({ page }) => {
  await page.goto('./#/roadmap');
  await lane(page, 'E').getByRole('combobox', { name: /Status of MIT 18\.06/ }).selectOption('done');
  await expect(phase(page, 'In flight').getByText('1 of 16 items done')).toBeVisible();

  await page.goto('./');
  await expect(page.getByRole('region', { name: 'Math & physics' }).getByRole('link', { name: /algorithms and data structures/i })).toBeVisible();
});

test('the forecast appears once hours are logged, and reads as a verdict', async ({ page }) => {
  // Log a day of block E work and tick a unit, so the lane has both a pace and progress.
  await page.goto('./');
  const blockE = page.getByRole('region', { name: 'Math & physics' });
  await blockE.getByRole('button', { name: /0m/ }).first().click();
  const input = blockE.getByRole('textbox', { name: 'Minutes for this block' });
  await input.fill('60');
  await input.press('Enter');
  await blockE.getByRole('button', { name: 'Unit done' }).click();

  await page.goto('./#/roadmap');
  const verdict = lane(page, 'E').getByText(/On track|weeks? (behind|early)|No hours logged lately/);
  await expect(verdict.first()).toBeVisible();
  await expect(phase(page, 'In flight').getByText(/finishes about/)).toBeVisible();
});

test('re-plan shows a diff first, applies only when asked, and is then a no-op', async ({ page }) => {
  await page.goto('./#/roadmap');
  await page.getByRole('button', { name: 'Re-plan' }).click();

  const dialog = page.getByRole('dialog', { name: 'Re-plan from today' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Nothing is\s+dropped/)).toBeVisible();

  // The seed runs some lanes over budget, so there is something to move.
  const apply = dialog.getByRole('button', { name: /^Apply \d+ moves?$/ });
  await expect(apply).toBeVisible();

  // Cancelling changes nothing.
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Re-plan' }).click();
  await dialog.getByRole('button', { name: /^Apply \d+ moves?$/ }).click();
  await expect(dialog).toBeHidden();

  // A second re-plan straight after finds nothing to do.
  await page.getByRole('button', { name: 'Re-plan' }).click();
  await expect(dialog.getByText('Everything already fits. Nothing would move.')).toBeVisible();
});

test('reorders a lane with the keyboard-friendly arrows and keeps the order', async ({ page }) => {
  await page.goto('./#/roadmap');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();

  const laneD = lane(page, 'D');
  const firstTitle = async (): Promise<string> => (await laneD.getByRole('listitem').first().getByRole('button').first().innerText()).trim();
  expect(await firstTitle()).toMatch(/Zoomcamp midterm/);

  await laneD.getByRole('button', { name: /Move .*CLI expense or habit tracker.* up/ }).click();
  await expect.poll(firstTitle).toMatch(/CLI expense or habit tracker/);

  await page.reload();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect.poll(firstTitle).toMatch(/CLI expense or habit tracker/);
});

test('adds an item of your own to a lane, and it reaches Today', async ({ page }) => {
  await page.goto('./#/roadmap');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await lane(page, 'C').getByRole('button', { name: 'Add to this lane' }).click();

  const dialog = page.getByRole('dialog', { name: /Add to Block C/ });
  await dialog.getByRole('tab', { name: 'Something new' }).click();
  await dialog.getByLabel('Title').fill('Distributed systems reading group');
  await dialog.getByLabel('Estimated hours').fill('12');
  await dialog.getByRole('button', { name: 'Add to the lane' }).click();
  await expect(dialog).toBeHidden();

  await expect(lane(page, 'C').getByRole('button', { name: 'Distributed systems reading group', exact: true })).toBeVisible();

  // Finish everything ahead of it in lane C, and Today's block C is on the new item.
  for (const title of [/Machine Learning Zoomcamp/, /Hugging Face LLM Course/, /Hugging Face AI Agents Course/]) {
    await lane(page, 'C').getByRole('combobox', { name: new RegExp('Status of .*' + title.source) }).selectOption('done');
  }
  await page.goto('./');
  await expect(page.getByRole('region', { name: 'Core track' }).getByRole('link', { name: 'Distributed systems reading group' })).toBeVisible();
});

test('removing an item takes it off the roadmap but keeps it in the library', async ({ page }) => {
  await page.goto('./#/roadmap');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();

  const item = lane(page, 'B').getByRole('button', { name: /^freeCodeCamp: Scientific Computing with Python/ });
  await item.click();
  await lane(page, 'B').getByRole('button', { name: 'Remove' }).click();
  await expect(item).toBeHidden();

  // Still in the curriculum: the add dialog offers it again.
  await lane(page, 'B').getByRole('button', { name: 'Add to this lane' }).click();
  const dialog = page.getByRole('dialog', { name: /Add to Block B/ });
  await dialog.getByLabel('Search').fill('Scientific Computing');
  await expect(dialog.getByRole('option', { name: /freeCodeCamp: Scientific Computing with Python/ })).toBeVisible();
});
