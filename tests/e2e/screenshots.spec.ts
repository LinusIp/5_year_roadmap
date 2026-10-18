import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { DEMO_TIME, demoBackupText } from '../../scripts/lib/demo.ts';
import { FakeGithub } from '../fake-github.ts';
import { serveGithub } from './github-route.ts';
import { open } from './helpers.ts';

/**
 * The screenshot test: every screen on a 390 x 844 phone and a 1280 x 800 desktop in both themes, plus
 * the five-year map in full, a tech doc over Today and the other screens below, compared with the pictures committed in /screenshots. Eight weeks of demo
 * history are imported first, so the screens have something to show.
 *
 * The baselines are drawn on CI's Linux (Chromium from `npx playwright install`), and CI compares against them on
 * every run. To redraw them after a UI change, commit an empty `screenshots/.redraw` to the pull request's branch:
 * the `screenshots` job in .github/workflows/ci.yml redraws them all and pushes them. `npm run screenshots` redraws
 * them locally, but text renders differently on other systems, so a local redraw is for looking, not committing.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

const PHONE = [
  ['today', './'],
  ['activity', './#/activity'],
  ['plan', './#/plan'],
  ['library', './#/library'],
  ['library-path', './#/library?path=ai'],
  ['library-shelf', './#/library?type=course&status=active'],
  ['library-search', './#/library?q=graphics'],
  ['settings', './#/settings'],
  ['pick', './#/plan/pick'],
  ['stats', './#/stats'],
  ['reviews', './#/reviews'],
  ['calendar', './#/calendar?view=month'],
  ['calendar-day', './#/calendar?view=day'],
  ['calendar-week', './#/calendar?view=week'],
] as const;

/** The same screens on a 1280 x 800 desktop, and the five-year map that only fits there. */
const DESKTOP = [...PHONE, ['map', './#/plan/map']] as const;

async function importDemo(page: Page, theme: 'light' | 'dark'): Promise<void> {
  // A fixed time: the clock reads the same in every run, and timers still run.
  await page.clock.setFixedTime(new Date(DEMO_TIME));
  await open(page, './#/settings');
  await page.getByLabel('Backup file to import').setInputFiles({ name: 'atlas-backup-demo.json', mimeType: 'application/json', buffer: Buffer.from(demoBackupText(theme)) });
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(page.getByText(/Restored \d+ records/)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

for (const theme of ['light', 'dark'] as const) {
  test('the phone screens match the committed screenshots, ' + theme + ' theme', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await importDemo(page, theme);
    for (const [name, path] of PHONE) {
      await open(page, path);
      await expect(page.locator('main .text-meta').first()).toBeVisible();
      // The catalogue index loads after the day: wait for Block B's daily challenge.
      if (name === 'today') await expect(page.getByText(/daily challenge/).first()).toBeVisible();
      await expect(page).toHaveScreenshot(name + '-' + theme + '.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });
    }
  });
}

for (const theme of ['light', 'dark'] as const) {
  test('the desktop screens match the committed screenshots, ' + theme + ' theme', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await importDemo(page, theme);
    for (const [name, path] of DESKTOP) {
      await open(page, path);
      await expect(page.locator('main h1').first()).toBeVisible();
      if (name === 'today') await expect(page.getByText(/daily challenge/).first()).toBeVisible();
      await expect(page).toHaveScreenshot(name + '-desktop-' + theme + '.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });
    }
  });
}

test('the five-year map matches the committed screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await importDemo(page, 'light');
  await open(page, './#/plan/map');
  await expect(page).toHaveScreenshot('map-light.png', { animations: 'disabled', fullPage: true, maxDiffPixelRatio: 0.002 });
});

test('the Sync section in Settings, off and connected, matches the committed screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = new FakeGithub({ owner: 'octo-learner', repo: 'atlas-data', token: 'github_pat_screenshot', userId: 4242, name: 'Octo Learner' });
  await serveGithub(page, fake);
  await importDemo(page, 'light');
  // A picture of the section alone: the fixed tab bar would sit over its lower part.
  await page.addStyleTag({ content: 'nav[aria-label="Main"] { display: none !important; }' });
  const section = page.locator('section#sync');
  await section.scrollIntoViewIfNeeded();
  await expect(section).toHaveScreenshot('settings-sync-off-light.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });

  await section.getByRole('textbox', { name: 'Repository' }).fill('octo-learner/atlas-data');
  await section.getByLabel('Personal access token').fill(fake.token);
  await section.getByRole('button', { name: 'Connect' }).click();
  await expect(section.getByRole('status')).toHaveText('Synced just now');
  const expiry = section.getByRole('textbox', { name: 'Token expires on' });
  await expiry.fill('2027-01-06');
  await expiry.blur();
  await page.getByRole('heading', { level: 1, name: 'Settings' }).click();
  await expect(section).toHaveScreenshot('settings-sync-on-light.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });
});

for (const theme of ['light', 'dark'] as const) {
  test('Today through the daily schedule (08:40, 13:00, and running at 06:24) matches the committed screenshots, ' + theme + ' theme', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await importDemo(page, theme);
    const at = (time: string): Date => new Date(DEMO_TIME.slice(0, 11) + time + ':00+05:00');
    for (const [name, time] of [['today-0840', '08:40'], ['today-1300', '13:00']] as const) {
      await page.clock.setFixedTime(at(time));
      await open(page, './');
      await expect(page.getByText(/daily challenge/).first()).toBeVisible();
      await expect(page).toHaveScreenshot(name + '-' + theme + '.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });
    }
    // ML Zoomcamp started at 06:00; at 06:24 its counter runs.
    await page.clock.setFixedTime(at('06:00'));
    await open(page, './');
    await page.locator('section[aria-labelledby="now-title"]').getByRole('button', { name: 'Start', exact: true }).click();
    await page.clock.setFixedTime(at('06:24'));
    await open(page, './');
    await expect(page.locator('main .tile').first()).toContainText('Running · since 06:00 · ');
    await expect(page.getByText(/daily challenge/).first()).toBeVisible();
    await expect(page).toHaveScreenshot('today-running-0624-' + theme + '.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });
  });
}

test('compact Today and the Change today sheet match the committed screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await importDemo(page, 'light');
  await open(page, './#/settings?section=layout');
  await page.getByRole('radio', { name: 'Compact' }).first().click();
  await open(page, './');
  await expect(page.locator('main .text-meta').first()).toBeVisible();
  await expect(page).toHaveScreenshot('today-compact-light.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });

  await page.getByRole('button', { name: 'Change today' }).click();
  const sheet = page.getByRole('dialog', { name: 'Change today' });
  await expect(sheet.getByText(/^Blocks · /)).toBeVisible();
  await expect(page).toHaveScreenshot('change-today-light.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });
});

test('a tech doc over Today, with the timer running, matches the committed screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await importDemo(page, 'light');
  await open(page, './');
  await expect(page.getByText(/daily challenge/).first()).toBeVisible();
  // GameDevHQ's project (the small game, once the course is done) becomes Now from its doc, its timer starts, and Tech
  // doc opens the doc over it.
  await page.getByRole('button', { name: /^GameDevHQ .*One finished small game/ }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Work on it now' }).click();
  const now = page.locator('section[aria-labelledby="now-title"]');
  await now.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText(/^Running · since /)).toBeVisible();
  await now.getByRole('button', { name: 'Tech doc' }).click();
  // The block's total for today, which the demo's earlier sessions already started.
  await expect(sheet.getByRole('timer')).toHaveText(/^Running · [\d:]+$/);
  await expect(sheet.getByRole('heading', { name: /^Done when/ }).first()).toBeVisible();
  await expect(page).toHaveScreenshot('tech-doc-today-light.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });
});

for (const theme of ['light', 'dark'] as const) {
  test('a case doc, its Overview and its Design, matches the committed screenshots, ' + theme + ' theme', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await importDemo(page, theme);
    await open(page, './#/library/mx-ai-ticket-triage-llm');
    const sheet = page.getByRole('dialog', { name: 'Support-ticket triage service for a SaaS helpdesk' });
    await expect(sheet.getByRole('heading', { name: 'The situation' })).toBeVisible();
    await expect(page).toHaveScreenshot('doc-case-overview-' + theme + '.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });
    await sheet.getByRole('radio', { name: 'Design' }).click();
    await expect(sheet.getByRole('radio', { name: 'Design' })).toHaveAttribute('aria-checked', 'true');
    await expect(sheet.getByRole('img', { name: /^Diagram of / })).toBeInViewport();
    // The jump scrolls smoothly unless motion is reduced; wait for it to settle.
    const body = sheet.locator('div.overflow-y-auto');
    await expect.poll(async () => { const a = await body.evaluate((el) => el.scrollTop); await page.waitForTimeout(150); return a === (await body.evaluate((el) => el.scrollTop)); }).toBe(true);
    await expect(page).toHaveScreenshot('doc-case-design-' + theme + '.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });
  });
}

test('a weekly build doc matches the committed screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await importDemo(page, 'light');
  await open(page, './#/library/ai-hybrid-retrieval-benchmark');
  const sheet = page.getByRole('dialog', { name: 'BM25 versus dense versus hybrid retrieval benchmark' });
  await sheet.getByRole('radio', { name: 'Design' }).click();
  await expect(sheet.getByRole('img', { name: /^Diagram of / })).toBeInViewport();
  const body = sheet.locator('div.overflow-y-auto');
  await expect.poll(async () => { const a = await body.evaluate((el) => el.scrollTop); await page.waitForTimeout(150); return a === (await body.evaluate((el) => el.scrollTop)); }).toBe(true);
  await expect(page).toHaveScreenshot('doc-build-light.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });
});

test('a calendar event sheet matches the committed screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await importDemo(page, 'light');
  await open(page, './#/calendar?view=day');
  await page.getByRole('button', { name: /^ML Zoomcamp ?, \d/ }).click();
  const sheet = page.getByRole('dialog', { name: 'ML Zoomcamp' });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveScreenshot('calendar-event-sheet-light.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });
});

test('a challenge, a case sheet and the Deck on Daily match the committed screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await importDemo(page, 'light');
  await open(page, './#/challenge/dc-a-zeros-to-the-back');
  await expect(page.getByRole('button', { name: 'Mark solved' })).toBeVisible();
  await page.getByRole('button', { name: 'Hint', exact: true }).click();
  await expect(page).toHaveScreenshot('challenge-light.png', { animations: 'disabled', fullPage: true, maxDiffPixelRatio: 0.002 });

  await open(page, './#/library/mx-ai-ticket-triage-llm');
  const sheet = page.getByRole('dialog', { name: 'Support-ticket triage service for a SaaS helpdesk' });
  await expect(sheet.getByRole('heading', { name: 'The situation', exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('case-sheet-light.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });

  await open(page, './#/plan/pick?cadence=daily');
  await expect(page.locator('#deck-top-title')).not.toHaveText('');
  await expect(page).toHaveScreenshot('deck-daily-light.png', { animations: 'disabled', maxDiffPixelRatio: 0.002 });
});
