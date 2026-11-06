/**
 * Today's backup card: everything Atlas knows about the user lives in this browser, so once there is history worth
 * keeping and no copy of it elsewhere (no GitHub Sync, no recent export), Today asks for one: export a backup, set
 * up Sync, or not now (a week). Sooner when the browser has not promised to keep the data (src/lib/storage-guard.ts).
 */
import { useState } from 'react';
import { backupDue, daysSinceBackup } from '../../db/backup.ts';
import { updateSettings } from '../../db/settings.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { useStorageState } from '../../hooks/useStorageState.ts';
import { addDays, today as todayDate } from '../../lib/dates.ts';
import { seed } from '../../seed/index.ts';
import { useSyncView } from '../../sync/status.ts';
import { Button } from '../../ui/Button.tsx';
import { exportBackup } from './backupActions.ts';

export function BackupNudge({ atlas }: { atlas: Atlas }) {
  const sync = useSyncView();
  const { state } = useStorageState();
  const [saved, setSaved] = useState<string | null>(null);
  const date = todayDate();
  const logged = atlas.logs.filter((l) => l.entries.some((e) => e.minutes > 0)).map((l) => l.date).sort();
  const { lastBackupAt, snoozedUntil } = atlas.settings.backup;
  if (!sync || state === undefined) return null;
  const due = backupDue({
    lastBackupAt,
    snoozedUntil,
    intervalDays: atlas.settings.core.backupReminderDays,
    asOf: date,
    hasData: logged.length > 0,
    firstLogDate: logged[0],
    synced: sync.connected,
    storageKept: state === 'kept' ? true : state === 'not-kept' ? false : undefined,
  });
  if (saved) {
    return (
      <section aria-label="Backup" className="tile mt-4 p-[18px]" role="status">
        <p className="text-body font-semibold">{'Saved ' + saved + '.'}</p>
        <p className="text-meta text-ink2">Keep it somewhere that is not this phone: a drive, an email to yourself, a computer.</p>
      </section>
    );
  }
  if (!due) return null;
  const since = daysSinceBackup(lastBackupAt, date);
  return (
    <section aria-labelledby="backup-nudge-title" className="tile well-ice mt-4 flex flex-col gap-1.5 p-[18px]">
      <h2 id="backup-nudge-title" className="text-body font-semibold">
        Keep a copy of your progress
      </h2>
      <p className="text-meta text-ink2">
        {(since === null ? 'Your ' + (logged.length === 1 ? '1 day of history exists' : logged.length + ' days of history exist') + ' only in this browser, with no backup yet.' : 'Your last backup was ' + since + ' days ago.') +
          (state === 'not-kept' ? ' This browser may clear Atlas’s data on its own when the phone runs low on space.' : '') +
          ' Export a backup, or turn on GitHub Sync to keep a copy off the phone.'}
      </p>
      <div className="mt-2 flex flex-wrap gap-2.5">
        <Button icon="arrowDown" onClick={() => void exportBackup().then((name) => setSaved(name))}>
          Export a backup
        </Button>
        <Button to="/settings?section=sync">Set up Sync</Button>
        <Button variant="icon" onClick={() => void updateSettings(seed.settings, (s) => ({ ...s, backup: { ...s.backup, snoozedUntil: addDays(date, 7) } }))}>
          Not now
        </Button>
      </div>
    </section>
  );
}
