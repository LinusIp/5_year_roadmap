import { expect, test } from '@playwright/test';
import { FIRST_DAY, open, pickStatus } from './helpers.ts';

test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

test('Projects shows three stacks: this week, this month with the brief numbering, and the capstones', async ({ page }) => {
  await open(page, './#/plan?view=projects');
  await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This month' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Capstones' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^ML Zoomcamp midterm project, deployed Next in Block D · No\. 1/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Stage 1 capstone/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Pick a project' })).toHaveAttribute('href', /#\/plan\/pick$/);
});

test('stage 2 builds list their parts, and desk-only ones say there is nothing to buy', async ({ page }) => {
  await open(page, './#/library/m38');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Parts and budget' })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('listitem').first()).toBeVisible();

  await open(page, './#/library/m37');
  await expect(page.getByRole('dialog').getByText(/Nothing to buy/)).toBeVisible();
});

test('shipping a weekly build counts the week, and only with a repository', async ({ page }) => {
  await open(page, './#/library/w-c-ring-buffer');
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('textbox', { name: 'Repository' }).fill('https://github.com/me/ring-buffer');
  await sheet.getByRole('textbox', { name: 'Repository' }).blur();
  const pill = sheet.getByRole('button', { name: /^Status of / }).first();
  await pickStatus(page, pill, 'Done');
  await expect(pill).toHaveText('Done');

  await open(page, './#/plan?view=projects');
  await expect(page.getByText(/^1 week of 1 with a build shipped/)).toBeVisible();
  const shipped = page.getByRole('button', { name: /^1 weekly build shipped/ });
  await shipped.click();
  await expect(page.getByRole('button', { name: /ring buffer.*https:\/\/github\.com\/me\/ring-buffer/i })).toBeVisible();
});

test('acceptance criteria tick off on the project and stay ticked', async ({ page }) => {
  await open(page, './#/library/m02');
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('checkbox', { name: /Installable with pip/ }).click();
  await sheet.getByRole('checkbox', { name: /Unit tests with pytest/ }).click();
  await page.reload();
  await expect(sheet.getByRole('checkbox', { name: /Installable with pip/ })).toHaveAttribute('aria-checked', 'true');
  await expect(sheet.getByRole('checkbox', { name: /Unit tests with pytest/ })).toHaveAttribute('aria-checked', 'true');
});
