import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { FakeGithub } from '../fake-github.ts';
import { CORS, serveGithub } from './github-route.ts';
import { logTime, nowCard, open, reload, writesSettled } from './helpers.ts';

/**
 * The daily blog helper (DAILY-BLOG): Today reminds once the last block is over, the blog screen gives the day's facts
 * and an outline to copy, Open my blog goes to the editor link, I posted it marks the day (with Undo) and feeds the
 * writing streak, the mark syncs as blog/<date>.json, and the optional detection finds a dated post in the blog's
 * repository. Sunday 18 October 2026 is day 28; Math and physics runs 20:00 to 22:00.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });

const at = (time: string, date = '2026-10-18'): Date => new Date(date + 'T' + time + ':00+05:00');
/** Today's log tile (the redesign mockup): "Not written yet", "The day’s outline is ready" once the day is over, "Posted ✓". */
const logTile = (page: Page) => page.getByRole('link', { name: /^Today’s log/ });
/** The blog's editor, so Publish never reaches the real one. */
async function stubEditor(page: Page): Promise<void> {
  await page.context().route('https://app.pagescms.org/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Pages CMS</title>' }));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => void ((window as unknown as { copied: string }).copied = text) } });
  });
}

test('stopping the last block readies the log tile, which opens the log screen', async ({ page }) => {
  await page.clock.install({ time: at('20:05') });
  await open(page, './');
  await expect(page.locator('#now-title')).toHaveText('Math and physics');
  await expect(logTile(page)).toContainText('Not written yet');
  await expect(logTile(page)).not.toContainText('outline is ready');

  await logTime(page, '40');
  await expect(logTile(page)).toContainText('The day’s outline is ready');

  await logTile(page).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Today’s log' })).toBeVisible();
  await expect(page.getByText('Day 28 · Sun 18 Oct')).toBeVisible();
  const did = page.locator('section[aria-labelledby="studied-title"]');
  await expect(did).toContainText('40 m');
  await expect(did.getByRole('listitem')).toHaveCount(1);
  await expect(did.getByRole('listitem')).toContainText('Math and physics');
});

test('22:00 readies the tile even with nothing stopped, and the Day done card opens the screen', async ({ page }) => {
  await page.clock.install({ time: at('21:59') });
  await open(page, './');
  await expect(logTile(page)).not.toContainText('outline is ready');
  await page.clock.setFixedTime(at('22:05'));
  await page.reload();
  await expect(page.getByText('That was the day.')).toBeVisible();
  await expect(logTile(page)).toContainText('The day’s outline is ready');
  await page.getByRole('link', { name: 'Today’s blog post' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Today’s log' })).toBeVisible();
});

test('the outline lists the blocks with time and what was ticked, and Copy outline copies it', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => void ((window as unknown as { copied: string }).copied = text) } });
  });
  await page.clock.install({ time: at('06:05') });
  await open(page, './');
  await logTime(page, '50');
  // A lesson of ML Zoomcamp ticked today.
  await open(page, './#/library/ml-zoomcamp');
  await page.getByRole('dialog').getByRole('checkbox', { name: '1.7 Introduction to NumPy' }).check();
  await writesSettled(page);

  await open(page, './#/blog');
  await page.getByText('The post as Markdown').click();
  const outline = page.getByLabel('The post, in Markdown');
  await expect(outline).toContainText('# Sun 18 Oct · day 28');
  await expect(outline).toContainText('## ML Zoomcamp · 50 m');
  await expect(outline).toContainText('- 1.7 Introduction to NumPy');
  await expect(outline).toContainText('What I learned:');
  await expect(outline).toContainText('Stuck on:');
  // Only blocks with time logged.
  await expect(outline).not.toContainText('GameDevHQ');

  await page.getByRole('button', { name: 'Copy outline' }).click();
  await expect(page.getByRole('status').getByText('Copied', { exact: true })).toBeVisible();
  const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied);
  expect(copied).toBe(await outline.textContent());
});

test('Publish opens Pages CMS, or the link set in Settings › Blog, in a new tab', async ({ page, context }) => {
  await page.clock.install({ time: at('20:30') });
  await stubEditor(page);
  await open(page, './#/blog');
  await expect(page.getByText(/Publish copies the post, opens app\.pagescms\.org in a new tab/)).toBeVisible();
  // The screen's one filled button.
  await expect(page.locator('main [data-variant="filled"]')).toHaveCount(1);

  await open(page, './#/settings?section=blog');
  const field = page.getByRole('textbox', { name: 'Editor link' });
  await field.fill('not a link');
  await field.blur();
  await expect(page.getByText(/Paste a full https:\/\/ link/)).toBeVisible();
  await field.fill('https://example.com/my-blog/posts');
  await field.blur();
  await writesSettled(page);

  await context.route('https://example.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Posts</title>' }));
  await open(page, './#/blog');
  const [tab] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: /^Publish/ }).click()]);
  await tab.waitForLoadState();
  expect(tab.url()).toBe('https://example.com/my-blog/posts');
  await expect(page.getByRole('button', { name: 'Published, tap to undo' })).toHaveAttribute('aria-pressed', 'true');
});

test('the draft is kept: the fields survive a reload, and Publish puts them in the post', async ({ page }) => {
  await page.clock.install({ time: at('20:30') });
  await stubEditor(page);
  await open(page, './#/blog');
  await page.getByRole('textbox', { name: 'Title' }).fill('Day 28: tokenizers');
  await page.getByRole('textbox', { name: 'What did I learn?' }).fill('BPE merges the most frequent pair.');
  await page.getByRole('textbox', { name: 'Where did I get stuck?' }).fill('WordPiece prefixes.');
  await page.getByRole('textbox', { name: 'Tomorrow' }).fill('Chapter 6 exercises.');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('status').getByText('Draft saved')).toBeVisible();
  await reload(page);
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Day 28: tokenizers');
  await expect(page.getByRole('textbox', { name: 'Tomorrow' })).toHaveValue('Chapter 6 exercises.');
  await page.getByText('The post as Markdown').click();
  const post = page.getByLabel('The post, in Markdown');
  await expect(post).toContainText('# Day 28: tokenizers');
  await expect(post).toContainText('## What I learned');
  await expect(post).toContainText('BPE merges the most frequent pair.');
  await expect(post).toContainText('## Tomorrow');
  // Publish copies that post.
  await page.getByRole('button', { name: /^Publish/ }).click();
  await expect(page.getByRole('button', { name: 'Published, tap to undo' })).toBeVisible();
  const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied);
  expect(copied).toContain('# Day 28: tokenizers');
  expect(copied).toContain('WordPiece prefixes.');
});

test('Publish marks the day, feeds the streak and the Today tile, survives a reload, and Undo takes it back', async ({ page }) => {
  await page.clock.install({ time: at('20:30') });
  await stubEditor(page);
  await open(page, './');
  await logTime(page, '20');
  await open(page, './#/blog');
  const sub = page.getByText(/^Day 28 · Sun 18 Oct/);
  await expect(sub).not.toContainText('in a row');
  await page.getByRole('button', { name: /^Publish/ }).click();
  await expect(page.getByRole('button', { name: 'Published, tap to undo' })).toHaveAttribute('aria-pressed', 'true');
  await expect(sub).toContainText('1 day in a row');
  await expect(page.getByText('Done', { exact: true })).toBeVisible();

  await open(page, './');
  await expect(logTile(page)).toContainText('Posted ✓');
  await reload(page);
  await expect(logTile(page)).toContainText('Posted ✓');

  await open(page, './#/blog');
  await page.getByRole('button', { name: 'Published, tap to undo' }).click();
  await expect(page.getByRole('button', { name: /^Publish/ })).toBeVisible();
  await page.getByRole('button', { name: /^Publish/ }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Publish/ })).toBeVisible();
  await expect(sub).not.toContainText('in a row');
});

test('a past day opens its post from Calendar', async ({ page }) => {
  await page.clock.install({ time: at('09:00') });
  await open(page, './#/calendar?view=day&date=2026-10-16');
  await stubEditor(page);
  await page.getByRole('link', { name: 'Blog post, not yet' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'The day’s log' })).toBeVisible();
  await expect(page.getByText('Day 26 · Fri 16 Oct')).toBeVisible();
  await page.getByRole('button', { name: /^Publish/ }).click();
  await expect(page.getByRole('button', { name: 'Published, tap to undo' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to the day in Calendar' }).click();
  await expect(page.getByRole('link', { name: 'Blog post, posted' })).toBeVisible();
});

const TOKEN = 'github_pat_blog_0123456789';

/** A device whose clock starts at `time`: the second device starts later, so its marks are the newer ones. */
async function device(browser: Browser, fake: FakeGithub, time = '21:00'): Promise<Page> {
  const context = await browser.newContext({ timezoneId: 'Asia/Tashkent', locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.clock.install({ time: at(time) });
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

test('the posted mark reaches a second device as blog/<date>.json, and so does its undo', async ({ browser }) => {
  const fake = new FakeGithub({ owner: 'octo-learner', repo: 'atlas-data', token: TOKEN, userId: 4242, name: 'Octo Learner' });
  const a = await device(browser, fake);
  await syncNow(a, true);
  await stubEditor(a);
  await open(a, './#/blog');
  await a.getByRole('button', { name: /^Publish/ }).click();
  await expect(a.getByRole('button', { name: 'Published, tap to undo' })).toBeVisible();
  await syncNow(a);
  const file = JSON.parse(fake.files()['blog/2026-10-18.json']!) as { posted: boolean; at: string };
  expect(file.posted).toBe(true);
  expect(Object.keys(file)).not.toContain('date');

  const b = await device(browser, fake, '21:30');
  await syncNow(b, true);
  await open(b, './');
  await expect(logTile(b)).toContainText('Posted ✓');
  await reload(b);
  await expect(logTile(b)).toContainText('Posted ✓');

  await open(b, './#/blog');
  await b.getByRole('button', { name: 'Published, tap to undo' }).click();
  await syncNow(b);
  await syncNow(a);
  await open(a, './');
  await expect(logTile(a)).toContainText('Not written yet');
});

const POSTS_API = 'https://api.github.com/repos/LinusIp/abdullohshavkatjonov/contents/_posts';
const listing = (names: string[]) => names.map((name) => ({ name, path: '_posts/' + name, type: 'file' }));

test('with detection on, a post dated today in the blog marks the day; a token that cannot read the blog keeps it off', async ({ page }) => {
  let posts = listing(['2026-10-16-loading-scenes.md', '2026-10-17-ui-toolkit.md']);
  let status = 404;
  const seen: string[] = [];
  await page.route(POSTS_API, async (route) => {
    seen.push(route.request().method());
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (status !== 200) return route.fulfill({ status, headers: CORS, json: { message: 'Not Found' } });
    return route.fulfill({ status: 200, headers: CORS, json: posts });
  });
  await page.clock.install({ time: at('20:30') });

  await open(page, './#/settings?section=blog');
  const toggle = page.getByRole('switch', { name: 'Detect my post automatically' });
  await toggle.click();
  await expect(page.getByText(/Contents: Read-only/)).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');

  status = 200;
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText(/once an evening/)).toBeVisible();

  // The post goes up; the evening check at 21:00 finds it.
  posts = [...posts, ...listing(['2026-10-18-.md'])];
  await page.clock.setFixedTime(at('21:05'));
  await open(page, './');
  await expect(logTile(page)).toContainText('Posted ✓');
  await open(page, './#/blog');
  await expect(page.getByText(/found in your blog/)).toBeVisible();
  // Read-only: only ever a GET.
  expect(seen.filter((m) => m !== 'GET' && m !== 'OPTIONS')).toEqual([]);
  void nowCard;
});
