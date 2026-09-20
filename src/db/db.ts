/**
 * The IndexedDB database (Dexie). User state only. The curriculum is bundled with the app and
 * never written here, which is what makes "edit the YAML, rebuild, keep every log" true.
 */
import Dexie from 'dexie';
import type { EntityTable, Table } from 'dexie';
import type {
  CertState, CustomEntity, DayLog, EntityKind, Meta, MilestoneState, Override, PaperState,
  ReplanRecord, Review, Secret, StoredSettings, UserItemState, WeekPick,
} from './types.ts';

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
