import { describe, expect, it, vi } from 'vitest';
import { backupDue, FIRST_BACKUP_DAYS_UNKEPT } from '../../src/db/backup.ts';
import { askToKeep, asksSilently, keepStorageOnStart, storageState } from '../../src/lib/storage-guard.ts';

/** Keeping the user's data: the Storage API's persistence, asked for at start-up, and the backup reminder's rules. */
describe('the browser keeping the data', () => {
  it('reads kept, not kept or unknown', async () => {
    expect(await storageState({ persisted: async () => true })).toBe('kept');
    expect(await storageState({ persisted: async () => false })).toBe('not-kept');
    expect(await storageState({})).toBe('unknown');
    expect(await storageState(undefined)).toBe('unknown');
    expect(await storageState({ persisted: async () => { throw new Error('no'); } })).toBe('unknown');
  });

  it('asks once at start-up where the answer needs no prompt, and never when it is kept already', async () => {
    const persist = vi.fn(async () => true);
    expect(await keepStorageOnStart({ persisted: async () => false, persist }, 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36')).toBe('kept');
    expect(persist).toHaveBeenCalledTimes(1);
    const again = vi.fn(async () => true);
    expect(await keepStorageOnStart({ persisted: async () => true, persist: again }, 'Chrome/130.0')).toBe('kept');
    expect(again).not.toHaveBeenCalled();
    // Firefox would show a prompt: start-up leaves it to Settings' button.
    const firefox = vi.fn(async () => true);
    expect(await keepStorageOnStart({ persisted: async () => false, persist: firefox }, 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0')).toBe('not-kept');
    expect(firefox).not.toHaveBeenCalled();
    expect(asksSilently('Firefox/131.0')).toBe(false);
    expect(asksSilently('Chrome/130.0')).toBe(true);
  });

  it('reports a refusal as not kept, and a failing persist() as what the browser says', async () => {
    expect(await askToKeep({ persisted: async () => false, persist: async () => false })).toBe('not-kept');
    expect(await askToKeep({ persisted: async () => false, persist: async () => { throw new Error('no'); } })).toBe('not-kept');
  });
});

describe('the backup reminder with Sync and unprotected storage', () => {
  const base = { lastBackupAt: undefined, snoozedUntil: undefined, intervalDays: 30, hasData: true, firstLogDate: '2026-11-01' };
  it('stays quiet with GitHub Sync connected: the repository is the copy', () => {
    expect(backupDue({ ...base, asOf: '2027-01-01', synced: true })).toBe(false);
  });
  it('asks for a first backup after three days of history when the browser may clear the data, a month otherwise', () => {
    expect(FIRST_BACKUP_DAYS_UNKEPT).toBe(3);
    expect(backupDue({ ...base, asOf: '2026-11-03', storageKept: false })).toBe(false);
    expect(backupDue({ ...base, asOf: '2026-11-04', storageKept: false })).toBe(true);
    expect(backupDue({ ...base, asOf: '2026-11-04', storageKept: true })).toBe(false);
    expect(backupDue({ ...base, asOf: '2026-12-01', storageKept: true })).toBe(true);
  });
});
