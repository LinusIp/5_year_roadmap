import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/** The first day of the plan, in the user's zone: the schedule the brief describes. */
export const FIRST_DAY = '2026-09-21T09:00:00+05:00';

/** Every screen, and the sheets that have an address of their own. */
export const PAGES = [
  './',
  './#/activity',
  './#/plan',
  './#/plan?view=projects',
  './#/plan?view=papers',
  './#/plan?view=credentials',
  './#/plan?view=credentials&roadmap=inference-engineering',
  './#/plan/map',
  './#/plan?lane=y1-p0.C',
  './#/plan/pick',
  './#/library',
  './#/library/mit-18-06',
  './#/library/w-c-ring-buffer',
  './#/reviews',
  './#/reviews?tab=month',
  './#/reviews?open=week:2026-09-21',
  './#/reviews?tab=quarter',
  './#/reviews?tab=quarter&open=quarter:2026-Q3',
  './#/stats',
  './#/settings',
  './#/no-such-page',
];

/**
 * Waits until every IndexedDB write the page has started is committed. A read transaction over every store
 * queues behind any write already begun, so this returns exactly when they are done. The app writes behind an
 * optimistic UI, so a test that reloads or navigates the moment after a click would otherwise race the write
 * (it did, on CI's slower runner).
 */
export async function writesSettled(page: Page): Promise<void> {
  if (!page.url().startsWith('http')) return;
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('atlas');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const stores = [...database.objectStoreNames];
          if (stores.length === 0) {
            database.close();
            resolve();
            return;
          }
          const tx = database.transaction(stores, 'readonly');
          tx.oncomplete = () => {
            database.close();
            resolve();
          };
          tx.onerror = () => {
            database.close();
            reject(tx.error);
          };
          tx.objectStore(stores[0]!).count();
        };
      }),
  );
}

/** Reloads once the page's writes are committed. */
export async function reload(page: Page): Promise<void> {
  await writesSettled(page);
  await page.reload();
}

/** Opens a screen and waits until it has drawn its heading and finished loading. */
export async function open(page: Page, path: string): Promise<void> {
  await writesSettled(page);
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.getByText(/^Loading/)).toHaveCount(0);
}

/** Today's "Now" card. */
export function nowCard(page: Page): Locator {
  return page.locator('section[aria-labelledby="now-title"]');
}

/** A row of Today's "Later today" list, by its title. */
export function laterRow(page: Page, title: RegExp): Locator {
  return page.getByRole('button', { name: title });
}

/**
 * Logs minutes on Today the only way left, the timer: Start on the Now card, the mocked clock moves on, Stop.
 * "45", "90" or "1h30". The test must have installed the clock (page.clock.install).
 */
export async function logTime(page: Page, duration: string): Promise<void> {
  const m = /^(?:(\d+)h)?\s*(\d+)?$/.exec(duration.trim());
  const minutes = m ? Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) : Number(duration);
  await nowCard(page).getByRole('button', { name: 'Start', exact: true }).click();
  await writesSettled(page);
  const before = await page.evaluate(() => Date.now());
  await page.clock.fastForward(minutes * 60_000);
  // A fixed clock (setFixedTime) does not move with fastForward: move it by hand.
  if ((await page.evaluate(() => Date.now())) - before < minutes * 60_000 - 1000) await page.clock.setFixedTime(before + minutes * 60_000);
  await nowCard(page).getByRole('button', { name: /^Stop/ }).first().click();
  await writesSettled(page);
}

/** Makes a "Later today" row the Now item. */
export async function makeNow(page: Page, title: RegExp): Promise<void> {
  await laterRow(page, title).click();
  await expect(page.locator('#now-title')).toHaveText(title);
}

/** Opens a status pill's full list (a right click stands in for the long press) and picks a status. */
export async function pickStatus(page: Page, pill: Locator, status: string): Promise<void> {
  await pill.click({ button: 'right' });
  const list = page.getByRole('dialog', { name: /^Status of / }).last();
  await list.getByRole('button', { name: new RegExp('^' + status) }).click();
  await writesSettled(page);
}
