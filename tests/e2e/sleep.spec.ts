import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { FakeGithub } from '../fake-github.ts';
import { serveGithub } from './github-route.ts';
import { open, reload, writesSettled } from './helpers.ts';

/**
 * The sleep log (SLEEP-LOG): at 05:45 Today asks how you slept; the Sleep screen logs 23:00 to 05:40 and the Slept
 * widget shows 6 h 40 m; last night can be edited; the week chart and its average; a night outside 1 to 16 hours asks
 * first; the question is gone after 12:00 or when turned off; the goal moves the bedtime tile; a reload and a second
 * device keep the night. Sunday 18 October 2026.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });

const at = (time: string, date = '2026-10-18'): Date => new Date(date + 'T' + time + ':00+05:00');
const ask = (page: Page) => page.getByRole('listitem').filter({ hasText: 'How did you sleep?' });
const widget = (page: Page) => page.getByRole('link', { name: /^Slept/ });

async function typeTime(page: Page, label: 'Bedtime' | 'Woke up', time: string): Promise<void> {
  await page.getByRole('textbox', { name: label, exact: true }).fill(time);
  await expect(page.getByRole('textbox', { name: label, exact: true })).toHaveValue(time);
}

async function logNight(page: Page, date: string | null, bed: string, wake: string): Promise<void> {
  await open(page, date ? './#/sleep?date=' + date : './#/sleep');
  await typeTime(page, 'Bedtime', bed);
  await typeTime(page, 'Woke up', wake);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').getByText(/^Saved /)).toBeVisible();
  await writesSettled(page);
}

test('at 05:45 Today asks, the Sleep screen logs 23:00 to 05:40, and the widget shows 6 h 40 m', async ({ page }) => {
  await page.clock.install({ time: at('05:45') });
  await open(page, './');
  await expect(ask(page)).toBeVisible();
  await expect(widget(page)).toHaveAccessibleName('Slept not logged Log sleep');
  await ask(page).getByRole('link', { name: 'Log sleep' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Sleep' })).toBeVisible();
  await expect(page.getByText('Last night · Sat 17 → Sun 18 Oct')).toBeVisible();
  // The defaults: 23:00 at first, and now rounded to 5 minutes.
  await expect(page.getByRole('textbox', { name: 'Bedtime', exact: true })).toHaveValue('23:00');
  await expect(page.getByRole('textbox', { name: 'Woke up', exact: true })).toHaveValue('05:45');
  await expect(page.locator('output')).toHaveText('6 h 45 m');
  // The knobs step 15 minutes, and the result follows.
  await page.getByRole('button', { name: 'Woke up 15 minutes earlier' }).click();
  await expect(page.locator('output')).toHaveText('6 h 30 m');
  await typeTime(page, 'Woke up', '05:40');
  await expect(page.locator('output')).toHaveText('6 h 40 m');
  await expect(page.locator('main [data-variant="filled"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').getByText('Saved 6 h 40 m for Sat 17 → Sun 18 Oct')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Sunday 18 October' })).toContainText('23:00 → 05:40');

  await page.getByRole('link', { name: 'Back to Today' }).click();
  await expect(widget(page)).toContainText('6 h 40 m');
  await expect(widget(page)).toContainText('23:00 → 05:40');
  await expect(ask(page)).toHaveCount(0);
  await reload(page);
  await expect(widget(page)).toHaveAccessibleName('Slept 6 h 40 m 23:00 → 05:40');
});

test('last night can be edited, and a night over 16 hours asks first', async ({ page }) => {
  await page.clock.install({ time: at('07:00') });
  await logNight(page, null, '23:00', '05:40');
  await open(page, './');
  await widget(page).click();
  await expect(page.getByRole('textbox', { name: 'Bedtime', exact: true })).toHaveValue('23:00');
  await page.getByRole('button', { name: 'Bedtime 15 minutes later' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Sunday 18 October' })).toContainText('6 h 25 m');
  // Undo puts the night back.
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Sunday 18 October' })).toContainText('6 h 40 m');

  await typeTime(page, 'Bedtime', '13:00');
  await expect(page.locator('output')).toHaveText('16 h 40 m');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Are you sure? That is 16 h 40 m. Save again to keep it.');
  await expect(page.getByRole('listitem').filter({ hasText: 'Sunday 18 October' })).toContainText('6 h 40 m');
  await page.getByRole('button', { name: 'Save anyway' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Sunday 18 October' })).toContainText('16 h 40 m');
});

test('the week chart shows each night and the average, with the goal and the bedtime for it', async ({ page }) => {
  await page.clock.install({ time: at('07:00') });
  await logNight(page, '2026-10-12', '23:00', '06:00');
  await logNight(page, '2026-10-14', '23:00', '05:00');
  await logNight(page, null, '23:00', '05:40');
  await open(page, './#/sleep');
  const chart = page.getByRole('img', { name: /^This week:/ });
  await expect(chart).toHaveAccessibleName(
    'This week: Monday 7.0 hours, Tuesday not logged, Wednesday 6.0 hours, Thursday not logged, Friday not logged, Saturday not logged, Sunday 6.7 hours. Goal 8 h.',
  );
  await expect(page.getByText('average 6 h 33 m · goal 8 h')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Usual bedtime' })).toContainText('23:00');
  await expect(page.getByRole('region', { name: 'For 8 h by 06:00' })).toContainText('22:00');

  // The goal, in Settings › Sleep, moves the line and the bedtime.
  await open(page, './#/settings?section=sleep');
  await page.getByRole('button', { name: 'Goal half an hour shorter' }).click();
  await expect(page.locator('section#sleep')).toContainText('7 h 30 m');
  await open(page, './#/sleep');
  await expect(page.getByText('average 6 h 33 m · goal 7 h 30 m')).toBeVisible();
  await expect(page.getByRole('region', { name: 'For 7 h 30 m by 06:00' })).toContainText('22:30');

  // Activity's tile: the last 7 nights' average, and a way to the screen.
  await open(page, './#/activity');
  const tile = page.getByRole('link', { name: 'Sleep last 7 nights · average 6 h 33 m · 3 of the last 30 nights logged, from 6.0 to 7.0 hours' });
  await expect(tile).toBeVisible();
  await tile.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sleep' })).toBeVisible();
});

test('the question is gone after 12:00, and when turned off', async ({ page }) => {
  await page.clock.install({ time: at('12:05') });
  await open(page, './');
  await expect(page.locator('#now-title, section[aria-label="Now"]').first()).toBeVisible();
  await expect(ask(page)).toHaveCount(0);
  await expect(widget(page)).toContainText('Log sleep');
  // The days left in the phase, no longer on Today, are in Plan's header.
  await open(page, './#/plan');
  await expect(page.getByText('Year 1 · Foundations I — in flight · ends 31 January · 105 days left')).toBeVisible();

  await page.clock.setFixedTime(at('06:30', '2026-10-19'));
  await open(page, './');
  await expect(ask(page)).toBeVisible();
  await open(page, './#/settings?section=sleep');
  await page.locator('section#sleep').getByRole('switch', { name: 'Ask how I slept' }).click();
  await writesSettled(page);
  await open(page, './');
  await expect(widget(page)).toBeVisible();
  await expect(ask(page)).toHaveCount(0);
});

const TOKEN = 'github_pat_sleep_0123456789';

async function device(browser: Browser, fake: FakeGithub): Promise<Page> {
  const context = await browser.newContext({ timezoneId: 'Asia/Tashkent', locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.clock.install({ time: at('07:00') });
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

test('a night reaches a second device as sleep/<date>.json, and the newer edit wins', async ({ browser }) => {
  const fake = new FakeGithub({ owner: 'octo-learner', repo: 'atlas-data', token: TOKEN, userId: 4242, name: 'Octo Learner' });
  const a = await device(browser, fake);
  await syncNow(a, true);
  await logNight(a, null, '23:00', '05:40');
  await syncNow(a);
  expect(JSON.parse(fake.files()['sleep/2026-10-18.json']!)).toMatchObject({ bed: '2026-10-17T23:00', wake: '2026-10-18T05:40', minutes: 400 });

  const b = await device(browser, fake);
  await syncNow(b, true);
  await open(b, './');
  await expect(widget(b)).toContainText('6 h 40 m');
  // An edit on the second device, later, wins on the first.
  await b.clock.setFixedTime(at('07:30'));
  await logNight(b, null, '22:30', '05:40');
  await syncNow(b);
  await a.clock.setFixedTime(at('07:40'));
  await syncNow(a);
  await open(a, './');
  await expect(widget(a)).toContainText('7 h 10 m');
  await expect(widget(a)).toContainText('22:30 → 05:40');
});
