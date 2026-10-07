import { backupFileName, createBackup, markBackedUp, serialiseBackup } from '../../db/backup.ts';

/** Writes every table except the GitHub token to atlas-backup-YYYY-MM-DD.json, then records the date. */
export async function exportBackup(): Promise<string> {
  const text = serialiseBackup(await createBackup());
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFileName();
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  await markBackedUp();
  return backupFileName();
}
