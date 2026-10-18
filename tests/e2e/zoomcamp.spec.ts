import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { FakeGithub } from '../fake-github.ts';
import { serveGithub } from './github-route.ts';
import { nowCard, open, reload, writesSettled } from './helpers.ts';

/**
 * The ML Zoomcamp lesson checklist (ZOOMCAMP-CHECKLIST): at 06:10 ML Zoomcamp is Now, its card shows module 1 with
 * 1.1 to 1.6 done (seeded from the checklist file) and 1.7 labelled Now. A tick moves Now on and can be undone; the
 * play knobs open the lesson in its playlist; the full list groups every module; ticks survive a reload and reach a
 * second device.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });

const MORNING = new Date('2026-10-18T06:10:00+05:00');
const PLAYLIST = 'list=PL3MmuxUbc_hIhxl5Ji8t4O6lPAOpHaCLR';
const lesson = (page: Page, label: string) => nowCard(page).getByRole('listitem').filter({ hasText: label });

async function mockOpen(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { opened: string[] }).opened = [];
    window.open = ((url: string) => {
      (window as unknown as { opened: string[] }).opened.push(String(url));
      return null;
    }) as typeof window.open;
  });
}
const opened = (page: Page) => page.evaluate(() => (window as unknown as { opened: string[] }).opened);

test('the Now card shows module 1 with 1.1 to 1.6 done and 1.7 now, and ticking moves Now on, with Undo', async ({ page }) => {
  await page.clock.install({ time: MORNING });
  await open(page, './');
  await expect(page.locator('#now-title')).toHaveText('ML Zoomcamp');
  await expect(nowCard(page)).toContainText('Module 1 · 6 of 97 videos done');
  await expect(nowCard(page).getByText('Module 1 · Introduction to Machine Learning')).toBeVisible();
  await expect(lesson(page, '1.6 Setting up the Environment').getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  await expect(lesson(page, '1.7 Introduction to NumPy')).toContainText('Now');
  await expect(lesson(page, '1.7 Introduction to NumPy').getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
  await expect(lesson(page, 'Homework 1')).toBeVisible();
  // The second button plays the current lesson; Start stays the one filled button.
  await expect(nowCard(page).getByRole('button', { name: 'Play 1.7', exact: true })).toBeVisible();
  await expect(page.locator('main [data-variant="filled"]')).toHaveCount(1);

  // The timer runs on through a tick.
  await nowCard(page).getByRole('button', { name: 'Start', exact: true }).click();
  await writesSettled(page);
  await lesson(page, '1.7 Introduction to NumPy').getByRole('checkbox').click();
  await expect(lesson(page, '1.8 Linear Algebra Refresher')).toContainText('Now');
  await expect(nowCard(page)).toContainText('Module 1 · 7 of 97 videos done');
  await expect(nowCard(page).getByRole('button', { name: /^Stop/ })).toBeVisible();
  await expect(nowCard(page).getByRole('button', { name: 'Play 1.8', exact: true })).toBeVisible();

  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();
  await expect(lesson(page, '1.7 Introduction to NumPy')).toContainText('Now');
  await expect(nowCard(page)).toContainText('Module 1 · 6 of 97 videos done');
});

test('the play knobs open the lesson inside the playlist', async ({ page }) => {
  await mockOpen(page);
  await page.clock.install({ time: MORNING });
  await open(page, './');
  await lesson(page, '1.9 Introduction to Pandas').getByRole('button', { name: 'Play 1.9 Introduction to Pandas' }).click();
  await nowCard(page).getByRole('button', { name: 'Play 1.7', exact: true }).click();
  expect(await opened(page)).toEqual(['https://www.youtube.com/watch?v=0j3XK5PsnxA&' + PLAYLIST, 'https://www.youtube.com/watch?v=Qa0-jYtRdbY&' + PLAYLIST]);
  // A homework opens its page on GitHub.
  await expect(lesson(page, 'Homework 1').getByRole('link', { name: 'Homework 1' })).toHaveAttribute('href', 'https://github.com/DataTalksClub/machine-learning-zoomcamp/blob/main/cohorts/2025/01-intro/homework.md');
});

test('Show all modules lists every module, with the optional ones folded away, and the Library sheet has the same', async ({ page }) => {
  await page.clock.install({ time: MORNING });
  await open(page, './');
  await nowCard(page).getByRole('button', { name: 'Show all modules' }).click();
  const sheet = page.getByRole('dialog', { name: 'ML Zoomcamp' });
  await expect(sheet).toContainText('6 of 97 videos');
  await expect(sheet.getByText('Module 2 · Machine Learning for Regression')).toBeVisible();
  await expect(sheet.getByText('Capstone projects')).toBeVisible();
  const optional = sheet.locator('summary').filter({ hasText: 'Optional (5)' });
  await expect(optional).toBeVisible();
  await expect(sheet.getByText('9.3 TensorFlow Lite')).toBeHidden();
  await optional.click();
  await expect(sheet.getByText('9.3 TensorFlow Lite')).toBeVisible();
  await expect(sheet.getByRole('listitem').filter({ hasText: '9.3 TensorFlow Lite' }).last()).toContainText('Outdated, optional');

  await open(page, './#/library/ml-zoomcamp');
  const item = page.getByRole('dialog');
  await expect(item).toContainText('Module 1 · 6 of 97 videos done · now 1.7 Introduction to NumPy');
  await expect(item.getByText('Module 12 · Capstone projects').or(item.getByText('Capstone projects'))).toBeVisible();
  await open(page, './#/library');
  await expect(page.getByText('Module 1 · 6 of 97', { exact: true })).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
  test('the checklist on Today and the full list pass the accessibility audit, ' + theme + ' theme', async ({ page }) => {
    await page.clock.install({ time: MORNING });
    if (theme === 'dark') {
      await open(page, './#/settings');
      await page.getByRole('radio', { name: 'Dark' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    }
    await open(page, './');
    await expect(lesson(page, '1.7 Introduction to NumPy')).toContainText('Now');
    const audit = async (): Promise<string[]> =>
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze()).violations.map(
        (v) => v.id + ' on ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', '),
      );
    expect(await audit()).toEqual([]);
    await nowCard(page).getByRole('button', { name: 'Show all modules' }).click();
    await page.getByRole('dialog', { name: 'ML Zoomcamp' }).locator('summary').first().click();
    expect(await audit()).toEqual([]);
  });
}

test('a tick survives a reload', async ({ page }) => {
  await page.clock.install({ time: MORNING });
  await open(page, './');
  await lesson(page, '1.7 Introduction to NumPy').getByRole('checkbox').click();
  await expect(nowCard(page)).toContainText('7 of 97 videos done');
  await reload(page);
  await expect(lesson(page, '1.8 Linear Algebra Refresher')).toContainText('Now');
  await expect(nowCard(page)).toContainText('Module 1 · 7 of 97 videos done');
});

const TOKEN = 'github_pat_zoomcamp_0123456789';

async function device(browser: Browser, fake: FakeGithub): Promise<Page> {
  const context = await browser.newContext({ timezoneId: 'Asia/Tashkent', locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.clock.install({ time: MORNING });
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

test('ticks reach a second device, over the progress that device seeded itself', async ({ browser }) => {
  const fake = new FakeGithub({ owner: 'octo-learner', repo: 'atlas-data', token: TOKEN, userId: 4242, name: 'Octo Learner' });
  const a = await device(browser, fake);
  await syncNow(a, true);
  await open(a, './');
  await lesson(a, '1.7 Introduction to NumPy').getByRole('checkbox').click();
  await lesson(a, '1.8 Linear Algebra Refresher').getByRole('checkbox').click();
  await expect(nowCard(a)).toContainText('8 of 97 videos done');
  await syncNow(a);

  const b = await device(browser, fake);
  await open(b, './');
  // Before it syncs, the new device starts where the checklist file does.
  await expect(nowCard(b)).toContainText('6 of 97 videos done');
  await syncNow(b, true);
  await open(b, './');
  await expect(nowCard(b)).toContainText('Module 1 · 8 of 97 videos done');
  await expect(lesson(b, '1.9 Introduction to Pandas')).toContainText('Now');
  await reload(b);
  await expect(nowCard(b)).toContainText('8 of 97 videos done');
});
