import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { FIRST_DAY, logTime, makeNow, nowCard, open, reload } from './helpers.ts';

test.use({ timezoneId: 'Asia/Tashkent' });

test.describe('reviews', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date(FIRST_DAY) });
  });

  test('the weekly review fills in its numbers and keeps the three answers', async ({ page }) => {
    await open(page, './');
    await makeNow(page, /18\.06 Linear Algebra/);
    await logTime(page, '90');

    await open(page, './#/reviews');
    const row = page.getByRole('button', { name: /^Week of 21 to 27 Sep 2026 1 h 30 m logged/ });
    await expect(row).toContainText('This week');
    await row.click();
    const sheet = page.getByRole('dialog', { name: 'Week of 21 to 27 Sep 2026' });
    await expect(sheet.getByText(/^1 h 30 m of 56 h/)).toBeVisible();
    await expect(sheet.getByText(/Math 1 h 30 m/)).toBeVisible();

    await sheet.getByRole('textbox', { name: 'What worked' }).fill('Linear algebra in the morning.');
    await sheet.getByRole('textbox', { name: "What didn't" }).fill('Skipped the projects block.');
    await sheet.getByRole('textbox', { name: 'What changes next week' }).fill('Projects first.');
    await sheet.getByRole('textbox', { name: 'What worked' }).click();
    await sheet.getByRole('button', { name: 'Mark this week reviewed' }).click();
    await expect(sheet.getByText('Reviewed on 21 September.')).toBeVisible();
    await expect(sheet.getByRole('link', { name: /Next week's build/ })).toHaveAttribute('href', /plan\/pick\?week=next/);

    await reload(page);
    await expect(sheet.getByRole('textbox', { name: 'What changes next week' })).toHaveValue('Projects first.');
  });

  test('the monthly review suggests a re-plan and asks whether a project shipped', async ({ page }) => {
    await open(page, './#/reviews?tab=month');
    await page.getByRole('button', { name: /^September 2026/ }).click();
    const sheet = page.getByRole('dialog', { name: 'September 2026' });
    await expect(sheet.getByText(/A re-plan would move \d+ items?|Everything still fits/)).toBeVisible();
    await expect(sheet.getByText(/Filled in from your projects: none was marked done/)).toBeVisible();
    await sheet.getByRole('radio', { name: 'A project shipped' }).click();
    await expect(sheet.getByRole('radio', { name: 'A project shipped' })).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('stats', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date(FIRST_DAY) });
  });

  test('charts hours by track family once time is logged, with a table view', async ({ page }) => {
    await open(page, './#/stats');
    await expect(page.getByText('The charts fill in as you log time.')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Year 1' })).toBeVisible();

    await open(page, './');
    await logTime(page, '120');
    await logTime(page, '60');

    await open(page, './#/stats');
    await expect(page.getByRole('img', { name: 'Hours per track family, by month' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Legend' })).toBeVisible();
    await page.getByRole('button', { name: 'Show the table' }).click();
    await expect(page.getByRole('row', { name: /September 2026/ }).getByRole('cell').last()).toHaveText('3 h');
  });
});

test.describe('settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date(FIRST_DAY) });
  });

  test('block minutes drive Today, and a bad threshold is refused', async ({ page }) => {
    await open(page, './#/settings');
    await page.getByRole('button', { name: /^Block A · Graphics/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Block A' });
    await sheet.getByRole('textbox', { name: 'Minutes a day' }).fill('180');
    await sheet.getByRole('textbox', { name: 'Minutes a day' }).blur();
    await sheet.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText('Blocks · about 9 h a day, 63 h a week')).toBeVisible();

    await open(page, './');
    await expect(page.getByText(/^0 h of 9 h today/)).toBeVisible();
    await expect(nowCard(page).getByText(/0 h of 3 h/)).toBeVisible();

    await open(page, './#/settings');
    const level2 = page.getByRole('textbox', { name: 'Level 2 from, min' });
    await level2.fill('500');
    await level2.blur();
    await expect(page.getByRole('alert')).toHaveText(/must start above the one before it/);
  });

  test('export, reset, then import restores everything, byte for byte', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-21T22:30:00+05:00'));
    await open(page, './');
    await makeNow(page, /18\.06 Linear Algebra/);
    await logTime(page, '75');
    await page.locator('#now-title').click();
    await nowCard(page).getByRole('checkbox', { name: 'Lecture 1: The geometry of linear equations' }).click();
    await page.getByRole('button', { name: 'How was today?' }).click();
    await page.getByRole('dialog', { name: 'How was today?' }).getByRole('textbox', { name: 'One line about today' }).fill('A good first day.');
    await page.getByRole('dialog', { name: 'How was today?' }).getByRole('textbox', { name: 'One line about today' }).blur();

    await open(page, './#/settings');
    const [firstDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export everything' }).click()]);
    expect(firstDownload.suggestedFilename()).toBe('atlas-backup-2026-09-21.json');
    const first = readFileSync((await firstDownload.path())!, 'utf8');
    expect(first).toContain('A good first day.');
    expect(first).toContain('lecture-1');

    await page.getByRole('textbox', { name: 'Type RESET to confirm' }).fill('RESET');
    await page.getByRole('button', { name: 'Reset everything' }).click();
    await expect(page.getByText('Everything was reset.')).toBeVisible();
    await open(page, './');
    await expect(page.getByText(/^0 h of 8 h today/)).toBeVisible();

    await open(page, './#/settings');
    await page.getByLabel('Backup file to import').setInputFiles((await firstDownload.path())!);
    await page.getByRole('button', { name: 'Replace', exact: true }).click();
    await expect(page.getByText(/Restored \d+ records/)).toBeVisible();

    const [secondDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export everything' }).click()]);
    const second = readFileSync((await secondDownload.path())!, 'utf8');
    const strip = (text: string): string => text.replace(/"exportedAt": "[^"]*"/, '');
    expect(strip(second)).toBe(strip(first));

    await open(page, './');
    await expect(page.getByText(/^1 h 15 m of 8 h today/)).toBeVisible();
  });

  test('a file that is not a backup changes nothing', async ({ page }) => {
    await open(page, './#/settings');
    await page.getByLabel('Backup file to import').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":"world"}') });
    await page.getByRole('button', { name: 'Replace', exact: true }).click();
    await expect(page.getByText(/Nothing was changed\. This JSON file is not an Atlas backup\./)).toBeVisible();
  });
});

test.describe('offline', () => {
  test('works offline once it has been opened', async ({ page, context }) => {
    await open(page, './');
    // The worker registers after load, precaches every build file, then claims the page.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    await context.setOffline(true);
    await reload(page);
    await expect(page.locator('#now-title')).toBeVisible();
    // Lazily loaded screens come from the precache too, by link and by a fresh load of a deep link.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Plan' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Plan' })).toBeVisible();
    await page.goto('./#/plan?view=credentials');
    await reload(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Plan' })).toBeVisible();
    await context.setOffline(false);
  });
});
