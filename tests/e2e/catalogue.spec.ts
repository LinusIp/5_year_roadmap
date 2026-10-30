import { expect, test } from '@playwright/test';
import type { Browser, Locator, Page } from '@playwright/test';
import { FakeGithub } from '../fake-github.ts';
import { serveGithub } from './github-route.ts';
import { FIRST_DAY, laterRow, makeNow, nowCard, open, pickStatus, reload, writesSettled } from './helpers.ts';

/**
 * The three-tier project catalogue through the real UI: the daily challenge inside Block B, a weekly build finished
 * with its repository, a monthly case with its milestones and README skeleton, Library › Projects, and all of it
 * across a reload and a second device.
 */
test.use({ timezoneId: 'Asia/Tashkent' });

const BUILD = { id: 'ai-hybrid-retrieval-benchmark', title: 'BM25 versus dense versus hybrid retrieval benchmark' };
const TOKEN = 'github_pat_catalogue_0123456789';

/** A list under its heading (RowList draws its label as a heading over the list). */
function listUnder(scope: Page | Locator, heading: string | RegExp): Locator {
  const root = 'goto' in scope ? scope : scope.page();
  return scope.locator('section').filter({ has: root.getByRole('heading', { name: heading }) }).last().getByRole('list');
}

/** This week's build in Plan › Projects. */
function weeklySlot(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: new RegExp('^' + BUILD.title + ' Weekly build') });
}

async function solveTodaysChallenge(page: Page): Promise<string> {
  await open(page, './');
  // The day's challenge lives in Block B, Coding lessons: mentioned on its row, a row of its own on its Now card.
  await expect(laterRow(page, /^Coding lessons 30 Days of Python · .* · daily challenge 18:00–20:00$/)).toBeVisible();
  await makeNow(page, /^Coding lessons/);
  const row = nowCard(page).getByRole('link', { name: /Daily challenge · / });
  await expect(row).toContainText(/Daily challenge · easy · .* · in Python/);
  const title = ((await row.locator('span[id]').first().innerText()) ?? '');
  await row.click();

  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByText(/^Daily challenge · easy · \d+ min/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip · 3 left' })).toBeVisible();
  await page.getByRole('button', { name: 'Hint', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Hints' }).getByRole('listitem')).toHaveCount(1);
  await page.getByRole('button', { name: 'Show approach' }).click();
  await expect(page.getByRole('region', { name: 'Approach' })).toContainText('Complexity');
  // Mark solved is the screen's one filled button.
  await expect(page.locator('[data-variant="filled"]')).toHaveCount(1);
  await page.getByRole('radio', { name: 'Rust' }).click();
  await page.getByRole('button', { name: 'Mark solved' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Solved today in Rust.' })).toBeVisible();
  return title;
}

test.describe('with the clock on the plan’s first day', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date(FIRST_DAY) });
  });

  test('solves today’s challenge from Block B: hints, the approach, Mark solved', async ({ page }) => {
    const title = await solveTodaysChallenge(page);
    await page.screenshot({ path: 'test-results/catalogue-challenge.png', fullPage: true });
    await open(page, './');
    await expect(laterRow(page, /^Coding lessons 30 Days of Python · .* · daily challenge done 18:00–20:00$/)).toBeVisible();
    await makeNow(page, /^Coding lessons/);
    await expect(nowCard(page).getByRole('link', { name: new RegExp('^' + title + ' Daily challenge · solved') })).toBeVisible();

    await reload(page);
    await expect(laterRow(page, /^Coding lessons .* daily challenge done 18:00–20:00$/)).toBeVisible();
    await open(page, './#/activity?view=projects');
    await expect(page.getByText(/^Daily challenge streak: 1 day/)).toBeVisible();
  });

  test('skip moves to another challenge, three times a day; Not today hides it', async ({ page }) => {
    await open(page, './');
    await makeNow(page, /^Coding lessons/);
    await nowCard(page).getByRole('link', { name: /Daily challenge · / }).click();
    const first = await page.getByRole('heading', { level: 1 }).innerText();
    await page.getByRole('button', { name: 'Skip · 3 left' }).click();
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(first);
    await expect(page.getByRole('button', { name: 'Skip · 2 left' })).toBeVisible();
    await page.getByRole('button', { name: 'Not today' }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(laterRow(page, /^Coding lessons 30 Days of Python · /)).toBeVisible();
    await expect(laterRow(page, /daily challenge/)).toHaveCount(0);
  });

  test('a weekly build from the catalogue: taken, then done only with a repository', async ({ page }) => {
    await open(page, './#/library/' + BUILD.id);
    const sheet = page.getByRole('dialog', { name: BUILD.title });
    await sheet.getByRole('button', { name: "Make it this week's build" }).click();
    // Today's fixed day has no projects block: the week's build shows in Plan › Projects.
    await open(page, './#/plan?view=projects');
    await expect(weeklySlot(page)).toBeVisible();

    await open(page, './#/library/' + BUILD.id);
    const pill = sheet.getByRole('button', { name: /^Status of / }).first();
    await expect(pill).toHaveText('Active');
    await expect(sheet.getByText('Add the repository link below to be able to mark it done.')).toBeVisible();
    await sheet.getByRole('textbox', { name: 'Repository' }).fill('https://github.com/me/retrieval-benchmark');
    await sheet.getByRole('textbox', { name: 'Repository' }).blur();
    await pickStatus(page, pill, 'Done');
    await expect(pill).toHaveText('Done');
    await reload(page);
    await expect(page.getByRole('dialog', { name: BUILD.title }).getByRole('button', { name: /^Status of / }).first()).toHaveText('Done');
  });

  test('a monthly case from the Deck: milestones ticked, README skeleton copied, done with a repository', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, './#/plan/pick?cadence=monthly&scope=all&group=inference');
    await expect(page.getByText(/^\d+ monthly projects left$/)).toBeVisible();
    await expect(page.locator('#deck-top-title')).not.toHaveText('');
    await page.screenshot({ path: 'test-results/catalogue-deck.png' });
    const title = await page.locator('#deck-top-title').innerText();
    await page.getByRole('button', { name: 'Take it', exact: true }).click();
    await expect(page).toHaveURL(/#\/$/);

    // The case is the next project in Block D, which Plan › Projects shows (Today's day has no projects block).
    await open(page, './#/plan?view=projects');
    const queued = listUnder(page, 'Monthly queue · real cases').getByRole('button', { name: new RegExp('^' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
    await expect(queued).toContainText('Next in Block D');
    await queued.click();
    const sheet = page.getByRole('dialog', { name: title });
    await expect(sheet.getByRole('heading', { name: 'Requirements', exact: true })).toBeVisible();
    const milestones = listUnder(sheet, /^Milestones$/);
    await milestones.getByRole('checkbox').first().click();
    await expect(milestones.getByRole('checkbox').first()).toBeChecked();
    await page.screenshot({ path: 'test-results/catalogue-case.png', fullPage: true });

    await sheet.getByRole('button', { name: 'README skeleton' }).click();
    await expect(sheet.getByRole('status').filter({ hasText: 'Copied' })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.startsWith('# ' + title + '\n')).toBe(true);
    expect(copied).toContain('## Architecture');

    await reload(page);
    const again = page.getByRole('dialog', { name: title });
    await expect(listUnder(again, /^Milestones$/).getByRole('checkbox').first()).toBeChecked();
    const pill = again.getByRole('button', { name: /^Status of / }).first();
    await expect(pill).toHaveText('Active');
    await expect(again.getByText('Add the repository link below to be able to mark it done.')).toBeVisible();
    await again.getByRole('textbox', { name: 'Repository' }).fill('https://github.com/me/case');
    await again.getByRole('textbox', { name: 'Repository' }).blur();
    await pickStatus(page, pill, 'Done');
    await expect(pill).toHaveText('Done');
  });

  test('Library › Projects narrows to advanced Year 2 inference cases', async ({ page }) => {
    await open(page, './#/library');
    await page.getByRole('button', { name: /^Projects \d+$/ }).click();
    const pickFilter = async (chip: string, option: string | RegExp): Promise<void> => {
      await page.getByRole('button', { name: chip, exact: true }).click();
      await page.getByRole('dialog', { name: chip }).getByRole('button', { name: option }).click();
    };
    await pickFilter('Kind', 'Cases');
    await pickFilter('Difficulty', 'Advanced');
    await pickFilter('Topic or domain', 'Inference');
    await pickFilter('Phase', /^Year 2/);
    await expect(page).toHaveURL(/kind=case/);
    await expect(page).toHaveURL(/phase=y2/);
    const count = Number((await page.getByText(/^[\d,]+ of [\d,]+$/).innerText()).split(' ')[0]!.replace(/,/g, ''));
    expect(count).toBeGreaterThan(0);
    const rows = page.locator('main ul').last().getByRole('listitem');
    await expect(rows).toHaveCount(count);
    for (const meta of await rows.allInnerTexts()) expect(meta).toMatch(/Case · advanced · Inference · Year 2/);
  });

  test('the long Library list is windowed: about 1,600 entries, a few dozen rows drawn', async ({ page }) => {
    await open(page, './#/library');
    await page.getByRole('button', { name: /^Projects \d+$/ }).click();
    const count = Number((await page.getByText(/^[\d,]+ of [\d,]+$/).innerText()).split(' ')[0]!.replace(/,/g, ''));
    expect(count).toBeGreaterThan(1100);
    expect(await page.locator('main ul').last().getByRole('listitem').count()).toBeLessThan(120);
    await page.mouse.wheel(0, 30_000);
    await expect(page.locator('main ul').last().getByRole('listitem').first()).not.toHaveText(/^$/);
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

test('a solved challenge and a taken build reach a second device, and survive a reload', async ({ browser }) => {
  const fake = new FakeGithub({ owner: 'octo-learner', repo: 'atlas-data', token: TOKEN, userId: 4242, name: 'Octo Learner' });
  const a = await device(browser, fake);
  await connect(a);
  await solveTodaysChallenge(a);
  await open(a, './#/library/' + BUILD.id);
  await a.getByRole('dialog', { name: BUILD.title }).getByRole('button', { name: "Make it this week's build" }).click();
  await writesSettled(a);
  await open(a, './#/settings?section=sync');
  await a.locator('section#sync').getByRole('button', { name: 'Sync now' }).click();
  await expect(a.locator('section#sync').getByRole('status')).toHaveText('Synced just now');
  const file = JSON.parse(fake.files()['state/challenges.json']!);
  expect(file).toMatchObject({ format: 'atlas-challenges', version: 1, events: [{ event: 'solved', language: 'Rust', daily: true }] });

  const b = await device(browser, fake);
  await connect(b);
  await open(b, './');
  await expect(laterRow(b, /^Coding lessons .* daily challenge done 18:00–20:00$/)).toBeVisible();
  await reload(b);
  await expect(laterRow(b, /^Coding lessons .* daily challenge done 18:00–20:00$/)).toBeVisible();
  // The build is not on Today's fixed day: Plan › Projects carries it, before and after a reload.
  await open(b, './#/plan?view=projects');
  await expect(weeklySlot(b)).toBeVisible();
  await reload(b);
  await expect(weeklySlot(b)).toBeVisible();
  await open(b, './#/activity?view=projects');
  await expect(b.getByText(/^Daily challenge streak: 1 day/)).toBeVisible();
});
