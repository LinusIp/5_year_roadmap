import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Icon } from './Icon.tsx';
import { backupDue, backupFileName, createBackup, markBackedUp, serialiseBackup } from '../db/backup.ts';
import { db } from '../db/db.ts';
import { updateSettings, useSettings } from '../db/settings.ts';
import { addDays, today } from '../lib/dates.ts';
import { onUpdateReady, applyUpdate } from '../pwa/register.ts';
import { seed } from '../seed/index.ts';

/** Every N days (Settings), a nudge to export: the logs live only in this browser. */
export function BackupReminder() {
  const settings = useSettings(seed.settings);
  const firstLog = useLiveQuery(async () => (await db.dayLogs.orderBy('date').first())?.date ?? null, []);
  const asOf = today();
  if (!settings || firstLog === undefined) return null;

  const due = backupDue({
    lastBackupAt: settings.backup.lastBackupAt,
    snoozedUntil: settings.backup.snoozedUntil,
    intervalDays: settings.core.backupReminderDays,
    asOf,
    hasData: firstLog !== null,
    firstLogDate: firstLog ?? undefined,
  });
  if (!due) return null;

  const exportNow = async (): Promise<void> => {
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
  };

  return (
    <div role="region" aria-label="Backup reminder" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
      <Icon name="download" size={16} className="text-warning-text" />
      <p className="min-w-0 flex-1">
        {settings.backup.lastBackupAt ? 'Your last backup was on ' + settings.backup.lastBackupAt + '.' : 'You have never backed up.'} Everything you log lives
        only in this browser.
      </p>
      <div className="flex gap-1.5">
        <button type="button" className="btn btn-sm btn-primary" onClick={() => void exportNow()}>
          Export now
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => void updateSettings(seed.settings, (s) => ({ ...s, backup: { ...s.backup, snoozedUntil: addDays(asOf, 7) } }))}
        >
          In a week
        </button>
      </div>
    </div>
  );
}

/** Shown when a new version has been downloaded in the background and is waiting to take over. */
export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  useEffect(() => onUpdateReady(() => setReady(true)), []);
  if (!ready) return null;
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-accent/50 bg-accent-wash px-4 py-3 text-sm">
      <Icon name="refresh" size={16} className="text-accent-text" />
      <p className="min-w-0 flex-1">A new version of Atlas is ready. Your data stays as it is.</p>
      <button type="button" className="btn btn-sm btn-primary" onClick={applyUpdate}>
        Reload
      </button>
    </div>
  );
}
