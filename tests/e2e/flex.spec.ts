import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FIRST_DAY, laterRow, nowCard, open, reload, writesSettled } from './helpers.ts';

/**
 * The flexibility brief, through the real UI: the day's schedule, plan editing, pace and layout. The clock is
 * pinned to the first day of the plan (a Monday), in the user's zone.
 */
test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

async function changeToday(page: Page) {
  await page.getByRole('button', { name: 'Change today' }).click();
  return page.getByRole('dialog', { name: 'Change today' });
}

test('changing today to a University day changes the targets', async ({ page }) => {
  await open(page, './');
  await expect(page.getByText('0 h of 8 h today · no streak yet')).toBeVisible();

  const sheet = await changeToday(page);
  await sheet.getByRole('button', { name: /^Template/ }).click();
  await page.getByRole('dialog', { name: 'Template for today' }).getByRole('button', { name: /^University day/ }).click();
  await expect(sheet.getByText('Blocks · 3 h')).toBeVisible();
  await sheet.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByText('0 h of 3 h today · University day · no streak yet')).toBeVisible();
  await expect(nowCard(page).getByText('Graphics · 0 h of 1 h')).toBeVisible();
  // Projects (D) is not part of a University day.
  await expect(laterRow(page, /Weekly build/)).toHaveCount(0);

  await reload(page);
  await expect(page.getByText('0 h of 3 h today · University day · no streak yet')).toBeVisible();
  await page.screenshot({ path: 'test-results/flex-university-today.png', fullPage: true });
});

test('skips a block and moves another to tomorrow, for this day only', async ({ page }) => {
  await open(page, './');
  const sheet = await changeToday(page);

  await sheet.getByRole('button', { name: /^Math Block E/ }).click();
  await sheet.getByRole('button', { name: 'Skip today' }).click();
  await expect(sheet.getByText('Skipped today')).toBeVisible();

  await sheet.getByRole('button', { name: /^Core Block C/ }).click();
  await sheet.getByRole('button', { name: 'Move to Tuesday' }).click();
  await expect(sheet.getByText('Moved to Tuesday')).toBeVisible();
  await page.screenshot({ path: 'test-results/flex-change-today-sheet.png' });
  await sheet.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByText('0 h of 5 h today · no streak yet')).toBeVisible();
  await expect(laterRow(page, /^18\.06 Linear Algebra/)).toHaveCount(0);
  await expect(laterRow(page, /^ML Zoomcamp/)).toHaveCount(0);

  // Tomorrow carries Core twice over.
  await writesSettled(page);
  await page.goto('./#/?date=2026-09-22');
  await expect(page.getByText(/of 10 h today/)).toBeVisible();
});

test('changes one block’s minutes and makes a rest day', async ({ page }) => {
  await open(page, './');
  const sheet = await changeToday(page);
  await sheet.getByRole('button', { name: /^Graphics/ }).click();
  const minutes = sheet.getByRole('textbox', { name: /^Minutes for Graphics today/ });
  await minutes.fill('30');
  await minutes.blur();
  await expect(sheet.getByText('Blocks · 6 h 30 m')).toBeVisible();

  await sheet.getByRole('switch', { name: /^Rest day/ }).click();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('A rest day.')).toBeVisible();
  await expect(page.getByText('0 h of 0 h today · rest day · no streak yet')).toBeVisible();

  // Undo the day's changes from the sheet.
  const again = await changeToday(page);
  await again.getByRole('button', { name: "Undo today's changes" }).click();
  await again.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('0 h of 8 h today · no streak yet')).toBeVisible();
});

test('an exam-week date range shifts the forecast', async ({ page }) => {
  await open(page, './');
  await page.getByRole('button', { name: 'Log time' }).first().click();
  const log = page.getByRole('dialog', { name: 'Log time' });
  await log.getByRole('textbox', { name: 'Minutes' }).fill('120');
  await log.getByRole('textbox', { name: 'Minutes' }).press('Enter');
  await writesSettled(page);

  await open(page, './#/plan');
  const graphics = page.getByRole('button', { name: /^Graphics · 2 h/ });
  const before = Number(/(\d+) weeks? behind/.exec((await graphics.textContent()) ?? '')?.[1]);
  expect(before).toBeGreaterThan(0);

  await open(page, './#/settings?section=schedule');
  await page.getByRole('button', { name: /^Give a date or a range another template/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Give dates another template' });
  await sheet.getByRole('textbox', { name: 'Name' }).fill('Exam week');
  await sheet.getByRole('textbox', { name: 'First day' }).fill('2026-09-22');
  await sheet.getByRole('textbox', { name: 'Last day' }).fill('2026-10-05');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /^Exam week 22 Sep/ })).toBeVisible();

  await open(page, './#/plan');
  await expect(page.getByRole('button', { name: new RegExp('^Graphics · 2 h.*' + (before + 2) + ' weeks behind') })).toBeVisible();
  await page.goto('./#/?date=2026-09-23');
  await expect(page.getByText(/^0 h of 1 h 30 m today · Exam week/)).toBeVisible();
});
