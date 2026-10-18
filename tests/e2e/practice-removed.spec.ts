import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { open } from './helpers.ts';

/**
 * Practice was removed in pull request #6. Nothing of it is left to see, `#/practice` is an address like any unknown
 * one, and a backup made by the build with Practice (tests/fixtures/live-2026-10-16/) still restores: its settings
 * lose the Practice block, and the minutes it logged to P stay in their day under the name Practice.
 */
test.use({ timezoneId: 'Asia/Tashkent' });

/** 16 October 2026 was the first day of the practice period: Today had a Practice row then. */
const PRACTICE_DAY = '2026-10-16T10:00:00+05:00';
const BACKUP = readFileSync(join(import.meta.dirname, '..', 'fixtures', 'live-2026-10-16', 'backup.json'));

async function expectNoPractice(page: Page): Promise<void> {
  await open(page, './');
  await expect(page.getByText(/daily challenge/).first()).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText(/Practice|Practise|subjects/);
  await expect(page.locator('a[href*="practice"]')).toHaveCount(0);

  await open(page, './#/activity');
  await expect(page.getByRole('radio', { name: 'Practice' })).toHaveCount(0);
  await open(page, './#/activity?view=practice');
  await expect(page.getByRole('radio', { name: 'Practice' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Logged' })).toBeVisible();

  await open(page, './#/settings');
  await expect(page.getByRole('heading', { name: 'Schedule' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /Practice/ })).toHaveCount(0);
  await expect(page.getByLabel('Questions a subject')).toHaveCount(0);
  await expect(page.locator('#practice')).toHaveCount(0);

  await open(page, './#/library?type=course');
  await expect(page.getByRole('button', { name: 'Add a resource' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Practise/ })).toHaveCount(0);

  await open(page, './#/practice');
  await expect(page.getByRole('heading', { level: 1, name: 'Not found' })).toBeVisible();
  await expect(page.getByText('Nothing lives at /practice.')).toBeVisible();
}

test('a fresh install has no Practice anywhere, and plans the 10-hour day', async ({ page }) => {
  await page.clock.install({ time: new Date(PRACTICE_DAY) });
  await open(page, './');
  await expect(page.getByText('0 m of 10 h today · no streak yet')).toBeVisible();
  await expectNoPractice(page);
});

test('a backup from the build with Practice restores without it, and its Practice minutes stay', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-17T10:00:00+05:00') });
  await open(page, './#/settings');
  await page.getByLabel('Backup file to import').setInputFiles({ name: 'atlas-backup-2026-10-16.json', mimeType: 'application/json', buffer: BACKUP });
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(page.getByText(/Restored \d+ records/)).toBeVisible();
  // The user's own settings came with it: the dark theme, and 90 minutes of C (so 7 h 30 m, not 8 h) for the days
  // it planned. They predate the fixed daily schedule, so from today the day is the schedule's 10 hours.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await open(page, './#/?date=2026-10-16');
  await expect(page.getByText(/^1 h 30 m of 7 h 30 m/)).toBeVisible();
  await open(page, './');
  await expect(page.getByText(/^0 m of 10 h today/)).toBeVisible();
  await expectNoPractice(page);

  // 16 October: 1 h of A and 30 minutes of Practice, in the heatmap and in the day.
  await open(page, './#/activity');
  const cell = page.getByRole('button', { name: /^Friday 16 October: 1 h 30 m/ });
  await expect(cell).toBeVisible();
  await cell.click();
  const sheet = page.getByRole('dialog', { name: /16 October/ });
  await expect(sheet.getByText('Practice · calculus')).toBeVisible();
  await expect(sheet.getByText('Practice · physics')).toBeVisible();
  await expect(sheet.getByText(/^Block P \(Practice\) · /).first()).toBeVisible();

  // Stats keeps the hours logged to P, under its old name.
  await open(page, './#/stats');
  await expect(page.getByText('Block P · Practice')).toBeVisible();
});
