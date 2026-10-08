import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { DEMO_TIME, demoBackupText } from '../../scripts/lib/demo.ts';
import { open } from './helpers.ts';

/**
 * The redesign's screenshot test: Today, Activity, Plan and Library on a 390 x 844 phone in both themes, plus
 * the five-year map on a desktop, compared with the pictures committed in /screenshots. Eight weeks of demo
 * history are imported first, so the screens have something to show.
 *
 * `npm run screenshots` redraws the baselines after a UI change. They are drawn by Edge on Windows; Linux
 * renders text differently, so CI skips the comparison (DECISIONS.md).
 */
test.skip(Boolean(process.env.CI), 'The baselines are drawn by Edge on Windows; CI renders text differently');
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

const PHONE = [
  ['today', './'],
  ['activity', './#/activity'],
  ['plan', './#/plan'],
  ['library', './#/library'],
] as const;

async function importDemo(page: Page, theme: 'light' | 'dark'): Promise<void> {
  // A fixed time: the clock reads the same in every run, and timers still run.
  await page.clock.setFixedTime(new Date(DEMO_TIME));
  await open(page, './#/settings');
  await page.getByLabel('Backup file to import').setInputFiles({ name: 'atlas-backup-demo.json', mimeType: 'application/json', buffer: Buffer.from(demoBackupText(theme)) });
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(page.getByText(/Restored \d+ records/)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

for (const theme of ['light', 'dark'] as const) {
  test('the phone screens match the committed screenshots, ' + theme + ' theme', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await importDemo(page, theme);
    for (const [name, path] of PHONE) {
      await open(page, path);
      await expect(page.locator('main .text-meta').first()).toBeVisible();
      await expect(page).toHaveScreenshot(name + '-' + theme + '.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });
    }
  });
}

test('the five-year map matches the committed screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await importDemo(page, 'light');
  await open(page, './#/plan/map');
  await expect(page).toHaveScreenshot('map-light.png', { animations: 'disabled', fullPage: true, maxDiffPixelRatio: 0.002 });
});
