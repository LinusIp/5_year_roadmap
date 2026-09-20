import { defineConfig } from '@playwright/test';

const CI = Boolean(process.env.CI);
const PORT = 4173;

/**
 * The smoke tests run against the production build (`vite preview`), so they exercise exactly what
 * GitHub Pages serves: relative base path, hash routing, service worker.
 *
 * Locally they drive a browser that is already installed (Edge by default; PW_CHANNEL=chrome to
 * switch), so nothing has to be downloaded. CI installs Playwright's own Chromium.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:' + PORT + '/',
    // The user lives in UTC+5. Day boundaries must follow the local date, never UTC.
    timezoneId: 'Asia/Tashkent',
    locale: 'en-GB',
    trace: 'retain-on-failure',
    ...(CI ? {} : { channel: process.env.PW_CHANNEL ?? 'msedge' }),
  },
  webServer: {
    command: '"' + process.execPath + '" node_modules/vite/bin/vite.js preview --port ' + PORT + ' --strictPort',
    url: 'http://localhost:' + PORT + '/',
    reuseExistingServer: !CI,
    timeout: 60_000,
  },
});
