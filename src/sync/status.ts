/**
 * What the UI says about Sync (brief 4.10): one phrase in Settings ("Synced 2 min ago", "Syncing", "Offline, 3
 * changes waiting", "Token invalid — reconnect"), and on Today a quiet line only when changes are stuck. No
 * banners.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.ts';
import type { SyncConfig, SyncStatus } from '../db/types.ts';
import { daysBetween, today } from '../lib/dates.ts';

export interface SyncView {
  connected: boolean;
  config: SyncConfig | undefined;
  status: SyncStatus;
  waiting: number;
  /** Epoch milliseconds of the oldest change waiting, if any. */
  oldestWaiting: number | undefined;
  /** A token is stored without a repository: the calendar-only setup from before Sync. */
  calendarOnly: boolean;
}

export function useSyncView(): SyncView | undefined {
  return useLiveQuery(async () => {
    const [config, status, outbox, secret] = await Promise.all([db.sync.get('config'), db.sync.get('status'), db.outbox.toArray(), db.secrets.get('github')]);
    const cfg = config as SyncConfig | undefined;
    return {
      connected: Boolean(cfg && secret),
      config: cfg,
      status: (status as SyncStatus | undefined) ?? { id: 'status', phase: 'idle' },
      waiting: outbox.length,
      oldestWaiting: outbox.length ? Math.min(...outbox.map((e) => e.queuedAt)) : undefined,
      calendarOnly: Boolean(secret && !cfg),
    };
  }, []);
}

function plural(n: number, word: string): string {
  return n + ' ' + word + (n === 1 ? '' : 's');
}

/** "just now", "2 min ago", "3 h ago", "on 8 Oct". */
export function ago(then: number, now: number): string {
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes + ' min ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + ' h ago';
  const d = new Date(then);
  return 'on ' + d.getDate() + ' ' + d.toLocaleString('en-GB', { month: 'short' });
}

export function changesWaiting(n: number): string {
  return plural(n, 'change') + ' waiting';
}

/** The one phrase Settings shows. */
export function statusText(view: SyncView, now: number = Date.now()): string {
  if (!view.connected) return 'Not backed up';
  const { status, waiting } = view;
  switch (status.phase) {
    case 'syncing':
      return 'Syncing';
    case 'offline':
      return waiting ? 'Offline, ' + changesWaiting(waiting) : 'Offline';
    case 'unauthorized':
      return 'Token invalid — reconnect';
    case 'rate-limited':
      return "Waiting for GitHub's rate limit" + (waiting ? ', ' + changesWaiting(waiting) : '');
    case 'error':
      return 'Not synced: ' + (status.message ?? 'something went wrong');
    case 'idle':
      if (!status.lastSyncAt) return waiting ? changesWaiting(waiting) : 'Not synced yet';
      return 'Synced ' + ago(status.lastSyncAt, now) + (waiting ? ', ' + changesWaiting(waiting) : '');
  }
}

/** Today's footer line: only when changes have been waiting a while or cannot go out. */
export function todayLine(view: SyncView | undefined, now: number = Date.now()): string | null {
  if (!view?.connected) return null;
  if (view.status.phase === 'unauthorized') return 'Sync stopped: the GitHub token needs renewing';
  if (view.waiting === 0) return null;
  const stuck = view.status.phase !== 'idle' && view.status.phase !== 'syncing';
  const old = view.oldestWaiting !== undefined && now - view.oldestWaiting > 2 * 60_000;
  return stuck || old ? changesWaiting(view.waiting) + ' to sync' : null;
}

/** Days until the token expires, when known. */
export function tokenDaysLeft(config: SyncConfig | undefined, asOf: string = today()): number | null {
  if (!config?.tokenExpiresAt) return null;
  return daysBetween(asOf, config.tokenExpiresAt);
}
