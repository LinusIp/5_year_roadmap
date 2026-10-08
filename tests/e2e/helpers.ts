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

/** Opens a screen and waits until it has drawn its heading and finished loading. */
export async function open(page: Page, path: string): Promise<void> {
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

/** Logs minutes on Today through the Log time sheet: against the Now item, unless `something` names another thing. */
export async function logTime(page: Page, minutes: string, something?: string): Promise<void> {
  await nowCard(page).getByRole('button', { name: 'Log time', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Log time' });
  if (something) {
    await sheet.getByRole('radio', { name: 'Something else' }).click();
    await sheet.getByRole('textbox', { name: 'What did you do?' }).fill(something);
  }
  await sheet.getByRole('textbox', { name: 'Minutes' }).fill(minutes);
  await sheet.getByRole('textbox', { name: 'Minutes' }).press('Enter');
  await expect(sheet).toBeHidden();
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
}
