import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { DEMO_TIME, demoBackupText } from '../../scripts/lib/demo.ts';
import { FIRST_DAY, open, writesSettled } from './helpers.ts';

/**
 * ATLAS-ART, through the real UI: Today's header sits on its picture and goes back to a plain row when the
 * illustrations are off; nothing laid over the art fails contrast; the panel reserves its space so nothing shifts;
 * the phases, the map, the empty states and the paths show theirs.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

/** The daily scene (ATLAS-DAILY-SCENES) takes the header first; off, the illustration's slot shows again. */
async function sceneOff(page: Page): Promise<void> {
  await open(page, './#/settings?section=appearance');
  await page.getByRole('switch', { name: 'Daily scene' }).click();
  await writesSettled(page);
}

test('Today shows the art panel with the header on it, and hides it when the setting is off', async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) }); // 09:00: the morning
  await sceneOff(page);
  await open(page, './');
  const panel = page.locator('[data-art-slot]').first();
  await expect(panel).toHaveAttribute('data-art-slot', 'today-morning');
  await expect(panel).toHaveAttribute('data-art', 'placeholder');
  // The header's controls sit on the picture's fade and still work.
  await expect(panel.getByRole('button', { name: /pick a date/ })).toBeVisible();
  await expect(panel.getByRole('link', { name: 'Settings' })).toBeVisible();
  await expect(panel.getByText(/of 10 h today/)).toBeVisible();
  // No tile for the hours beside it: the panel took its place.
  await expect(page.getByText(/of 10 h today/)).toHaveCount(1);

  await open(page, './#/settings?section=layout');
  await page.getByRole('switch', { name: 'Illustrations' }).click();
  await writesSettled(page);
  await open(page, './');
  await expect(page.locator('[data-art-slot]')).toHaveCount(0);
  await expect(page.getByText(/of 10 h today/)).toBeVisible();
  await expect(page.getByRole('button', { name: /pick a date/ })).toBeVisible();
});

test('the header follows the hour, the season or the track as Settings says', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-21T19:30:00+05:00') });
  await sceneOff(page);
  await open(page, './');
  await expect(page.locator('[data-art-slot]').first()).toHaveAttribute('data-art-slot', 'today-evening');
  await open(page, './#/settings?section=layout');
  await page.getByRole('radio', { name: 'The season' }).click();
  await writesSettled(page);
  await open(page, './');
  await expect(page.locator('[data-art-slot]').first()).toHaveAttribute('data-art-slot', 'season-autumn');
  await open(page, './#/settings?section=layout');
  await page.getByRole('radio', { name: 'The track' }).click();
  await writesSettled(page);
  await open(page, './');
  // 19:30 is Coding lessons, the languages track.
  await expect(page.locator('[data-art-slot]').first()).toHaveAttribute('data-art-slot', 'track-languages');
});

for (const theme of ['light', 'dark'] as const) {
  test('no text over the art fails contrast, ' + theme + ' theme', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(new Date(DEMO_TIME));
    await open(page, './#/settings');
    await page.getByLabel('Backup file to import').setInputFiles({ name: 'atlas-backup-demo.json', mimeType: 'application/json', buffer: Buffer.from(demoBackupText(theme)) });
    await page.getByRole('button', { name: 'Replace', exact: true }).click();
    await expect(page.getByText(/Restored \d+ records/)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await sceneOff(page);
    await open(page, './');
    await expect(page.locator('[data-art-slot]').first()).toBeVisible();
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(results.violations).toEqual([]);
    await open(page, './#/plan');
    await expect(page.locator('[data-art-slot^="phase-"]').first()).toBeVisible();
    const plan = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(plan.violations).toEqual([]);
  });
}

test('the panel reserves its space: nothing shifts while Today loads', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { hadRecentInput?: boolean; value: number })[]) {
        if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await sceneOff(page);
  await open(page, './');
  await expect(page.locator('[data-art-slot]').first()).toBeVisible();
  await page.waitForTimeout(800);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls).toBeLessThan(0.05);
  // The panel's box is set by its aspect ratio, not by the picture: 2:1 at the column's width.
  const box = await page.locator('[data-art-slot]').first().boundingBox();
  expect(Math.abs(box!.width / box!.height - 2)).toBeLessThan(0.05);
});

test('the phases, the map, an empty search and a path show their art', async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await sceneOff(page);
  await open(page, './#/plan');
  await expect(page.locator('[data-art-slot="phase-y1-foundations"]').first()).toBeVisible();
  await page.getByRole('button', { name: /^Foundations II/ }).click();
  await expect(page.locator('[data-art-slot="phase-y1-foundations"]')).toHaveCount(2);
  await page.getByRole('button', { name: /^Building/ }).click();
  await expect(page.locator('[data-art-slot="phase-y2-building"]')).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, './#/plan/map');
  const river = page.locator('[data-art-slot="map-river-long"]');
  await expect(river).toHaveCount(1);
  await expect(river).toHaveAttribute('aria-hidden', 'true');

  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, './#/library?type=book');
  await page.getByRole('searchbox').first().fill('zzzz-nothing-here');
  await expect(page.locator('[data-art-slot="empty-state"]')).toBeVisible();

  await open(page, './#/library?path=ai');
  await expect(page.locator('[data-art-slot="path-ai"]')).toBeVisible();
  await expect(page.locator('[data-art-slot="path-ai"]')).toHaveAttribute('aria-hidden', 'true');
});
