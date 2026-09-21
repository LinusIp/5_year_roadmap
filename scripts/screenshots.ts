/**
 * npm run screenshots
 *
 * Regenerates the README's screenshots in docs/screenshots from the production build. The pictures need
 * some history to be worth looking at, so this makes eight weeks of it: a demo backup, imported through
 * Settings like any other. Nothing here touches your own data: the browser is a fresh, temporary one.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import { parseBackup, serialiseBackup } from '../src/db/backup-file.ts';
import type { BackupFile, DayLog, DayLogEntry, UserItemState } from '../src/db/types.ts';
import { addDays, daysBetween, weekday } from '../src/lib/dates.ts';
import type { BlockId, TrackId } from '../src/seed/schema.ts';
import { REPO_ROOT, loadSeedOrThrow } from './lib/load-seed.ts';

// Not 4190: that is on the Fetch standard's list of blocked ports.
const PORT = 4177;
const BASE = 'http://localhost:' + PORT + '/';
const OUT = join(REPO_ROOT, 'docs', 'screenshots');
const START = '2026-09-21';
const NOW = '2026-11-18';

const seed = loadSeedOrThrow();
const trackOf = (id: string): TrackId =>
  (seed.resources.find((r) => r.id === id)?.tracks[0] ?? seed.projects.find((p) => p.id === id)?.tracks[0] ?? 'swe') as TrackId;
const unitIds = (id: string): string[] => seed.resources.find((r) => r.id === id)?.units?.map((u) => u.id) ?? [];

/** A small deterministic generator, so the demo is the same every run. */
function random(seedValue: number): () => number {
  let state = seedValue;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function demoBackup(): BackupFile {
  const rand = random(21);
  const dayLogs: DayLog[] = [];
  const days = daysBetween(START, NOW);
  for (let i = 0; i <= days; i++) {
    const date = addDays(START, i);
    // Two freeze days in October, as life happens.
    if (date === '2026-10-09' || date === '2026-10-24') {
      dayLogs.push({ date, entries: [], frozen: true, frozenAuto: true });
      continue;
    }
    const sunday = weekday(date) === 0;
    const effort = date === NOW ? 0.3 : 0.55 + rand() * 0.5;
    const lane = (block: BlockId, refId: string, full: number): DayLogEntry | null => {
      const minutes = Math.round((full * Math.min(1, effort + (rand() - 0.5) * 0.3)) / 5) * 5;
      return minutes > 0 ? { block, track: trackOf(refId), refId, minutes } : null;
    };
    const entries = [
      lane('A', 'a-small-game-1', 120),
      lane('B', i < 30 ? '30-days-of-python' : 'automate-the-boring-stuff', 60),
      lane('C', 'ml-zoomcamp', 120),
      sunday ? lane('D', 'paper-attention', 120) : lane('D', 'm01', 120),
      lane('E', 'mit-18-06', 60),
    ].filter((entry): entry is DayLogEntry => entry !== null);
    const log: DayLog = { date, entries };
    if (sunday) {
      log.reflection = 'A steady week. Mornings for maths work best.';
      log.energy = 4;
    }
    dayLogs.push(log);
  }

  const itemStates: UserItemState[] = [
    { refId: '30-days-of-python', status: 'done', unitsDone: unitIds('30-days-of-python'), startedAt: START, doneAt: '2026-10-20' },
    { refId: 'automate-the-boring-stuff', status: 'active', unitsDone: [], startedAt: '2026-10-21' },
    { refId: 'ml-zoomcamp', status: 'active', unitsDone: unitIds('ml-zoomcamp').slice(0, 6), startedAt: START },
    { refId: 'mit-18-06', status: 'active', unitsDone: unitIds('mit-18-06').slice(0, 17), startedAt: START },
    // In progress, not done: done needs a repository link, and the demo does not invent one.
    { refId: 'a-small-game-1', status: 'active', unitsDone: [], startedAt: START },
    { refId: 'm01', status: 'active', unitsDone: [], startedAt: START },
  ];

  return {
    app: 'atlas',
    formatVersion: 1,
    exportedAt: NOW + 'T05:00:00.000Z',
    data: {
      dayLogs,
      itemStates,
      paperStates: [{ refId: 'paper-attention', status: 'reading', startedAt: '2026-11-15' }],
      certStates: [],
      milestoneStates: [],
      customEntities: [],
      overrides: [],
      reviews: [
        { id: 'week:2026-11-09', kind: 'week', periodStart: '2026-11-09', completedAt: '2026-11-15', worked: 'Linear algebra before breakfast.', didnt: 'Evenings for the project.', changes: 'Projects block right after lunch.' },
      ],
      weekPicks: [{ weekStart: '2026-11-16', projectId: 'w-c-ring-buffer', pickedAt: '2026-11-16' }],
      replans: [],
      settings: [{ id: 'app', core: seed.settings, theme: 'dark', github: { username: '', showCalendar: false }, backup: { lastBackupAt: '2026-11-15' } }],
      meta: [],
    },
  };
}

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('vite preview did not start on port ' + PORT + '. Run npm run build first.');
}

async function settle(page: Page, heading: string): Promise<void> {
  await page.getByRole('heading', { level: 1, name: heading }).waitFor();
  await page.getByText('Loading…').waitFor({ state: 'detached' }).catch(() => undefined);
  await page.waitForTimeout(400);
}

async function main(): Promise<void> {
  const file = demoBackup();
  const text = serialiseBackup(file);
  const check = parseBackup(text);
  if (!check.ok) throw new Error('The demo backup is not valid:\n' + check.errors.join('\n'));
  const work = mkdtempSync(join(tmpdir(), 'atlas-shots-'));
  const backupPath = join(work, 'atlas-backup-demo.json');
  writeFileSync(backupPath, text);
  mkdirSync(OUT, { recursive: true });

  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { cwd: REPO_ROOT, stdio: 'ignore' });
  const browser = await chromium.launch(process.env.CI ? {} : { channel: process.env.PW_CHANNEL ?? 'msedge' });
  try {
    await waitForServer();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 820 },
      timezoneId: 'Asia/Tashkent',
      locale: 'en-GB',
      colorScheme: 'dark',
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    await page.clock.install({ time: new Date(NOW + 'T10:30:00+05:00') });

    await page.goto(BASE + '#/settings');
    await settle(page, 'Settings');
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByLabel('Backup file to import').setInputFiles(backupPath);
    await page.getByText(/Restored \d+ records/).waitFor();

    const shots: [string, string, string][] = [
      ['today.png', '', 'Today'],
      ['activity.png', '#/activity', 'Activity'],
      ['roadmap.png', '#/roadmap', 'Roadmap'],
      ['stats.png', '#/stats', 'Stats'],
    ];
    for (const [name, path, heading] of shots) {
      await page.goto(BASE + path);
      await settle(page, heading);
      await page.screenshot({ path: join(OUT, name) });
      console.log('wrote docs/screenshots/' + name);
    }

    // Today on a phone, in the light theme.
    await page.goto(BASE + '#/settings');
    await settle(page, 'Settings');
    await page.getByRole('radio', { name: 'Light' }).click();
    await page.setViewportSize({ width: 380, height: 820 });
    await page.goto(BASE);
    await settle(page, 'Today');
    await page.screenshot({ path: join(OUT, 'today-phone-light.png') });
    console.log('wrote docs/screenshots/today-phone-light.png');
  } finally {
    await browser.close();
    server.kill();
    rmSync(work, { recursive: true, force: true });
  }
}

await main();
