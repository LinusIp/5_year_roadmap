import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { DEMO_TIME, demoBackupText } from '../../scripts/lib/demo.ts';
import { FIRST_DAY, open } from './helpers.ts';

/**
 * ATLAS-UI-POLISH, through the real UI: the tab bar carries its names, Plan's segments are never clipped, the last
 * card of every tabbed screen ends above the bar on two phones, and Today's numbers agree with each other.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

const TABBED = [
  ['Today', './'],
  ['Plan', './#/plan'],
  ['Calendar', './#/calendar'],
  ['Library', './#/library'],
  ['Activity', './#/activity'],
] as const;

/** How far the last card's bottom is above the tab bar's top, with the page scrolled to the end. */
async function clearance(page: Page): Promise<number> {
  return page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const main = document.querySelector('main')!;
    const children = [...main.children].filter((c) => {
      const r = c.getBoundingClientRect();
      return r.height > 0 && !c.classList.contains('sr-only') && c.tagName !== 'DIALOG';
    });
    const last = children.at(-1)!;
    const bar = document.querySelector('nav[aria-label="Main"] ul')!;
    return bar.getBoundingClientRect().top - last.getBoundingClientRect().bottom;
  });
}

for (const phone of [
  { width: 390, height: 844 },
  { width: 412, height: 915 },
]) {
  test('every tabbed screen ends above the tab bar at ' + phone.width + ' × ' + phone.height, async ({ page }) => {
    await page.setViewportSize(phone);
    await page.clock.install({ time: new Date(FIRST_DAY) });
    for (const [name, path] of TABBED) {
      await open(page, path);
      expect(await clearance(page), name).toBeGreaterThanOrEqual(16);
    }
  });
}

test('the tab bar names its tabs, and Plan\'s segments are never clipped at 390 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await open(page, './#/plan');
  const bar = page.getByRole('navigation', { name: 'Main' });
  for (const name of ['Today', 'Plan', 'Calendar', 'Library', 'Activity']) {
    const link = bar.getByRole('link', { name, exact: true });
    await expect(link).toBeVisible();
    // The name is drawn, not only read: the label's box has a height.
    expect((await link.locator('span').last().boundingBox())?.height ?? 0).toBeGreaterThan(8);
  }
  await expect(bar.getByRole('link', { name: 'Plan', exact: true })).toHaveAttribute('aria-current', 'page');

  const segments = page.getByRole('radiogroup', { name: 'View' }).getByRole('radio');
  await expect(segments).toHaveCount(4);
  await expect(segments.nth(3)).toHaveAccessibleName('Credentials');
  await expect(segments.nth(3)).toHaveText('Certs');
  const clipped = await segments.evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent));
  expect(clipped).toEqual([]);
  // The segments share the track; none reaches past it.
  const track = await page.getByRole('radiogroup', { name: 'View' }).boundingBox();
  const last = await segments.nth(3).boundingBox();
  expect(last!.x + last!.width).toBeLessThanOrEqual(track!.x + track!.width + 1);
});

test('Today\'s numbers agree: blocks under way are counted, the hours sit on the tile, Open is one word', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date(DEMO_TIME));
  await open(page, './#/settings');
  await page.getByLabel('Backup file to import').setInputFiles({ name: 'atlas-backup-demo.json', mimeType: 'application/json', buffer: Buffer.from(demoBackupText('light')) });
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(page.getByText(/Restored \d+ records/)).toBeVisible();
  await open(page, './');
  // The demo's morning: three blocks with minutes short of their two hours.
  await expect(page.getByText(/^\d in progress$/)).toBeVisible();
  await expect(page.getByText('0/5')).toBeVisible();
  const openLink = page.getByRole('link', { name: 'Open course' });
  await expect(openLink).toBeVisible();
  await expect(openLink).toHaveText(/^Open$/);
  const box = await openLink.boundingBox();
  expect(box!.height).toBeLessThan(60);
  // The week strip: today is a ring, the other days are shaded.
  const strip = page.getByRole('navigation', { name: /^This week/ });
  await expect(strip.locator('.day-ring')).toHaveCount(1);
  expect(await strip.locator('[class*="day-"]').count()).toBe(7);

  await open(page, './#/library');
  await expect(page.getByText(/15,\d{3} more when you need them/)).toBeVisible();
  await expect(page.getByText(/\d+ h logged · over estimate/)).toBeVisible();
  await expect(page.getByText(/\d+ of \d+ h$/)).toHaveCount(0);
});
