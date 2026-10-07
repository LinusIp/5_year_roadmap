import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { logTime, open } from './helpers.ts';

/**
 * The optional GitHub integration, against a stand-in for api.github.com (page.route), so the tests never
 * reach the real one. Also the brief's rule that nothing else leaves the machine.
 */
const DAY = '2026-09-24T09:00:00+05:00';
const TOKEN = 'github_pat_e2e_0123456789';

// Service workers would sit between the page and page.route; this spec is not about offline.
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(DAY) });
});

/** Every request that leaves the app's own origin, as "METHOD origin/path". */
function watchForeignRequests(page: Page, baseURL: string | undefined): string[] {
  const origin = new URL(baseURL!).origin;
  const foreign: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && url.origin !== origin) foreign.push(request.method() + ' ' + url.origin + url.pathname);
  });
  return foreign;
}

const CORS = { 'Access-Control-Allow-Origin': '*' };

/** Answers like GitHub: who the token belongs to, and a calendar with three active days. */
async function fakeGithub(page: Page, options: { accept: boolean }): Promise<string[]> {
  const authorizations: string[] = [];
  await page.route('https://api.github.com/graphql', async (route: Route) => {
    const request = route.request();
    authorizations.push(request.headers()['authorization'] ?? '');
    if (!options.accept) {
      await route.fulfill({ status: 401, headers: CORS, json: { message: 'Bad credentials' } });
      return;
    }
    const body = request.postDataJSON() as { query: string };
    if (!body.query.includes('contributionsCollection')) {
      await route.fulfill({ headers: CORS, json: { data: { viewer: { login: 'octo-learner' } } } });
      return;
    }
    const days = [
      { date: '2026-09-20', contributionCount: 2, contributionLevel: 'FIRST_QUARTILE' },
      { date: '2026-09-21', contributionCount: 5, contributionLevel: 'SECOND_QUARTILE' },
      { date: '2026-09-22', contributionCount: 0, contributionLevel: 'NONE' },
      { date: '2026-09-23', contributionCount: 9, contributionLevel: 'FOURTH_QUARTILE' },
      { date: '2026-09-24', contributionCount: 2, contributionLevel: 'FIRST_QUARTILE' },
    ];
    await route.fulfill({
      headers: CORS,
      json: { data: { viewer: { login: 'octo-learner', contributionsCollection: { contributionCalendar: { weeks: [{ contributionDays: days }] } } } } },
    });
  });
  return authorizations;
}

test('without a token, no page ever makes a request beyond the app itself', async ({ page, baseURL }) => {
  const foreign = watchForeignRequests(page, baseURL);
  const pages = ['./', './#/activity', './#/plan', './#/plan?view=projects', './#/plan?view=papers', './#/plan?view=credentials', './#/plan/pick', './#/library', './#/library/mit-18-06', './#/reviews', './#/stats', './#/settings'];
  for (const path of pages) await open(page, path);
  await expect(page.getByRole('heading', { name: 'GitHub', exact: true })).toBeVisible();
  expect(foreign).toEqual([]);
});

test('connecting GitHub puts the real calendar under the Atlas heatmap, and the token stays out of backups', async ({ page, baseURL }) => {
  const foreign = watchForeignRequests(page, baseURL);
  const authorizations = await fakeGithub(page, { accept: true });

  await open(page, './');
  await logTime(page, '120');

  await open(page, './#/settings');
  const section = page.locator('section#github');
  await section.getByLabel('Personal access token').fill(TOKEN);
  await section.getByRole('button', { name: 'Connect' }).click();
  await expect(section.getByRole('status')).toHaveText('Your GitHub calendar is now on Activity.');
  await expect(section.getByText('Connected as @octo-learner', { exact: true })).toBeVisible();
  expect(authorizations).toEqual(['bearer ' + TOKEN]);

  await open(page, './#/activity');
  const calendar = page.getByRole('region', { name: 'GitHub @octo-learner' });
  await expect(calendar.getByRole('group', { name: 'GitHub contributions in 2026' })).toBeVisible();
  // The whole calendar year, like the Atlas heatmap's above it.
  await expect(calendar.getByText('18 contributions on 4 days · both on 1 of 1 Atlas day')).toBeVisible();
  await expect(calendar.getByRole('status')).toHaveText(/^Updated 24 Sep, 09:0\d\.$/);

  // A backup carries the login and the switch, never the token.
  await open(page, './#/settings');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export everything' }).click()]);
  const backup = readFileSync((await download.path())!, 'utf8');
  expect(backup).toContain('"username": "octo-learner"');
  expect(backup).not.toContain(TOKEN);

  // Removing the token removes the calendar.
  await page.locator('section#github').getByRole('button', { name: 'Remove the token' }).click();
  await expect(page.locator('section#github').getByLabel('Personal access token')).toBeVisible();
  await open(page, './#/activity');
  await expect(page.getByRole('region', { name: /^GitHub/ })).toHaveCount(0);

  // The only requests that left the app went to GitHub's API, and each carried the token.
  expect(foreign.filter((request) => request.startsWith('POST ')).length).toBeGreaterThan(0);
  expect(new Set(foreign.map((request) => request.split(' ')[1]))).toEqual(new Set(['https://api.github.com/graphql']));
  expect(new Set(authorizations)).toEqual(new Set(['bearer ' + TOKEN]));
});

test('a token GitHub refuses is not saved', async ({ page }) => {
  await fakeGithub(page, { accept: false });
  await open(page, './#/settings');
  const section = page.locator('section#github');
  await section.getByLabel('Personal access token').fill('github_pat_revoked');
  await section.getByRole('button', { name: 'Connect' }).click();
  await expect(section.getByRole('status')).toHaveText('GitHub did not accept the token. It may have expired or been revoked. The token was not saved.');
  await page.reload();
  await expect(page.locator('section#github').getByLabel('Personal access token')).toHaveValue('');
  await expect(page.locator('section#github').getByRole('button', { name: 'Connect' })).toBeDisabled();
});
