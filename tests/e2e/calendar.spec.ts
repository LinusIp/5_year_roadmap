import { expect, test } from '@playwright/test';
import type { Browser, Locator, Page } from '@playwright/test';
import { FakeGithub } from '../fake-github.ts';
import { serveGithub } from './github-route.ts';
import { FIRST_DAY, laterRow, nowCard, open, reload, writesSettled } from './helpers.ts';

/**
 * Calendar: the month, a date's day view, and changing it like a calendar app. The clock is the plan's first day
 * (Monday 21 September 2026, 09:00 in Tashkent), the daily schedule: ML Zoomcamp 06:00, GameDevHQ 08:00, Hugging Face
 * 10:00, a break from 12:00, Coding lessons 18:00 and Math and physics 20:00, two hours each.
 */
test.use({ timezoneId: 'Asia/Tashkent', viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

/** A block on the day grid, by its name: its accessible name starts with it. */
const event = (page: Page, name: string): Locator => page.getByRole('button', { name: new RegExp('^' + name + ' ?, \\d') });

/** Drags a locator vertically by a number of minutes on the grid (56 px an hour). */
async function drag(page: Page, target: Locator, minutes: number, where: 'middle' | 'bottom' = 'middle'): Promise<void> {
  // Away from the tab bar and the toast above it.
  await target.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const box = (await target.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = where === 'middle' ? box.y + Math.min(20, box.height / 2) : box.y + box.height - 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 10, { steps: 2 });
  await page.mouse.move(x, y + (minutes * 56) / 60, { steps: 8 });
  await page.mouse.up();
}

test('a phone opens on the day; the month shows today; a date opens its day, with the blocks at their times', async ({ page }) => {
  await open(page, './#/calendar');
  await expect(page.getByRole('radio', { name: 'Day' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('Mon 21 Sep', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'Month' }).click();
  await expect(page.getByText('September 2026')).toBeVisible();
  const month = page.getByRole('grid', { name: 'Days' });
  await expect(month.getByRole('button', { name: /^Monday 21 September, today/ })).toBeVisible();
  await expect(month.getByRole('button', { name: /^Tuesday 22 September.*5 blocks planned/ })).toBeVisible();

  await month.getByRole('button', { name: /^Wednesday 23 September/ }).click();
  await expect(page.getByText('Wed 23 Sep', { exact: true })).toBeVisible();
  await expect(event(page, 'ML Zoomcamp')).toHaveAccessibleName(/^ML Zoomcamp ?, 06:00 to 08:00/);
  await expect(event(page, 'GameDevHQ')).toHaveAccessibleName(/^GameDevHQ ?, 08:00 to 10:00/);
  await expect(event(page, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 10:00 to 12:00/);
  await expect(event(page, 'Coding lessons')).toHaveAccessibleName(/^Coding lessons ?, 18:00 to 20:00/);
  await expect(event(page, 'Math and physics')).toHaveAccessibleName(/^Math and physics ?, 20:00 to 22:00/);
  // Projects is not in the daily schedule.
  await expect(event(page, 'Projects')).toHaveCount(0);
  await expect(page.getByText('0 m of 10 h')).toBeVisible();

  // Arrows move by a day in the day view, and Today comes back.
  await page.getByRole('button', { name: 'Next day' }).click();
  await expect(page.getByText('Thu 24 Sep', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.getByText('Mon 21 Sep', { exact: true })).toBeVisible();
});

test('drag a block to 19:00, make it 90 minutes, and Today follows', async ({ page }) => {
  await open(page, './#/calendar?view=day');
  await drag(page, event(page, 'Coding lessons'), 19 * 60 - 18 * 60);
  await expect(event(page, 'Coding lessons')).toHaveAccessibleName(/^Coding lessons ?, 19:00 to 21:00/);
  await expect(page.getByRole('status').getByText('Moved Coding lessons to 19:00')).toBeVisible();
  // Math and physics, at 20:00 in the schedule, moves past it with a 15-minute break.
  await expect(event(page, 'Math and physics')).toHaveAccessibleName(/^Math and physics ?, 21:15 to 23:15/);

  await drag(page, event(page, 'Coding lessons'), -30, 'bottom');
  await expect(event(page, 'Coding lessons')).toHaveAccessibleName(/^Coding lessons ?, 19:00 to 20:30/);
  await expect(event(page, 'Math and physics')).toHaveAccessibleName(/^Math and physics ?, 20:45 to 22:45/);

  // Today: the rows follow the new times, the break ends at 19:00, and Coding lessons takes 1 h 30 m.
  await open(page, './');
  const rows = page.locator('section:has(h2:text-is("Later today")) li');
  // The last block of the day (the log lives on its tile, not in the list).
  await expect(rows.last()).toContainText('Math and physics');
  await expect(rows.last()).toContainText('20:45');
  await expect(laterRow(page, /^Coding lessons/)).toContainText('19:00');
  await expect(page.getByText('Break · 12:00–19:00')).toBeVisible();
  await laterRow(page, /^Coding lessons/).click();
  await expect(page.locator('#now-title')).toHaveText('Coding lessons');
  await expect(nowCard(page).getByText(/^0 m of 1 h 30 m · /)).toBeVisible();
});

test('the block sheet sets the time, and Undo takes it back', async ({ page }) => {
  await open(page, './#/calendar?view=day');
  await event(page, 'Hugging Face').click();
  const sheet = page.getByRole('dialog', { name: 'Hugging Face' });
  await sheet.getByLabel('Starts').fill('16:00');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(event(page, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 16:00 to 18:00/);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(event(page, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 10:00 to 12:00/);
});

test('a weekly busy event on Tuesdays moves the blocks out of its way', async ({ page }) => {
  await open(page, './#/calendar?view=day&date=2026-09-22');
  await page.getByRole('button', { name: 'Add time', exact: true }).click();
  const add = page.getByRole('dialog', { name: /^Add at / });
  await add.getByRole('radio', { name: 'Busy' }).click();
  await add.getByLabel('Starts').fill('09:00');
  await add.getByLabel('Length').selectOption(String(4 * 60));
  await add.getByRole('textbox', { name: 'What' }).fill('Lectures');
  await add.getByRole('switch', { name: 'Every Tuesday' }).click();
  await add.getByRole('button', { name: 'Add busy time' }).click();

  await expect(page.getByRole('button', { name: /^Lectures · 09:00 ?, busy, 09:00 to 13:00/ })).toBeVisible();
  // ML Zoomcamp is done before it; GameDevHQ and Hugging Face, which overlap it, go after it.
  await expect(event(page, 'ML Zoomcamp')).toHaveAccessibleName(/^ML Zoomcamp ?, 06:00 to 08:00/);
  await expect(event(page, 'GameDevHQ')).toHaveAccessibleName(/^GameDevHQ ?, 13:15 to 15:15/);
  await expect(event(page, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 15:30 to 17:30/);
  // The next Tuesday too, and not the Wednesday.
  await page.getByRole('button', { name: 'Next day' }).click();
  await expect(event(page, 'GameDevHQ')).toHaveAccessibleName(/^GameDevHQ ?, 08:00/);
  await open(page, './#/calendar?view=day&date=2026-09-29');
  await expect(page.getByRole('button', { name: /^Lectures · 09:00 ?, busy, 09:00 to 13:00/ })).toBeVisible();
  await expect(event(page, 'GameDevHQ')).toHaveAccessibleName(/^GameDevHQ ?, 13:15/);
  await expect(event(page, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 15:30/);
});

test('a block dropped on busy time offers to shift it and the blocks after it', async ({ page }) => {
  await open(page, './#/calendar?view=day&date=2026-09-22');
  await page.getByRole('button', { name: 'Add time', exact: true }).click();
  const add = page.getByRole('dialog', { name: /^Add at / });
  await add.getByRole('radio', { name: 'Busy' }).click();
  await add.getByLabel('Starts').fill('18:00');
  await add.getByRole('textbox', { name: 'What' }).fill('Dentist');
  await add.getByRole('button', { name: 'Add busy time' }).click();
  // Coding lessons, at 18:00, already moves out of the Dentist's way.
  await expect(event(page, 'Coding lessons')).toHaveAccessibleName(/^Coding lessons ?, 19:15 to 21:15/);
  await drag(page, event(page, 'GameDevHQ'), 10 * 60);
  const conflict = page.getByRole('dialog', { name: 'Busy then' });
  await expect(conflict).toContainText('Dentist is 18:00–19:00. Shift GameDevHQ and the blocks after it to after 19:00?');
  await conflict.getByRole('button', { name: 'Shift them' }).click();
  await expect(event(page, 'GameDevHQ')).toHaveAccessibleName(/^GameDevHQ ?, 19:15 to 21:15/);
  await expect(event(page, 'Coding lessons')).toHaveAccessibleName(/^Coding lessons ?, 21:30 to 23:30/);
});

test('apply a change to every day', async ({ page }) => {
  // Every weekday uses the daily schedule, so the change goes into it: no copy for Monday.
  await open(page, './#/calendar?view=day');
  await event(page, 'Hugging Face').click();
  const sheet = page.getByRole('dialog', { name: 'Hugging Face' });
  await sheet.getByLabel('Starts').fill('14:00');
  await expect(sheet.getByRole('switch', { name: 'Apply to every Monday' })).toHaveCount(0);
  await expect(sheet.getByText('Saves the time and length in the daily schedule, from today on')).toBeVisible();
  await sheet.getByRole('switch', { name: 'Apply to every day' }).click();
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(event(page, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 14:00 to 16:00/);

  // The next Monday, a Tuesday and a Saturday all have it, and still use the daily schedule itself.
  for (const date of ['2026-09-28', '2026-09-29', '2026-09-26']) {
    await open(page, './#/calendar?view=day&date=' + date);
    await expect(event(page, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 14:00 to 16:00/);
    await expect(page.getByRole('button', { name: 'Daily schedule', exact: true })).toBeVisible();
  }
  // A day before today keeps its plan.
  await open(page, './#/calendar?view=day&date=2026-09-20');
  await expect(event(page, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 10:00 to 12:00/);
});

test('with another template on some weekday, a change applies to every Monday only', async ({ page }) => {
  // Saturday gets the Weekend template: the weekdays no longer share one template.
  await open(page, './#/settings?section=schedule');
  await page.getByRole('button', { name: /^Saturday/ }).click();
  await page.getByRole('dialog', { name: 'Saturday' }).getByRole('button', { name: /^Weekend/ }).click();
  await expect(page.getByRole('button', { name: /^Saturday/ })).toContainText('Weekend');

  await open(page, './#/calendar?view=day');
  await event(page, 'Hugging Face').click();
  const sheet = page.getByRole('dialog', { name: 'Hugging Face' });
  await sheet.getByLabel('Starts').fill('14:00');
  await expect(sheet.getByRole('switch', { name: 'Apply to every day' })).toHaveCount(0);
  await sheet.getByRole('switch', { name: 'Apply to every Monday' }).click();
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(event(page, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 14:00 to 16:00/);

  // Monday has its own copy of the daily schedule.
  await open(page, './#/calendar?view=day&date=2026-09-28');
  await expect(event(page, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 14:00/);
  await expect(page.getByRole('button', { name: 'Daily schedule · Monday', exact: true })).toBeVisible();
  // Tuesday keeps the daily schedule as it was.
  await open(page, './#/calendar?view=day&date=2026-09-29');
  await expect(event(page, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 10:00 to 12:00/);
  await expect(page.getByRole('button', { name: 'Daily schedule', exact: true })).toBeVisible();
});

test('an empty slot adds a block that is not on the day, or makes it a rest day', async ({ page }) => {
  await open(page, './#/calendar?view=day&date=2026-09-23');
  // Hugging Face is skipped for this date only.
  await event(page, 'Hugging Face').click();
  await page.getByRole('dialog', { name: 'Hugging Face' }).getByRole('button', { name: /^Skip it this day/ }).click();
  await expect(event(page, 'Hugging Face')).toHaveCount(0);
  await expect(page.getByText('0 m of 8 h')).toBeVisible();

  // Projects, not in the daily schedule, goes into the break.
  await page.getByRole('button', { name: 'Add time', exact: true }).click();
  const add = page.getByRole('dialog', { name: /^Add at / });
  await add.getByLabel('Starts').fill('14:00');
  await add.getByRole('button', { name: /^Projects/ }).click();
  await expect(event(page, 'Projects')).toHaveAccessibleName(/^Projects ?, 14:00 to 15:00/);
  await expect(page.getByText('0 m of 9 h')).toBeVisible();

  await page.getByRole('button', { name: 'Add time', exact: true }).click();
  await add.getByRole('radio', { name: 'Rest day' }).click();
  await add.getByRole('button', { name: 'Make it a rest day' }).click();
  await expect(page.getByText(/· rest day · 0 m logged$/)).toBeVisible();
});

test('the timer is the only way to log: it counts through a reload, one at a time, and a correction lives in Calendar', async ({ page }) => {
  await open(page, './');
  const now = page.locator('section[aria-labelledby="now-title"]');
  // At 09:00 the clock's block is GameDevHQ.
  await expect(page.locator('#now-title')).toHaveText('GameDevHQ');
  await expect(now.getByRole('button', { name: 'Log time' })).toHaveCount(0);
  await now.getByRole('button', { name: 'Start' }).click();
  await writesSettled(page);
  await page.clock.fastForward('25:00');
  await reload(page);
  await expect(page.getByText(/^0?:?25:0\d$|^25:0\d$/)).toBeVisible();

  // Another block: the first stops and keeps its 25 minutes.
  await laterRow(page, /^Coding lessons/).click();
  await expect(page.locator('#now-title')).toHaveText('Coding lessons');
  await now.getByRole('button', { name: 'Start' }).click();
  await writesSettled(page);
  await expect(page.getByText(/^Running · since \d\d:\d\d · 0 m on this block today$/)).toBeVisible();
  await page.clock.fastForward('10:00');
  await now.getByRole('button', { name: /^Stop/ }).click();
  await expect(page.getByText('35 m', { exact: true })).toBeVisible();

  // Correcting: Calendar's day view, the block's sheet, Edit logged time.
  await open(page, './#/calendar?view=day');
  await event(page, 'GameDevHQ').click();
  await page.getByRole('dialog', { name: 'GameDevHQ' }).getByRole('button', { name: /^Edit logged time/ }).click();
  const logged = page.getByRole('dialog', { name: /^Logged on / });
  await logged.getByRole('button', { name: /^Remove 25 m/ }).click();
  await logged.getByRole('button', { name: 'Close' }).click();
  await open(page, './');
  await expect(page.getByText('10 m', { exact: true })).toBeVisible();
});

test('a timer left running asks on the next open after three hours', async ({ page }) => {
  await open(page, './');
  await page.locator('section[aria-labelledby="now-title"]').getByRole('button', { name: 'Start' }).click();
  await writesSettled(page);
  await page.clock.fastForward('03:10:00');
  await reload(page);
  const ask = page.getByRole('dialog', { name: 'Still working on GameDevHQ?' });
  await expect(ask).toContainText('You started at 09:00');
  await ask.getByRole('button', { name: 'Stop now' }).click();
  await expect(page.getByText('3 h 10 m', { exact: true })).toBeVisible();
});

const TOKEN = 'github_pat_calendar_0123456789';

async function device(browser: Browser, fake: FakeGithub): Promise<Page> {
  const context = await browser.newContext({ timezoneId: 'Asia/Tashkent', locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.clock.install({ time: new Date(FIRST_DAY) });
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

test('calendar edits reach a second device', async ({ browser }) => {
  const fake = new FakeGithub({ owner: 'octo-learner', repo: 'atlas-data', token: TOKEN, userId: 4242, name: 'Octo Learner' });
  const a = await device(browser, fake);
  await syncNow(a, true);
  await open(a, './#/calendar?view=day&date=2026-09-22');
  await a.getByRole('button', { name: 'Add time', exact: true }).click();
  const add = a.getByRole('dialog', { name: /^Add at / });
  await add.getByRole('radio', { name: 'Busy' }).click();
  await add.getByLabel('Starts').fill('09:00');
  await add.getByLabel('Length').selectOption('240');
  await add.getByRole('textbox', { name: 'What' }).fill('Lectures');
  await add.getByRole('switch', { name: 'Every Tuesday' }).click();
  await add.getByRole('button', { name: 'Add busy time' }).click();
  await expect(event(a, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 15:30/);
  await event(a, 'Hugging Face').click();
  await a.getByRole('dialog', { name: 'Hugging Face' }).getByLabel('Starts').fill('16:00');
  await a.getByRole('dialog', { name: 'Hugging Face' }).getByRole('button', { name: 'Save' }).click();
  await syncNow(a);

  const b = await device(browser, fake);
  await syncNow(b, true);
  await open(b, './#/calendar?view=day&date=2026-09-22');
  await expect(b.getByRole('button', { name: /^Lectures · 09:00 ?, busy, 09:00 to 13:00/ })).toBeVisible();
  await expect(event(b, 'GameDevHQ')).toHaveAccessibleName(/^GameDevHQ ?, 13:15/);
  await expect(event(b, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 16:00 to 18:00/);
  await reload(b);
  await expect(event(b, 'Hugging Face')).toHaveAccessibleName(/^Hugging Face ?, 16:00 to 18:00/);
});
