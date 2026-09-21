/**
 * Export, import and reset: everything the user owns, as one JSON file.
 *
 * Three properties matter, and each is tested:
 *   - Export → reset → import restores the same state, byte for byte. Rows are written in canonical form
 *     (keys sorted, tables in a fixed order, rows by primary key), so the file does not depend on the order in
 *     which the app happened to write fields.
 *   - A file is validated in full before anything is touched. A bad file changes nothing.
 *   - The GitHub token never leaves the browser: it lives in a table that is neither exported nor cleared by
 *     an import, so a backup committed to a public repository cannot leak it.
 */
import { db, EXPORTED_TABLES } from './db.ts';
import type { AtlasDB, ExportedTable } from './db.ts';
import { BACKUP_FORMAT_VERSION, BackupFileSchema } from './types.ts';
import type { BackupData, BackupFile } from './types.ts';
import { today } from '../lib/dates.ts';

/** Recursively sorts object keys so that equal data always serialises to identical bytes. */
export function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = canonical(v);
    }
    return out;
  }
  return value;
}

export async function collectBackup(database: AtlasDB = db): Promise<BackupData> {
  const data = {} as Record<ExportedTable, unknown[]>;
  await database.transaction('r', EXPORTED_TABLES.map((t) => database.table(t)), async () => {
    for (const table of EXPORTED_TABLES) {
      // toArray() returns rows in primary-key order, which is what makes the file deterministic.
      data[table] = (await database.table(table).toArray()).map(canonical);
    }
  });
  return data as BackupData;
}

export async function createBackup(now: Date = new Date(), database: AtlasDB = db): Promise<BackupFile> {
  return { app: 'atlas', formatVersion: BACKUP_FORMAT_VERSION, exportedAt: now.toISOString(), data: await collectBackup(database) };
}

/** The file's text. Two-space indentation, so a backup committed to git produces readable diffs. */
export function serialiseBackup(file: BackupFile): string {
  return JSON.stringify(canonical(file), null, 2) + '\n';
}

export function backupFileName(date: string = today()): string {
  return 'atlas-backup-' + date + '.json';
}

/** Records that a backup was taken, for the 30-day reminder. Done after the snapshot, so it is not in it. */
export async function markBackedUp(date: string = today(), database: AtlasDB = db): Promise<void> {
  const current = await database.settings.get('app');
  if (!current) return; // no settings row yet: the reminder starts counting when there is one
  await database.settings.put({ ...current, backup: { ...current.backup, lastBackupAt: date } });
}

export type ImportResult = { ok: true; counts: Record<ExportedTable, number> } | { ok: false; errors: string[] };

/** Parses and validates a backup file's text without touching the database. */
export function parseBackup(text: string): { ok: true; file: BackupFile } | { ok: false; errors: string[] } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    return { ok: false, errors: ['This is not a JSON file (' + (err instanceof Error ? err.message : String(err)) + ').'] };
  }
  if (json && typeof json === 'object' && (json as { app?: unknown }).app !== 'atlas') {
    return { ok: false, errors: ['This JSON file is not an Atlas backup.'] };
  }
  const version = (json as { formatVersion?: unknown }).formatVersion;
  if (typeof version === 'number' && version > BACKUP_FORMAT_VERSION) {
    return { ok: false, errors: ['This backup was made by a newer version of Atlas (format ' + version + '). Update the app, then import it.'] };
  }
  const parsed = BackupFileSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.slice(0, 8).map((issue) => (issue.path.length ? issue.path.join('.') + ': ' : '') + issue.message),
    };
  }
  return { ok: true, file: parsed.data };
}

/** Replaces all user state with the backup's, in one transaction. Nothing changes if any part fails. */
export async function restoreBackup(file: BackupFile, database: AtlasDB = db): Promise<Record<ExportedTable, number>> {
  const counts = {} as Record<ExportedTable, number>;
  await database.transaction('rw', EXPORTED_TABLES.map((t) => database.table(t)), async () => {
    for (const table of EXPORTED_TABLES) {
      await database.table(table).clear();
      const rows = file.data[table];
      if (rows.length > 0) await database.table(table).bulkPut(rows);
      counts[table] = rows.length;
    }
  });
  return counts;
}

export async function importBackup(text: string, database: AtlasDB = db): Promise<ImportResult> {
  const parsed = parseBackup(text);
  if (!parsed.ok) return parsed;
  try {
    return { ok: true, counts: await restoreBackup(parsed.file, database) };
  } catch (err) {
    return { ok: false, errors: ['The import failed and nothing was changed: ' + (err instanceof Error ? err.message : String(err))] };
  }
}

/** Deletes every log, status, note and edit. The curriculum is untouched, and so is the GitHub token. */
export async function resetAll(database: AtlasDB = db): Promise<void> {
  await database.transaction('rw', EXPORTED_TABLES.map((t) => database.table(t)), async () => {
    for (const table of EXPORTED_TABLES) await database.table(table).clear();
  });
}

/** How many days since the last backup, or null if there has never been one. */
export function daysSinceBackup(lastBackupAt: string | undefined, asOf: string): number | null {
  if (!lastBackupAt) return null;
  const a = new Date(lastBackupAt + 'T00:00:00');
  const b = new Date(asOf + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Whether to show the backup reminder: never backed up with data worth keeping, or older than the interval. */
export function backupDue(opts: {
  lastBackupAt: string | undefined;
  snoozedUntil: string | undefined;
  intervalDays: number;
  asOf: string;
  hasData: boolean;
  firstLogDate: string | undefined;
}): boolean {
  if (!opts.hasData) return false;
  if (opts.snoozedUntil && opts.asOf < opts.snoozedUntil) return false;
  const since = daysSinceBackup(opts.lastBackupAt, opts.asOf);
  if (since === null) {
    // Never backed up: ask once there is a month of history to lose.
    const firstLog = opts.firstLogDate ? daysSinceBackup(opts.firstLogDate, opts.asOf) : null;
    return firstLog !== null && firstLog >= opts.intervalDays;
  }
  return since >= opts.intervalDays;
}
