import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FakeGithub } from '../fake-github.ts';
import { serveGithub } from './github-route.ts';
import { logTime, nowCard, open, reload } from './helpers.ts';

/**
 * GitHub Sync and the calendar, against a stand-in for api.github.com (tests/fake-github.ts behind page.route),
 * so the tests never reach the real one. Also the brief's rule that nothing else leaves the machine, and that
 * "Not backed up" shows once, in Settings.
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

test('without a token, no page ever makes a request beyond the app itself, and only Settings says "Not backed up"', async ({ page, baseURL }) => {
  const foreign = watchForeignRequests(page, baseURL);
  const pages = ['./', './#/activity', './#/plan', './#/plan?view=projects', './#/plan?view=papers', './#/plan?view=credentials', './#/plan/pick', './#/library', './#/library/mit-18-06', './#/reviews', './#/stats', './#/settings'];
  for (const path of pages) {
    await open(page, path);
    await expect(page.getByText('Not backed up', { exact: true })).toHaveCount(path === './#/settings' ? 1 : 0);
  }
  await expect(page.getByRole('heading', { name: 'Sync', exact: true })).toBeVisible();
  expect(foreign).toEqual([]);
});

test('connecting Sync writes the log to the repository as the user, flushes when a block is done, and keeps the token to itself', async ({ page, baseURL }) => {
  const foreign = watchForeignRequests(page, baseURL);
  const fake = new FakeGithub({ owner: 'octo-learner', repo: 'atlas-data', token: TOKEN, userId: 4242, name: 'Octo Learner', tokenExpiry: '2026-12-23' });
  const authorizations = await serveGithub(page, fake);

  await open(page, './');
  await logTime(page, '120');

  await open(page, './#/settings');
  const section = page.locator('section#sync');
  await expect(section.getByRole('status')).toHaveText('Not backed up');
  await section.getByRole('textbox', { name: 'Repository' }).fill('octo-learner/atlas-data');
  await section.getByLabel('Personal access token').fill(TOKEN);
  await section.getByRole('button', { name: 'Connect' }).click();
  await expect(section.getByText('Connected as @octo-learner. Your log and progress are in octo-learner/atlas-data.')).toBeVisible();
  await expect(section.getByRole('status')).toHaveText('Synced just now');

  // The first sync: a README, then the layout, authored with the no-reply address so GitHub counts it.
  expect(Object.keys(fake.files()).sort()).toEqual([
    'README.md',
    'log/2026/09/2026-09-24.json',
    'log/2026/09/2026-09-24.md',
    // Logging time started the game, so it has a project page.
    'projects/a-small-game-1.md',
    'state/items.json',
    'state/plan.json',
    'state/settings.json',
  ]);
  expect(JSON.parse(fake.files()['log/2026/09/2026-09-24.json']!).entries[0].minutes).toBe(120);
  expect(fake.files()['projects/a-small-game-1.md']).toMatch(/^# One finished small game[\s\S]*Status: active[\s\S]*## Done when\n\n- \[ \] /);
  expect(fake.log().map((c) => c.message.split('\n')[0])).toEqual([expect.stringMatching(/^log: 2026-09-24 · 2 h · 0\/\d blocks$/), 'Atlas: set up the data repository']);
  expect(fake.log()[0]!.author).toMatchObject({ name: 'Octo Learner', email: '4242+octo-learner@users.noreply.github.com' });

  // GitHub does not let the page read the token's expiry, so it is typed in; the reminder follows it.
  const expiry = section.getByRole('textbox', { name: 'Token expires on' });
  await expect(expiry).toHaveValue('');
  await expiry.fill('2026-10-01');
  await expiry.blur();
  await expect(section.getByText('The token expires in 7 days. Create a new one and reconnect.')).toBeVisible();

  // A block marked done goes to GitHub 3 seconds later, in its own commit.
  await open(page, './');
  await expect(page.getByRole('link', { name: 'The GitHub token expires in 7 days' })).toBeVisible();
  await nowCard(page).getByRole('button', { name: 'Mark done' }).click();
  await page.clock.fastForward(4_000);
  await expect.poll(() => fake.log()[0]!.message.split('\n')[0]).toMatch(/^log: 2026-09-24 · 2 h · 1\/\d blocks$/);
  expect(fake.log()).toHaveLength(3);

  // The calendar comes with the same token.
  await open(page, './#/settings');
  await section.getByRole('switch', { name: 'Show my GitHub calendar on Activity' }).click();
  await open(page, './#/activity');
  const calendar = page.getByRole('region', { name: 'GitHub @octo-learner' });
  await expect(calendar.getByText('18 contributions on 4 days · both on 1 of 1 Atlas day')).toBeVisible();

  // Neither a backup nor the repository holds the token.
  await open(page, './#/settings');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export everything' }).click()]);
  const backup = readFileSync((await download.path())!, 'utf8');
  expect(backup).toContain('"username": "octo-learner"');
  expect(backup).not.toContain(TOKEN);
  for (const content of Object.values(fake.files())) expect(content).not.toContain(TOKEN);

  // Disconnecting forgets the token and the repository; the calendar goes with them.
  await section.getByRole('button', { name: 'Disconnect' }).click();
  await expect(section.getByRole('status')).toHaveText('Not backed up');
  await open(page, './#/activity');
  await expect(page.getByRole('region', { name: /^GitHub/ })).toHaveCount(0);

  // Everything that left the app went to GitHub's API, with the token.
  expect(new Set(foreign.map((request) => new URL(request.split(' ')[1]!).origin))).toEqual(new Set(['https://api.github.com']));
  expect(new Set(authorizations)).toEqual(new Set(['Bearer ' + TOKEN, 'bearer ' + TOKEN]));
});

test('a token or repository GitHub refuses is not saved, and nothing is written', async ({ page }) => {
  const fake = new FakeGithub({ owner: 'octo-learner', repo: 'atlas-data', token: TOKEN });
  await serveGithub(page, fake);
  await open(page, './#/settings');
  const section = page.locator('section#sync');

  await section.getByRole('textbox', { name: 'Repository' }).fill('octo-learner/atlas-data');
  await section.getByLabel('Personal access token').fill('github_pat_revoked');
  await section.getByRole('button', { name: 'Connect' }).click();
  await expect(section.getByRole('alert')).toHaveText('GitHub did not accept the token. It may have expired or been revoked. The token was not saved.');

  await section.getByRole('textbox', { name: 'Repository' }).fill('octo-learner/no-such-repo');
  await section.getByLabel('Personal access token').fill(TOKEN);
  await section.getByRole('button', { name: 'Connect' }).click();
  await expect(section.getByRole('alert')).toHaveText(
    'GitHub found no repository octo-learner/no-such-repo that this token can see. Check the name, and that the token was given access to it. The token was not saved.',
  );

  await reload(page);
  await expect(section.getByLabel('Personal access token')).toHaveValue('');
  await expect(section.getByRole('button', { name: 'Connect' })).toBeDisabled();
  await expect(section.getByRole('status')).toHaveText('Not backed up');
  expect(fake.files()).toEqual({});
});
