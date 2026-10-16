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

  for (const hash of ['#/', '#/practice', '#/plan/pick?cadence=daily', '#/library?type=project', '#/activity']) {
    await page.goto(new URL(hash, url).href);
    await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 30_000 });
    step('renders ' + hash);
  }
  if (errors.length > 0) throw new Error('page errors: ' + errors.join(' | '));
  console.log('\nLive check passed.');
} catch (err) {
  console.error('\nLive check failed: ' + (err instanceof Error ? err.message : String(err)));
  await page.screenshot({ path: 'live-check.png', fullPage: true }).catch(() => undefined);
  process.exitCode = 1;
} finally {
  await browser.close();
}
