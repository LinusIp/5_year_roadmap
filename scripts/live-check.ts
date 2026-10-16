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

try {
  const before = await servedVersion();
  step('live site serves version ' + before + '; the new build is ' + version);
  await page.goto(url);
  await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
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
  step('reloaded into version ' + version);

  for (const hash of ['#/', '#/calendar', '#/plan/pick?cadence=daily', '#/library?type=project', '#/activity']) {
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
  await page.keyboard.press('Escape');
  // A full load, not a hash change from the Deck: wait for Today's own Now card, then for its block icons.
  await page.goto(new URL('#/', url).href);
  await page.reload();
  await page.locator('#now-title').waitFor({ timeout: 30_000 });
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
  console.error('\nLive check failed: ' + (err instanceof Error ? err.message : String(err)));
  await page.screenshot({ path: 'live-check.png', fullPage: true }).catch(() => undefined);
  process.exitCode = 1;
} finally {
  await browser.close();
}
