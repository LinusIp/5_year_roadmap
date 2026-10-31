import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { EMBEDDABLE, MISSING, NOT_EMBEDDABLE, serveYouTube } from './focus-route.ts';
import { FIRST_DAY, nowCard, open, reload, writesSettled } from './helpers.ts';

/**
 * ATLAS-FOCUS-MUSIC, through the real UI with YouTube stood in for (focus-route.ts): the six-tab bar fits at 360 px;
 * a session plays from a tap, through the stub player on youtube-nocookie.com, and keeps playing, docked, on
 * another screen; a pasted link is confirmed by oEmbed (a video that refuses embedding is refused, a missing one
 * too), saved, reordered and removed; the timer stops playback; the block's Stop fades it out; the Atlas noise
 * generator starts and stops; Today's block card opens Focus with the block's mix and offers it once on Start.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

/** A stand-in AudioContext, so the generator runs in the test browser without a sound card. */
async function fakeAudio(page: Page): Promise<void> {
  await page.addInitScript(() => {
    class Param {
      value = 0;
      setValueAtTime(v: number) {
        this.value = v;
        return this;
      }
      linearRampToValueAtTime(v: number) {
        this.value = v;
        return this;
      }
      exponentialRampToValueAtTime(v: number) {
        this.value = v;
        return this;
      }
      cancelScheduledValues() {
        return this;
      }
    }
    class Node {
      gain = new Param();
      frequency = new Param();
      detune = new Param();
      Q = new Param();
      type = '';
      buffer: unknown = null;
      loop = false;
      connect(n: unknown) {
        return n;
      }
      disconnect() {}
      start() {
        (window as unknown as { __started: number }).__started = ((window as unknown as { __started: number }).__started ?? 0) + 1;
      }
      stop() {
        (window as unknown as { __stopped: number }).__stopped = ((window as unknown as { __stopped: number }).__stopped ?? 0) + 1;
      }
    }
    class FakeContext {
      state = 'running';
      currentTime = 0;
      sampleRate = 48000;
      destination = new Node();
      resume() {
        return Promise.resolve();
      }
      createGain() {
        return new Node();
      }
      createBiquadFilter() {
        return new Node();
      }
      createOscillator() {
        return new Node();
      }
      createConvolver() {
        return new Node();
      }
      createBufferSource() {
        return new Node();
      }
      createBuffer(_c: number, length: number) {
        return { length, copyToChannel() {} };
      }
    }
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeContext;
  });
}

test('six labelled tabs fit at 360 px with 44 px targets, Focus among them', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await open(page, './');
  const tabs = page.getByRole('navigation', { name: 'Main' }).getByRole('link');
  await expect(tabs).toHaveCount(6);
  await expect(tabs.nth(5)).toHaveText('Focus');
  const bar = (await page.getByRole('navigation', { name: 'Main' }).locator('ul').boundingBox())!;
  for (let i = 0; i < 6; i++) {
    const box = (await tabs.nth(i).boundingBox())!;
    expect(box.width, 'tab ' + i).toBeGreaterThanOrEqual(44);
    expect(box.height, 'tab ' + i).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(bar.x);
    expect(box.x + box.width).toBeLessThanOrEqual(bar.x + bar.width + 0.5);
    // The label is not clipped: its text box fits its tab.
    const label = (await tabs.nth(i).locator('span').boundingBox())!;
    expect(label.width, 'label ' + i).toBeLessThanOrEqual(box.width + 0.5);
  }
  await tabs.nth(5).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Focus' })).toBeVisible();
});

test('a session plays from a tap through the embed on youtube-nocookie.com, and keeps playing, docked, on Today', async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await serveYouTube(page);
  await open(page, './#/focus');
  // Nothing plays before a tap: no player, no request to YouTube.
  await expect(page.locator('[data-focus-embed]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Lofi', exact: true }).click();
  await page.getByRole('button', { name: /^1 A\.M Study Session/ }).click();
  const frame = page.locator('iframe[data-yt-stub]');
  await expect(frame).toHaveAttribute('data-yt-video', 'lTRiuFIWV54');
  await expect(frame).toHaveAttribute('data-yt-state', '1');
  // The embed sits in the Now playing tile, with the title and the channel beside it.
  await expect(page.locator('[data-focus-player="tile"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: /^1 A\.M Study Session/ })).toBeVisible();
  await expect(page.getByText('Lofi Girl · YouTube')).toBeVisible();
  await expect(page.getByText('ON', { exact: true })).toBeVisible();
  // The player was created on the privacy-enhanced host.
  const host = await page.evaluate(() => (window as unknown as { __ytPlayers: { options: { host: string } }[] }).__ytPlayers[0]!.options.host);
  expect(host).toBe('https://www.youtube-nocookie.com');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(frame).toHaveAttribute('data-yt-state', '2');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(frame).toHaveAttribute('data-yt-state', '1');
  // Elsewhere the player docks, still visible, with its title and channel.
  await page.getByRole('link', { name: 'Today' }).click();
  const docked = page.locator('[data-focus-player="docked"]');
  await expect(docked).toBeVisible();
  await expect(docked).toContainText('Lofi Girl');
  const box = (await docked.locator('[data-focus-embed]').boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(200);
  expect(box.height).toBeGreaterThanOrEqual(200);
  await expect(page.locator('iframe[data-yt-stub]')).toHaveAttribute('data-yt-state', '1');
  // Nothing sits under it: the page keeps room for the card above the tab bar, and the last card ends above it.
  // Today's cards arrive as their reads land, so the page can grow after a scroll: scroll and measure until it holds.
  await expect
    .poll(async () => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const card = (await docked.boundingBox())!;
      const contentBottom = await page.evaluate(() => Math.max(...[...document.querySelectorAll('main > *')].map((e) => e.getBoundingClientRect().bottom)));
      return contentBottom - card.y;
    })
    .toBeLessThanOrEqual(1);
  await docked.getByRole('button', { name: 'Stop the music' }).click();
  await expect(docked).toHaveCount(0);
});

test('a pasted link is confirmed by oEmbed, saved to My sessions, reordered and removed; refusals are explained', async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
  const asked = await serveYouTube(page);
  await open(page, './#/focus');
  await page.getByRole('button', { name: 'My sessions', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Paste a YouTube link to save it' });
  await field.fill('not a link');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('That is not a YouTube link. Paste a watch, youtu.be or playlist address.')).toBeVisible();
  expect(asked).toEqual([]);
  await field.fill('https://youtu.be/' + NOT_EMBEDDABLE);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('YouTube does not allow this video to be embedded, so Atlas cannot play it.')).toBeVisible();
  await field.fill('https://www.youtube.com/watch?v=' + MISSING);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('YouTube cannot find that video.')).toBeVisible();
  await field.fill('https://youtu.be/' + EMBEDDABLE + '?t=12');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('button', { name: /^lofi hip hop radio · beats to relax\/study to/ }).first()).toBeVisible();
  expect(asked.at(-1)).toBe('https://www.youtube.com/watch?v=' + EMBEDDABLE);
  await writesSettled(page);
  // A second one, then reorder and remove: the list is the user's and survives a reload.
  await field.fill('https://www.youtube.com/watch?v=ccccccccccc');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Session ccccccccccc/ })).toBeVisible();
  await writesSettled(page);
  await page.getByRole('button', { name: 'Move Session ccccccccccc up' }).click();
  await writesSettled(page);
  await reload(page);
  await open(page, './#/focus');
  await page.getByRole('button', { name: 'My sessions', exact: true }).click();
  const rows = page.locator('section[aria-labelledby="sessions"] .rows > *');
  await expect(rows.first()).toContainText('Session ccccccccccc');
  await page.getByRole('button', { name: 'Remove Session ccccccccccc' }).click();
  await writesSettled(page);
  await expect(page.getByRole('button', { name: /^Session ccccccccccc/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^lofi hip hop radio · beats to relax\/study to/ }).first()).toBeVisible();
});

test('the session timer stops playback, fading out', async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await serveYouTube(page);
  await open(page, './#/focus');
  await page.getByRole('button', { name: 'Piano', exact: true }).click();
  await page.getByRole('button', { name: '25 m', exact: true }).click();
  await page.getByRole('button', { name: /^2 Hour Beautiful Piano/ }).click();
  const frame = page.locator('iframe[data-yt-stub]');
  await expect(frame).toHaveAttribute('data-yt-state', '1');
  await expect(page.getByText(/^2[45] m left$/)).toBeVisible();
  await page.clock.fastForward(24 * 60_000);
  await expect(page.getByText(/^1 m left$|^\d+ s left$/)).toBeVisible();
  await page.clock.fastForward(70_000);
  // The volume ramps down over five seconds, then the video stops and the player goes.
  await page.clock.fastForward(3_000);
  const midway = await page.evaluate(() => (window as unknown as { __ytPlayers: { volume: number }[] }).__ytPlayers[0]!.volume);
  expect(midway).toBeLessThan(80);
  await page.clock.fastForward(3_000);
  await expect(frame).toHaveCount(0);
  await expect(page.locator('[data-focus-player]')).toHaveCount(0);
  await expect(page.getByText('ON', { exact: true })).toHaveCount(0);
  // A second session plays again from a tap: a new player.
  await page.getByRole('button', { name: /^Relaxing Piano Music/ }).click();
  await expect(page.locator('iframe[data-yt-stub]')).toHaveAttribute('data-yt-state', '1');
});

test('Today’s block card opens Focus with the block’s mix, Start offers it once, and the block’s Stop fades it out', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-21T10:30:00+05:00') }); // Hugging Face's window
  await serveYouTube(page);
  // Settings › Schedule: Hugging Face starts with Lofi.
  await open(page, './#/settings?section=schedule');
  await page.getByRole('button', { name: /^Hugging Face/ }).click();
  await page.getByRole('dialog', { name: 'Focus music for Hugging Face' }).getByRole('button', { name: 'Lofi', exact: true }).click();
  await writesSettled(page);
  await expect(page.getByRole('button', { name: /^Hugging Face/ })).toContainText('Lofi');

  await open(page, './');
  await expect(page.locator('#now-title')).toHaveText('Hugging Face');
  await nowCard(page).getByRole('link', { name: 'Focus music · Lofi for Hugging Face' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Focus' })).toBeVisible();
  await expect(page.getByText('Hugging Face block · ends 12:00')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lofi', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText("Lofi · Hugging Face's mix")).toBeVisible();

  await open(page, './');
  await nowCard(page).getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Start with Lofi?')).toBeVisible();
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await writesSettled(page);
  const docked = page.locator('[data-focus-player="docked"]');
  await expect(docked).toBeVisible();
  await expect(page.locator('iframe[data-yt-stub]')).toHaveAttribute('data-yt-state', '1');
  // Stop on the block: the music fades over five seconds and stops with it.
  await nowCard(page).getByRole('button', { name: /^Stop/ }).first().click();
  await page.clock.fastForward(6_000);
  await expect(docked).toHaveCount(0);
  // Asked once: the next Start says nothing.
  await nowCard(page).getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Start with Lofi?')).toHaveCount(0);
  await nowCard(page).getByRole('button', { name: /^Stop/ }).first().click();
});

test('the Atlas noise generator starts and stops, with the lock-screen metadata', async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await fakeAudio(page);
  await serveYouTube(page);
  await open(page, './#/focus');
  await page.getByRole('switch', { name: 'Brown noise' }).click();
  await expect(page.getByRole('switch', { name: 'Brown noise' })).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => (window as unknown as { __started: number }).__started)).toBeGreaterThan(0);
  const metadata = await page.evaluate(() => navigator.mediaSession.metadata && { title: navigator.mediaSession.metadata.title, artist: navigator.mediaSession.metadata.artist });
  expect(metadata).toEqual({ title: 'Atlas · Brown noise', artist: 'Atlas sounds' });
  // One sound at a time: rain replaces brown.
  await page.getByRole('switch', { name: 'Soft rain' }).click();
  await expect(page.getByRole('switch', { name: 'Soft rain' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('switch', { name: 'Brown noise' })).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('switch', { name: 'Soft rain' }).click();
  await expect(page.getByRole('switch', { name: 'Soft rain' })).toHaveAttribute('aria-checked', 'false');
  await page.clock.fastForward(6_000);
  expect(await page.evaluate(() => (window as unknown as { __stopped: number }).__stopped)).toBeGreaterThan(0);
  // Brown noise's category points here.
  await page.getByRole('button', { name: 'Brown noise', exact: true }).click();
  await expect(page.getByText('Brown noise is an Atlas sound')).toBeVisible();
});
