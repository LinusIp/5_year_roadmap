import { expect, test } from '@playwright/test';

const FIRST_DAY = '2026-09-21T09:00:00+05:00';

test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

test('lists all three cadences, with the brief numbering on monthly projects', async ({ page }) => {
  await page.goto('./#/projects');
  await expect(page.getByRole('heading', { level: 2, name: /^Capstones/ })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /^Monthly projects/ })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /^Weekly mini-builds/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^1\.\s*ML Zoomcamp midterm project, deployed/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^35\.\s*Stage 1 capstone/ })).toBeVisible();
});

test('filters by cadence and stage, and stage 2 builds say they need parts', async ({ page }) => {
  await page.goto('./#/projects');
  await page.getByLabel('Cadence').selectOption('monthly');
  await page.getByLabel('Stage').selectOption('2');
  await expect(page).toHaveURL(/cadence=monthly/);
  await expect(page.getByRole('heading', { level: 2, name: /^Weekly mini-builds/ })).toBeHidden();

  const pcb = page.getByRole('listitem').filter({ hasText: /Audio amplifier or power supply on a self-designed KiCad PCB/ });
  await expect(pcb.getByText('needs parts')).toBeVisible();
  // A desk-only stage 2 project has an empty parts list and no badge.
  const spice = page.getByRole('listitem').filter({ hasText: /Own SPICE-like DC and transient solver/ });
  await expect(spice.getByText('needs parts')).toHaveCount(0);
});

test('pick my next project suggests from the current phase and sets it for the week', async ({ page }) => {
  await page.goto('./#/projects');
  const pick = page.getByRole('region', { name: "This week's mini-build" });
  await expect(pick.getByText('Nothing picked yet')).toBeVisible();

  const suggestion = pick.locator('p.eyebrow + div a').first();
  const first = await suggestion.innerText();
  await pick.getByRole('button', { name: 'Pick my next project' }).click();
  await expect(suggestion).not.toHaveText(first);
  const second = await suggestion.innerText();

  await pick.getByRole('button', { name: "Make it this week's" }).click();
  await expect(pick.getByText(/picked for the week of 21 Sep 2026/)).toBeVisible();

  // Today's projects block now carries the same card.
  await page.goto('./');
  await expect(page.getByRole('region', { name: 'Projects / hands-on' }).getByRole('link', { name: second })).toBeVisible();
});

test('shipping a weekly build counts the week, and only with a repository', async ({ page }) => {
  await page.goto('./#/projects/w-c-ring-buffer');
  await page.getByRole('textbox', { name: 'Repository' }).fill('https://github.com/me/ring-buffer');
  await page.getByRole('textbox', { name: 'Repository' }).blur();
  await page.getByRole('radio', { name: 'Done' }).click();
  await expect(page.getByRole('radio', { name: 'Done' })).toHaveAttribute('aria-checked', 'true');

  await page.goto('./#/projects');
  const weekly = page.locator('.card').filter({ hasText: /^Weekly mini-builds/ }).first();
  await expect(weekly.getByText('1 shipped')).toBeVisible();
  await expect(weekly.getByText('this one done')).toBeVisible();

  const row = page.getByRole('listitem').filter({ hasText: /Implement a ring buffer in C/ });
  await expect(row.getByText('Shipped')).toBeVisible();
  await expect(row.getByRole('link', { name: 'repo' })).toHaveAttribute('href', 'https://github.com/me/ring-buffer');
});

test('acceptance criteria tick off on the project and show on the list', async ({ page }) => {
  await page.goto('./#/projects/m02');
  await page.getByRole('checkbox', { name: /Installable with pip/ }).check();
  await page.getByRole('checkbox', { name: /Unit tests with pytest/ }).check();

  await page.goto('./#/projects?q=habit+tracker');
  await expect(page.getByRole('listitem').filter({ hasText: /habit tracker/ }).getByText('2/4 criteria')).toBeVisible();
});
