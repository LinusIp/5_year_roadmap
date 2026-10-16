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

test('adds, reorders, swaps, drops and restores a plan item, and undoes an edit', async ({ page }) => {
  // Add Nielsen and Chuang, not on the plan, to Block E of the first phase, from its sheet.
  await open(page, './#/library/nielsen-chuang');
  await page.getByRole('button', { name: /^Add to the plan/ }).click();
  const add = page.getByRole('dialog', { name: /^Add .* to the plan$/ });
  await add.getByRole('button', { name: /^Lane/ }).click();
  await page.getByRole('dialog', { name: 'Lane' }).getByRole('button', { name: /^Block E/ }).click();
  await add.getByRole('button', { name: 'Add to the plan' }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Added .*Quantum/ })).toBeVisible();

  await open(page, './#/plan?lane=y1-p0.E');
  const sheet = page.getByRole('dialog', { name: /^Block E · Math/ });
  const items = sheet.getByRole('list').first().getByRole('listitem');
  await expect(items.last()).toContainText(/Quantum/);

  // Reorder with the arrows, then undo it from the toast.
  await sheet.getByRole('button', { name: 'Edit' }).click();
  const before = await items.allTextContents();
  await sheet.getByRole('button', { name: /^Move .*Quantum.* up$/ }).click();
  await expect(page.getByRole('status').filter({ hasText: /Moved .* up/ })).toBeVisible();
  await expect.poll(async () => (await items.allTextContents()).join('|')).not.toBe(before.join('|'));
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText(/^Undone: Moved/)).toBeVisible();
  await expect.poll(async () => (await items.allTextContents()).join('|')).toBe(before.join('|'));

  // In year 2, swap 6.041 for its named alternative, Stat 110.
  await open(page, './#/plan?lane=y2.E');
  const y2 = page.getByRole('dialog', { name: /^Block E · Math/ });
  await y2.getByRole('button', { name: 'Edit' }).click();
  await y2.getByRole('button', { name: /^Swap .*6\.041.* for another$/ }).click();
  const swap = page.getByRole('dialog', { name: /^Swap .* for$/ });
  await expect(swap.getByRole('list').getByRole('button').first()).toContainText(/Stat 110.*Alternative/);
  await swap.getByRole('button', { name: /Stat 110.*Alternative/ }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Swapped .* for .*Stat 110/ })).toBeVisible();
  await expect(y2).toContainText(/Stat 110/);

  // Drop the first item, then restore it from the Dropped group.
  const first = (await y2.getByRole('list').first().getByRole('listitem').first().textContent()) ?? '';
  await y2.getByRole('button', { name: /^Take .* off the plan$/ }).first().click();
  await expect(y2.getByRole('button', { name: /^Dropped · 1/ })).toBeVisible();
  await y2.getByRole('button', { name: /^Dropped · 1/ }).click();
  await y2.getByRole('button', { name: 'Restore' }).click();
  await expect(y2.getByRole('button', { name: /^Dropped/ })).toHaveCount(0);

  await reload(page);
  const again = page.getByRole('dialog', { name: /^Block E · Math/ });
  await expect(again.getByRole('list').first().getByRole('listitem').first()).toContainText(first);
  await expect(again).toContainText(/Stat 110/);
});

test('creates a resource of its own and a goal that shows on the Timeline', async ({ page }) => {
  await open(page, './#/library');
  await page.getByRole('button', { name: 'Add a resource' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add a resource' });
  await sheet.getByRole('textbox', { name: 'Title' }).fill('My numerical methods notes');
  await sheet.getByRole('textbox', { name: 'Units' }).fill('Floating point\nRoot finding\nQuadrature');
  await sheet.getByRole('button', { name: 'Add to the library' }).click();
  await expect(page.getByRole('dialog', { name: 'My numerical methods notes' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'My numerical methods notes' }).getByRole('checkbox', { name: 'Root finding' })).toBeVisible();

  await open(page, './#/plan');
  await page.getByRole('button', { name: 'Edit plan' }).click();
  const edit = page.getByRole('dialog', { name: 'Edit the plan' });
  await edit.getByRole('button', { name: /^Add a goal/ }).click();
  const goal = page.getByRole('dialog', { name: 'A goal' });
  await goal.getByRole('textbox', { name: 'Goal' }).fill('Finish linear algebra');
  await goal.getByRole('textbox', { name: 'By' }).fill('2027-12-31');
  await goal.getByRole('button', { name: /^What it depends on/ }).click();
  const picker = page.getByRole('dialog', { name: 'What it depends on' });
  await picker.getByRole('searchbox', { name: 'Search items and nodes' }).fill('18.06 Linear');
  await picker.getByRole('checkbox', { name: /^MIT 18\.06 Linear Algebra/ }).click();
  await picker.getByRole('button', { name: 'Close' }).click();
  await goal.getByRole('button', { name: 'Save' }).click();
  await edit.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByRole('button', { name: /^Finish linear algebra By 31 December 2027.*On track/ })).toBeVisible();
  await reload(page);
  await expect(page.getByRole('button', { name: /^Finish linear algebra/ })).toBeVisible();
});

test('pauses a lane, giving its time to another, and resumes it', async ({ page }) => {
  await open(page, './#/plan?lane=y1-p0.A');
  const lane = page.getByRole('dialog', { name: /^Block A · Graphics/ });
  await lane.getByRole('button', { name: /^Pace/ }).click();
  const pace = page.getByRole('dialog', { name: 'Pace · Graphics' });
  await pace.getByRole('button', { name: 'Pause this lane' }).click();
  await pace.getByRole('textbox', { name: 'From' }).fill('2026-09-20');
  await pace.getByRole('button', { name: /^Its time goes to/ }).click();
  await page.getByRole('dialog', { name: 'Its time goes to' }).getByRole('button', { name: /^Block C/ }).click();
  await pace.getByRole('button', { name: 'Pause Graphics' }).click();
  await expect(pace.getByText(/^Paused since .* until you resume it\. Its time goes to Core\./)).toBeVisible();

  await open(page, './');
  await expect(laterRow(page, /^ML Zoomcamp Core/)).toContainText('4 h');
  await expect(page.locator('#now-title')).not.toHaveText('One finished small game');

  await open(page, './#/plan?lane=y1-p0.A');
  await page.getByRole('dialog', { name: /^Block A · Graphics/ }).getByRole('button', { name: /^Pace/ }).click();
  await page.getByRole('dialog', { name: 'Pace · Graphics' }).getByRole('button', { name: 'Resume' }).click();
  await open(page, './');
  await expect(page.locator('#now-title')).toHaveText('One finished small game');
});

test('compact Today, other tabs, and a reset to the default layout', async ({ page }) => {
  await open(page, './#/settings?section=layout');
  await page.getByRole('radio', { name: 'Compact' }).first().click();
  await page.getByRole('switch', { name: 'Reviews' }).click();
  await page.getByRole('switch', { name: 'Library' }).click();
  await writesSettled(page);

  await open(page, './');
  const tabs = page.getByRole('navigation', { name: 'Main' }).getByRole('link');
  await expect(tabs).toHaveText(['Today', 'Plan', 'Activity', 'Reviews']);
  await expect(laterRow(page, /^30 Days of Python 1 h$/)).toBeVisible();
  await page.screenshot({ path: 'test-results/flex-compact-today.png' });

  await reload(page);
  await expect(tabs).toHaveText(['Today', 'Plan', 'Activity', 'Reviews']);

  await open(page, './#/settings?section=layout');
  for (const section of ['Layout · Today', 'Layout · Tabs']) {
    await page.locator('section').filter({ has: page.getByRole('heading', { name: section }) }).getByRole('button', { name: 'Reset to default' }).click();
  }
  await open(page, './');
  await expect(tabs).toHaveText(['Today', 'Plan', 'Library', 'Activity']);
  await expect(laterRow(page, /^30 Days of Python Languages · day 1/)).toBeVisible();
});
