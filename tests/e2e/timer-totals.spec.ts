import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FIRST_DAY, laterRow, makeNow, nowCard, open, reload, writesSettled } from './helpers.ts';

/**
 * FIXES-TIMER-LAYOUT: the timer counts the block's total for today, never only the current run. Stop then Start
 * continues from the total; switching blocks saves the one running first; nothing is rounded away or counted twice.
 * Graphics is Now on the plan's first day; Languages, Core and Math wait in Later today.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

const counter = (page: Page) => page.getByRole('timer').first();
const header = (page: Page) => page.locator('main .tile').first();

/** Makes the Graphics project Now again: its Later today row opens its tech doc, whose "Work on it now" does it. */
async function backToGraphics(page: Page): Promise<void> {
  await laterRow(page, /^One finished small game/).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Work on it now' }).click();
  await expect(page.locator('#now-title')).toHaveText(/^One finished small game/);
}

async function start(page: Page): Promise<void> {
  await nowCard(page).getByRole('button', { name: 'Start' }).click();
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
  await expect(counter(page)).toHaveText('10:30');
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
  await start(page); // A: Graphics
  await page.clock.fastForward('15:00');
  await makeNow(page, /^30 Days of Python/); // B: Languages
  await start(page);
  await page.clock.fastForward('20:00');
  await makeNow(page, /^ML Zoomcamp/); // C: Core
  await start(page);
  await page.clock.fastForward('05:00');
  await backToGraphics(page); // A again
  await start(page);
  await expect(counter(page)).toHaveText(/^15:0\d$/);
  await page.clock.fastForward('01:00');
  await expect(counter(page)).toHaveText(/^16:0\d$/);
  await expect(laterRow(page, /^30 Days of Python/)).toContainText('20 m today');
  await expect(laterRow(page, /^ML Zoomcamp/)).toContainText('5 m today');

  await nowCard(page).getByRole('button', { name: /^Stop/ }).click();
  await writesSettled(page);
  await expect(header(page)).toContainText('41 m');
  await reload(page);
  await expect(header(page)).toContainText('41 m');
  await expect(laterRow(page, /^30 Days of Python/)).toContainText('20 m today');
  await expect(laterRow(page, /^ML Zoomcamp/)).toContainText('5 m today');
  await expect(nowCard(page)).toContainText('16 m of 2 h');
});

test('switching to another block and back within three seconds loses nothing and doubles nothing', async ({ page }) => {
  await open(page, './');
  await start(page);
  await page.clock.fastForward('10:00');
  await makeNow(page, /^30 Days of Python/);
  await start(page);
  await page.clock.fastForward('00:02');
  await backToGraphics(page);
  await start(page);
  await page.clock.fastForward('00:01');
  await nowCard(page).getByRole('button', { name: /^Stop/ }).click();
  await writesSettled(page);
  await reload(page);
  // 10 min and 1 s on Graphics, 2 s on Languages: 10 whole minutes logged, the seconds carried.
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
