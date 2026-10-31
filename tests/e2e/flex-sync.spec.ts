import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { FakeGithub } from '../fake-github.ts';
import { serveGithub } from './github-route.ts';
import { FIRST_DAY, laterRow, open, reload, writesSettled } from './helpers.ts';

/**
 * Everything the flexibility brief adds travels with GitHub Sync: a day's change, the schedule, pace, layout
 * (state/settings.json, version 2) and plan edits (state/plan.json, patches). Two devices share one repository on
 * the fake GitHub; what one sets, the other gets, and both survive a reload.
 */
const TOKEN = 'github_pat_flex_0123456789';

test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

async function device(browser: Browser, fake: FakeGithub): Promise<Page> {
  const context = await browser.newContext({ timezoneId: 'Asia/Tashkent', locale: 'en-GB', serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await serveGithub(page, fake);
  return page;
}

async function connect(page: Page): Promise<void> {
  await open(page, './#/settings?section=sync');
  const section = page.locator('section#sync');
  await section.getByRole('textbox', { name: 'Repository' }).fill('octo-learner/atlas-data');
  await section.getByLabel('Personal access token').fill(TOKEN);
  await section.getByRole('button', { name: 'Connect' }).click();
  await expect(section.getByRole('status')).toHaveText('Synced just now');
}

async function syncNow(page: Page): Promise<void> {
  await writesSettled(page);
  await open(page, './#/settings?section=sync');
  const section = page.locator('section#sync');
  await section.getByRole('button', { name: 'Sync now' }).click();
  await expect(section.getByRole('status')).toHaveText('Synced just now');
}

test('the schedule, pace, layout and plan edits reach a second device, and survive a reload', async ({ browser }) => {
  const fake = new FakeGithub({ owner: 'octo-learner', repo: 'atlas-data', token: TOKEN, userId: 4242, name: 'Octo Learner' });
  const a = await device(browser, fake);
  await connect(a);

  // Device A: today is a University day, the tabs change, and the first item of Coding lessons comes off the plan.
  await open(a, './');
  await a.getByRole('button', { name: 'Change today' }).click();
  const change = a.getByRole('dialog', { name: 'Change today' });
  await change.getByRole('button', { name: /^Template/ }).click();
  await a.getByRole('dialog', { name: 'Template for today' }).getByRole('button', { name: /^University day/ }).click();
  await change.getByRole('button', { name: 'Close' }).click();

  await open(a, './#/settings?section=layout');
  await a.locator('section').filter({ has: a.getByRole('heading', { name: 'Layout · Tabs' }) }).getByRole('switch', { name: 'Calendar' }).click();
  await a.getByRole('switch', { name: 'Reviews' }).click();

  await open(a, './#/plan?lane=y1-p0.B');
  const laneB = a.getByRole('dialog', { name: /^Block B · Coding lessons/ });
  await laneB.getByRole('button', { name: 'Edit' }).click();
  await laneB.getByRole('button', { name: /^Take .* off the plan$/ }).first().click();
  await expect(laneB.getByRole('button', { name: /^Dropped · 1/ })).toBeVisible();

  await syncNow(a);
  const settings = JSON.parse(fake.files()['state/settings.json']!);
  expect(settings.version).toBe(3);
  expect(settings.schedule.days['2026-09-21']).toEqual({ template: 'university' });
  expect(settings.layout.tabs).toEqual(['today', 'plan', 'library', 'activity', 'focus', 'reviews']);
  const plan = JSON.parse(fake.files()['state/plan.json']!);
  expect(plan.version).toBe(2);
  expect(plan.patches).toMatchObject([{ op: 'drop' }]);

  // Device B connects to the same repository and gets all of it.
  const b = await device(browser, fake);
  await connect(b);
  await open(b, './');
  await expect(b.getByText('0 m of 3 h today · University day · no streak yet')).toBeVisible();
  await expect(b.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveText(['Today', 'Plan', 'Library', 'Stats', 'Focus', 'Reviews']);
  // The University day's Coding lessons now starts with what comes after 30 Days of Python.
  await expect(laterRow(b, /^Coding lessons/)).toHaveCount(1);
  await expect(laterRow(b, /^Coding lessons/)).not.toContainText('30 Days of Python');

  await open(b, './#/plan?lane=y1-p0.B');
  await expect(b.getByRole('dialog', { name: /^Block B · Coding lessons/ }).getByRole('button', { name: /^Dropped · 1/ })).toBeVisible();

  // And it all survives a reload.
  await reload(b);
  await expect(b.getByRole('dialog', { name: /^Block B · Coding lessons/ }).getByRole('button', { name: /^Dropped · 1/ })).toBeVisible();
  await open(b, './');
  await expect(b.getByText('0 m of 3 h today · University day · no streak yet')).toBeVisible();
});
