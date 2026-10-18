import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Browser, Locator, Page } from '@playwright/test';
import { FakeGithub } from '../fake-github.ts';
import { serveGithub } from './github-route.ts';
import { nowCard, open, pickStatus, reload, writesSettled } from './helpers.ts';

/**
 * The fixed daily schedule (DAILY-SCHEDULE): 06–08 ML Zoomcamp, 08–10 GameDevHQ, 10–12 Hugging Face, a break,
 * 18–20 Coding lessons, 20–22 Math and physics. Now follows the clock; the break and the end of the day have cards
 * of their own; a running block whose time is up offers to move on. Settings from the build before it switch once,
 * keep their own day changes, and the template travels with Sync.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });

/** Monday 21 September 2026, the plan's first day, at a time of day in Tashkent. */
const at = (time: string, date = '2026-09-21'): Date => new Date(date + 'T' + time + ':00+05:00');
const nowLabel = (page: Page): Locator => nowCard(page).getByText(/^Now · /);
const event = (page: Page, name: string): Locator => page.getByRole('button', { name: new RegExp('^' + name + ' ?, \\d') });

test('at 06:10 ML Zoomcamp is Now, and the day is 10 hours', async ({ page }) => {
  await page.clock.install({ time: at('06:10') });
  await open(page, './');
  await expect(nowLabel(page)).toHaveText('Now · 06:00–08:00');
  await expect(page.locator('#now-title')).toHaveText('ML Zoomcamp');
  await expect(nowCard(page)).toContainText('0 m of 2 h · Module 1 · 6 of 97 videos done');
  await expect(page.getByText('0 m of 10 h today · no streak yet')).toBeVisible();
  // Later today in the order of the day, with the break between the sessions.
  const later = page.locator('section:has(h2:text-is("Later today")) li');
  await expect(later).toHaveText(['Session 1 · 06:00–12:00', /^GameDevHQ.*08:00–10:00$/, /^Hugging Face.*10:00–12:00$/, 'Break · 12:00–18:00', 'Session 2 · 18:00–22:00', /^Coding lessons.*18:00–20:00$/, /^Math and physics.*20:00–22:00$/, /^Blog post · not yet/]);
});

test('at 08:40 GameDevHQ is Now with its course; at 13:00 it is the break, with Coding lessons next', async ({ page }) => {
  await page.clock.install({ time: at('08:40') });
  await open(page, './');
  await expect(nowLabel(page)).toHaveText('Now · 08:00–10:00');
  await expect(page.locator('#now-title')).toHaveText('GameDevHQ');
  await expect(nowCard(page).getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  await expect(nowCard(page).getByRole('link', { name: /Open course/ })).toBeVisible();

  await page.clock.setFixedTime(at('13:00'));
  await page.reload();
  const card = page.getByRole('region', { name: 'Now' });
  await expect(card).toContainText('Break · 12:00–18:00');
  await expect(card.getByRole('heading', { name: 'Break until 18:00' })).toBeVisible();
  await expect(card.getByRole('button', { name: /^Next: Coding lessons/ })).toContainText('30 Days of Python');
  // A tap starts the evening early: Coding lessons becomes Now.
  await card.getByRole('button', { name: /^Next: Coding lessons/ }).click();
  await expect(page.locator('#now-title')).toHaveText('Coding lessons');

  await page.clock.setFixedTime(at('22:30'));
  await page.reload();
  await expect(page.getByText('That was the day.')).toBeVisible();
});

test('a running block whose time is up offers to move on: Switch starts the next, Keep going stays quiet', async ({ page }) => {
  await page.clock.install({ time: at('07:50') });
  await open(page, './');
  await expect(page.locator('#now-title')).toHaveText('ML Zoomcamp');
  await nowCard(page).getByRole('button', { name: 'Start', exact: true }).click();
  await writesSettled(page);
  const prompt = page.getByRole('region', { name: 'Move on' });
  await expect(prompt).toHaveCount(0);

  await page.clock.fastForward('11:00');
  await expect(prompt).toContainText('Move on to GameDevHQ?');
  await prompt.getByRole('button', { name: 'Keep going' }).click();
  await expect(prompt).toHaveCount(0);
  await page.clock.fastForward('01:00');
  await expect(prompt).toHaveCount(0);

  // Asked again at the next end only if the same block still runs: start GameDevHQ by the prompt at 10:00 instead.
  await page.reload();
  await expect(prompt).toHaveCount(0);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(prompt).toContainText('Move on to GameDevHQ?');
  await prompt.getByRole('button', { name: 'Switch' }).click();
  await writesSettled(page);
  await expect(page.locator('#now-title')).toHaveText('GameDevHQ');
  await expect(nowCard(page).getByRole('button', { name: /^Stop/ })).toBeVisible();
  // ML Zoomcamp kept its 12 minutes; its window is over, so it waits under Earlier · not finished.
  await expect(page.locator('section:has(h2:text-is("Earlier · not finished"))').getByRole('button', { name: /^ML Zoomcamp/ })).toContainText('12 m of 2 h');
});

test('finishing ML Zoomcamp moves lane C on to its next course', async ({ page }) => {
  await page.clock.install({ time: at('06:10') });
  await open(page, './#/library/ml-zoomcamp');
  await pickStatus(page, page.getByRole('button', { name: /^Status of / }).first(), 'Done');
  await open(page, './');
  await expect(page.locator('#now-title')).toHaveText('ML Zoomcamp');
  await expect(nowCard(page)).not.toContainText('module 1');
  await expect(nowCard(page).getByText(/^0 m of 2 h · /)).toBeVisible();
});

test('Calendar applies a change to every day, from today on, and Settings resets to the daily schedule', async ({ page }) => {
  await page.clock.install({ time: at('09:00') });
  await open(page, './#/calendar?view=day');
  await event(page, 'Math and physics').click();
  const sheet = page.getByRole('dialog', { name: 'Math and physics' });
  await sheet.getByLabel('Starts').fill('21:00');
  await sheet.getByLabel('Length').selectOption('60');
  await sheet.getByRole('switch', { name: 'Apply to every day' }).click();
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(event(page, 'Math and physics')).toHaveAccessibleName(/^Math and physics ?, 21:00 to 22:00/);
  await open(page, './#/calendar?view=day&date=2026-09-24');
  await expect(event(page, 'Math and physics')).toHaveAccessibleName(/^Math and physics ?, 21:00 to 22:00/);
  // Days before today keep the schedule they had.
  await open(page, './#/calendar?view=day&date=2026-09-20');
  await expect(event(page, 'Math and physics')).toHaveAccessibleName(/^Math and physics ?, 20:00 to 22:00/);

  await open(page, './#/settings?section=schedule');
  await page.getByRole('button', { name: /^Reset to the daily schedule/ }).click();
  await open(page, './#/calendar?view=day&date=2026-09-24');
  await expect(event(page, 'Math and physics')).toHaveAccessibleName(/^Math and physics ?, 20:00 to 22:00/);
});

const LIVE_BACKUP = readFileSync(join(import.meta.dirname, '..', 'fixtures', 'live-2026-10-18', 'backup.json'));

test('a backup from the build before the schedule switches to it from today, keeping its own day change and its busy class', async ({ page }) => {
  await page.clock.install({ time: at('09:00', '2026-10-18') });
  await open(page, './#/settings');
  await page.getByLabel('Backup file to import').setInputFiles({ name: 'atlas-backup-2026-10-18.json', mimeType: 'application/json', buffer: LIVE_BACKUP });
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(page.getByText(/Restored \d+ records/)).toBeVisible();

  await open(page, './');
  await expect(page.getByText(/ of 10 h today/)).toBeVisible();
  await expect(page.locator('#now-title')).toHaveText('GameDevHQ');
  // The day change made on the old build, GameDevHQ (Graphics then) at 19:00 on Tuesday 20 October, still holds: it
  // leaves the morning and, Coding lessons keeping 18:00 to 20:00, follows it at 20:15. The Tuesday class (10:00 to
  // 13:00) still moves Hugging Face after it.
  await open(page, './#/calendar?view=day&date=2026-10-20');
  await expect(event(page, 'GameDevHQ')).toHaveAccessibleName(/^GameDevHQ ?, 20:15/);
  await expect(page.getByRole('button', { name: /^University · 10:00 ?, busy/ })).toBeVisible();
  await expect(event(page, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 13:15/);
  // Yesterday keeps the 8-hour day it was planned with, Projects included.
  await open(page, './#/calendar?view=day&date=2026-10-17');
  await expect(event(page, 'Projects')).toBeVisible();
  await reload(page);
  await expect(event(page, 'Projects')).toBeVisible();
});

const TOKEN = 'github_pat_schedule_0123456789';

async function device(browser: Browser, fake: FakeGithub): Promise<Page> {
  const context = await browser.newContext({ timezoneId: 'Asia/Tashkent', locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.clock.install({ time: at('09:00') });
  await serveGithub(page, fake);
  return page;
}

async function syncNow(page: Page, first = false): Promise<void> {
  await writesSettled(page);
  await open(page, './#/settings?section=sync');
  const section = page.locator('section#sync');
  if (first) {
    await section.getByRole('textbox', { name: 'Repository' }).fill('octo-learner/atlas-data');
    await section.getByLabel('Personal access token').fill(TOKEN);
    await section.getByRole('button', { name: 'Connect' }).click();
  } else {
    await section.getByRole('button', { name: 'Sync now' }).click();
  }
  await expect(section.getByRole('status')).toHaveText('Synced just now');
}

test('a change to the daily schedule reaches a second device', async ({ browser }) => {
  const fake = new FakeGithub({ owner: 'octo-learner', repo: 'atlas-data', token: TOKEN, userId: 4242, name: 'Octo Learner' });
  const a = await device(browser, fake);
  await syncNow(a, true);
  await open(a, './#/calendar?view=day');
  await event(a, 'Coding lessons').click();
  const sheet = a.getByRole('dialog', { name: 'Coding lessons' });
  await sheet.getByLabel('Starts').fill('17:00');
  await sheet.getByRole('switch', { name: 'Apply to every day' }).click();
  await sheet.getByRole('button', { name: 'Save' }).click();
  await syncNow(a);

  const b = await device(browser, fake);
  await syncNow(b, true);
  await open(b, './#/calendar?view=day&date=2026-09-23');
  await expect(event(b, 'Coding lessons')).toHaveAccessibleName(/^Coding lessons ?, 17:00/);
  await reload(b);
  await expect(event(b, 'Coding lessons')).toHaveAccessibleName(/^Coding lessons ?, 17:00/);
});
