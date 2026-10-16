import { expect, test } from '@playwright/test';
import type { Browser, Locator, Page } from '@playwright/test';
import { FakeGithub } from '../fake-github.ts';
import { serveGithub } from './github-route.ts';
import { FIRST_DAY, laterRow, open, reload, writesSettled } from './helpers.ts';

/**
 * Calendar: the month, a date's day view, and changing it like a calendar app. The clock is the plan's first day
 * (Monday 21 September 2026, 09:00 in Tashkent), a Full day: Graphics, Languages, Core, Projects, Math and physics
 * from 08:00 with 15-minute breaks.
 */
test.use({ timezoneId: 'Asia/Tashkent', viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

/** A block on the day grid, by its name: its accessible name starts with it. */
const event = (page: Page, name: string): Locator => page.getByRole('button', { name: new RegExp('^' + name + ', ') });

/** Drags a locator vertically by a number of minutes on the grid (0.8 px a minute). */
async function drag(page: Page, target: Locator, minutes: number, where: 'middle' | 'bottom' = 'middle'): Promise<void> {
  // Away from the tab bar and the toast above it.
  await target.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const box = (await target.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = where === 'middle' ? box.y + Math.min(20, box.height / 2) : box.y + box.height - 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 10, { steps: 2 });
  await page.mouse.move(x, y + minutes * 0.8, { steps: 8 });
  await page.mouse.up();
}

test('the month opens on today; a date opens its day, with the blocks at their times', async ({ page }) => {
  await open(page, './#/calendar');
  await expect(page.getByText('September 2026')).toBeVisible();
  const month = page.getByRole('grid', { name: 'Days' });
  await expect(month.getByRole('button', { name: /^Monday 21 September, today/ })).toBeVisible();
  await expect(month.getByRole('button', { name: /^Tuesday 22 September.*5 blocks planned/ })).toBeVisible();

  await month.getByRole('button', { name: /^Wednesday 23 September/ }).click();
  await expect(page.getByText('Wednesday 23 September')).toBeVisible();
  await expect(event(page, 'Graphics')).toHaveAccessibleName(/^Graphics, 08:00 to 10:00/);
  await expect(event(page, 'Languages')).toHaveAccessibleName(/^Languages, 10:15 to 11:15/);
  await expect(page.getByText('8 h planned · 0 h logged')).toBeVisible();

  // Arrows move by a day in the day view, and Today comes back.
  await page.getByRole('button', { name: 'Next day' }).click();
  await expect(page.getByText('Thursday 24 September')).toBeVisible();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.getByText('Monday 21 September')).toBeVisible();
});

test('drag a block to 19:00, make it 90 minutes, and Today follows', async ({ page }) => {
  await open(page, './#/calendar?view=day');
  await drag(page, event(page, 'Languages'), 19 * 60 - (10 * 60 + 15));
  await expect(event(page, 'Languages')).toHaveAccessibleName(/^Languages, 19:00 to 20:00/);
  await expect(page.getByRole('status').getByText('Moved Languages to 19:00')).toBeVisible();

  await drag(page, event(page, 'Languages'), 30, 'bottom');
  await expect(event(page, 'Languages')).toHaveAccessibleName(/^Languages, 19:00 to 20:30/);

  // Today: Languages is last, in the order of the day's times, and takes 1 h 30 m.
  await open(page, './');
  const rows = page.locator('section:has(h2:text-is("Later today")) li');
  await expect(rows.last()).toContainText('Languages');
  await expect(laterRow(page, /30 Days of Python/).first()).toContainText('1 h 30 m');
});

test('the block sheet sets the time, and Undo takes it back', async ({ page }) => {
  await open(page, './#/calendar?view=day');
  await event(page, 'Core').click();
  const sheet = page.getByRole('dialog', { name: 'Core' });
  await sheet.getByLabel('Starts').fill('16:00');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(event(page, 'Core')).toHaveAccessibleName(/^Core, 16:00 to 18:00/);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(event(page, 'Core')).toHaveAccessibleName(/^Core, 11:30 to 13:30/);
});

test('a weekly busy event on Tuesdays moves the blocks out of its way', async ({ page }) => {
  await open(page, './#/calendar?view=day&date=2026-09-22');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const add = page.getByRole('dialog', { name: /^Add at / });
  await add.getByRole('radio', { name: 'Busy' }).click();
  await add.getByLabel('Starts').fill('09:00');
  await add.getByLabel('Length').selectOption(String(4 * 60));
  await add.getByRole('textbox', { name: 'What' }).fill('Lectures');
  await add.getByRole('switch', { name: 'Every Tuesday' }).click();
  await add.getByRole('button', { name: 'Add busy time' }).click();

  await expect(page.getByRole('button', { name: 'Busy: Lectures, 09:00 to 13:00' })).toBeVisible();
  await expect(event(page, 'Graphics')).toHaveAccessibleName(/^Graphics, 13:15 to 15:15/);
  // The next Tuesday too, and not the Wednesday.
  await page.getByRole('button', { name: 'Next day' }).click();
  await expect(event(page, 'Graphics')).toHaveAccessibleName(/^Graphics, 08:00/);
  await open(page, './#/calendar?view=day&date=2026-09-29');
  await expect(page.getByRole('button', { name: 'Busy: Lectures, 09:00 to 13:00' })).toBeVisible();
  await expect(event(page, 'Graphics')).toHaveAccessibleName(/^Graphics, 13:15/);
});

test('a block dropped on busy time offers to shift it and the blocks after it', async ({ page }) => {
  await open(page, './#/calendar?view=day&date=2026-09-22');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const add = page.getByRole('dialog', { name: /^Add at / });
  await add.getByRole('radio', { name: 'Busy' }).click();
  await add.getByLabel('Starts').fill('18:00');
  await add.getByRole('textbox', { name: 'What' }).fill('Dentist');
  await add.getByRole('button', { name: 'Add busy time' }).click();
  await drag(page, event(page, 'Graphics'), 10 * 60);
  const conflict = page.getByRole('dialog', { name: 'Busy then' });
  await expect(conflict).toContainText('Dentist is 18:00–19:00');
  await conflict.getByRole('button', { name: 'Shift them' }).click();
  await expect(event(page, 'Graphics')).toHaveAccessibleName(/^Graphics, 19:15 to 21:15/);
});

test('apply a change to every Monday', async ({ page }) => {
  await open(page, './#/calendar?view=day');
  await event(page, 'Math').click();
  const sheet = page.getByRole('dialog', { name: 'Math' });
  await sheet.getByLabel('Starts').fill('07:00');
  await sheet.getByRole('switch', { name: 'Apply to every Monday' }).click();
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(event(page, 'Math')).toHaveAccessibleName(/^Math, 07:00 to 08:00/);

  await open(page, './#/calendar?view=day&date=2026-09-28');
  await expect(event(page, 'Math')).toHaveAccessibleName(/^Math, 07:00/);
  // Tuesday keeps the Full day as it was.
  await open(page, './#/calendar?view=day&date=2026-09-29');
  await expect(event(page, 'Math')).not.toHaveAccessibleName(/^Math, 07:00/);
});

test('an empty slot adds a block that is not on the day, or makes it a rest day', async ({ page }) => {
  await open(page, './#/calendar?view=day&date=2026-09-23');
  await event(page, 'Projects').click();
  await page.getByRole('dialog', { name: 'Projects' }).getByRole('button', { name: /^Skip it this day/ }).click();
  await expect(event(page, 'Projects')).toHaveCount(0);

  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const add = page.getByRole('dialog', { name: /^Add at / });
  await add.getByLabel('Starts').fill('20:00');
  await add.getByRole('button', { name: /^Projects/ }).click();
  await expect(event(page, 'Projects')).toHaveAccessibleName(/^Projects, 20:00 to 21:00/);

  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await add.getByRole('radio', { name: 'Rest day' }).click();
  await add.getByRole('button', { name: 'Make it a rest day' }).click();
  await expect(page.getByText('0 h planned · 0 h logged')).toBeVisible();
});

test('the timer is the only way to log: it counts through a reload, one at a time, and a correction lives in Calendar', async ({ page }) => {
  await open(page, './');
  const now = page.locator('section[aria-labelledby="now-title"]');
  await expect(now.getByRole('button', { name: 'Log time' })).toHaveCount(0);
  await now.getByRole('button', { name: 'Start' }).click();
  await writesSettled(page);
  await page.clock.fastForward('25:00');
  await reload(page);
  await expect(page.getByText(/^0?:?25:0\d$|^25:0\d$/)).toBeVisible();

  // Another block: the first stops and keeps its 25 minutes.
  await laterRow(page, /30 Days of Python/).click();
  await now.getByRole('button', { name: 'Start' }).click();
  await writesSettled(page);
  await expect(page.getByText('Running · 30 Days of Python · 25 m today')).toBeVisible();
  await page.clock.fastForward('10:00');
  await now.getByRole('button', { name: /^Stop/ }).click();
  await expect(page.getByText('35 m', { exact: true })).toBeVisible();

  // Correcting: Calendar's day view, the block's sheet, Edit logged time.
  await open(page, './#/calendar?view=day');
  await event(page, 'Graphics').click();
  await page.getByRole('dialog', { name: 'Graphics' }).getByRole('button', { name: /^Edit logged time/ }).click();
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
  const ask = page.getByRole('dialog', { name: 'Still working on Graphics?' });
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
  await a.getByRole('button', { name: 'Add', exact: true }).click();
  const add = a.getByRole('dialog', { name: /^Add at / });
  await add.getByRole('radio', { name: 'Busy' }).click();
  await add.getByLabel('Starts').fill('09:00');
  await add.getByLabel('Length').selectOption('240');
  await add.getByRole('textbox', { name: 'What' }).fill('Lectures');
  await add.getByRole('switch', { name: 'Every Tuesday' }).click();
  await add.getByRole('button', { name: 'Add busy time' }).click();
  await event(a, 'Core').click();
  await a.getByRole('dialog', { name: 'Core' }).getByLabel('Starts').fill('19:00');
  await a.getByRole('dialog', { name: 'Core' }).getByRole('button', { name: 'Save' }).click();
  await syncNow(a);

  const b = await device(browser, fake);
  await syncNow(b, true);
  await open(b, './#/calendar?view=day&date=2026-09-22');
  await expect(b.getByRole('button', { name: 'Busy: Lectures, 09:00 to 13:00' })).toBeVisible();
  await expect(event(b, 'Core')).toHaveAccessibleName(/^Core, 19:00/);
  await reload(b);
  await expect(event(b, 'Core')).toHaveAccessibleName(/^Core, 19:00/);
});
