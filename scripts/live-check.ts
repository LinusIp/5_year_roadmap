/**
 * node scripts/live-check.ts <site url> <new service-worker version>
 *
 * Run by the Pages workflow while the deploy happens: it opens the live site as a returning user would (the old build,
 * its service worker installed), waits until the new build is being served, then checks that the app's own update
 * prompt appears, that Reload brings the new version in, and that the new screens render without an error.
 */
import { chromium } from '@playwright/test';

const [url, version] = process.argv.slice(2);
if (!url || !version) {
  console.error('Usage: node scripts/live-check.ts <site url> <new service-worker version>');
  process.exit(2);
}
const swUrl = new URL('sw.js', url).href;
const step = (s: string): void => console.log('• ' + s);

/** The build files the served service worker precaches: the new build's, once it is live. */
async function servedAssets(): Promise<string[]> {
  const res = await fetch(swUrl + '?check=' + Date.now(), { cache: 'no-store' });
  const m = /const ASSETS = (\[.*\]);/.exec(await res.text());
  return m ? (JSON.parse(m[1]!) as string[]) : [];
}

async function servedVersion(): Promise<string> {
  const res = await fetch(swUrl + '?check=' + Date.now(), { cache: 'no-store' });
  const m = /const VERSION = "([0-9a-f]+)"/.exec(await res.text());
  return m?.[1] ?? 'none';
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ serviceWorkers: 'allow', locale: 'en-GB' });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
// Requests that failed or came back 4xx/5xx, the page's and the service worker's: what to look at when it stalls.
const failed: string[] = [];
const noteFailure = (what: string): void => {
  if (failed.length < 20) failed.push(what);
};
context.on('requestfailed', (r) => noteFailure(r.url() + ' (' + (r.failure()?.errorText ?? 'failed') + ')'));
context.on('response', (r) => {
  if (r.status() >= 400) noteFailure(r.url() + ' (' + r.status() + ')');
});

/** The service worker becomes active within `ms`, or the check fails saying how far it got. */
async function workerReady(ms: number): Promise<void> {
  const state = await page.evaluate(
    (limit) =>
      Promise.race([
        navigator.serviceWorker.ready.then(() => 'ready'),
        new Promise<string>((resolve) =>
          setTimeout(() => {
            void navigator.serviceWorker.getRegistration().then((r) => resolve(r ? 'installing ' + Boolean(r.installing) + ', waiting ' + Boolean(r.waiting) + ', active ' + Boolean(r.active) : 'no registration'));
          }, limit),
        ),
      ]),
    ms,
  );
  if (state !== 'ready') throw new Error('the service worker did not become active within ' + ms / 1000 + ' s (' + state + ')');
}

try {
  const before = await servedVersion();
  step('live site serves version ' + before + '; the new build is ' + version);
  await page.goto(url);
  await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 30_000 });
  await workerReady(90_000);
  // A returning user's page is controlled by the service worker; a first visit is not until it reloads.
  await page.reload();
  await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 30_000 });
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) throw new Error('the page is not controlled by the service worker after a reload');
  step('opened as a returning user: the old build\'s service worker controls the page');

  if (before !== version) {
    const until = Date.now() + 15 * 60_000;
    while ((await servedVersion()) !== version) {
      if (Date.now() > until) throw new Error('the new build was not served within 15 minutes');
      await new Promise((r) => setTimeout(r, 10_000));
    }
    step('the new build is being served');
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r?.update()));
    const prompt = page.getByRole('button', { name: /A new version of Atlas is ready/ });
    await prompt.waitFor({ timeout: 120_000 });
    step('the in-app update prompt appeared');
    await Promise.all([page.waitForEvent('load', { timeout: 60_000 }), prompt.click()]);
  } else {
    step('the new build was already live: no update to prompt for');
  }

  const caches = await page.evaluate(() => globalThis.caches.keys());
  if (!caches.includes('atlas-' + version)) throw new Error('after Reload the cache is ' + caches.join(', ') + ', not atlas-' + version);
  // The new cache alone is not enough: the page must run the new build's own script, not an old index.html's.
  const scripts = await page.evaluate(() => [...document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]')].map((s) => new URL(s.src).pathname));
  const assets = await servedAssets();
  const stale = scripts.filter((path) => !assets.some((a) => a !== './' && path.endsWith(a.replace(/^\.\//, ''))));
  if (scripts.length === 0 || stale.length > 0) throw new Error('the page runs a script that is not the new build\'s: ' + (stale.join(', ') || 'none found'));
  step('reloaded into version ' + version + ', running ' + scripts.map((p) => p.split('/').pop()).join(', '));

  for (const hash of ['#/', '#/calendar', '#/plan/pick?cadence=daily', '#/library?type=project', '#/activity', '#/blog']) {
    await page.goto(new URL(hash, url).href);
    await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 30_000 });
    step('renders ' + hash);
  }

  // The features of the last pull requests, on the live site: a tech doc opened by a tap on a Deck card with Take
  // it in it, and the icons on Today.
  await page.goto(new URL('#/plan/pick?cadence=monthly&scope=all', url).href);
  await page.locator('#deck-top-title').waitFor({ timeout: 30_000 });
  const title = (await page.locator('#deck-top-title').innerText()).trim();
  await page.locator('#deck-top-title').click();
  await page.getByRole('dialog', { name: title }).getByRole('button', { name: 'Take it' }).waitFor({ timeout: 30_000 });
  step('a tap on the Deck card opens its tech doc, with Take it: ' + title);
  // The redesigned doc: its jump bar, and the diagram generated from its design.
  const doc = page.getByRole('dialog', { name: title });
  await doc.getByRole('radio', { name: 'Design' }).click();
  await doc.getByRole('img', { name: /^Diagram of / }).waitFor({ timeout: 30_000 });
  step('the doc jumps to Design and draws its diagram');
  await page.keyboard.press('Escape');
  // The Library's home: in progress, paths, up next and the shelves.
  await page.goto(new URL('#/library', url).href);
  await page.getByRole('heading', { name: 'Your paths' }).waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /^\d+ Courses$/ }).waitFor({ timeout: 30_000 });
  step('the Library opens on its home, with the paths and the shelves');
  // A full load, not a hash change from the Deck: wait for Today's own Now card, then for its block icons. Now follows
  // the clock, so between 12:00 and 18:00 it is the break card and after 22:00 the day-done card.
  await page.goto(new URL('#/', url).href);
  await page.reload();
  await page.locator('#now-title, section[aria-label="Now"]').first().waitFor({ timeout: 30_000 });
  await page.locator('main svg.lucide').first().waitFor({ timeout: 30_000 }).catch(() => undefined);
  const icons = await page.locator('main svg.lucide').count();
  if (icons === 0) throw new Error('Today shows no icons');
  step('Today shows its icons (' + icons + ')');
  // The brush mark at the top of Today, in the theme's colour, and the font the clay style sets.
  const mark = page.locator('img[src*="brand/atlas-mark-"]');
  await mark.waitFor({ timeout: 30_000 });
  const markLoaded = await mark.evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0);
  if (!markLoaded) throw new Error('The Atlas mark did not load');
  const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  if (!font.includes('Nunito')) throw new Error('Today is not set in Nunito: ' + font);
  step('Today shows the Atlas mark (' + (await mark.getAttribute('src')) + ') in Nunito');

  // Calendar: today's day view draws the day's blocks at their times; Today has no Log time, only the timer.
  if ((await page.getByRole('button', { name: 'Log time' }).count()) > 0) throw new Error('Today still shows Log time');
  await page.goto(new URL('#/calendar?view=day', url).href);
  const first = page.locator('[data-block]').first();
  await first.waitFor({ timeout: 30_000 });
  step('Calendar draws today with ' + (await page.locator('[data-block]').count()) + ' blocks, the first: ' + (await first.innerText()).replace(/\s+/g, ' ').trim());
  if ((await page.getByRole('link', { name: 'Practice' }).count()) > 0) throw new Error('a Practice tab is still there');

  if (errors.length > 0) throw new Error('page errors: ' + errors.join(' | '));
  console.log('\nLive check passed.');
} catch (err) {
  if (failed.length > 0) console.error('Failed requests:\n  ' + failed.join('\n  '));
  console.error('\nLive check failed: ' + (err instanceof Error ? err.message : String(err)));
  await page.screenshot({ path: 'live-check.png', fullPage: true }).catch(() => undefined);
  process.exitCode = 1;
} finally {
  await browser.close();
}
