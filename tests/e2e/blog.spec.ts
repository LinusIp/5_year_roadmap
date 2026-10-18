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
const reminder = (page: Page) => page.getByRole('listitem').filter({ hasText: 'Write today’s blog post' });
const blogRow = (page: Page) => page.getByRole('link', { name: /^Blog post · / });

test('stopping the last block brings the reminder, which opens the blog screen', async ({ page }) => {
  await page.clock.install({ time: at('20:05') });
  await open(page, './');
  await expect(page.locator('#now-title')).toHaveText('Math and physics');
  await expect(reminder(page)).toHaveCount(0);
  await expect(blogRow(page)).toHaveAccessibleName(/^Blog post · not yet/);

  await logTime(page, '40');
  await expect(reminder(page)).toBeVisible();
  // At the top of Later today, and the plain row at the end makes way for it.
  await expect(page.locator('section:has(h2:text-is("Later today")) li').first()).toContainText('Write today’s blog post');
  await expect(blogRow(page)).toHaveCount(0);

  await reminder(page).getByRole('link', { name: 'Open' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Today’s blog post' })).toBeVisible();
  await expect(page.getByText('Sun 18 Oct · day 28 · written in your blog')).toBeVisible();
  const did = page.locator('section:has(h2:text-is("What you did today"))');
  await expect(did).toContainText('40 m');
  await expect(did.getByRole('listitem')).toHaveCount(1);
  await expect(did.getByRole('listitem')).toContainText('Math and physics');
});

test('22:00 brings the reminder even with nothing stopped, and the Day done card opens the screen', async ({ page }) => {
  await page.clock.install({ time: at('21:59') });
  await open(page, './');
  await expect(reminder(page)).toHaveCount(0);
  await page.clock.setFixedTime(at('22:05'));
  await page.reload();
  await expect(page.getByText('That was the day.')).toBeVisible();
  await expect(reminder(page)).toBeVisible();
  await page.getByRole('link', { name: 'Today’s blog post' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Today’s blog post' })).toBeVisible();
});

test('the outline lists the blocks with time and what was ticked, and Copy outline copies it', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => void ((window as unknown as { copied: string }).copied = text) } });
  });
  await page.clock.install({ time: at('06:05') });
  await open(page, './');
  await logTime(page, '50');
  // A unit of ML Zoomcamp ticked today.
  await open(page, './#/library/ml-zoomcamp');
  await page.getByRole('dialog').getByRole('checkbox').first().check();
  await writesSettled(page);

  await open(page, './#/blog');
  const outline = page.getByLabel('The outline, in Markdown');
  await expect(outline).toContainText('# Sun 18 Oct · day 28');
  await expect(outline).toContainText('## ML Zoomcamp · 50 m');
  await expect(outline).toContainText(/^- .+/m);
  await expect(outline).toContainText('What I learned:');
  await expect(outline).toContainText('Stuck on:');
  // Only blocks with time logged.
  await expect(outline).not.toContainText('GameDevHQ');

  await page.getByRole('button', { name: 'Copy outline' }).click();
  await expect(page.getByRole('status').getByText('Copied', { exact: true })).toBeVisible();
  const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied);
  expect(copied).toBe(await outline.textContent());
});

test('Open my blog opens Pages CMS, or the link set in Settings › Blog, in a new tab', async ({ page, context }) => {
  await page.clock.install({ time: at('20:30') });
  await open(page, './#/blog');
  const openBlog = page.getByRole('link', { name: 'Open my blog' });
  await expect(openBlog).toHaveAttribute('href', 'https://app.pagescms.org');
  await expect(openBlog).toHaveAttribute('target', '_blank');
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
  const [tab] = await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: 'Open my blog' }).click()]);
  await tab.waitForLoadState();
  expect(tab.url()).toBe('https://example.com/my-blog/posts');
});

test('I posted it marks the day, feeds the streak and the Today row, survives a reload, and Undo takes it back', async ({ page }) => {
  await page.clock.install({ time: at('20:30') });
  await open(page, './');
  await logTime(page, '20');
  await open(page, './#/blog');
  const streak = page.locator('.tile').filter({ hasText: 'Writing streak' });
  await expect(streak).toContainText('0');
  await page.getByRole('button', { name: 'I posted it' }).click();
  await expect(page.getByRole('button', { name: 'Posted, tap to undo' })).toHaveAttribute('aria-pressed', 'true');
  await expect(streak).toContainText('1');

  await open(page, './');
  await expect(blogRow(page)).toHaveAccessibleName(/^Blog post · posted ✓/);
  await expect(reminder(page)).toHaveCount(0);
  await reload(page);
  await expect(blogRow(page)).toHaveAccessibleName(/^Blog post · posted ✓/);

  await open(page, './#/blog');
  await page.getByRole('button', { name: 'Posted, tap to undo' }).click();
  await expect(page.getByRole('button', { name: 'I posted it' })).toBeVisible();
  await page.getByRole('button', { name: 'I posted it' }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'I posted it' })).toBeVisible();
  await expect(streak).toContainText('0');
});

test('a past day opens its post from Calendar', async ({ page }) => {
  await page.clock.install({ time: at('09:00') });
  await open(page, './#/calendar?view=day&date=2026-10-16');
  await page.getByRole('link', { name: 'Blog post, not yet' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Blog post' })).toBeVisible();
  await expect(page.getByText('Fri 16 Oct · day 26 · written in your blog')).toBeVisible();
  await page.getByRole('button', { name: 'I posted it' }).click();
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
  await open(a, './#/blog');
  await a.getByRole('button', { name: 'I posted it' }).click();
  await syncNow(a);
  const file = JSON.parse(fake.files()['blog/2026-10-18.json']!) as { posted: boolean; at: string };
  expect(file.posted).toBe(true);
  expect(Object.keys(file)).not.toContain('date');

  const b = await device(browser, fake, '21:30');
  await syncNow(b, true);
  await open(b, './');
  await expect(blogRow(b)).toHaveAccessibleName(/^Blog post · posted ✓/);
  await reload(b);
  await expect(blogRow(b)).toHaveAccessibleName(/^Blog post · posted ✓/);

  await open(b, './#/blog');
  await b.getByRole('button', { name: 'Posted, tap to undo' }).click();
  await syncNow(b);
  await syncNow(a);
  await open(a, './');
  await expect(blogRow(a)).toHaveAccessibleName(/^Blog post · not yet/);
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
  await expect(blogRow(page)).toHaveAccessibleName(/^Blog post · posted ✓/);
  await open(page, './#/blog');
  await expect(page.getByText('found in your blog')).toBeVisible();
  // Read-only: only ever a GET.
  expect(seen.filter((m) => m !== 'GET' && m !== 'OPTIONS')).toEqual([]);
  void nowCard;
});
