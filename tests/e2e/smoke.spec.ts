import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PAGES, open } from './helpers.ts';

/**
 * Smoke tests over the whole app: every screen and sheet passes an automated accessibility audit in both
 * themes, fits a 380 px screen and logs no errors; the keyboard shortcuts work and can be turned off; the
 * heatmap is one tab stop; and an empty search offers a way back.
 */
const DAY = '2026-09-23T09:00:00+05:00';


test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(DAY) });
});

for (const theme of ['light', 'dark'] as const) {
  test('every screen passes an automated accessibility audit, ' + theme + ' theme', async ({ page }) => {
    test.setTimeout(150_000);
    if (theme === 'dark') {
      await open(page, './#/settings');
      await page.getByRole('radio', { name: 'Dark' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    }
    const problems: string[] = [];
    for (const path of PAGES) {
      await open(page, path);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
      for (const v of violations) problems.push(path + ': ' + v.id + ' on ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', '));
    }
    expect(problems).toEqual([]);
  });
}

test('every screen fits a 380 px screen and logs no errors', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.setViewportSize({ width: 380, height: 800 });
  const overflowing: string[] = [];
  for (const path of PAGES) {
    await open(page, path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) overflowing.push(path + ' by ' + overflow + 'px');
  }
  expect(overflowing).toEqual([]);
  expect(errors).toEqual([]);
});

test.describe('keyboard shortcuts', () => {
  test('t, r, / and l go where they say, and never fire while typing', async ({ page }) => {
    await open(page, './');

    await page.keyboard.press('r');
    await expect(page.getByRole('heading', { level: 1, name: 'Plan' })).toBeVisible();
    await page.keyboard.press('t');
    await expect(page.getByRole('heading', { level: 1, name: 'Wednesday 23 September' })).toBeVisible();

    // Today has no search of its own, so "/" goes to the Library's.
    await page.keyboard.press('/');
    const search = page.getByRole('searchbox', { name: 'Search the library' });
    await expect(search).toBeFocused();
    await page.keyboard.type('rust');
    await expect(search).toHaveValue('rust');
    await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();

    // "l" from another screen: Today, with the Log time sheet open.
    await page.locator('main').focus();
    await page.keyboard.press('l');
    await expect(page.getByRole('dialog', { name: 'Log time' })).toBeVisible();
  });

  test('? lists them, and they can be turned off', async ({ page }) => {
    await open(page, './');
    await page.keyboard.press('?');
    const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Log time on Today')).toBeVisible();
    // While a sheet is open, keys belong to it.
    await page.keyboard.press('r');
    await expect(page.getByRole('heading', { level: 1, name: 'Wednesday 23 September' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await open(page, './#/settings');
    const toggle = page.getByRole('switch', { name: 'Use single-key shortcuts' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await page.locator('main').focus();
    await page.keyboard.press('r');
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('switch', { name: 'Use single-key shortcuts' })).toHaveAttribute('aria-checked', 'false');
  });
});

test('the heatmap is one tab stop, and the arrow keys move through the days', async ({ page }) => {
  await open(page, './#/activity');
  const grid = page.getByRole('group', { name: 'Time logged in 2026' });
  await expect(grid.locator('rect[tabindex="0"]')).toHaveCount(1);
  const start = grid.locator('rect[tabindex="0"]');
  await expect(start).toHaveAttribute('data-date', '2026-09-23');
  await start.focus();
  await page.keyboard.press('ArrowRight');
  await expect(grid.locator('rect[data-date="2026-09-30"]')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(grid.locator('rect[data-date="2026-09-29"]')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(grid.locator('rect[data-date="2026-01-01"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Thursday 1 January' })).toBeVisible();
});

test('an empty search offers a way back', async ({ page }) => {
  await open(page, './#/library?q=zzzqqq');
  await expect(page.getByText(/^Nothing matches/)).toBeVisible();
  await page.getByRole('button', { name: 'Clear the search and filters' }).click();
  await expect(page.getByText(/^Nothing matches/)).toHaveCount(0);
});
