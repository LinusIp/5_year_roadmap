import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const FIRST_DAY = '2026-09-21T09:00:00+05:00';

test.use({ timezoneId: 'Asia/Tashkent' });

async function logMinutes(page: Page, block: string, minutes: string): Promise<void> {
  const region = page.getByRole('region', { name: block });
  await region.getByRole('button', { name: /^\s*\d/ }).first().click();
  const input = region.getByRole('textbox', { name: 'Minutes for this block' });
  await input.fill(minutes);
  await input.press('Enter');
}

test.describe('reviews', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date(FIRST_DAY) });
  });

  test('the weekly review fills in its numbers and keeps the three answers', async ({ page }) => {
    await page.goto('./');
    await logMinutes(page, 'Math & physics', '90');
    await page.getByRole('region', { name: 'Math & physics' }).getByRole('button', { name: 'Unit done' }).click();

    await page.goto('./#/reviews');
    const week = page.getByRole('article').filter({ hasText: /Week of 21 to 27 Sep 2026/ });
    await expect(week.getByText('This week', { exact: true })).toBeVisible();
    await expect(week.getByText('1.5h', { exact: true })).toBeVisible();
    await expect(week.getByText('E · 1h 30m')).toBeVisible();

    await week.getByLabel('What worked').fill('Linear algebra in the morning.');
    await week.getByLabel("What didn't").fill('Skipped the projects block.');
    await week.getByLabel('What changes next week').fill('Projects first.');
    await week.getByRole('button', { name: 'Mark this week reviewed' }).click();
    await expect(week.getByText(/Reviewed on 2026-09-21/)).toBeVisible();

    await page.reload();
    await expect(week.getByLabel('What changes next week')).toHaveValue('Projects first.');
  });

  test('the monthly review suggests a re-plan and asks whether a project shipped', async ({ page }) => {
    await page.goto('./#/reviews?tab=month');
    const month = page.getByRole('article').filter({ hasText: /September 2026/ });
    await expect(month.getByText('Re-plan suggestion')).toBeVisible();
    await expect(month.getByText(/A re-plan from today would move \d+ items?|Everything still fits/)).toBeVisible();
    await expect(month.getByText(/Filled in from your projects: none was marked done/)).toBeVisible();
    await month.getByRole('button', { name: 'Yes' }).click();
    await expect(month.getByRole('button', { name: 'Yes' })).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('stats', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date(FIRST_DAY) });
  });

  test('charts hours by track family once time is logged, with a table view', async ({ page }) => {
    await page.goto('./#/stats');
    await expect(page.getByRole('heading', { name: 'No hours logged yet' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Year 1' })).toBeVisible();

    await page.goto('./');
    await logMinutes(page, 'Math & physics', '120');
    await logMinutes(page, 'Languages', '60');

    await page.goto('./#/stats');
    const chart = page.getByRole('img', { name: 'Hours per track family, by month' });
    await expect(chart).toBeVisible();
    await expect(page.getByRole('list', { name: 'Legend' }).getByText('Math & science')).toBeVisible();

    await page.getByRole('button', { name: 'Show table' }).click();
    const row = page.getByRole('row', { name: /September 2026/ });
    await expect(row.getByRole('cell').last()).toHaveText('3h');
  });
});

test.describe('settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date(FIRST_DAY) });
  });

  test('block minutes drive Today, and a bad threshold is refused', async ({ page }) => {
    await page.goto('./#/settings');
    const minutes = page.getByRole('spinbutton', { name: 'Minutes a day' }).first();
    await minutes.fill('180');
    await minutes.blur();
    await expect(page.getByText(/9h a day on average/)).toBeVisible();

    await page.goto('./');
    await expect(page.getByText('9h to go')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Gamedev / Graphics / Simulation' }).getByText('0m / 3h')).toBeVisible();

    await page.goto('./#/settings');
    const level2 = page.getByRole('spinbutton', { name: 'Level 2 from' });
    await level2.fill('500');
    await level2.blur();
    await expect(page.getByRole('alert')).toHaveText(/must start above the one before it/);
  });

  test('export, reset, then import restores everything, byte for byte', async ({ page }) => {
    await page.goto('./');
    await logMinutes(page, 'Math & physics', '75');
    await page.getByRole('region', { name: 'Math & physics' }).getByRole('button', { name: 'Unit done' }).click();
    await page.getByPlaceholder('What moved today?').fill('A good first day.');
    await page.getByPlaceholder('What moved today?').blur();

    await page.goto('./#/settings');
    const [firstDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export everything' }).click()]);
    expect(firstDownload.suggestedFilename()).toBe('atlas-backup-2026-09-21.json');
    const first = readFileSync((await firstDownload.path())!, 'utf8');
    expect(first).toContain('A good first day.');
    expect(first).toContain('lecture-1');

    await page.getByText('Reset everything', { exact: true }).first().click();
    await page.getByLabel('Type RESET to confirm').fill('RESET');
    await page.getByRole('button', { name: 'Reset everything' }).click();
    await expect(page.getByText('Everything was reset.')).toBeVisible();

    await page.goto('./');
    await expect(page.getByText('8h to go')).toBeVisible();

    await page.goto('./#/settings');
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByLabel('Backup file to import').setInputFiles((await firstDownload.path())!);
    await expect(page.getByText(/Restored \d+ records/)).toBeVisible();

    const [secondDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export everything' }).click()]);
    const second = readFileSync((await secondDownload.path())!, 'utf8');
    const strip = (text: string): string => text.replace(/"exportedAt": "[^"]*"/, '');
    expect(strip(second)).toBe(strip(first));

    await page.goto('./');
    await expect(page.getByText('6h 45m to go')).toBeVisible();
    await expect(page.getByPlaceholder('What moved today?')).toHaveValue('A good first day.');
  });

  test('a file that is not a backup changes nothing', async ({ page }) => {
    await page.goto('./#/settings');
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByLabel('Backup file to import').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":"world"}') });
    await expect(page.getByText(/Nothing was changed\. This JSON file is not an Atlas backup\./)).toBeVisible();
  });
});

test.describe('backup reminder', () => {
  test('asks after a month of history, and a snooze hides it', async ({ page }) => {
    await page.clock.install({ time: new Date(FIRST_DAY) });
    await page.goto('./');
    await logMinutes(page, 'Languages', '30');
    await expect(page.getByRole('region', { name: 'Backup reminder' })).toBeHidden();

    await page.clock.setFixedTime(new Date('2026-10-22T09:00:00+05:00'));
    await page.reload();
    const reminder = page.getByRole('region', { name: 'Backup reminder' });
    await expect(reminder).toBeVisible();
    await expect(reminder.getByText('You have never backed up.')).toBeVisible();

    await reminder.getByRole('button', { name: 'In a week' }).click();
    await expect(reminder).toBeHidden();
  });
});

test.describe('offline', () => {
  test('works offline once it has been opened', async ({ page, context }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
    // The worker registers after load, precaches every build file, then claims the page.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
    // Lazily loaded pages come from the precache too, by link and by a fresh load of a deep link.
    await page.getByRole('navigation', { name: 'Main' }).first().getByRole('link', { name: 'Roadmap' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Roadmap' })).toBeVisible();
    await page.goto('./#/certs');
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Certifications' })).toBeVisible();
    await context.setOffline(false);
  });
});
