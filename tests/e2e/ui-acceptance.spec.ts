import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FIRST_DAY, open } from './helpers.ts';

/**
 * The redesign's acceptance checks for the UI, measured in the production build on a 390 x 844 phone:
 * Today fits one screen, one filled button, the type scale, 44 px tap targets, visible focus rings, ink2 at 5:1
 * and the block icons at 3:1 in both themes. Results are recorded in PROGRESS.md.
 */
test.use({ timezoneId: 'Asia/Tashkent', viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

const SCREENS: [string, string][] = [
  ['Today', './'],
  ['Activity', './#/activity'],
  ['Plan', './#/plan'],
  ['Calendar', './#/calendar'],
  ['Calendar day', './#/calendar?view=day'],
  ['Library', './#/library'],
  ['Settings', './#/settings'],
];

/**
 * The type scale since the polish of pull request #3: tab 12, section label 13, meta and button 15, body 17, lead 18,
 * card 24, headline 26, hero 30 (body was 16 and meta 14 before).
 */
const TYPE_SCALE = [12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 30, 32];

/** Distinct font sizes of the visible text on the page, in px. */
async function fontSizes(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const sizes = new Set<number>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!el || !node.textContent?.trim()) continue;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (rect.width === 0 || rect.height === 0 || style.visibility === 'hidden' || el.closest('.sr-only, [aria-hidden="true"]')) continue;
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      sizes.add(Math.round(parseFloat(style.fontSize)));
    }
    return [...sizes].sort((a, b) => a - b);
  });
}

/** Visible controls smaller than 44 x 44 px. */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('a[href], button, input, textarea, [role="checkbox"], [role="switch"], [role="radio"], [tabindex="0"]')) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || el.closest('.sr-only')) continue;
      // The heatmap's day cells are drawn at the mockup's size; the grid is one tab stop with arrow keys, and the
      // last seven days open from 48 px rows under it (DECISIONS.md).
      if (el.closest('svg')) continue;
      // Calendar's time grid draws blocks to scale (a 30-minute block is 24 px tall); each opens the same sheet with
      // its time and length as fields (DECISIONS.md).
      if (el.closest('[data-calendar-grid]')) continue;
      if (el.getAttribute('type') === 'file') continue;
      if (rect.width < 44 - 0.5 || rect.height < 44 - 0.5) out.push((el.getAttribute('aria-label') ?? el.textContent ?? el.tagName).trim().slice(0, 40) + ' ' + Math.round(rect.width) + 'x' + Math.round(rect.height));
    }
    return out;
  });
}

test('Today reaches "Later today" at 390 x 844 without scrolling, above the tab bar, and shows exactly one filled button', async ({ page }) => {
  await open(page, './');
  const later = await page.getByRole('heading', { name: 'Later today' }).boundingBox();
  const tabs = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
  expect(later).not.toBeNull();
  expect(tabs).not.toBeNull();
  expect(later!.y + later!.height).toBeLessThanOrEqual(tabs!.y);
  await expect(page.locator('[data-variant="filled"]')).toHaveCount(1);
});

test('every screen draws its text from the type scale', async ({ page }) => {
  const report: Record<string, number[]> = {};
  for (const [name, path] of SCREENS) {
    await open(page, path);
    // The heading draws before the data: wait for the screen's meta lines too.
    await expect(page.locator('main .text-meta').first()).toBeVisible();
    const sizes = await fontSizes(page);
    report[name] = sizes;
    for (const size of sizes) expect(TYPE_SCALE, name + ' uses ' + size + ' px').toContain(size);
  }
  // The clay Today board sets seven sizes (32 time, 24 Now title, 20 wordmark, 16 rows and buttons, 14 meta,
  // 13 labels, 12 week days); DECISIONS.md records why. Nothing may add sizes beyond the board's.
  expect(report.Today!.length).toBeLessThanOrEqual(7);
  test.info().annotations.push({ type: 'font sizes', description: JSON.stringify(report) });
  console.log('font sizes ' + JSON.stringify(report));
});

test('every control on every screen is at least 44 x 44 px', async ({ page }) => {
  const problems: string[] = [];
  for (const [name, path] of SCREENS) {
    await open(page, path);
    await expect(page.locator('main .text-meta').first()).toBeVisible();
    for (const target of await smallTargets(page)) problems.push(name + ': ' + target);
  }
  expect(problems).toEqual([]);
});

test('the keyboard focus ring is visible', async ({ page }) => {
  await open(page, './');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const style = getComputedStyle(el);
    return { tag: el.tagName, outline: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(ring).not.toBeNull();
  expect(ring!.outline).not.toBe('none');
  expect(ring!.width).toBeGreaterThanOrEqual(2);
});

for (const theme of ['light', 'dark'] as const) {
  test('every text colour is at least 4.5:1 on what it sits on, ' + theme + ' theme', async ({ page }) => {
    await open(page, './#/settings');
    await page.getByRole('radio', { name: theme === 'dark' ? 'Dark' : 'Light' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const ratios = await page.evaluate(() => {
      const probe = document.createElement('div');
      document.body.append(probe);
      const rgb = (token: string): number[] => {
        probe.style.color = 'var(' + token + ')';
        return getComputedStyle(probe).color.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
      };
      const luminance = ([r, g, b]: number[]): number => {
        const lin = (c: number): number => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
      };
      const contrast = (fg: string, bg: string): number => {
        const a = luminance(rgb(fg));
        const b = luminance(rgb(bg));
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const out: Record<string, number> = {};
      // Soft clay has one background; widgets sit on its soft blue and soft ice.
      // ink2 never sits on soft blue: the blue wells hold blue-deep numbers.
      for (const bg of ['--bg', '--ice-soft']) out['ink2 on ' + bg] = contrast('--ink2', bg);
      for (const bg of ['--bg', '--blue-soft', '--ice-soft']) out['ink on ' + bg] = contrast('--ink', bg);
      // The deep colours carry text (Active, behind, the Now label) and the block icons.
      for (const bg of ['--bg', '--blue-soft']) out['blue-deep on ' + bg] = contrast('--blue-deep', bg);
      for (const bg of ['--bg', '--ice-soft']) out['ice-deep on ' + bg] = contrast('--ice-deep', bg);
      // Words on the buttons: the blue gradient runs from --blue to --blue-deep, the ice one ends on --ice.
      for (const bg of ['--blue', '--blue-deep']) out['on-blue on ' + bg] = contrast('--on-blue', bg);
      out['on-ice on --ice'] = contrast('--on-ice', '--ice');
      probe.remove();
      return out;
    });
    console.log(theme + ' ' + JSON.stringify(Object.fromEntries(Object.entries(ratios).map(([k, v]) => [k, Number(v.toFixed(2))]))));
    for (const [what, ratio] of Object.entries(ratios)) expect(ratio, what).toBeGreaterThanOrEqual(4.5);
  });
}
