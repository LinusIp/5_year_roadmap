import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { FakeGithub } from '../fake-github.ts';
import { serveGithub } from './github-route.ts';
import { FIRST_DAY, laterRow, makeNow, nowCard, open, reload, writesSettled } from './helpers.ts';

/**
 * A project's tech doc is one tap away: from the Deck (before Take it, and with Take it in the doc), the Library,
 * Plan › Projects and Today's Now card, where the timer keeps running in the sheet's header and ticks made in the
 * doc show on the card at once. Enter or Space opens it from a focused row, Escape closes it with focus back on the
 * row, it reopens where it was scrolled to, and all of it survives a reload and a second device.
 */
test.use({ timezoneId: 'Asia/Tashkent' });

const GAME = 'One finished small game (close the GameDevHQ loop)';
const BUILD = { id: 'ai-hybrid-retrieval-benchmark', title: 'BM25 versus dense versus hybrid retrieval benchmark' };
const TOKEN = 'github_pat_techdoc_0123456789';

test.describe('with the clock on the plan’s first day', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date(FIRST_DAY) });
  });

  test('from the Deck: a tap opens the doc before Take it, Escape returns to the card, Take it from the doc', async ({ page }) => {
    await open(page, './#/plan/pick?cadence=monthly&scope=all&group=inference');
    const title = (await page.locator('#deck-top-title').innerText()).trim();
    // A tap on the card, not a swipe.
    await page.locator('#deck-top-title').click();
    const sheet = page.getByRole('dialog', { name: title });
    await expect(sheet.getByRole('heading', { name: 'Requirements', exact: true })).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Take it' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    // The deck kept its card and its buttons.
    await expect(page.locator('#deck-top-title')).toHaveText(title);
    await expect(page.getByRole('button', { name: 'Shuffle', exact: true })).toBeVisible();

    // From the keyboard: Enter on the card's title opens it, Escape gives focus back.
    const titleButton = page.locator('#deck-top-title button');
    await titleButton.focus();
    await page.keyboard.press('Enter');
    await expect(sheet).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(titleButton).toBeFocused();

    await titleButton.press(' ');
    await sheet.getByRole('button', { name: 'Take it' }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(laterRow(page, /monthly case \d+ h$/)).toBeVisible();
  });

  test('from the Library and Plan › Projects, with the keyboard: Enter opens, Escape closes, focus returns', async ({ page }) => {
    await open(page, './#/library?q=' + encodeURIComponent(BUILD.title));
    const row = page.getByRole('main').getByRole('button', { name: new RegExp('^' + BUILD.title) });
    await row.focus();
    await page.keyboard.press('Enter');
    const sheet = page.getByRole('dialog', { name: BUILD.title });
    // A weekly build reads like a tech doc: goal, approach, done when, measure, pitfalls.
    for (const heading of [/^Approach$/, /^Done when$/, /^Measure$/, /^Pitfalls$/]) await expect(sheet.getByRole('heading', { name: heading })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(row).toBeFocused();

    // Make it this week's build; Plan › Projects' weekly slot opens the same doc.
    await row.press('Enter');
    await sheet.getByRole('button', { name: "Make it this week's build" }).click();
    await page.keyboard.press('Escape');
    await open(page, './#/plan?view=projects');
    const slot = page.getByRole('main').getByRole('button', { name: new RegExp('^' + BUILD.title + ' Weekly build') });
    await slot.click();
    await expect(sheet.getByRole('heading', { name: /^Approach/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(slot).toBeFocused();
  });

  test('from Today’s Now card with the timer running: tick a milestone in the doc, close, and the timer and progress hold', async ({ page }) => {
    await open(page, './');
    await expect(page.locator('#now-title')).toHaveText('One finished small game');
    await nowCard(page).getByRole('button', { name: 'Start' }).click();
    await expect(nowCard(page).getByText('Now · running')).toBeVisible();
    await page.clock.fastForward('02:00');

    // "Tech doc" sits next to Stop and Log time; the title opens the same sheet.
    await nowCard(page).getByRole('button', { name: 'Tech doc' }).click();
    const sheet = page.getByRole('dialog', { name: GAME });
    await expect(sheet.getByRole('timer')).toHaveText(/^Running · 2:0\d$/);
    await page.clock.fastForward('01:00');
    await expect(sheet.getByRole('timer')).toHaveText(/^Running · 3:0\d$/);
    await page.screenshot({ path: 'test-results/tech-doc-over-today.png' });

    const milestone = sheet.getByRole('checkbox', { name: /^1\. One-page design/ });
    await milestone.click();
    await expect(milestone).toBeChecked();
    await expect(page.getByText(/· 1 of \d+ ticked/)).toBeAttached();

    // Scroll the doc, close it: Today is as it was, the timer still running.
    const body = sheet.locator('div.overflow-y-auto');
    await body.evaluate((el) => el.scrollTo(0, 400));
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(nowCard(page).getByText('Now · running')).toBeVisible();
    // The running time sits in Today's header widget, in blue; the Now card keeps Stop.
    await expect(nowCard(page).getByRole('button', { name: /^Stop/ })).toBeVisible();
    await expect(page.getByText(/^3:0\d$/)).toBeVisible();
    await expect(nowCard(page).getByText(/^Graphics · .* · 1 of \d+ ticked$/)).toBeVisible();

    // The doc reopens where it was left.
    await page.locator('#now-title').click();
    await expect(sheet).toBeVisible();
    await expect.poll(() => body.evaluate((el) => Math.round(el.scrollTop))).toBe(400);
    await page.keyboard.press('Escape');
    await expect(page.locator('#now-title')).toBeFocused();

    await reload(page);
    await expect(nowCard(page).getByText('Now · running')).toBeVisible();
    await expect(nowCard(page).getByText(/1 of \d+ ticked$/)).toBeVisible();
    await page.locator('#now-title').click();
    await expect(page.getByRole('dialog', { name: GAME }).getByRole('checkbox', { name: /^1\. One-page design/ })).toBeChecked();
  });

  test('a Later today project row opens its doc; "Work on it now" makes it Now; a build’s steps tick from the doc', async ({ page }) => {
    await open(page, './#/library/' + BUILD.id);
    await page.getByRole('dialog', { name: BUILD.title }).getByRole('button', { name: "Make it this week's build" }).click();
    await open(page, './');
    await laterRow(page, new RegExp('^' + BUILD.title + ' Weekly build')).click();
    const sheet = page.getByRole('dialog', { name: BUILD.title });
    const steps = sheet.getByRole('checkbox');
    await steps.first().click();
    await expect(steps.first()).toBeChecked();
    await expect(sheet.getByText(/^1 of \d+ steps$/)).toBeVisible();
    await sheet.getByRole('button', { name: 'Work on it now' }).click();
    await expect(sheet).toHaveCount(0);
    await expect(page.locator('#now-title')).toHaveText(BUILD.title);
    await expect(nowCard(page).getByText(/1 of \d+ ticked$/)).toBeVisible();
  });

  test('a challenge opens its challenge screen, from the Deck and from Today', async ({ page }) => {
    await open(page, './#/plan/pick?cadence=daily');
    const title = (await page.locator('#deck-top-title').innerText()).trim();
    await page.locator('#deck-top-title').click();
    await expect(page).toHaveURL(/#\/challenge\//);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hint', exact: true })).toBeVisible();

    // Today's daily challenge, on Block B's Now card, opens the same screen.
    await open(page, './');
    await makeNow(page, /^30 Days of Python/);
    await nowCard(page).getByRole('link', { name: /^Daily challenge · / }).click();
    await expect(page).toHaveURL(/#\/challenge\/.*daily=1/);
    await expect(page.getByText(/^Daily challenge · easy/)).toBeVisible();
  });
});

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

test('a milestone ticked in the doc reaches a second device', async ({ browser }) => {
  const fake = new FakeGithub({ owner: 'octo-learner', repo: 'atlas-data', token: TOKEN, userId: 4242, name: 'Octo Learner' });
  const a = await device(browser, fake);
  await connect(a);
  await open(a, './');
  await a.locator('#now-title').click();
  await a.getByRole('dialog', { name: GAME }).getByRole('checkbox', { name: /^1\. One-page design/ }).click();
  await writesSettled(a);
  await open(a, './#/settings?section=sync');
  await a.locator('section#sync').getByRole('button', { name: 'Sync now' }).click();
  await expect(a.locator('section#sync').getByRole('status')).toHaveText('Synced just now');

  const b = await device(browser, fake);
  await connect(b);
  await open(b, './');
  await expect(nowCard(b).getByText(/1 of \d+ ticked$/)).toBeVisible();
  await b.locator('#now-title').click();
  await expect(b.getByRole('dialog', { name: GAME }).getByRole('checkbox', { name: /^1\. One-page design/ })).toBeChecked();
});
