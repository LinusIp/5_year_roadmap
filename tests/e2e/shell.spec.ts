import { expect, test } from '@playwright/test';
import { FIRST_DAY, open } from './helpers.ts';

test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

test.describe('app shell', () => {
  test('opens light, navigates by hash, and keeps the theme across reloads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await open(page, './');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Plan' }).click();
    await expect(page).toHaveURL(/#\/plan$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Plan' })).toBeVisible();
    await expect(page).toHaveTitle(/Plan/);
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Plan' })).toHaveAttribute('aria-current', 'page');

    await open(page, './');
    await page.getByRole('button', { name: 'Switch to the dark theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    expect(pageErrors).toEqual([]);
  });

  test('unknown routes say so instead of rendering a blank page', async ({ page }) => {
    await open(page, './#/nowhere');
    await expect(page.getByRole('heading', { level: 1, name: 'Not found' })).toBeVisible();
    await page.getByRole('link', { name: 'Go to Today', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Monday 21 September' })).toBeVisible();
  });

  test('Settings sits behind the gear on Today', async ({ page }) => {
    await open(page, './');
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  });

  test('addresses from before the redesign still land in the right place', async ({ page }) => {
    await open(page, './#/roadmap');
    await expect(page).toHaveURL(/#\/plan$/);
    await open(page, './#/projects');
    await expect(page).toHaveURL(/#\/plan\?view=projects$/);
    await open(page, './#/certs?subject=python');
    await expect(page).toHaveURL(/#\/plan\?view=credentials&subject=python$/);
    await open(page, './#/projects/w-c-ring-buffer');
    await expect(page.getByRole('dialog', { name: /ring buffer/i })).toBeVisible();
  });
});
