import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FIRST_DAY, laterRow, makeNow, nowCard, open, reload, writesSettled } from './helpers.ts';

/**
 * FIXES-TIMER-LAYOUT: the timer counts the block's total for today, never only the current run. Stop then Start
 * continues from the total; switching blocks saves the one running first; nothing is rounded away or counted twice.
 * At 09:00 on the plan's first day the clock makes GameDevHQ (A) Now; ML Zoomcamp (C), Hugging Face (H), Coding
 * lessons (B) and Math and physics (E) wait in Later today.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

const counter = (page: Page) => page.getByRole('timer').first();
const header = (page: Page) => page.locator('main .tile').first();

/** Starts Now's timer and waits until it runs (the switch's stop and the start are separate writes). */
async function start(page: Page): Promise<void> {
  await nowCard(page).getByRole('button', { name: 'Start' }).click();
  await expect(nowCard(page).getByRole('button', { name: /^Stop/ })).toBeVisible();
  await writesSettled(page);
}

test('stop then start continues from the block’s total, and the Now card counts minutes, not hours', async ({ page }) => {
  await open(page, './');
  await start(page);
  await page.clock.fastForward('10:00');
  await nowCard(page).getByRole('button', { name: /^Stop/ }).click();
  await writesSettled(page);
  await expect(header(page)).toContainText('10 m');
  await expect(nowCard(page)).toContainText('10 m of 2 h');

  await start(page);
  await expect(counter(page)).toHaveText('10:00');
  await page.clock.fastForward('00:30');
  await expect(counter(page)).toHaveText(/^10:3\d$/);
  await expect(header(page)).toContainText(/Running · since \d\d:\d\d · 10 m on this block today/);
  await page.clock.fastForward('30:00');
  await expect(nowCard(page)).toContainText('40 m of 2 h');
  await nowCard(page).getByRole('button', { name: /^Stop/ }).click();
  await writesSettled(page);
  await expect(nowCard(page)).toContainText('40 m of 2 h');
  await expect(header(page)).toContainText('40 m');
});

test('a running timer keeps its total through a reload', async ({ page }) => {
  await open(page, './');
  await start(page);
  await page.clock.fastForward('30:00');
  await reload(page);
  await expect(counter(page)).toHaveText(/^30:0\d$/);
});

test('switching A → B → C → A keeps each block’s own total, and the day adds up after a reload', async ({ page }) => {
  await open(page, './');
  await expect(page.locator('#now-title')).toHaveText('GameDevHQ');
  await start(page); // A: GameDevHQ
  await page.clock.fastForward('15:00');
  await makeNow(page, /^Coding lessons/); // B
  await start(page);
  await page.clock.fastForward('20:00');
  await makeNow(page, /^ML Zoomcamp/); // C
  await start(page);
  await page.clock.fastForward('05:00');
  await makeNow(page, /^GameDevHQ/); // A again
  await start(page);
  await expect(counter(page)).toHaveText(/^15:0\d$/);
  await page.clock.fastForward('01:00');
  await expect(counter(page)).toHaveText(/^16:0\d$/);
  await expect(laterRow(page, /^Coding lessons/)).toContainText('20 m today');
  await expect(laterRow(page, /^ML Zoomcamp/)).toContainText('5 m of 2 h');

  await nowCard(page).getByRole('button', { name: /^Stop/ }).click();
  await writesSettled(page);
  await expect(header(page)).toContainText('41 m');
  await reload(page);
  await expect(header(page)).toContainText('41 m');
  await expect(laterRow(page, /^Coding lessons/)).toContainText('20 m today');
  await expect(laterRow(page, /^ML Zoomcamp/)).toContainText('5 m of 2 h');
  await expect(nowCard(page)).toContainText('16 m of 2 h');
});

test('switching to another block and back within three seconds loses nothing and doubles nothing', async ({ page }) => {
  await open(page, './');
  await start(page);
  await page.clock.fastForward('10:00');
  await makeNow(page, /^Coding lessons/);
  await start(page);
  await page.clock.fastForward('00:02');
  await makeNow(page, /^GameDevHQ/);
  await start(page);
  await page.clock.fastForward('00:01');
  await nowCard(page).getByRole('button', { name: /^Stop/ }).click();
  await writesSettled(page);
  await reload(page);
  // 10 min and 1 s on GameDevHQ, 2 s on Coding lessons: 10 whole minutes logged, the seconds carried.
  await expect(header(page)).toContainText('10 m');
  await expect(nowCard(page)).toContainText('10 m of 2 h');
});

test('short sessions add up instead of rounding to nothing', async ({ page }) => {
  await open(page, './');
  for (let i = 0; i < 4; i++) {
    await start(page);
    await page.clock.fastForward('00:20');
    await nowCard(page).getByRole('button', { name: /^Stop/ }).click();
    await writesSettled(page);
  }
  // Four 20-second sessions: one whole minute logged, 20 s carried to the next.
  await expect(nowCard(page)).toContainText('1 m of 2 h');
  await start(page);
  await expect(counter(page)).toHaveText(/^1:2\d$/);
});
