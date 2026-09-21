import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Smoke tests over the whole app: every page passes an automated accessibility audit in both themes, fits a
 * 380px screen and logs no errors; the keyboard shortcuts work and can be turned off; the heatmap is one tab
 * stop; and the edges of the plan and empty searches say what is going on.
 */
const DAY = '2026-09-23T09:00:00+05:00';

const PAGES = [
  './',
  './#/activity',
  './#/roadmap',
  './#/library',
  './#/library/mit-18-06',
  './#/projects',
  './#/projects/w-c-ring-buffer',
  './#/papers',
  './#/certs',
  './#/certs?view=map',
  './#/reviews',
  './#/reviews?tab=month',
  './#/stats',
  './#/settings',
  './#/no-such-page',
];

test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(DAY) });
});

async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.getByText('Loading…')).toHaveCount(0);
}

for (const theme of ['dark', 'light'] as const) {
  test('every page passes an automated accessibility audit, ' + theme + ' theme', async ({ page }) => {
    test.setTimeout(120_000);
    if (theme === 'light') {
      await open(page, './#/settings');
      await page.getByRole('radio', { name: 'Light' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    }
    const problems: string[] = [];
    for (const path of PAGES) {
      await open(page, path);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
      for (const v of violations) problems.push(path + ': ' + v.id + ' on ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', '));
    }
    expect(problems).toEqual([]);
  });
}

test('every page fits a 380px screen and logs no errors', async ({ page }) => {
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
    await expect(page.getByRole('heading', { level: 1, name: 'Roadmap' })).toBeVisible();
    await page.keyboard.press('t');
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();

    // Today has no search of its own, so "/" goes to the Library's.
    await page.keyboard.press('/');
    const search = page.getByPlaceholder('Search titles, providers, summaries and your notes');
    await expect(search).toBeFocused();
    await page.keyboard.type('rust');
    await expect(search).toHaveValue('rust');
    await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();

    // "l" from another page: Today, with the log form open and the cursor in it.
    await page.locator('main').focus();
    await page.keyboard.press('l');
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
    await expect(page.getByLabel('What did you do?')).toBeFocused();
    await page.keyboard.type('Read about ray marching');
    await expect(page.getByLabel('What did you do?')).toHaveValue('Read about ray marching');

    // On a page with its own search, "/" uses it.
    await open(page, './#/projects');
    await page.locator('main').focus();
    await page.keyboard.press('/');
    await expect(page.getByPlaceholder('Search projects, skills and sources')).toBeFocused();
  });

  test('? lists them, and they can be turned off', async ({ page }) => {
    await open(page, './');
    await page.keyboard.press('?');
    const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Log time on Today')).toBeVisible();
    // While a dialog is open, keys belong to it.
    await page.keyboard.press('r');
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await open(page, './#/settings');
    await page.getByLabel('Use single-key shortcuts').uncheck();
    await page.locator('main').focus();
    await page.keyboard.press('r');
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Use single-key shortcuts')).not.toBeChecked();
  });
});

test('the heatmap is one tab stop, and the arrow keys move through the days', async ({ page }) => {
  await open(page, './#/activity');
  const grid = page.getByRole('group', { name: 'Activity in 2026' });
  await expect(grid.locator('rect[tabindex="0"]')).toHaveCount(1);
  const start = grid.locator('rect[tabindex="0"]');
  await expect(start).toHaveAttribute('data-date', '2026-09-23');
  await start.focus();
  await page.keyboard.press('ArrowRight');
  await expect(grid.locator('rect[data-date="2026-09-30"]')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(grid.locator('rect[data-date="2026-09-29"]')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(grid.locator('rect[data-date="2026-09-21"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Monday, 21 September 2026' })).toBeVisible();
  await expect(grid.locator('rect[tabindex="0"]')).toHaveAttribute('data-date', '2026-09-21');
});

test('a day outside the five years says so', async ({ page }) => {
  await open(page, './#/?date=2026-09-20');
  await expect(page.getByText(/The plan starts on Monday, 21 September 2026/)).toBeVisible();
  await open(page, './');
  await expect(page.getByText(/The plan starts on/)).toHaveCount(0);
});

test('an empty search offers a way back', async ({ page }) => {
  for (const [path, heading] of [
    ['./#/projects?q=zzzqqq', 'Projects'],
    ['./#/papers?q=zzzqqq', 'Papers'],
    ['./#/library?q=zzzqqq', 'Library'],
  ] as const) {
    await open(page, path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nothing matches' })).toBeVisible();
    // The empty state's button (the Library also has one in its result count).
    await page.getByRole('button', { name: 'Clear filters' }).last().click();
    await expect(page.getByRole('heading', { name: 'Nothing matches' })).toHaveCount(0);
  }
});
