/**
 * Everything Atlas stores about the user. Seed data is never copied into the database:
 * these records only reference seed ids, so editing /data and rebuilding cannot lose them.
 *
 * DayLog and UserItemState are supersets of the interfaces in seed/model.ts. DayLog stays a
 * flat, self-describing JSON document so that another app ("Horizon") can read an export.
 */
import { z } from 'zod';
import { BlockIdSchema, ClockTime, DayTemplateSchema, GoalSchema, HttpUrl, IsoDate, PlanItemSchema, Slug, StoredCoreSchema, Text, TrackIdSchema } from '../seed/schema.ts';
import type { SettingsDefaults } from '../seed/schema.ts';

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

/**
 * GitHub Sync (brief 4.10): every record carries when it last changed (ISO, this device's clock) and on which
 * device, for the merge rules. Optional, so records and backups from before Sync stay valid.
 */
const Stamp = {
  updatedAt: z.string().optional(),
  deviceId: z.string().optional(),
};

export const DayLogEntrySchema = z.strictObject({
  block: BlockIdSchema,
  track: TrackIdSchema,
  refId: z.string().min(1).optional(),
  minutes: z.number().int().min(0).max(1440),
  note: z.string().optional(),
  /** Set when the entry was created by a block's "done" toggle rather than a timer or typed minutes. */
  auto: z.boolean().optional(),
  /** Stable within the day, so two devices' edits to the same day merge entry by entry. */
  id: z.string().min(1).optional(),
  ...Stamp,
});
export type DayLogEntry = z.infer<typeof DayLogEntrySchema>;

/** An entry removed from a day: kept so another device's copy of it is not merged back in. */
export const RemovedEntrySchema = z.strictObject({ id: z.string().min(1), at: z.string(), deviceId: z.string().optional() });
export type RemovedEntry = z.infer<typeof RemovedEntrySchema>;

/** The day-level fields, each merged on its own: a reflection written on one device survives a timer on another. */
export const DAY_FIELDS = ['reflection', 'energy', 'frozen', 'frozenAuto', 'doneBlocks'] as const;
export type DayField = (typeof DAY_FIELDS)[number];

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
  /** Entries removed from this day, for the merge. */
  removed: z.array(RemovedEntrySchema).optional(),
  /** When each day-level field last changed. */
  fieldsAt: z.partialRecord(z.enum(DAY_FIELDS), z.string()).optional(),
  ...Stamp,
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
  /** "I own this" on a paid book (ATLAS-LIBRARY, 15,364 rows): then it may be suggested like a free one. */
  owned: z.boolean().optional(),
  ...Stamp,
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
  ...Stamp,
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
  ...Stamp,
});
export type CertState = z.infer<typeof CertStateSchema>;

export const MilestoneStateSchema = z.strictObject({
  refId: z.string().min(1),
  status: z.enum(MILESTONE_STATUSES),
  url: OptionalUrl,
  notes: z.string().optional(),
  ...Stamp,
});
export type MilestoneState = z.infer<typeof MilestoneStateSchema>;

/** A resource, project, paper, cert or plan item the user added. `data` is validated with the seed schema of its kind. */
export const CustomEntitySchema = z.strictObject({
  kind: z.enum(ENTITY_KINDS),
  id: Slug,
  data: z.record(z.string(), z.unknown()),
  createdAt: IsoDate,
  ...Stamp,
});
export type CustomEntity = z.infer<typeof CustomEntitySchema>;

/** The user's edits to a seed entity, stored as a patch so that seed updates still flow through. */
export const OverrideSchema = z.strictObject({
  kind: z.enum(ENTITY_KINDS),
  id: z.string().min(1),
  patch: z.record(z.string(), z.unknown()),
  /** Plan items only: taken off the roadmap. Nothing else can be removed; resources and projects are "dropped" instead. */
  removed: z.boolean().optional(),
  ...Stamp,
});
export type Override = z.infer<typeof OverrideSchema>;

/** Minutes per block. Reviews written before blocks were open-ended have exactly A to E. */
/* ------------------------------------------------------------------ plan edits */

const PatchBase = {
  id: z.string().min(1),
  /** When the edit was made (ISO); patches apply in this order, then by id. */
  at: z.string().min(1),
  /** One user action: the unit of undo. A re-plan or a reorder is several patches in one group. */
  group: z.string().min(1),
  /** What the toast and the undo list say: "Moved CS231n to Year 2". */
  label: z.string().optional(),
  ...Stamp,
};

const PhaseEdit = {
  title: Text.optional(),
  start: IsoDate.optional(),
  end: IsoDate.optional(),
  goal: Text.optional(),
  /** A lane's focus text, by block. */
  focus: z.record(BlockIdSchema, Text).optional(),
};

/**
 * One edit to the plan, applied over the curriculum in order (src/lib/plan.ts). The curriculum itself is never
 * changed, so an update to /data still flows in and the edits survive it.
 */
export const PlanPatchSchema = z.discriminatedUnion('op', [
  /** A new appearance of a resource or project in a lane. */
  z.strictObject({ ...PatchBase, op: z.literal('add'), item: PlanItemSchema }),
  /** Taken off the plan, shown under "Dropped" with Restore. */
  z.strictObject({ ...PatchBase, op: z.literal('drop'), planItemId: z.string().min(1) }),
  z.strictObject({ ...PatchBase, op: z.literal('restore'), planItemId: z.string().min(1) }),
  /** A new position, and optionally another phase or lane. */
  z.strictObject({ ...PatchBase, op: z.literal('move'), planItemId: z.string().min(1), phaseId: Slug.optional(), block: BlockIdSchema.optional(), order: z.number() }),
  /** The same place in the plan, another resource or project (an alternative). */
  z.strictObject({ ...PatchBase, op: z.literal('swap'), planItemId: z.string().min(1), resourceId: Slug.optional(), projectId: Slug.optional() }),
  z.strictObject({ ...PatchBase, op: z.literal('editPhase'), phaseId: Slug, ...PhaseEdit }),
  /** A phase of the user's, after another one. */
  z.strictObject({
    ...PatchBase,
    op: z.literal('addPhase'),
    after: Slug,
    phase: z.strictObject({ id: Slug, title: Text, start: IsoDate, end: IsoDate, goal: Text, focus: z.record(BlockIdSchema, Text).optional() }),
  }),
  /** A track of the user's (resources, projects and papers of the user's live with customEntities). */
  z.strictObject({ ...PatchBase, op: z.literal('custom'), kind: z.literal('track'), data: z.record(z.string(), z.unknown()), remove: z.boolean().optional() }),
  z.strictObject({ ...PatchBase, op: z.literal('goal'), goal: GoalSchema, remove: z.boolean().optional() }),
]);
export type PlanPatch = z.infer<typeof PlanPatchSchema>;
export type PlanPatchOp = PlanPatch['op'];
/** A patch before it is stored: id, time and group are added by addPlanEdit. */
export type NewPlanPatch = PlanPatch extends infer P ? (P extends PlanPatch ? Omit<P, 'id' | 'at' | 'group' | 'label' | 'updatedAt' | 'deviceId'> : never) : never;

/* ------------------------------------------------------------------ practice (archived) */

/**
 * One answered practice question, as the Practice feature stored them until it was removed (pull request #6). The
 * answers are archived: they stay in their table on the device and travel in backups as they are, and the app no
 * longer reads or writes them. The schema stays so that those backups still parse.
 */
export const PracticeAnswerSchema = z.strictObject({
  /** "<set>|<question id>": a question is answered once per set. */
  id: z.string().min(1),
  questionId: Slug,
  subject: Slug,
  topic: Slug,
  /** The day it was answered. */
  date: IsoDate,
  /** "daily:2026-10-16" for a day's set, "topic:<subject>/<topic>:<started at>" for practice on demand. */
  set: z.string().min(1),
  /** Whether it came up as new or as a review. */
  role: z.enum(['new', 'review']),
  /** right, wrong, or partly (a proof marked "partly", or a multipart question with some parts right). */
  result: z.enum(['right', 'wrong', 'partial']),
  /** The solution was shown before an answer was checked: it counts as wrong. */
  revealed: z.boolean().optional(),
  /** A chained part was right only given the user's own earlier part. */
  followed: z.boolean().optional(),
  hints: z.number().int().min(0).max(3),
  seconds: z.number().int().min(0),
  difficulty: z.number().int().min(1).max(5),
  ...Stamp,
});
export type PracticeAnswer = z.infer<typeof PracticeAnswerSchema>;

/* ------------------------------------------------------------------ catalogue challenges */

/**
 * One thing done with a catalogue challenge: solved (in a language), skipped as the day's pick, or hidden for the
 * day ("Not today"). Append-only: the daily pick, the cycles through the pool and the
 * daily-challenge streak are worked out from it (src/lib/catalogue/daily.ts), so two devices' logs merge by id.
 */
export const ChallengeEventSchema = z.strictObject({
  /** "<date>|<event>|<challenge id>|<n>". */
  id: z.string().min(1),
  challengeId: Slug,
  date: IsoDate,
  event: z.enum(['solved', 'skipped', 'hidden']),
  /** The language it was solved in. */
  language: z.string().trim().min(1).max(40).optional(),
  /** Whether it was the day's pick (Block B) rather than one opened from the Deck or the Library. */
  daily: z.boolean().optional(),
  ...Stamp,
});
export type ChallengeEvent = z.infer<typeof ChallengeEventSchema>;

/* ------------------------------------------------------------------ the daily blog post */

/**
 * Whether the day's blog post was written (DAILY-BLOG): the post itself lives in the user's own blog, written through
 * Pages CMS; Atlas keeps only this, as blog/<date>.json. "I posted it" sets `posted`, Undo clears it (the record stays,
 * so the undo reaches the other devices too). `auto` marks a day found by "Detect my post automatically".
 */
export const BlogPostSchema = z.strictObject({
  date: IsoDate,
  posted: z.boolean(),
  /** When it was marked (ISO time). */
  at: z.string(),
  /** Whether "Open my blog" was used that day before it was marked. */
  editorLinkUsed: z.boolean().optional(),
  auto: z.boolean().optional(),
  ...Stamp,
});
export type BlogPost = z.infer<typeof BlogPostSchema>;

/* ------------------------------------------------------------------ the sleep log */

/** A local wall-clock time, "2026-10-17T23:00" (Asia/Tashkent: no daylight saving). */
const LocalTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

/**
 * One night of sleep (SLEEP-LOG), entered by hand: synced as sleep/<date>.json. `date` is the wake-up date, so last
 * night shows on today; `minutes` is wake minus bed, across midnight. One per date: an edit replaces it.
 */
export const SleepNightSchema = z.strictObject({
  date: IsoDate,
  bed: LocalTime,
  wake: LocalTime,
  minutes: z.number().int().positive(),
  ...Stamp,
});
export type SleepNight = z.infer<typeof SleepNightSchema>;

const MinutesByBlock = z.record(BlockIdSchema, z.number());

export const ReviewSchema = z.strictObject({
  /** "week:2026-09-21" (the week's first day), "month:2026-09" or "quarter:2027-Q3". */
  id: z.string().regex(/^(week:\d{4}-\d{2}-\d{2}|month:\d{4}-\d{2}|quarter:\d{4}-Q[1-4])$/),
  kind: z.enum(['week', 'month', 'quarter']),
  periodStart: IsoDate,
  completedAt: IsoDate.optional(),
  worked: z.string().optional(),
  didnt: z.string().optional(),
  changes: z.string().optional(),
  /** Quarterly review: the research question of the quarter, and the link to its two-page report in research/. */
  question: z.string().optional(),
  reportUrl: OptionalUrl,
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
  ...Stamp,
});
export type Review = z.infer<typeof ReviewSchema>;

export const WeekPickSchema = z.strictObject({
  /** First day of the week (Settings > week starts on). */
  weekStart: IsoDate,
  projectId: z.string().min(1),
  pickedAt: IsoDate,
  ...Stamp,
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
  ...Stamp,
});
export type ReplanRecord = z.infer<typeof ReplanRecordSchema>;

/* ------------------------------------------------------------------ settings, version 2 */

/** One date's changes, from Today's "Change today" sheet. History is never rewritten by them: they name a date. */
export const DayChangeSchema = z.strictObject({
  /** Another template for this day. */
  template: Slug.optional(),
  /** A rest day: nothing planned, and the streak is safe. */
  rest: z.boolean().optional(),
  /** Minutes for single blocks on this day. */
  minutes: z.record(BlockIdSchema, z.number().int().min(0).max(720)).optional(),
  /** Blocks left out of this day only. */
  skip: z.array(BlockIdSchema).optional(),
  /** Blocks moved to the next day, minutes and all. */
  toTomorrow: z.array(BlockIdSchema).optional(),
  /** Pairs of blocks that trade items on this day. */
  swaps: z.array(z.tuple([BlockIdSchema, BlockIdSchema])).optional(),
  /** Calendar: blocks moved to a clock time on this day. */
  times: z.record(BlockIdSchema, ClockTime).optional(),
  /** Calendar: the item a block works on this day, instead of the lane's next one. */
  items: z.record(BlockIdSchema, z.string().min(1)).optional(),
  /** Calendar: blocks added to this day (from an empty slot, or moved here from another date). */
  add: z.array(z.strictObject({ block: BlockIdSchema, minutes: z.number().int().min(5).max(720), start: ClockTime.optional() })).optional(),
});
export type DayChange = z.infer<typeof DayChangeSchema>;

/** A fixed commitment from Calendar (a class, work): once on a date, or every week on a weekday from a date. */
export const BusyEventSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(80),
  start: ClockTime,
  minutes: z.number().int().min(15).max(720),
  date: IsoDate.optional(),
  weekday: z.number().int().min(0).max(6).optional(),
  from: IsoDate.optional(),
  until: IsoDate.optional(),
});
export type BusyEvent = z.infer<typeof BusyEventSchema>;

/** "Exam week 12–19 Dec": a template for a date or a range. Beats the weekly pattern. */
export const DateOverrideSchema = z.strictObject({
  id: z.string().min(1),
  from: IsoDate,
  to: IsoDate,
  template: Slug,
  label: z.string().optional(),
});
export type DateOverride = z.infer<typeof DateOverrideSchema>;

/**
 * The templates, weekly pattern and block minutes as they were before an edit, kept so that days already past
 * keep the plan they had: a schedule change never rewrites history.
 */
export const ScheduleVersionSchema = z.strictObject({
  /** The last day this version applied to. */
  until: IsoDate,
  templates: z.array(DayTemplateSchema),
  pattern: z.array(Slug).length(7),
  blocks: z.array(z.strictObject({ id: BlockIdSchema, minutes: z.number().int().min(0), days: z.array(z.number().int().min(0).max(6)) })),
});
export type ScheduleVersion = z.infer<typeof ScheduleVersionSchema>;

export const LANE_PACES = ['normal', 'relaxed', 'intense', 'custom'] as const;
export type LanePaceMode = (typeof LANE_PACES)[number];
/** relaxed is 25 % less than the template, intense 25 % more; custom is fixed minutes on every day the lane runs. */
export const LanePaceSchema = z.strictObject({
  mode: z.enum(LANE_PACES),
  minutes: z.number().int().min(0).max(720).optional(),
  /** The day the pace was set: earlier days keep the plan they had. */
  from: IsoDate.optional(),
});
export type LanePace = z.infer<typeof LanePaceSchema>;

/** A lane paused from a date, until another or until resumed; its minutes go to another lane, or free time. */
export const PauseSchema = z.strictObject({
  id: z.string().min(1),
  block: BlockIdSchema,
  from: IsoDate,
  /** Null: until resumed. */
  until: IsoDate.nullable(),
  /** Where the minutes go: a block, or "free" for free time. */
  to: z.union([BlockIdSchema, z.literal('free')]),
});
export type Pause = z.infer<typeof PauseSchema>;

export const TAB_IDS = ['today', 'plan', 'calendar', 'library', 'activity', 'projects', 'map', 'reviews'] as const;
export type TabId = (typeof TAB_IDS)[number];
export const PLAN_SEGMENTS = ['timeline', 'projects', 'papers', 'credentials', 'roadmaps'] as const;

export const LayoutSchema = z.strictObject({
  today: z.strictObject({
    stats: z.boolean(),
    later: z.boolean(),
    review: z.boolean(),
    footer: z.boolean(),
    /** compact: titles only in Later today; detailed: titles, meta and a progress line. */
    view: z.enum(['detailed', 'compact']),
    /** What "Now" picks: the first unfinished block, or the first unfinished one in `order`. */
    now: z.enum(['first', 'order']),
    order: z.array(BlockIdSchema),
  }),
  /** 3 to 5 tabs; Today is always first. */
  tabs: z.array(z.enum(TAB_IDS)).min(3).max(5),
  plan: z.strictObject({ segment: z.enum(PLAN_SEGMENTS), showDropped: z.boolean() }),
  general: z.strictObject({ clock: z.enum(['24', '12']), density: z.enum(['comfortable', 'compact']) }),
});
export type Layout = z.infer<typeof LayoutSchema>;

export const ScheduleStateSchema = z.strictObject({
  overrides: z.array(DateOverrideSchema),
  days: z.record(IsoDate, DayChangeSchema),
  history: z.array(ScheduleVersionSchema),
  /** Calendar's busy events. Optional so that version 2 schedules parse; version 3 always has it. */
  busy: z.array(BusyEventSchema).optional(),
});
export type ScheduleState = z.infer<typeof ScheduleStateSchema>;

export const SETTINGS_VERSION = 3;

/**
 * Settings as stored: in IndexedDB, in a backup and in state/settings.json. Version 1 (before the flexibility
 * brief) has none of the schedule, pace or layout fields and a core without templates; version 2 (before Calendar)
 * has no busy events, block start times or calendar fields on a day. Both still parse, and `upgradeSettings`
 * (src/lib/settings.ts) brings them to version 3 when they are read.
 */
export const StoredSettingsSchema = z.strictObject({
  id: z.literal('app'),
  version: z.union([z.literal(2), z.literal(SETTINGS_VERSION)]).optional(),
  /** Same shape as data/settings.yaml: blocks, templates, review day, heatmap thresholds, streak rules… */
  core: StoredCoreSchema,
  theme: z.enum(THEMES),
  github: z.strictObject({ username: z.string(), showCalendar: z.boolean() }),
  backup: z.strictObject({ lastBackupAt: IsoDate.optional(), snoozedUntil: IsoDate.optional() }),
  schedule: ScheduleStateSchema.optional(),
  pace: z.record(BlockIdSchema, LanePaceSchema).optional(),
  pauses: z.array(PauseSchema).optional(),
  /** Opt-in catch-up per lane: at most this many extra minutes a day until the lane is no longer behind. */
  catchUp: z.record(BlockIdSchema, z.strictObject({ capMinutes: z.number().int().min(5).max(240) })).optional(),
  layout: LayoutSchema.optional(),
  ...Stamp,
});
/** What the parsers accept: version 1, 2 or 3. */
export type StoredSettingsInput = z.infer<typeof StoredSettingsSchema>;

/** Settings as the app uses them: always version 3, every field present. */
export interface StoredSettings extends Omit<StoredSettingsInput, 'version' | 'core' | 'schedule' | 'pace' | 'pauses' | 'catchUp' | 'layout'> {
  version: typeof SETTINGS_VERSION;
  core: SettingsDefaults;
  schedule: ScheduleState & { busy: BusyEvent[] };
  pace: Record<string, LanePace>;
  pauses: Pause[];
  catchUp: Record<string, { capMinutes: number }>;
  layout: Layout;
}

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

/**
 * GitHub Sync, local-only like the token: never exported, never in the data repository.
 *
 * `config`: which repository, and who the commits are authored as. `cache`: the sha of every file as this
 * device last saw it on GitHub, which is how a pull knows what changed and a push knows whether another device
 * wrote first. `status`: what Settings and Today show.
 */
export interface SyncConfig {
  id: 'config';
  owner: string;
  repo: string;
  branch: string;
  authorName: string;
  authorEmail: string;
  /** From GitHub's token-expiration header, for the renewal reminder. ISO date or undefined. */
  tokenExpiresAt?: string;
  /** False when GitHub says the repository is public: Settings warns. */
  private: boolean;
}

export interface SyncCache {
  id: 'cache';
  /** The commit this device last pushed or pulled, and its tree. */
  headSha?: string;
  treeSha?: string;
  /** Path to blob sha, as of headSha. */
  files: Record<string, string>;
}

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'unauthorized' | 'rate-limited' | 'error';

export interface SyncStatus {
  id: 'status';
  phase: SyncPhase;
  /** Epoch milliseconds of the last successful sync. */
  lastSyncAt?: number;
  /** When a rate limit lifts, epoch milliseconds. */
  retryAt?: number;
  message?: string;
  /** Files in the data repository that could not be read, by path, with why. */
  problems?: Record<string, string>;
}

export type SyncRow = SyncConfig | SyncCache | SyncStatus | { id: 'device'; deviceId: string };

/** A file waiting to be pushed. Its content is rendered when the flush runs, so many edits make one blob. */
export interface OutboxEntry {
  path: string;
  /** Epoch milliseconds of the first change since the last push. */
  queuedAt: number;
  /** What changed, for the commit message: "mark 18.06 lecture 9 done". */
  summary?: string;
  /** Bumped on every change, so a flush clears only the entries that did not change again while it ran. */
  seq: number;
}

/** The running timer, stored under meta key "timer" so that it survives a reload. */
export const TimerSchema = z.strictObject({
  block: BlockIdSchema,
  track: TrackIdSchema,
  refId: z.string().optional(),
  startedAt: z.number(),
  /** When "Keep" last answered the forgotten-timer question. */
  keptAt: z.number().optional(),
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
  /** Plan edits (flexibility brief). Absent from backups made before it. */
  planPatches: z.array(PlanPatchSchema).default([]),
  /** Practice answers (archived since pull request #6, kept as they are). Absent from backups made before the practice brief. */
  practice: z.array(PracticeAnswerSchema).default([]),
  /** Catalogue challenges solved, skipped or hidden (catalogue brief). Absent from backups made before it. */
  challenges: z.array(ChallengeEventSchema).default([]),
  /** Days the blog post was written (daily blog brief). Absent from backups made before it. */
  blogPosts: z.array(BlogPostSchema).default([]),
  /** Nights of sleep (sleep log brief). Absent from backups made before it. */
  sleep: z.array(SleepNightSchema).default([]),
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

