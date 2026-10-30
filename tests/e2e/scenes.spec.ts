import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FIRST_DAY, open, reload, writesSettled } from './helpers.ts';
import scenes from '../../public/scenes/scenes.json' with { type: 'json' };

/**
 * ATLAS-DAILY-SCENES, through the real UI: Today names the day's scene and Plan shows the same image; a pin keeps
 * it across a reload; the dark theme takes the scene's dark set; the preview buttons look without saving; a skip
 * moves on for the day; Favourites only rotates through the starred; the setting off brings the fixed theme and
 * the illustrations back; and axe finds no contrast failure on Today, Plan and the Library for a light, a colourful
 * and a monochrome scene in both themes.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

const byId = (id: string) => scenes.find((s) => s.id === id)!;
/** A light scene, a colourful one and a monochrome one, as the brief asks. */
const THREE = [byId('snowtree'), byId('willow'), byId('greyhills')];

/** Pins a scene from the Daily scenes page. */
async function pin(page: Page, name: string): Promise<void> {
  await open(page, './#/scenes');
  await page.getByRole('button', { name: new RegExp('^Preview scene ' + name) }).click();
  await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
  await page.getByRole('button', { name: 'Pin', exact: true }).click();
  await writesSettled(page);
  await expect(page.getByRole('button', { name: 'Pinned', exact: true })).toBeVisible();
}

async function token(page: Page, name: string): Promise<string> {
  return page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim().toUpperCase(), name);
}

test('Today names the day’s scene and Plan shows the same image', async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await open(page, './');
  const header = page.locator('[data-scene-panel="today"]');
  await expect(header).toBeVisible();
  const id = await header.getAttribute('data-scene');
  const scene = byId(id!);
  await expect(header).toContainText(scene.name);
  await expect(header.getByText('Today’s scene')).toBeVisible();
  await expect(header.getByText(/of 10 h today/)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-scene', scene.id);
  expect(await token(page, '--bg')).toBe(scene.paper);
  expect(await token(page, '--l0')).toBe(scene.lanes[0]);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', scene.paper);
  // The header's controls still work on the picture.
  await expect(header.getByRole('button', { name: /pick a date/ })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Settings' })).toBeVisible();
  // The plan's phase header: the same scene.
  await open(page, './#/plan');
  await expect(page.locator('[data-scene-panel="plan"]')).toHaveAttribute('data-scene', scene.id);
  await expect(page.locator('[data-scene-panel="plan"] img').last()).toHaveAttribute('src', new RegExp(scene.id + '\\.webp$'));
  // The Library's banner and the Daily scenes page agree.
  await open(page, './#/library');
  await expect(page.locator('[data-scene-panel="library"]')).toHaveAttribute('data-scene', scene.id);
  await open(page, './#/scenes');
  await expect(page.getByRole('heading', { level: 2, name: scene.name })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="scene-name"]').getByText('Today', { exact: true })).toBeVisible();
});

test('a pin keeps the scene across a reload and the days; unpinning lets the days turn', async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await open(page, './');
  const todays = await page.locator('[data-scene-panel="today"]').getAttribute('data-scene');
  const other = scenes.find((s) => s.id !== todays)!;
  await pin(page, other.name);
  await reload(page);
  await open(page, './');
  await expect(page.locator('[data-scene-panel="today"]')).toHaveAttribute('data-scene', other.id);
  await expect(page.getByText('Pinned scene')).toBeVisible();
  // Ten days on, still pinned.
  await page.clock.setFixedTime(new Date(FIRST_DAY).getTime() + 10 * 86_400_000);
  await open(page, './');
  await expect(page.locator('[data-scene-panel="today"]')).toHaveAttribute('data-scene', other.id);
  // Settings shows the pin and lets go of it.
  await open(page, './#/settings?section=appearance');
  await expect(page.getByText('Pinned · ' + other.name)).toBeVisible();
  await page.getByRole('switch', { name: 'Pin this scene' }).click();
  await writesSettled(page);
  await open(page, './');
  await expect(page.locator('[data-scene-panel="today"]')).not.toHaveAttribute('data-scene', other.id);
});

test('the dark theme takes the scene’s dark set', async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await pin(page, byId('lakehouse').name);
  await open(page, './');
  await page.getByRole('button', { name: 'Switch to the dark theme' }).click();
  await writesSettled(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const s = byId('lakehouse');
  expect(await token(page, '--bg')).toBe(s.dark.bg);
  expect(await token(page, '--ink')).toBe(s.dark.text);
  expect(await token(page, '--ink2')).toBe(s.dark.text2);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', s.dark.bg);
  // Back to light: the paper.
  await page.getByRole('button', { name: 'Switch to the light theme' }).click();
  await writesSettled(page);
  expect(await token(page, '--bg')).toBe(s.paper);
});

test('the preview buttons look at the next and previous day without saving anything', async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await open(page, './');
  const header = page.locator('[data-scene-panel="today"]');
  const todays = (await header.getAttribute('data-scene'))!;
  await header.getByRole('button', { name: "Preview the next day's scene" }).click();
  await expect(header.getByText(/^Tomorrow · /)).toBeVisible();
  await expect(header.getByText('A preview, not saved')).toBeVisible();
  const tomorrow = (await header.getAttribute('data-scene'))!;
  expect(tomorrow).not.toBe(todays);
  // The whole screen takes the preview's palette while it shows.
  await expect(page.locator('html')).toHaveAttribute('data-scene', tomorrow);
  expect(await token(page, '--bg')).toBe(byId(tomorrow).paper);
  await header.getByRole('button', { name: "Preview the previous day's scene" }).click();
  await expect(header.getByText('Today’s scene')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-scene', todays);
  // Nothing was saved: a reload shows the day's scene.
  await header.getByRole('button', { name: "Preview the next day's scene" }).click();
  await expect(header).toHaveAttribute('data-scene', tomorrow);
  await reload(page);
  await open(page, './');
  await expect(page.locator('[data-scene-panel="today"]')).toHaveAttribute('data-scene', todays);
});

test('a skip moves on for today only, and Favourites only rotates through the starred scenes', async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await open(page, './');
  const todays = (await page.locator('[data-scene-panel="today"]').getAttribute('data-scene'))!;
  await open(page, './#/settings?section=appearance');
  await page.getByRole('button', { name: "Skip today's scene" }).click();
  await writesSettled(page);
  await expect(page.getByText('Skipped once today')).toBeVisible();
  await open(page, './');
  const skippedTo = (await page.locator('[data-scene-panel="today"]').getAttribute('data-scene'))!;
  expect(skippedTo).not.toBe(todays);
  // Tomorrow the skip is forgotten: the day's own scene, whatever it is, and never the skipped-to one by the skip.
  await page.clock.setFixedTime(new Date(FIRST_DAY).getTime() + 86_400_000);
  await open(page, './#/settings?section=appearance');
  await expect(page.getByText('Changes at midnight')).toBeVisible();

  // Star two scenes and keep to them.
  const [a, b] = [byId('willow'), byId('larches')];
  for (const s of [a, b]) {
    await open(page, './#/scenes');
    await page.getByRole('button', { name: new RegExp('^Preview scene ' + s.name) }).click();
    await page.getByRole('button', { name: 'Star', exact: true }).click();
    await writesSettled(page);
    await expect(page.getByRole('button', { name: 'Starred', exact: true })).toBeVisible();
  }
  await open(page, './#/settings?section=appearance');
  await expect(page.getByText('Rotate through the 2 starred scenes')).toBeVisible();
  await page.getByRole('switch', { name: 'Favourites only' }).click();
  await writesSettled(page);
  for (let d = 0; d < 3; d++) {
    await page.clock.setFixedTime(new Date(FIRST_DAY).getTime() + (2 + d) * 86_400_000);
    await open(page, './');
    const id = await page.locator('[data-scene-panel="today"]').getAttribute('data-scene');
    expect([a.id, b.id]).toContain(id);
  }
});

test('with the daily scene off the fixed theme and the illustrations come back', async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await open(page, './#/settings?section=appearance');
  await page.getByRole('switch', { name: 'Daily scene' }).click();
  await writesSettled(page);
  await open(page, './');
  await expect(page.locator('[data-scene-panel]')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-scene', /./);
  expect(await token(page, '--bg')).toBe('#E6EAE7');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#E6EAE7');
  await expect(page.locator('[data-art-slot]').first()).toHaveAttribute('data-art-slot', 'today-morning');
  await open(page, './#/scenes');
  await expect(page.getByText('The daily scene is off in Settings › Appearance')).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
  test('axe finds no contrast failure on Today, Plan and the Library for a light, a colourful and a monochrome scene, ' + theme + ' theme', async ({ page }) => {
    test.setTimeout(240_000); // nine axe runs
    await page.clock.install({ time: new Date(FIRST_DAY) });
    await open(page, './');
    if (theme === 'dark') {
      await page.getByRole('button', { name: 'Switch to the dark theme' }).click();
      await writesSettled(page);
    }
    for (const scene of THREE) {
      await pin(page, scene.name);
      for (const path of ['./', './#/plan', './#/library']) {
        await open(page, path);
        await expect(page.locator('html')).toHaveAttribute('data-scene', scene.id);
        const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
        expect(results.violations, scene.id + ' ' + theme + ' ' + path).toEqual([]);
      }
    }
  });
}
