/**
 * The IndexedDB database (Dexie). User state only. The curriculum is bundled with the app and
 * never written here, which is what makes "edit the YAML, rebuild, keep every log" true.
 */
import Dexie from 'dexie';
import type { EntityTable, Table } from 'dexie';
import type {
  CertState, CustomEntity, DayLog, EntityKind, Meta, MilestoneState, OutboxEntry, Override, PaperState,
  ReplanRecord, Review, Secret, StoredSettings, SyncRow, UserItemState, WeekPick,
} from './types.ts';
import { newId } from '../sync/device.ts';
import { markSilent, syncMiddleware } from '../sync/middleware.ts';

export class AtlasDB extends Dexie {
  dayLogs!: EntityTable<DayLog, 'date'>;
  itemStates!: EntityTable<UserItemState, 'refId'>;
  paperStates!: EntityTable<PaperState, 'refId'>;
  certStates!: EntityTable<CertState, 'refId'>;
  milestoneStates!: EntityTable<MilestoneState, 'refId'>;
  customEntities!: Table<CustomEntity, [EntityKind, string]>;
  overrides!: Table<Override, [EntityKind, string]>;
  reviews!: EntityTable<Review, 'id'>;
  weekPicks!: EntityTable<WeekPick, 'weekStart'>;
  replans!: EntityTable<ReplanRecord, 'id'>;
  settings!: EntityTable<StoredSettings, 'id'>;
  meta!: EntityTable<Meta, 'key'>;
  secrets!: EntityTable<Secret, 'id'>;
  /** GitHub Sync, local-only: files waiting to be pushed. */
  outbox!: EntityTable<OutboxEntry, 'path'>;
  /** GitHub Sync, local-only: the repository, the file cache, the status and this device's id. */
  sync!: Table<SyncRow, SyncRow['id']>;

  constructor(name = 'atlas') {
    super(name);
    this.version(1).stores({
      dayLogs: 'date',
      itemStates: 'refId, status',
      paperStates: 'refId, status',
      certStates: 'refId',
      milestoneStates: 'refId',
      customEntities: '[kind+id], kind',
      overrides: '[kind+id], kind',
      reviews: 'id, kind, periodStart',
      weekPicks: 'weekStart',
      replans: 'id',
      settings: 'id',
      meta: 'key',
      secrets: 'id',
    });
    // Version 2, GitHub Sync: the outbox and the sync state, and an id on every logged entry so two devices'
    // edits to one day merge entry by entry.
    this.version(2)
      .stores({ outbox: 'path', sync: 'id' })
      .upgrade(async (tx) => {
        markSilent(tx);
        await tx.table<DayLog, string>('dayLogs').toCollection().modify((log) => {
          log.entries = log.entries.map((entry) => (entry.id ? entry : { ...entry, id: newId() }));
        });
      });
    this.use(syncMiddleware(this));
  }
}

/**
 * Tables that make up a backup, in export order. `secrets` is deliberately absent: the GitHub
 * token never leaves this browser, so a backup committed to a public repo cannot leak it.
 */
export const EXPORTED_TABLES = [
  'dayLogs', 'itemStates', 'paperStates', 'certStates', 'milestoneStates', 'customEntities',
  'overrides', 'reviews', 'weekPicks', 'replans', 'settings', 'meta',
] as const;
export type ExportedTable = (typeof EXPORTED_TABLES)[number];

export const db = new AtlasDB();
