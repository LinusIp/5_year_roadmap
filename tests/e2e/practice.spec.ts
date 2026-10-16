import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { FakeGithub } from '../fake-github.ts';
import { serveGithub } from './github-route.ts';
import { open, reload, writesSettled } from './helpers.ts';
import type { Locator } from '@playwright/test';

/** A list under its heading (RowList draws its label as a heading over the list). */
function listUnder(scope: Page | Locator, heading: string): Locator {
  const root = 'goto' in scope ? scope : scope.page();
  return scope.locator('section').filter({ has: root.getByRole('heading', { name: heading, exact: true }) }).last().getByRole('list');
}
/** Today's Practice row, a link to the set. */
const practiceRow = (page: Page): Locator => page.getByRole('main').getByRole('link', { name: /^Practice/ });

/**
 * Daily practice, through the real UI: today's set subject by subject in an order of the user's choosing (one answer
 * wrong, one after a hint, the rest with the solution shown), resuming a half-done subject, the summary and its
 * Done, the reviews it schedules, "Start with", the end of the practice period, practice on demand from the Library,
 * a project's tech doc, and the answers reaching a second device.
 */
test.use({ timezoneId: 'Asia/Tashkent' });

/** A Monday inside the practice period (16 October 2026 to 31 January 2027). */
const PRACTICE_DAY = '2026-10-19T09:00:00+05:00';
const TOKEN = 'github_pat_practice_0123456789';

/**
 * Answers the open question. `wrong` checks a deliberately wrong number when the question takes a plain number
 * (returns false when it does not); otherwise takes a hint if asked, shows the solution and counts it as missed.
 */
async function answerOne(page: Page, how: 'wrong' | 'hint' | 'reveal'): Promise<boolean> {
  const section = page.locator('section[aria-labelledby="question-heading"]');
  if (how === 'wrong') {
    const plain = section.getByText('A number; fractions like 7/4 work.');
    if ((await plain.count()) !== 1) return false;
    await section.getByRole('textbox', { name: 'Your answer' }).fill('123456.789');
    await section.getByRole('button', { name: 'Check' }).click();
    await expect(section.getByText('Not quite.')).toBeVisible();
    await expect(section.getByRole('region', { name: 'Solution' })).toBeVisible();
    return true;
  }
  if (how === 'hint') {
    await section.getByRole('button', { name: 'Hint' }).click();
    await expect(section.getByRole('list', { name: 'Hints' }).getByRole('listitem')).toHaveCount(1);
  }
  const proof = section.getByRole('button', { name: 'Show the solution' });
  if ((await proof.count()) > 0) {
    await proof.click();
    await section.getByRole('button', { name: 'Missed it' }).click();
    return true;
  }
  await section.getByRole('button', { name: 'Show solution' }).click();
  await expect(section.getByRole('region', { name: 'Solution' })).toBeVisible();
  await section.getByRole('button', { name: 'Count it as missed' }).click();
  return true;
}

async function next(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^(Next|Back to the subjects|See the summary)$/ }).click();
}

/** A subject's row on the Practice start screen. */
const subjectRow = (page: Page, subject: string): Locator => page.getByRole('main').getByRole('link', { name: new RegExp('^' + subject + ' ') });

/** One wrong answer, one after a hint, the rest with the solution shown, over the whole set. */
const tally = { wrong: false, hint: false };
async function answerQuestions(page: Page, subject: string, from: number, to: number): Promise<void> {
  for (let i = from; i <= to; i++) {
    await expect(page.getByText(new RegExp('^Question ' + i + ' of 3 · ' + subject))).toBeVisible();
    if (!tally.wrong && (await answerOne(page, 'wrong'))) tally.wrong = true;
    else if (!tally.hint && (await page.getByRole('button', { name: 'Hint' }).count()) > 0) {
      await answerOne(page, 'hint');
      tally.hint = true;
    } else await answerOne(page, 'reveal');
    await next(page);
  }
}

async function dbRows<T>(page: Page, store: string): Promise<T[]> {
  await writesSettled(page);
  return page.evaluate(
    (name) =>
      new Promise<T[]>((resolve, reject) => {
        const request = indexedDB.open('atlas');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const all = request.result.transaction(name, 'readonly').objectStore(name).getAll();
          all.onsuccess = () => {
            request.result.close();
            resolve(all.result as T[]);
          };
          all.onerror = () => reject(all.error);
        };
      }),
    store,
  );
}

test('today’s set in an order of my choosing: physics, linear algebra, then calculus resumed after a reload', async ({ page }) => {
  await page.clock.install({ time: new Date(PRACTICE_DAY) });
  await open(page, './');
  const row = practiceRow(page);
  await expect(row).toContainText('9 questions · linear algebra, calculus, physics');
  await row.click();

  // The start screen: the three subjects with their size and status, any order.
  await expect(page).toHaveURL(/#\/practice$/);
  for (const subject of ['Linear algebra', 'Calculus', 'Physics']) {
    await expect(subjectRow(page, subject)).toContainText(/3 questions · ~\d+ min/);
    await expect(subjectRow(page, subject)).toContainText('Not started');
  }
  await expect(page.locator('[data-variant="filled"]')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/practice-start.png', fullPage: true });

  // Physics first: its three questions, then back to the start screen, not to a summary.
  await subjectRow(page, 'Physics').click();
  await page.screenshot({ path: 'test-results/practice-question.png', fullPage: true });
  await answerQuestions(page, 'Physics', 1, 3);
  await expect(page).toHaveURL(/#\/practice$/);
  await expect(subjectRow(page, 'Physics')).toContainText('Done');
  await expect(subjectRow(page, 'Calculus')).toContainText('Not started');

  // Its minutes are on the Practice block already, on the physics track; the block is not done yet.
  let logs = await dbRows<{ date: string; entries: { block: string; track: string; minutes: number; refId?: string }[]; doneBlocks?: string[] }>(page, 'dayLogs');
  let today = logs.find((l) => l.date === '2026-10-19')!;
  expect(today.entries).toEqual([expect.objectContaining({ block: 'P', track: 'physics', refId: 'practice:physics' })]);
  expect(today.doneBlocks ?? []).not.toContain('P');
  await open(page, './');
  await expect(practiceRow(page)).toContainText('1 of 3 subjects');
  await practiceRow(page).click();

  // Then linear algebra.
  await subjectRow(page, 'Linear algebra').click();
  await answerQuestions(page, 'Linear algebra', 1, 3);
  await expect(subjectRow(page, 'Linear algebra')).toContainText('Done');

  // Calculus half done, then a reload: it keeps its place and resumes at the next question.
  await subjectRow(page, 'Calculus').click();
  await answerOne(page, 'reveal');
  await reload(page);
  await expect(page.getByText(/^Question 2 of 3 · Calculus/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Solution' })).toHaveCount(0);
  await open(page, './#/practice');
  await expect(subjectRow(page, 'Calculus')).toContainText('1 of 3');
  // The half-done subject is the one offered first.
  await page.getByRole('link', { name: 'Go on with calculus' }).click();
  await answerQuestions(page, 'Calculus', 2, 3);
  expect(tally.wrong && tally.hint).toBe(true);

  // All three done: the day's summary, as before. Nothing right, every question back tomorrow.
  await expect(page.getByRole('heading', { name: '0 of 9 questions right' })).toBeVisible();
  await expect(listUnder(page, 'Coming back for review')).toContainText('9 questions tomorrow');
  await page.screenshot({ path: 'test-results/practice-summary.png', fullPage: true });

  const answers = await dbRows<{ result: string; hints: number; revealed?: boolean }>(page, 'practice');
  expect(answers).toHaveLength(9);
  expect(answers.filter((a) => a.result === 'wrong' && !a.revealed && a.hints === 0)).toHaveLength(1);
  expect(answers.filter((a) => a.hints === 1)).toHaveLength(1);
  expect(answers.filter((a) => a.revealed).length).toBeGreaterThanOrEqual(1);

  // One entry a subject, all on the Practice block, and the block done.
  logs = await dbRows(page, 'dayLogs');
  today = logs.find((l) => l.date === '2026-10-19')!;
  expect(today.entries.map((e) => e.refId).sort()).toEqual(['practice:calculus', 'practice:linear-algebra', 'practice:physics']);
  expect(new Set(today.entries.map((e) => e.block))).toEqual(new Set(['P']));
  expect(new Set(today.entries.map((e) => e.track))).toEqual(new Set(['math', 'physics']));
  expect(today.doneBlocks).toContain('P');

  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByText('Done today: Practice')).toBeVisible();

  // Tomorrow every subject's set ends with a review, and Activity › Practice lists them as due.
  await writesSettled(page);
  await page.clock.setSystemTime(new Date('2026-10-20T09:00:00+05:00'));
  await open(page, './#/activity?view=practice');
  const due = listUnder(page, 'Reviews due');
  for (const subject of ['Linear algebra', 'Calculus', 'Physics']) await expect(due.getByRole('listitem').filter({ hasText: subject })).toContainText('3');
  await expect(page.getByText(/^9 questions answered · 0 % right/)).toBeVisible();
});

test('Settings › Practice › Start with offers that subject first, and never fixes the order', async ({ page }) => {
  await page.clock.install({ time: new Date(PRACTICE_DAY) });
  await open(page, './#/settings?section=practice');
  await page.getByRole('button', { name: /^Start with/ }).click();
  await page.getByRole('dialog', { name: 'Start with' }).getByRole('button', { name: 'Physics' }).click();
  await expect(page.getByRole('button', { name: /^Start with/ })).toContainText('Physics');
  await open(page, './#/practice');
  await expect(page.getByRole('link', { name: 'Start physics' })).toBeVisible();
  // Any other subject still opens.
  await subjectRow(page, 'Calculus').click();
  await expect(page.getByText(/^Question 1 of 3 · Calculus/)).toBeVisible();
  await reload(page);
  await open(page, './#/practice');
  await expect(page.getByRole('link', { name: 'Start physics' })).toBeVisible();
});

test('the solution screen shows the worked solution and reading on the topic', async ({ page }) => {
  await page.clock.install({ time: new Date(PRACTICE_DAY) });
  await open(page, './#/practice?subject=linear-algebra');
  await page.getByRole('button', { name: 'Show solution' }).first().click();
  await expect(page.getByRole('region', { name: 'Solution' })).toBeVisible();
  await page.screenshot({ path: 'test-results/practice-solution.png', fullPage: true });
});

test('after the practice period the block is gone from Today, and Practice says so', async ({ page }) => {
  await page.clock.install({ time: new Date('2027-02-01T09:00:00+05:00') });
  await open(page, './');
  await expect(practiceRow(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Later today' })).toBeVisible();
  await open(page, './#/practice');
  await expect(page.getByText(/No daily set today: the practice period runs from 2026-10-16 to 2027-01-31/)).toBeVisible();
});

test('practice on demand: ten questions on a topic, from the Library', async ({ page }) => {
  await page.clock.install({ time: new Date(PRACTICE_DAY) });
  await open(page, './#/library');
  await page.getByRole('link', { name: 'Practise a topic' }).click();
  await expect(page.getByRole('heading', { name: 'Practice', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: /^Circular motion/ }).click();
  await expect(page.getByRole('heading', { name: 'Circular motion', level: 1 })).toBeVisible();
  await expect(page.getByText(/^Question 1 of 10 · Physics · Circular motion/)).toBeVisible();
  await answerOne(page, 'reveal');
  const answers = await dbRows<{ set: string; topic: string }>(page, 'practice');
  expect(answers).toMatchObject([{ topic: 'circular-motion' }]);
  expect(answers[0]!.set).toMatch(/^topic:physics\/circular-motion:/);
});

test('a project’s tech doc: milestones count, survive a reload, and the README skeleton copies', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, './#/library/m-inference-server');
  const sheet = page.getByRole('dialog', { name: 'Inference server from scratch' });
  await expect(sheet.getByRole('heading', { name: 'Tech doc' })).toBeVisible();
  await expect(sheet.getByRole('heading', { name: 'Architecture' })).toBeVisible();
  const milestones = listUnder(sheet, 'Milestones · 40 h');
  await expect(milestones.getByRole('checkbox')).toHaveCount(6);
  await milestones.getByRole('checkbox', { name: /^1\. Naive generate loop/ }).click();
  await expect(milestones.getByRole('checkbox', { name: /^1\. Naive generate loop/ })).toBeChecked();

  await sheet.getByRole('button', { name: 'Copy as README skeleton' }).click();
  await expect(sheet.getByRole('status').filter({ hasText: 'Copied' })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.startsWith('# Inference server from scratch\n')).toBe(true);
  expect(copied).toContain('## Architecture');

  await reload(page);
  await expect(listUnder(page.getByRole('dialog', { name: 'Inference server from scratch' }), 'Milestones · 40 h').getByRole('checkbox', { name: /^1\. Naive generate loop/ })).toBeChecked();
  const states = await dbRows<{ refId: string; unitsDone: string[] }>(page, 'itemStates');
  expect(states.find((s) => s.refId === 'm-inference-server')!.unitsDone).toEqual(['milestone-1']);
});

async function device(browser: Browser, fake: FakeGithub): Promise<Page> {
  const context = await browser.newContext({ timezoneId: 'Asia/Tashkent', locale: 'en-GB', serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.clock.install({ time: new Date(PRACTICE_DAY) });
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

test('practice answers and finished subjects reach a second device through GitHub Sync', async ({ browser }) => {
  const fake = new FakeGithub({ owner: 'octo-learner', repo: 'atlas-data', token: TOKEN, userId: 4242, name: 'Octo Learner' });
  const a = await device(browser, fake);
  await connect(a);
  // Physics finished, calculus started.
  await open(a, './#/practice?subject=physics');
  for (let i = 0; i < 3; i++) {
    await answerOne(a, 'reveal');
    await next(a);
  }
  await open(a, './#/practice?subject=calculus');
  await answerOne(a, 'reveal');
  await writesSettled(a);
  await open(a, './#/settings?section=sync');
  await a.locator('section#sync').getByRole('button', { name: 'Sync now' }).click();
  await expect(a.locator('section#sync').getByRole('status')).toHaveText('Synced just now');
  const file = JSON.parse(fake.files()['state/practice.json']!);
  expect(file.format).toBe('atlas-practice');
  expect(file.answers).toHaveLength(4);

  const b = await device(browser, fake);
  await connect(b);
  await open(b, './');
  await expect(practiceRow(b)).toContainText('1 of 3 subjects');
  await open(b, './#/practice');
  await expect(subjectRow(b, 'Physics')).toContainText('Done');
  await expect(subjectRow(b, 'Calculus')).toContainText('1 of 3');
  await subjectRow(b, 'Calculus').click();
  await expect(b.getByText(/^Question 2 of 3 · Calculus/)).toBeVisible();
  await reload(b);
  await expect(b.getByText(/^Question 2 of 3 · Calculus/)).toBeVisible();
  await open(b, './#/activity?view=practice');
  await expect(b.getByText(/^4 questions answered/)).toBeVisible();
});
