import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { laterRow, logTime, makeNow, nowCard, open, writesSettled } from './helpers.ts';

/**
 * From-to times on every block, and Later today regrouped (SCHEDULE-TIMES): the Now label and each row carry their
 * window; Later today counts what is done and splits into its two sessions around the break; a block whose window
 * passed unfinished waits under "Earlier · not finished" with the time it got; the done ones fold into "Done today";
 * the end of the day's card is never empty; the daily challenge goes by its own short title.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block', viewport: { width: 412, height: 915 } });

const at = (time: string): Date => new Date('2026-10-18T' + time + ':00+05:00');
const section = (page: Page, label: string) => page.locator('section:has(h2:text-is("' + label + '"))');

test('at 09:00 the Now label and every row show their window, in two sessions around the break', async ({ page }) => {
  await page.clock.install({ time: at('09:00') });
  await open(page, './');
  await expect(nowCard(page).getByText('Now · 08:00–10:00')).toBeVisible();
  await expect(nowCard(page).getByText('Now · 08:00–10:00')).toHaveCSS('text-transform', 'uppercase');
  const later = section(page, 'Later today');
  await expect(later.locator('h2 + span')).toHaveText('0 of 5 done');
  await expect(later.getByRole('listitem')).toHaveText([
    'Session 1 · 06:00–12:00',
    /^Hugging Face.*10:00–12:00$/,
    'Break · 12:00–18:00',
    'Session 2 · 18:00–22:00',
    /^Coding lessons.*18:00–20:00$/,
    /^Math and physics.*20:00–22:00$/,
    /^Blog post · not yet.*any time$/,
  ]);
  // The label sits on one line of its own, the count on the right.
  const label = await later.locator('h2').boundingBox();
  expect(label!.height).toBeLessThan(24);
  // ML Zoomcamp's window is over: it waits apart, and a tap still makes it Now to start it.
  const earlier = section(page, 'Earlier · not finished');
  await expect(earlier.getByRole('button')).toHaveText([/^ML Zoomcamp0 m of 2 h · .*06:00–08:00$/]);
  await earlier.getByRole('button', { name: /^ML Zoomcamp/ }).click();
  await expect(page.locator('#now-title')).toHaveText('ML Zoomcamp');
  await expect(nowCard(page).getByRole('button', { name: 'Start', exact: true })).toBeVisible();
});

test('the daily challenge goes by its short title, says what it is in its meta, and its time on the right', async ({ page }) => {
  await page.clock.install({ time: at('09:00') });
  await open(page, './');
  await makeNow(page, /^Coding lessons/);
  const row = nowCard(page).getByRole('link', { name: /Daily challenge · / });
  const title = (await row.locator('span[id]').first().innerText()).trim();
  expect(title).not.toMatch(/^Daily challenge/);
  await expect(row).toContainText(/Daily challenge · easy · /);
  await expect(row).toHaveText(/\d+ m$/);
  const titleBox = await row.locator('span[id]').first().boundingBox();
  expect(titleBox!.height).toBeLessThan(26);
});

test('at 22:04 the unfinished blocks are Earlier · not finished, the done ones folded away, and no card is empty', async ({ page }) => {
  // GameDevHQ done at 09:00, ML Zoomcamp 1 h 22 m at 06:00, Coding lessons and Math and physics done in the evening.
  await page.clock.install({ time: at('06:00') });
  await open(page, './');
  await logTime(page, '1h 22');
  for (const [time, block] of [['08:30', 'GameDevHQ'], ['18:30', 'Coding lessons'], ['20:30', 'Math and physics']] as const) {
    await page.clock.setFixedTime(at(time));
    await open(page, './');
    await expect(page.locator('#now-title')).toHaveText(block);
    await nowCard(page).getByRole('button', { name: 'Mark done' }).click();
    await writesSettled(page);
  }
  await page.clock.setFixedTime(at('22:04'));
  await open(page, './');
  await expect(page.getByText('That was the day.')).toBeVisible();

  const earlier = section(page, 'Earlier · not finished');
  await expect(earlier.getByRole('button')).toHaveText([/^ML Zoomcamp1 h 22 m of 2 h · .*06:00–08:00$/, /^Hugging Face0 m of 2 h · .*10:00–12:00$/]);
  await expect(section(page, 'Later today').locator('h2 + span')).toHaveText('3 of 5 done');
  await expect(laterRow(page, /^ML Zoomcamp/)).toHaveCount(1);

  // Done today: collapsed, three blocks inside.
  const doneGroup = page.locator('details').filter({ hasText: 'Done today (3)' });
  await expect(doneGroup).not.toHaveAttribute('open');
  await expect(laterRow(page, /^GameDevHQ/)).toHaveCount(0);
  await doneGroup.locator('summary').click();
  await expect(doneGroup.getByRole('button')).toHaveText([/^GameDevHQ/, /^Coding lessons/, /^Math and physics/]);

  // How was today: the day in a line.
  await expect(page.getByRole('button', { name: /^How was today\?/ })).toContainText('1 h 22 m logged · 3 of 5 blocks done');
  // No tile on the page is empty.
  const empty = await page.locator('main .tile').evaluateAll((tiles) => tiles.filter((t) => !(t.textContent ?? '').trim()).length);
  expect(empty).toBe(0);
});
