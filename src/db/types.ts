/**
 * Everything Atlas stores about the user. Seed data is never copied into the database:
 * these records only reference seed ids, so editing /data and rebuilding cannot lose them.
 *
 * DayLog and UserItemState are supersets of the interfaces in seed/model.ts. DayLog stays a
 * flat, self-describing JSON document so that another app ("Horizon") can read an export.
 */
import { z } from 'zod';
import { BlockIdSchema, HttpUrl, IsoDate, SettingsDefaultsSchema, Slug, TrackIdSchema } from '../seed/schema.ts';

export const ITEM_STATUSES = ['todo', 'active', 'done', 'dropped'] as const;
export const PAPER_STATUSES = ['queued', 'reading', 'read', 'implemented'] as const;
export const CERT_STATUSES = ['investigating', 'planned', 'studying', 'scheduled', 'earned', 'skipped'] as const;
export const MILESTONE_STATUSES = ['todo', 'active', 'done'] as const;
export const ENTITY_KINDS = ['resource', 'project', 'paper', 'cert', 'planItem'] as const;
export const THEMES = ['dark', 'light', 'system'] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type PaperStatus = (typeof PAPER_STATUSES)[number];
export type CertStatus = (typeof CERT_STATUSES)[number];
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];
export type EntityKind = (typeof ENTITY_KINDS)[number];
export type Theme = (typeof THEMES)[number];

const OptionalUrl = z.union([HttpUrl, z.literal('')]).optional();

export const DayLogEntrySchema = z.strictObject({
  block: BlockIdSchema,
  track: TrackIdSchema,
  refId: z.string().min(1).optional(),
  minutes: z.number().int().min(0).max(1440),
  note: z.string().optional(),
  /** Set when the entry was created by a block's "done" toggle rather than a timer or typed minutes. */
  auto: z.boolean().optional(),
});
export type DayLogEntry = z.infer<typeof DayLogEntrySchema>;

export const DayLogSchema = z.strictObject({
  date: IsoDate,
  entries: z.array(DayLogEntrySchema),
  reflection: z.string().optional(),
  energy: z.literal([1, 2, 3, 4, 5]).optional(),
  frozen: z.boolean().optional(),
  /** True when the freeze was spent automatically (Settings > Streak > auto-freeze). */
  frozenAuto: z.boolean().optional(),
  /** Blocks ticked "done" for the day. */
  doneBlocks: z.array(BlockIdSchema).optional(),
});
export type DayLog = z.infer<typeof DayLogSchema>;

export const UserItemStateSchema = z.strictObject({
  refId: z.string().min(1),
  status: z.enum(ITEM_STATUSES),
  unitsDone: z.array(z.string()),
  notes: z.string().optional(),
  repoUrl: OptionalUrl,
  demoUrl: OptionalUrl,
  writeUp: z.string().optional(),
  /** Stage 2 project cards: what was bought and what it cost. */
  partsNotes: z.string().optional(),
  budget: z.string().optional(),
  startedAt: IsoDate.optional(),
  doneAt: IsoDate.optional(),
});
export type UserItemState = z.infer<typeof UserItemStateSchema>;

export const PaperStateSchema = z.strictObject({
  refId: z.string().min(1),
  status: z.enum(PAPER_STATUSES),
  summary: z.string().optional(),
  keyIdea: z.string().optional(),
  tryNext: z.string().optional(),
  notes: z.string().optional(),
  startedAt: IsoDate.optional(),
  readAt: IsoDate.optional(),
});
export type PaperState = z.infer<typeof PaperStateSchema>;

export const CertStateSchema = z.strictObject({
  refId: z.string().min(1),
  status: z.enum(CERT_STATUSES),
  targetQuarter: z.string().regex(/^20[0-9][0-9]-Q[1-4]$/).optional(),
  credentialUrl: OptionalUrl,
  earnedAt: IsoDate.optional(),
  expiresAt: IsoDate.optional(),
  notes: z.string().optional(),
});
export type CertState = z.infer<typeof CertStateSchema>;

export const MilestoneStateSchema = z.strictObject({
  refId: z.string().min(1),
  status: z.enum(MILESTONE_STATUSES),
  url: OptionalUrl,
  notes: z.string().optional(),
});
export type MilestoneState = z.infer<typeof MilestoneStateSchema>;

/** A resource, project, paper, cert or plan item the user added. `data` is validated with the seed schema of its kind. */
export const CustomEntitySchema = z.strictObject({
  kind: z.enum(ENTITY_KINDS),
  id: Slug,
  data: z.record(z.string(), z.unknown()),
  createdAt: IsoDate,
});
export type CustomEntity = z.infer<typeof CustomEntitySchema>;

/** The user's edits to a seed entity, stored as a patch so that seed updates still flow through. */
export const OverrideSchema = z.strictObject({
  kind: z.enum(ENTITY_KINDS),
  id: z.string().min(1),
  patch: z.record(z.string(), z.unknown()),
  /** Plan items only: taken off the roadmap. Nothing else can be removed; resources and projects are "dropped" instead. */
  removed: z.boolean().optional(),
});
export type Override = z.infer<typeof OverrideSchema>;

const MinutesByBlock = z.strictObject({ A: z.number(), B: z.number(), C: z.number(), D: z.number(), E: z.number() });

export const ReviewSchema = z.strictObject({
  /** "week:2026-09-21" (the week's first day) or "month:2026-09". */
  id: z.string().regex(/^(week:\d{4}-\d{2}-\d{2}|month:\d{4}-\d{2})$/),
  kind: z.enum(['week', 'month']),
  periodStart: IsoDate,
  completedAt: IsoDate.optional(),
  worked: z.string().optional(),
  didnt: z.string().optional(),
  changes: z.string().optional(),
  /** Monthly review: was a project shipped this month? Pre-filled from project states, editable. */
  projectShipped: z.boolean().optional(),
  /** The auto-filled numbers as they stood when the review was completed. */
  snapshot: z
    .strictObject({
      totalMinutes: z.number(),
      targetMinutes: z.number(),
      minutesByBlock: MinutesByBlock,
      itemsFinished: z.array(z.string()),
      daysCounted: z.number(),
    })
    .optional(),
});
export type Review = z.infer<typeof ReviewSchema>;

export const WeekPickSchema = z.strictObject({
  /** First day of the week (Settings > week starts on). */
  weekStart: IsoDate,
  projectId: z.string().min(1),
  pickedAt: IsoDate,
});
export type WeekPick = z.infer<typeof WeekPickSchema>;

export const ReplanMoveSchema = z.strictObject({
  planItemId: z.string(),
  refId: z.string(),
  fromPhaseId: z.string(),
  toPhaseId: z.string(),
  fromStart: IsoDate.optional(),
  fromEnd: IsoDate.optional(),
  toStart: IsoDate,
  toEnd: IsoDate,
});
export type ReplanMove = z.infer<typeof ReplanMoveSchema>;

export const ReplanRecordSchema = z.strictObject({
  /** Timestamp the re-plan was applied; also the sort key (the latest record is the active anchor). */
  id: z.string().min(1),
  /** The day the plan was re-anchored to. Unfinished work is laid out from here. */
  date: IsoDate,
  /** Hours still to do on each unfinished plan item at that moment. */
  remaining: z.record(z.string(), z.number()),
  moves: z.array(ReplanMoveSchema),
});
export type ReplanRecord = z.infer<typeof ReplanRecordSchema>;

export const StoredSettingsSchema = z.strictObject({
  id: z.literal('app'),
  /** Same shape as data/settings.yaml: blocks, review day, heatmap thresholds, streak rules… */
  core: SettingsDefaultsSchema,
  theme: z.enum(THEMES),
  github: z.strictObject({ username: z.string(), showCalendar: z.boolean() }),
  backup: z.strictObject({ lastBackupAt: IsoDate.optional(), snoozedUntil: IsoDate.optional() }),
});
export type StoredSettings = z.infer<typeof StoredSettingsSchema>;

export const MetaSchema = z.strictObject({ key: z.string().min(1), value: z.unknown() });
export type Meta = z.infer<typeof MetaSchema>;

/** One day of a GitHub contribution calendar, compact because a year of them is cached: date, count, level 0-4. */
export type ContributionDay = [date: string, count: number, level: 0 | 1 | 2 | 3 | 4];

export interface CachedCalendar {
  /** Epoch milliseconds. */
  fetchedAt: number;
  days: ContributionDay[];
}

/**
 * Local-only: never exported, and left alone by import and reset. The GitHub token lives here and nowhere
 * else, with the calendars fetched with it, which go when the token goes.
 */
export interface Secret {
  id: 'github';
  token: string;
  /** By "from..to", the range the Activity page asked for. */
  calendars?: Record<string, CachedCalendar>;
}

/** The running timer, stored under meta key "timer" so that it survives a reload. */
export const TimerSchema = z.strictObject({
  block: BlockIdSchema,
  track: TrackIdSchema,
  refId: z.string().optional(),
  startedAt: z.number(),
});
export type RunningTimer = z.infer<typeof TimerSchema>;

export const BACKUP_FORMAT_VERSION = 1;

export const BackupDataSchema = z.strictObject({
  dayLogs: z.array(DayLogSchema),
  itemStates: z.array(UserItemStateSchema),
  paperStates: z.array(PaperStateSchema),
  certStates: z.array(CertStateSchema),
  milestoneStates: z.array(MilestoneStateSchema),
  customEntities: z.array(CustomEntitySchema),
  overrides: z.array(OverrideSchema),
  reviews: z.array(ReviewSchema),
  weekPicks: z.array(WeekPickSchema),
  replans: z.array(ReplanRecordSchema),
  settings: z.array(StoredSettingsSchema),
  meta: z.array(MetaSchema),
});
export type BackupData = z.infer<typeof BackupDataSchema>;

export const BackupFileSchema = z.strictObject({
  app: z.literal('atlas'),
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  exportedAt: z.string(),
  data: BackupDataSchema,
});
export type BackupFile = z.infer<typeof BackupFileSchema>;

