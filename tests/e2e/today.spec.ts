import { expect, test } from '@playwright/test';
import { FIRST_DAY, laterRow, logTime, makeNow, nowCard, open, reload, writesSettled } from './helpers.ts';

/**
 * The acceptance criteria of the brief for Today, through the real UI against the production build. The
 * clock is pinned to the first day of the plan, in the user's zone.
 */
test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

test('the block of the hour is Now, and the other four wait in Later today by their times', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await open(page, './');

  await expect(page.getByRole('heading', { level: 1, name: 'Monday 21 September' })).toBeVisible();
  await expect(page.getByText('0 m of 10 h today · no streak yet')).toBeVisible();

  // 09:00 falls in GameDevHQ's window, 08:00 to 10:00.
  await expect(page.locator('#now-title')).toHaveText('GameDevHQ');
  await expect(nowCard(page).getByText('Now · 08:00–10:00')).toBeVisible();
  await expect(nowCard(page).getByText('0 m of 2 h · GameDevHQ Unity course')).toBeVisible();
  await expect(nowCard(page).getByRole('link', { name: 'Open course' })).toBeVisible();

  // Later today: the rest, by start time, the break between the morning and the evening.
  const rows = page.getByRole('listitem').filter({ has: page.getByRole('button') }).or(page.getByRole('listitem').filter({ hasText: /^Break/ }));
  await expect(laterRow(page, /^ML Zoomcamp ML Zoomcamp · module 1.* 06:00$/)).toBeVisible();
  await expect(laterRow(page, /^Hugging Face LLM Course · 1\. Transformer models 10:00$/)).toBeVisible();
  await expect(laterRow(page, /^Coding lessons 30 Days of Python · day 1, introduction · daily challenge 18:00$/)).toBeVisible();
  await expect(laterRow(page, /^Math and physics 18\.06 Linear Algebra · lecture 1, the geometry of linear equations 20:00$/)).toBeVisible();
  await expect(rows).toHaveText([/^ML Zoomcamp/, /^Hugging Face/, 'Break · 12:00 – 18:00', /^Coding lessons/, /^Math and physics/]);
  await expect(page.getByText('Done: 0 of 5')).toBeVisible();
  // Projects (D) is not in the day any more, so there is no weekly build row.
  await expect(laterRow(page, /Weekly build/)).toHaveCount(0);

  // One filled button on the screen: the primary action.
  await expect(page.locator('[data-variant="filled"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('logs time with the timer and keeps it across a reload', async ({ page }) => {
  // From the start of GameDevHQ's window, so an hour and a half stays inside it.
  await page.clock.setFixedTime(new Date('2026-09-21T08:00:00+05:00'));
  await open(page, './');
  await logTime(page, '1h30');

  await expect(page.getByText(/^1 h 30 m of 10 h today/)).toBeVisible();
  await expect(nowCard(page).getByText('1 h 30 m of 2 h · GameDevHQ Unity course')).toBeVisible();

  await reload(page);
  await expect(nowCard(page).getByText('1 h 30 m of 2 h · GameDevHQ Unity course')).toBeVisible();
});

test('a timer adds the minutes it ran for', async ({ page }) => {
  await open(page, './');
  await nowCard(page).getByRole('button', { name: 'Start' }).click();
  await expect(nowCard(page).getByRole('button', { name: /^Stop/ })).toBeVisible();
  await expect(page.getByText(/^Running · since /)).toBeVisible();

  await page.clock.fastForward('25:00');
  await nowCard(page).getByRole('button', { name: /^Stop/ }).click();

  await expect(nowCard(page).getByText('25 m of 2 h · GameDevHQ Unity course')).toBeVisible();
  await expect(nowCard(page).getByRole('button', { name: 'Start' })).toBeVisible();
});

test('ticking a unit moves the item on to the next one', async ({ page }) => {
  await open(page, './');
  await makeNow(page, /^Math and physics/);
  await page.locator('#now-title').click();

  await nowCard(page).getByRole('checkbox', { name: 'Lecture 1: The geometry of linear equations' }).click();
  await expect(nowCard(page).getByText(/lecture 2, elimination with matrices/)).toBeVisible();
});

test('logs something that is not on the plan, from Calendar\'s correction sheet', async ({ page }) => {
  // Manual minutes live only behind Calendar › day view › a block › Edit logged time.
  await open(page, './#/calendar?view=day');
  await page.getByRole('button', { name: /^GameDevHQ ?, 08:00/ }).click();
  await page.getByRole('dialog', { name: 'GameDevHQ' }).getByRole('button', { name: /^Edit logged time/ }).click();
  await page.getByRole('dialog', { name: /^Logged on / }).getByRole('button', { name: 'Add logged time' }).click();
  const sheet = page.getByRole('dialog', { name: 'Log time' });
  await sheet.getByRole('textbox', { name: 'What did you do?' }).fill('Read the Raft paper');
  await sheet.getByRole('textbox', { name: 'Minutes' }).fill('40');
  await sheet.getByRole('textbox', { name: 'Minutes' }).press('Enter');
  await open(page, './');
  await expect(page.getByText(/^40 m of 10 h today/)).toBeVisible();

  // The day's entries, on Activity.
  await open(page, './#/activity');
  await page.getByRole('button', { name: /^Today/ }).click();
  await expect(page.getByRole('dialog', { name: 'Monday 21 September' }).getByText('Read the Raft paper')).toBeVisible();
});

test('records a reflection, an energy rating and a freeze day', async ({ page }) => {
  // "How was today?" appears at the end of the day, after the last block ends at 22:00.
  await page.clock.setFixedTime(new Date('2026-09-21T22:30:00+05:00'));
  await open(page, './');
  await expect(page.getByText('That was the day.')).toBeVisible();
  await page.getByRole('button', { name: 'How was today?' }).click();
  const sheet = page.getByRole('dialog', { name: 'How was today?' });
  await sheet.getByRole('textbox', { name: 'One line about today' }).fill('Linear algebra clicked.');
  await sheet.getByRole('radio', { name: '4 of 5, Good' }).click();
  await sheet.getByRole('switch', { name: 'Use a freeze day' }).click();
  await expect(sheet.getByRole('switch', { name: 'Use a freeze day' })).toHaveAttribute('aria-checked', 'true');

  await reload(page);
  await page.getByRole('button', { name: /How was today\? Energy 4 of 5/ }).click();
  await expect(sheet.getByRole('textbox', { name: 'One line about today' })).toHaveValue('Linear algebra clicked.');
  await expect(sheet.getByRole('radio', { name: '4 of 5, Good' })).toHaveAttribute('aria-checked', 'true');
  await expect(sheet.getByRole('switch', { name: 'Use a freeze day' })).toHaveAttribute('aria-checked', 'true');
});

test('a full day of logging turns the streak on', async ({ page }) => {
  // From 06:00, the first block's start, through the whole ten hours.
  await page.clock.setFixedTime(new Date('2026-09-21T06:00:00+05:00'));
  await open(page, './');
  await logTime(page, '600');
  // 600 minutes is over the 60-minute minimum, so today counts towards the streak.
  await expect(page.getByText('10 h of 10 h today · 1-day streak')).toBeVisible();
});

test('in my order, marking the block done brings the next one up, and folds the done one away', async ({ page }) => {
  // Settings › Layout › "Now is: In my order" keeps the first-unfinished rule.
  await open(page, './#/settings?section=layout');
  await page.getByRole('radio', { name: 'In my order' }).click();
  await writesSettled(page);

  await open(page, './');
  await expect(page.locator('#now-title')).toHaveText('ML Zoomcamp');
  await nowCard(page).getByRole('button', { name: 'Mark done' }).click();
  await expect(page.locator('#now-title')).toHaveText('GameDevHQ');
  await expect(page.getByText('Done: ML Zoomcamp')).toBeVisible();
  await expect(laterRow(page, /^ML Zoomcamp/)).toHaveCount(0);
});

test('by the clock, a block marked done stays Now until its window ends', async ({ page }) => {
  await open(page, './');
  await nowCard(page).getByRole('button', { name: 'Mark done' }).click();
  await expect(page.locator('#now-title')).toHaveText('GameDevHQ');
  await expect(nowCard(page).getByRole('button', { name: 'Mark not done' })).toHaveAttribute('aria-pressed', 'true');
  await expect(nowCard(page).getByText('0 m of 2 h · GameDevHQ Unity course · done')).toBeVisible();
  await expect(page.getByText('Done: GameDevHQ')).toBeVisible();

  // At 10:00 the clock moves Now on to Hugging Face, and GameDevHQ stays folded away.
  await page.clock.fastForward('01:00:30');
  await expect(page.locator('#now-title')).toHaveText('Hugging Face');
  await expect(nowCard(page).getByText('Now · 10:00–12:00')).toBeVisible();
  await expect(laterRow(page, /^GameDevHQ/)).toHaveCount(0);
});

test('Sunday plans the same five courses, and the weekly review is not a Today block', async ({ page }) => {
  // The review used to take the projects block's place on Sunday; Projects is no longer part of the day.
  await page.clock.setFixedTime(new Date('2026-09-27T09:00:00+05:00'));
  await open(page, './');
  await expect(page.getByRole('heading', { level: 1, name: 'Sunday 27 September' })).toBeVisible();
  await expect(page.getByText('0 m of 10 h today · no streak yet')).toBeVisible();
  await expect(page.locator('#now-title')).toHaveText('GameDevHQ');
  await expect(laterRow(page, /^ML Zoomcamp/)).toBeVisible();
  await expect(laterRow(page, /^Hugging Face/)).toBeVisible();
  await expect(laterRow(page, /^Coding lessons/)).toBeVisible();
  await expect(laterRow(page, /^Math and physics 18\.06 Linear Algebra/)).toBeVisible();
  await expect(page.getByText('Done: 0 of 5')).toBeVisible();
  await expect(laterRow(page, /Weekly review and paper/)).toHaveCount(0);
  await expect(page.getByText(/Projects · close the week/)).toHaveCount(0);
});

test('a day outside the five years says so', async ({ page }) => {
  await open(page, './#/?date=2026-09-20');
  await expect(page.getByText(/The plan starts on Monday, 21 September 2026/)).toBeVisible();
  await open(page, './');
  await expect(page.getByText(/The plan starts on/)).toHaveCount(0);
});
