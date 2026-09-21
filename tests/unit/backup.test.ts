import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AtlasDB } from '../../src/db/db.ts';
import { backupDue, canonical, collectBackup, createBackup, importBackup, markBackedUp, parseBackup, resetAll, serialiseBackup } from '../../src/db/backup.ts';
import { defaultSettings } from '../../src/db/settings.ts';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { addEntry, editLog, toggleBlockDone } from '../../src/lib/logs.ts';
import { editItemState, setItemStatus, toggleUnit } from '../../src/db/state.ts';
import { patchEntity, addCustomEntity } from '../../src/db/edits.ts';

const seedSettings = loadSeedOrThrow().settings;
let database: AtlasDB;
let counter = 0;

beforeEach(() => {
  // A fresh database per test, so they cannot leak state into each other.
  database = new AtlasDB('atlas-test-' + counter++);
});

afterEach(async () => {
  database.close();
  await database.delete();
});

/** A realistic spread of user state: logs, statuses, notes, edits, a custom item, settings and the token. */
async function populate(): Promise<void> {
  await database.settings.put({ ...defaultSettings(seedSettings), theme: 'light' });
  await editLog('2026-09-21', (log) => addEntry(log, { block: 'E', track: 'math', refId: 'mit-18-06', minutes: 75 }), database);
  await editLog('2026-09-21', (log) => addEntry(log, { block: 'D', track: 'swe', minutes: 30, note: 'Fixed the CI' }), database);
  await editLog('2026-09-21', (log) => ({ ...toggleBlockDone(log, 'E'), reflection: 'Good start', energy: 4 }), database);
  await editLog('2026-09-22', (log) => ({ ...log, frozen: true }), database);
  await toggleUnit('mit-18-06', 'lecture-1', database);
  await toggleUnit('mit-18-06', 'lecture-2', database);
  await editItemState('mit-18-06', (s) => ({ ...s, notes: '## Four subspaces\n\nColumn, null, row, left null.' }), database);
  await setItemStatus('30-days-of-python', 'active', database);
  await database.paperStates.put({ refId: 'paper-attention', status: 'reading', summary: 'Attention is enough.' });
  await database.certStates.put({ refId: 'cert-pcep', status: 'studying', targetQuarter: '2027-Q1' });
  await database.milestoneStates.put({ refId: 'ms-python-cli', status: 'active', url: 'https://github.com/me/cli' });
  await patchEntity('planItem', 'plan.m02', { order: 5 }, database);
  await addCustomEntity('resource', 'my-book', { id: 'my-book', title: 'A book', provider: 'Me', type: 'book', url: null, urlVerified: false, searchHint: 'a book', tracks: ['swe'], level: 'intro', cost: 'free', estHours: 10, prerequisites: [] }, database);
  await database.reviews.put({ id: 'week:2026-09-21', kind: 'week', periodStart: '2026-09-21', worked: 'Mornings', didnt: 'Evenings', changes: 'Start earlier' });
  await database.weekPicks.put({ weekStart: '2026-09-21', projectId: 'w-c-ring-buffer', pickedAt: '2026-09-21' });
  await database.meta.put({ key: 'onboarded', value: true });
  await database.secrets.put({ id: 'github', token: 'ghp_secret_do_not_export' });
}

describe('backup', () => {
  it('restores export → reset → import to byte-for-byte the same state', async () => {
    await populate();
    const first = serialiseBackup(await createBackup(new Date('2026-09-21T12:00:00Z'), database));

    await resetAll(database);
    expect(await database.dayLogs.count()).toBe(0);
    expect(await database.itemStates.count()).toBe(0);

    const result = await importBackup(first, database);
    expect(result.ok).toBe(true);

    const second = serialiseBackup(await createBackup(new Date('2026-09-21T12:00:00Z'), database));
    expect(second).toBe(first);
  });

  it('writes canonical JSON, so the order fields were written in does not matter', async () => {
    await database.dayLogs.put({ date: '2026-09-21', entries: [{ minutes: 60, block: 'A', track: 'gamedev' }], energy: 3 });
    const a = serialiseBackup(await createBackup(new Date(0), database));
    await database.dayLogs.clear();
    await database.dayLogs.put({ energy: 3, entries: [{ track: 'gamedev', block: 'A', minutes: 60 }], date: '2026-09-21' });
    const b = serialiseBackup(await createBackup(new Date(0), database));
    expect(b).toBe(a);
    expect(canonical({ b: 1, a: { d: 1, c: undefined, b: 2 } })).toEqual({ a: { b: 2, d: 1 }, b: 1 });
  });

  it('never exports the GitHub token, and an import or reset leaves it alone', async () => {
    await populate();
    const text = serialiseBackup(await createBackup(new Date(), database));
    expect(text).not.toContain('ghp_secret_do_not_export');
    expect(text).not.toContain('secrets');

    await resetAll(database);
    expect((await database.secrets.get('github'))?.token).toBe('ghp_secret_do_not_export');
    await importBackup(text, database);
    expect((await database.secrets.get('github'))?.token).toBe('ghp_secret_do_not_export');
  });

  it('rejects a file that is not JSON, not Atlas, from a newer version, or malformed, and changes nothing', async () => {
    await populate();
    const before = serialiseBackup(await createBackup(new Date(0), database));

    for (const [text, message] of [
      ['{ not json', /not a JSON file/],
      ['{"app":"something-else"}', /not an Atlas backup/],
      ['{"app":"atlas","formatVersion":99,"exportedAt":"x","data":{}}', /newer version of Atlas/],
      ['{"app":"atlas","formatVersion":1,"exportedAt":"x","data":{"dayLogs":[{"date":"2026-13-45","entries":[]}]}}', /./],
    ] as const) {
      const result = await importBackup(text, database);
      expect(result.ok, text).toBe(false);
      if (!result.ok) expect(result.errors.join(' '), text).toMatch(message);
    }

    const after = serialiseBackup(await createBackup(new Date(0), database));
    expect(after).toBe(before);
  });

  it('rejects a log entry with an unknown track, and one with a negative duration', () => {
    const bad = (entry: object): string =>
      JSON.stringify({ app: 'atlas', formatVersion: 1, exportedAt: 'x', data: { dayLogs: [{ date: '2026-09-21', entries: [entry] }], itemStates: [], paperStates: [], certStates: [], milestoneStates: [], customEntities: [], overrides: [], reviews: [], weekPicks: [], replans: [], settings: [], meta: [] } });
    expect(parseBackup(bad({ block: 'A', track: 'astrology', minutes: 60 })).ok).toBe(false);
    expect(parseBackup(bad({ block: 'A', track: 'math', minutes: -5 })).ok).toBe(false);
    expect(parseBackup(bad({ block: 'A', track: 'math', minutes: 60 })).ok).toBe(true);
  });

  it('keeps every table in the backup', async () => {
    await populate();
    const data = await collectBackup(database);
    expect(data.dayLogs).toHaveLength(2);
    expect(data.itemStates).toHaveLength(2);
    expect(data.overrides).toHaveLength(1);
    expect(data.customEntities).toHaveLength(1);
    expect(data.reviews).toHaveLength(1);
    expect(data.settings).toHaveLength(1);
  });

  it('records the backup date after the snapshot, for the reminder', async () => {
    await populate();
    await markBackedUp('2026-09-21', database);
    expect((await database.settings.get('app'))!.backup.lastBackupAt).toBe('2026-09-21');
  });
});

describe('the 30-day backup reminder', () => {
  const base = { snoozedUntil: undefined, intervalDays: 30, hasData: true, firstLogDate: '2026-09-21' };

  it('stays quiet with nothing to lose', () => {
    expect(backupDue({ ...base, hasData: false, lastBackupAt: undefined, asOf: '2027-01-01' })).toBe(false);
  });

  it('asks for a first backup once there is a month of history', () => {
    expect(backupDue({ ...base, lastBackupAt: undefined, asOf: '2026-10-10' })).toBe(false);
    expect(backupDue({ ...base, lastBackupAt: undefined, asOf: '2026-10-21' })).toBe(true);
  });

  it('asks again 30 days after the last backup', () => {
    expect(backupDue({ ...base, lastBackupAt: '2026-10-01', asOf: '2026-10-30' })).toBe(false);
    expect(backupDue({ ...base, lastBackupAt: '2026-10-01', asOf: '2026-10-31' })).toBe(true);
  });

  it('respects a snooze', () => {
    expect(backupDue({ ...base, lastBackupAt: '2026-01-01', snoozedUntil: '2026-11-05', asOf: '2026-11-01' })).toBe(false);
    expect(backupDue({ ...base, lastBackupAt: '2026-01-01', snoozedUntil: '2026-11-05', asOf: '2026-11-05' })).toBe(true);
  });
});
