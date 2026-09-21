/**
 * The backup file itself: its canonical form, its name, and how it is read back. Nothing here touches the
 * database, so the Node scripts (`npm run log:export`) read backups with exactly the checks the app uses.
 */
import { BACKUP_FORMAT_VERSION, BackupFileSchema } from './types.ts';
import type { BackupFile } from './types.ts';
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

/** The file's text. Two-space indentation, so a backup committed to git produces readable diffs. */
export function serialiseBackup(file: BackupFile): string {
  return JSON.stringify(canonical(file), null, 2) + '\n';
}

export function backupFileName(date: string = today()): string {
  return 'atlas-backup-' + date + '.json';
}

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
