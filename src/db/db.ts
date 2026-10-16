/**
 * The IndexedDB database (Dexie). User state only. The curriculum is bundled with the app and
 * never written here, which is what makes "edit the YAML, rebuild, keep every log" true.
 */
import Dexie from 'dexie';
import type { EntityTable, Table } from 'dexie';
import type {
  CertState, CustomEntity, DayLog, EntityKind, Meta, MilestoneState, OutboxEntry, Override, PaperState, PlanPatch, PracticeAnswer, ChallengeEvent,
  ReplanRecord, Review, Secret, StoredSettingsInput, SyncRow, UserItemState, WeekPick,
} from './types.ts';
import { legacyPlanPatches } from '../lib/plan.ts';
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
  /** Plan edits as an ordered list of patches over the curriculum (flexibility brief). */
  planPatches!: EntityTable<PlanPatch, 'id'>;
  /** Practice answers, one row per question answered in a set. */
  practice!: EntityTable<PracticeAnswer, 'id'>;
  /** Catalogue challenges solved, skipped or hidden. */
  challenges!: EntityTable<ChallengeEvent, 'id'>;
  /** Version 1 or 2 as stored; read through readSettings, which upgrades. */
  settings!: EntityTable<StoredSettingsInput, 'id'>;
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
    // Version 3, flexibility: plan edits become an ordered list of patches. Plan-item edits stored the old way
    // (a patch per item, a "removed" flag, custom plan items) are converted, so they can be undone and restored.
    this.version(3)
      .stores({ planPatches: 'id, at, group' })
      .upgrade(async (tx) => {
        markSilent(tx);
        const overrides = await tx.table<Override, [EntityKind, string]>('overrides').where('kind').equals('planItem').toArray();
        const customs = await tx.table<CustomEntity, [EntityKind, string]>('customEntities').where('kind').equals('planItem').toArray();
        const patches = legacyPlanPatches(overrides, customs, new Date().toISOString());
        if (patches.length > 0) await tx.table<PlanPatch, string>('planPatches').bulkPut(patches);
        await tx.table('overrides').where('kind').equals('planItem').delete();
        await tx.table('customEntities').where('kind').equals('planItem').delete();
      });
    // Version 4, practice: the answers of the daily sets and of practice on demand.
    this.version(4).stores({ practice: 'id, date, questionId, topic' });
    // Version 5, the project catalogue: what was done with its challenges.
    this.version(5).stores({ challenges: 'id, date, challengeId' });
    this.use(syncMiddleware(this));
  }
}

/**
 * Tables that make up a backup, in export order. `secrets` is deliberately absent: the GitHub
 * token never leaves this browser, so a backup committed to a public repo cannot leak it.
 */
export const EXPORTED_TABLES = [
  'dayLogs', 'itemStates', 'paperStates', 'certStates', 'milestoneStates', 'customEntities',
  'overrides', 'reviews', 'weekPicks', 'replans', 'planPatches', 'practice', 'challenges', 'settings', 'meta',
] as const;
export type ExportedTable = (typeof EXPORTED_TABLES)[number];

export const db = new AtlasDB();
