import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FIRST_DAY, logTime, open, reload, writesSettled } from './helpers.ts';

/**
 * Keeping the user's data: Settings says whether the browser keeps Atlas's storage and offers to ask; Today asks for
 * a backup once there are three days of history the browser may clear on its own, and "Not now" waits a week.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });

/** Stands in for the browser's answer: kept or not. */
async function storageSays(page: Page, kept: boolean): Promise<void> {
  await page.addInitScript((k) => {
    const storage = navigator.storage as unknown as Record<string, unknown>;
    storage.persisted = async () => k;
    storage.persist = async () => k;
  }, kept);
}

test('with storage the browser may clear, Today asks for a backup after three days of history, and Not now waits', async ({ page }) => {
  await storageSays(page, false);
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await open(page, './');
  await logTime(page, '30');
  await expect(page.getByRole('heading', { name: 'Keep a copy of your progress' })).toHaveCount(0);
  await page.clock.setFixedTime(new Date('2026-09-24T10:00:00+05:00'));
  await reload(page);
  const card = page.getByRole('region', { name: 'Keep a copy of your progress' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('Your 1 day of history exists only in this browser, with no backup yet. This browser may clear Atlas’s data on its own');
  await expect(card.getByRole('link', { name: 'Set up Sync' })).toHaveAttribute('href', '#/settings?section=sync');
  await card.getByRole('button', { name: 'Not now' }).click();
  await writesSettled(page);
  await expect(card).toHaveCount(0);
  await reload(page);
  await expect(page.getByRole('heading', { name: 'Keep a copy of your progress' })).toHaveCount(0);

  await open(page, './#/settings?section=backup');
  await expect(page.getByText(/^Storage: not protected\. This browser may clear Atlas’s data/)).toBeVisible();
  await page.getByRole('button', { name: 'Ask to keep it' }).click();
  await expect(page.getByText(/It said no for now; installing Atlas to the home screen usually earns it\./)).toBeVisible();
});

test('an export from the card saves the file and says where to keep it', async ({ page }) => {
  await storageSays(page, false);
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await open(page, './');
  await logTime(page, '30');
  await page.clock.setFixedTime(new Date('2026-09-25T10:00:00+05:00'));
  await reload(page);
  const download = page.waitForEvent('download');
  await page.getByRole('region', { name: 'Keep a copy of your progress' }).getByRole('button', { name: 'Export a backup' }).click();
  expect((await download).suggestedFilename()).toMatch(/^atlas-backup-.*\.json$/);
  await expect(page.getByText(/^Saved atlas-backup-.*\.json\.$/)).toBeVisible();
  await reload(page);
  await expect(page.getByRole('heading', { name: 'Keep a copy of your progress' })).toHaveCount(0);
});

test('with storage kept, Settings says so and Today waits the month', async ({ page }) => {
  await storageSays(page, true);
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await open(page, './');
  await logTime(page, '30');
  await page.clock.setFixedTime(new Date('2026-09-25T10:00:00+05:00'));
  await reload(page);
  await expect(page.getByRole('heading', { name: 'Keep a copy of your progress' })).toHaveCount(0);
  await open(page, './#/settings?section=backup');
  await expect(page.getByText('Storage: kept. This browser will not clear Atlas’s data on its own.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ask to keep it' })).toHaveCount(0);
});
