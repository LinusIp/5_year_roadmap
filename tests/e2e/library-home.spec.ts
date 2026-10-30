import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { FakeGithub } from '../fake-github.ts';
import { serveGithub } from './github-route.ts';
import { FIRST_DAY, open, pickStatus, reload, writesSettled } from './helpers.ts';

/**
 * The Library organised (LIBRARY-ORGANISE): a home of what is in progress, the plan's paths, the next three steps
 * and the shelves; a path's own view; a shelf that is the old filtered list; search grouped by shelf.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

async function start(page: Page, id: string): Promise<void> {
  await open(page, './#/library/' + id);
  await pickStatus(page, page.getByRole('dialog').getByRole('button', { name: /^Status of / }), 'Active');
}

test('the home shows the four sections, ML Zoomcamp in progress from its checklist', async ({ page }) => {
  await open(page, './#/library');
  await expect(page.getByText(/^1 in progress · 3 up next · [\d,]+ more when you need them$/)).toBeVisible();
  await expect(page.getByText('Module 1 · 6 of 97', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your paths' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^AI engineering/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Up next' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Browse when you need something' })).toBeVisible();
  for (const shelf of ['Courses', 'Books', 'Papers', 'Articles', 'Blogs to follow', 'Tools']) {
    await expect(page.getByRole('button', { name: new RegExp('^[\\d,]+ ' + shelf + '$') })).toBeVisible();
  }
  // Projects is a full-width row under the grid.
  await expect(page.getByRole('button', { name: /^Projects [\d,]+$/ })).toBeVisible();
});

test('a path opens grouped by phase, and its step opens the resource', async ({ page }) => {
  await open(page, './#/library');
  await page.getByRole('button', { name: /^AI engineering/ }).click();
  await expect(page).toHaveURL(/path=ai/);
  await expect(page.getByRole('heading', { level: 1, name: 'AI engineering' })).toBeVisible();
  const step = page.getByRole('button', { name: /^ML Zoomcamp/ });
  await expect(step).toContainText('now');
  await expect(page.getByRole('button', { name: /^Optional for this path/ })).toHaveAttribute('aria-expanded', 'false');
  await step.click();
  await expect(page.getByRole('dialog', { name: /Machine Learning Zoomcamp|ML Zoomcamp/ })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await page.getByRole('link', { name: 'Back to the Library' }).click();
  await expect(page.getByRole('heading', { name: 'Your paths' })).toBeVisible();
});

test('a card in progress pauses from its menu, back to not started', async ({ page }) => {
  await start(page, 'ml-zoomcamp');
  await open(page, './#/library');
  await expect(page.getByText(/^1 in progress · /)).toBeVisible();
  await page.getByRole('button', { name: 'More for ML Zoomcamp' }).click();
  await page.getByRole('dialog', { name: 'ML Zoomcamp' }).getByRole('button', { name: /^Pause/ }).click();
  await expect(page.getByText('Nothing in progress. Start the next step of a path.')).toBeVisible();
  await reload(page);
  await expect(page.getByText(/^0 in progress · /)).toBeVisible();
});

test('a shelf filters by status, in the URL, and says when nothing matches', async ({ page }) => {
  await start(page, 'ml-zoomcamp');
  await open(page, './#/library');
  await page.getByRole('button', { name: /^[\d,]+ Courses$/ }).click();
  await expect(page).toHaveURL(/type=course/);
  await expect(page.getByRole('heading', { level: 1, name: 'Courses' })).toBeVisible();
  await page.getByRole('button', { name: 'Active', exact: true }).click();
  await expect(page).toHaveURL(/status=active/);
  await expect(page.getByText(/^1 of [\d,]+$/)).toBeVisible();
  await expect(page.getByRole('button', { name: /ML Zoomcamp/ })).toBeVisible();
  await page.getByRole('searchbox').fill('no such course anywhere');
  await expect(page.getByText('No matches. Clear filters.')).toBeVisible();
});

test('search groups by shelf, three of each, and Show all opens the shelf', async ({ page }) => {
  await open(page, './#/library');
  await page.getByRole('searchbox', { name: 'Search the library' }).fill('graphics');
  const courses = page.getByRole('heading', { name: /^Courses · \d+$/ });
  await expect(courses).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your paths' })).toBeHidden();
  const total = Number((await courses.innerText()).split('·')[1]!.trim().replace(/,/g, ''));
  if (total > 3) {
    await page.getByRole('button', { name: 'Show all ' + total, exact: true }).first().click();
    await expect(page).toHaveURL(/type=course/);
    await expect(page).toHaveURL(/q=graphics/);
  }
});

test('marking done in the Library survives a reload and reaches a second device', async ({ browser }) => {
  const TOKEN = 'github_pat_library_0123456789';
  const fake = new FakeGithub({ owner: 'octo-learner', repo: 'atlas-data', token: TOKEN, userId: 4242, name: 'Octo Learner' });
  const device = async (b: Browser): Promise<Page> => {
    const context = await b.newContext({ timezoneId: 'Asia/Tashkent', locale: 'en-GB', serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.clock.install({ time: new Date(FIRST_DAY) });
    await serveGithub(page, fake);
    await open(page, './#/settings?section=sync');
    const section = page.locator('section#sync');
    await section.getByRole('textbox', { name: 'Repository' }).fill('octo-learner/atlas-data');
    await section.getByLabel('Personal access token').fill(TOKEN);
    await section.getByRole('button', { name: 'Connect' }).click();
    await expect(section.getByRole('status')).toHaveText('Synced just now');
    return page;
  };
  const syncNow = async (page: Page): Promise<void> => {
    await writesSettled(page);
    await open(page, './#/settings?section=sync');
    await page.locator('section#sync').getByRole('button', { name: 'Sync now' }).click();
    await expect(page.locator('section#sync').getByRole('status')).toHaveText('Synced just now');
  };

  const a = await device(browser);
  await start(a, 'ml-zoomcamp');
  await open(a, './#/library');
  await a.getByRole('button', { name: 'More for ML Zoomcamp' }).click();
  await a.getByRole('dialog', { name: 'ML Zoomcamp' }).getByRole('button', { name: 'Mark done' }).click();
  await reload(a);
  await expect(a.getByRole('button', { name: /^AI engineering/ })).toContainText('1 done');
  await syncNow(a);

  const b = await device(browser);
  await open(b, './#/library?path=ai');
  await expect(b.getByText(/ · 1 done$/)).toBeVisible();
  await expect(b.getByRole('button', { name: /^ML Zoomcamp/ })).toContainText('Done');
});
