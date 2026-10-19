import { expect, test } from '@playwright/test';
import { FIRST_DAY, open } from './helpers.ts';

/**
 * The 152 free resources (RESOURCES-ADD): a Practice shelf, search that finds them, a path's optional list that holds
 * them by the year they fit from, and a sheet that says how one is free and links to it exactly.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

test('the Practice tile opens a shelf of practice and problem sets', async ({ page }) => {
  await open(page, './#/library');
  const tile = page.getByRole('button', { name: /^\d+ Practice$/ });
  await expect(tile).toBeVisible();
  const count = Number((await tile.innerText()).match(/\d+/)![0]);
  expect(count).toBeGreaterThan(30);
  await tile.click();
  await expect(page).toHaveURL(/type=practice/);
  await expect(page.getByRole('heading', { level: 1, name: 'Practice' })).toBeVisible();
  await expect(page.getByText(new RegExp('^' + count + ' practice items$'))).toBeVisible();
  await expect(page.getByRole('button', { name: /^GPU Puzzles/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^CSES/ })).toBeVisible();
});

test('search finds OSTEP and Vulkan', async ({ page }) => {
  await open(page, './#/library');
  const search = page.getByRole('searchbox', { name: 'Search the library' });
  await search.fill('OSTEP');
  await expect(page.getByRole('heading', { name: /^Books · \d+$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^OSTEP/ })).toBeVisible();
  await search.fill('Vulkan');
  await expect(page.getByRole('button', { name: /^Vulkan Tutorial/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Vulkan/ }).nth(2)).toBeVisible();
});

test('a path lists the new resources under Optional, by the year they fit from', async ({ page }) => {
  await open(page, './#/library?path=ai');
  const optional = page.getByRole('button', { name: /^Optional for this path/ });
  await optional.click();
  await expect(optional).toHaveAttribute('aria-expanded', 'true');
  const dl = page.getByRole('button', { name: /^DL Specialization/ });
  await expect(dl).toContainText('Year 1 · Course');
  await expect(page.getByRole('button', { name: /^CS234 RL/ })).toContainText('Year 3');
  await dl.click();
  await expect(page.getByRole('dialog', { name: /Deep Learning Specialization/ })).toBeVisible();
});

test('a sheet says how a resource is free and links to it exactly', async ({ page }) => {
  await open(page, './#/library/coursera-deep-learning-specialization');
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByText(/· free to audit$/)).toBeVisible();
  await expect(sheet.getByRole('link', { name: 'Open' })).toHaveAttribute('href', 'https://www.coursera.org/specializations/deep-learning');
  await expect(sheet.getByText(/Link checked \d{4}-\d{2}-\d{2}\./)).toBeVisible();
});

test('a free-tier note and a soft prerequisite show in the sheet', async ({ page }) => {
  await open(page, './#/library/codecrafters');
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByText('Free tier', { exact: false }).first()).toBeVisible();
  await open(page, './#/library/coursera-deep-learning-specialization');
  await expect(page.getByRole('dialog').getByRole('link', { name: /Do first$/ })).toBeVisible();
});
