import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBackup, serialiseBackup } from '../../src/db/backup.ts';
import { AtlasDB } from '../../src/db/db.ts';
import { addCustomEntity } from '../../src/db/edits.ts';
import type { BackupFile } from '../../src/db/types.ts';
import { addEntry, editLog } from '../../src/lib/logs.ts';
import { buildLearningLog, existingLogFiles, logPath } from '../../scripts/lib/learning-log.ts';
import { loadSeedOrThrow, splitSeed } from '../../scripts/lib/load-seed.ts';

const seed = splitSeed(loadSeedOrThrow()).app;
const titleOf = (id: string): string =>
  [...seed.resources, ...seed.projects, ...seed.papers, ...seed.certs].find((item) => item.id === id)!.title;

let database: AtlasDB;
let counter = 0;

beforeEach(() => {
  database = new AtlasDB('atlas-log-test-' + counter++);
});

afterEach(async () => {
  database.close();
  await database.delete();
});

/** Monday the 21st: two blocks, one unplanned entry, a shipped project, a finished paper and a reflection. */
async function backup(): Promise<BackupFile> {
  await editLog('2026-09-21', (log) => addEntry(log, { block: 'E', track: 'math', refId: 'mit-18-06', minutes: 75 }), database);
  await editLog('2026-09-21', (log) => addEntry(log, { block: 'E', track: 'math', refId: 'mit-18-06', minutes: 15, note: 'Elimination\nby hand' }), database);
  await editLog('2026-09-21', (log) => addEntry(log, { block: 'D', track: 'swe', minutes: 30, note: 'Fixed the CI' }), database);
  await editLog('2026-09-21', (log) => ({ ...log, reflection: 'Slow start.\nBetter after lunch.', energy: 3 }), database);
  // Sunday the 27th: the review takes over block D.
  await editLog('2026-09-27', (log) => addEntry(log, { block: 'D', track: 'ai', refId: 'paper-attention', minutes: 60 }), database);
  // A freeze day, and a day with only a zero-minute note: neither is work.
  await editLog('2026-09-22', (log) => ({ ...log, frozen: true }), database);
  await editLog('2026-09-23', (log) => ({ ...log, entries: [{ block: 'A', track: 'gamedev', minutes: 0, note: 'Thought about it' }] }), database);
  // A custom resource, worked on the 28th.
  await addCustomEntity('resource', 'my-book', { id: 'my-book', title: 'My own book', provider: 'Me', type: 'book', url: null, urlVerified: false, searchHint: 'a book', tracks: ['swe'], level: 'intro', cost: 'free', estHours: 10, prerequisites: [] }, database);
  await editLog('2026-09-28', (log) => addEntry(log, { block: 'C', track: 'swe', refId: 'my-book', minutes: 45 }), database);

  await database.itemStates.put({ refId: 'w-c-ring-buffer', status: 'done', unitsDone: [], repoUrl: 'https://github.com/me/ring-buffer', doneAt: '2026-09-21' });
  await database.itemStates.put({ refId: '30-days-of-python', status: 'done', unitsDone: [], doneAt: '2026-09-21' });
  await database.paperStates.put({ refId: 'paper-attention', status: 'read', readAt: '2026-09-27' });
  return createBackup(new Date('2026-09-28T12:00:00Z'), database);
}

describe('learning log', () => {
  it('writes one file per day with time logged, at YYYY/MM/DD.md', async () => {
    const files = buildLearningLog(await backup(), seed);
    expect([...files.keys()]).toEqual(['2026/09/21.md', '2026/09/27.md', '2026/09/28.md']);
    expect(logPath('2031-01-05')).toBe('2031/01/05.md');
  });

  it('says what was worked on, for how long, and what was finished and shipped', async () => {
    const day = buildLearningLog(await backup(), seed).get('2026/09/21.md')!;
    expect(day).toBe(
      [
        '# Monday, 21 September 2026',
        '',
        'Day 1 of the plan. 2h of study.',
        '',
        '## D · Projects / hands-on (30m)',
        '',
        '- Something not on the plan: 30m',
        '  - Fixed the CI',
        '',
        '## E · Math & physics (1h 30m)',
        '',
        '- ' + titleOf('mit-18-06') + ': 1h 30m',
        '  - Elimination by hand',
        '',
        '## Finished',
        '',
        '- ' + titleOf('30-days-of-python'),
        '',
        '## Shipped',
        '',
        '- [' + titleOf('w-c-ring-buffer') + '](https://github.com/me/ring-buffer)',
        '',
      ].join('\n'),
    );
  });

  it('keeps reflections and energy out unless asked', async () => {
    const file = await backup();
    const plain = buildLearningLog(file, seed).get('2026/09/21.md')!;
    expect(plain).not.toContain('Slow start');
    expect(plain).not.toContain('Energy');
    const withReflections = buildLearningLog(file, seed, { reflections: true }).get('2026/09/21.md')!;
    expect(withReflections).toContain('## Reflection\n\n> Slow start.\n> Better after lunch.\n\nEnergy: 3/5\n');
  });

  it('names the review block on the review day, and uses titles of items the user added', async () => {
    const files = buildLearningLog(await backup(), seed);
    expect(files.get('2026/09/27.md')).toContain('## D · Weekly review + paper reading (1h)\n\n- ' + titleOf('paper-attention') + ': 1h');
    expect(files.get('2026/09/27.md')).toContain('## Finished\n\n- Read: ' + titleOf('paper-attention'));
    expect(files.get('2026/09/28.md')).toContain('- My own book: 45m');
  });

  it('is deterministic, so a second run changes nothing', async () => {
    const file = await backup();
    expect(buildLearningLog(file, seed)).toEqual(buildLearningLog(file, seed));
  });
});

describe('npm run log:export', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'atlas-log-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const run = (...args: string[]): string =>
    execFileSync(process.execPath, [resolve('scripts/log-export.ts'), ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, TZ: 'Asia/Tashkent' } });

  it('writes the files from a backup, then reports them unchanged, and never deletes a day', async () => {
    const file = await backup();
    const backupPath = join(dir, 'atlas-backup-2026-09-28.json');
    writeFileSync(backupPath, serialiseBackup(file));
    // A day written by an earlier run whose time was later removed.
    mkdirSync(join(dir, 'learning-log', '2026', '09'), { recursive: true });
    writeFileSync(join(dir, 'learning-log', '2026', '09', '20.md'), '# An older day\n');

    const first = run(backupPath);
    expect(first).toContain('Wrote 3 days to learning-log, 0 unchanged.');
    expect(first).toMatch(/left alone[^\n]*\n\s+learning-log[\\/]2026[\\/]09[\\/]20\.md/);
    expect(readFileSync(join(dir, 'learning-log', '2026', '09', '21.md'), 'utf8')).toBe(buildLearningLog(file, seed).get('2026/09/21.md'));
    expect(existsSync(join(dir, 'learning-log', '2026', '09', '20.md'))).toBe(true);
    expect(existingLogFiles(join(dir, 'learning-log'))).toEqual(['2026/09/20.md', '2026/09/21.md', '2026/09/27.md', '2026/09/28.md']);

    // With no file named, it finds the newest backup in the current folder.
    expect(run()).toContain('Wrote 0 days to learning-log, 3 unchanged.');
  });

  it('refuses a file that is not a backup, and writes nothing', () => {
    writeFileSync(join(dir, 'notes.json'), '{"hello":"world"}');
    expect(() => run('notes.json', '--out', 'log')).toThrow(/not an Atlas backup/);
    expect(existsSync(join(dir, 'log'))).toBe(false);
  });
});
