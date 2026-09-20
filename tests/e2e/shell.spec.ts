import { expect, test } from '@playwright/test';

test.describe('app shell', () => {
  test('loads, navigates by hash and keeps the theme across reloads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('navigation', { name: 'Main' }).first().getByRole('link', { name: 'Roadmap' }).click();
    await expect(page).toHaveURL(/#\/roadmap$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Roadmap' })).toBeVisible();
    await expect(page).toHaveTitle(/Roadmap/);

    await page.getByRole('button', { name: /light theme/i }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('heading', { level: 1, name: 'Roadmap' })).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('unknown routes say so instead of rendering a blank page', async ({ page }) => {
    await page.goto('./#/nowhere');
    await expect(page.getByRole('heading', { level: 1, name: 'Not found' })).toBeVisible();
    await page.getByRole('link', { name: 'Go to Today', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  });

  test('fits a 380px screen without horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('navigation', { name: 'More' }).getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  });
});
