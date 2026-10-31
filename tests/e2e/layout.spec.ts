import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FIRST_DAY, nowCard, open, writesSettled } from './helpers.ts';

/**
 * FIXES-TIMER-LAYOUT, checked on the phones it was reported on: at 360, 390 and 412 px nothing on Today, Calendar
 * or the Library reaches past the screen's edges, and the last card ends above the floating tab bar once the page is
 * scrolled to the bottom.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

const PHONES = [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
];

const SCREENS: { name: string; path: string; running?: boolean }[] = [
  { name: 'Today', path: './' },
  { name: 'Today, running', path: './', running: true },
  { name: 'Today, another day', path: './#/?date=2026-09-20' },
  { name: 'Calendar, day', path: './#/calendar?view=day' },
  { name: 'Calendar, week', path: './#/calendar?view=week' },
  { name: 'Library', path: './#/library' },
  { name: 'Plan', path: './#/plan' },
  { name: 'Stats', path: './#/activity' },
];

/** Elements whose box reaches past the viewport, leaving out what a horizontal scroller or sr-only clips. */
async function overflowing(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const out: string[] = [];
    if (document.documentElement.scrollWidth > width + 1) out.push('the page scrolls sideways: ' + document.documentElement.scrollWidth + ' > ' + width);
    for (const el of document.querySelectorAll<HTMLElement>('main *, nav[aria-label="Main"] *')) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (el.closest('.sr-only, dialog:not([open])')) continue;
      // Content inside a sideways scroller (the chip rows) may pass the edge by design.
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') {
          clipped = true;
          break;
        }
      }
      if (clipped) continue;
      if (rect.right > width + 1 || rect.left < -1) out.push(el.tagName.toLowerCase() + '.' + (el.className.toString().split(' ').slice(0, 3).join('.') || '') + ' ' + Math.round(rect.left) + '…' + Math.round(rect.right) + ' "' + (el.textContent ?? '').trim().slice(0, 30) + '"');
    }
    return out.slice(0, 10);
  });
}

/** How far the last card's bottom is above the tab bar's top, with the page scrolled to the end. */
async function clearance(page: Page): Promise<number> {
  return page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const main = document.querySelector('main')!;
    const children = [...main.children].filter((c) => {
      const r = c.getBoundingClientRect();
      return r.height > 0 && !c.classList.contains('sr-only') && c.tagName !== 'DIALOG';
    });
    const last = children.at(-1)!;
    const bar = document.querySelector('nav[aria-label="Main"] ul')!;
    return bar.getBoundingClientRect().top - last.getBoundingClientRect().bottom;
  });
}

for (const phone of PHONES) {
  test.describe(phone.width + ' × ' + phone.height, () => {
    test.use({ viewport: phone });
    for (const screen of SCREENS) {
      test(screen.name + ' fits the width and ends above the tab bar', async ({ page }) => {
        await page.clock.install({ time: new Date(FIRST_DAY) });
        await open(page, screen.path);
        if (screen.running) {
          await nowCard(page).getByRole('button', { name: 'Start' }).click();
          await writesSettled(page);
          await page.clock.fastForward('47:00');
        }
        expect(await overflowing(page)).toEqual([]);
        expect(await clearance(page)).toBeGreaterThanOrEqual(8);
      });
    }
  });
}
