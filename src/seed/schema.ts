/**
 * Zod schemas for everything under /data. The YAML is the curriculum; these schemas are
 * the only gate between a typo in a YAML file and a broken app, so they are strict:
 * unknown keys are rejected rather than ignored.
 *
 * Every schema here is a superset of the matching interface in `model.ts`.
 */
import { z } from 'zod';

export const TRACK_IDS = [
  'ai', 'swe', 'systems', 'graphics', 'simulation', 'gamedev', 'languages', 'math',
  'physics', 'ee', 'embedded', 'controls', 'mech', 'robotics', 'chem', 'career',
] as const;
/** The lanes of the curriculum (plan.yaml, the phase table): the five of the first plan and H, Hugging Face, added with
 * the fixed daily schedule. The user can add blocks of their own beyond them. */
export const BLOCK_IDS = ['A', 'B', 'C', 'D', 'E', 'H'] as const;
/** `problems` is a problem source (problem sets, judges, exercise collections); `tool` is software or a reference site. */
export const RESOURCE_TYPES = ['course', 'lectures', 'book', 'tutorial', 'article', 'paper', 'repo', 'cert', 'problems', 'tool'] as const;
export const LEVELS = ['intro', 'intermediate', 'advanced'] as const;
export const COSTS = ['free', 'audit-free', 'paid'] as const;
/** The brief's four cadences: a weekly mini-build, a monthly project, research (a reimplementation, a quarterly question, a paper), a yearly capstone. */
export const CADENCES = ['weekly', 'monthly', 'research', 'capstone'] as const;
export const PAPER_GROUPS = ['classics', 'llm', 'systems', 'graphics-sim', 'inference', 'generative'] as const;
export const ROADMAP_IDS = ['inference-engineering', 'ai-engineer', 'ai-agents', 'software-architect', 'game-developer'] as const;

/** A roadmap.sh node an item teaches: "inference-engineering/kv-cache". */
const NodeRef = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must look like roadmap-id/node-id');
export const CERT_MODES = ['committed', 'optional', 'investigate'] as const;

/** One of the sixteen tracks, or a track the user created (`my-…`). */
export type TrackId = (typeof TRACK_IDS)[number] | `my-${string}`;
export type SeedTrackId = (typeof TRACK_IDS)[number];
/** A block's id: A to E by default, any short capitalised id for a block the user adds. */
export type BlockId = string;
export type SeedBlockId = (typeof BLOCK_IDS)[number];
export type ResourceType = (typeof RESOURCE_TYPES)[number];
export type Cadence = (typeof CADENCES)[number];

export const CustomTrackIdSchema = z.string().regex(/^my-[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must look like my-something') as unknown as z.ZodType<`my-${string}`>;
export const TrackIdSchema = z.union([z.enum(TRACK_IDS), CustomTrackIdSchema]);
export const SeedTrackIdSchema = z.enum(TRACK_IDS);
export const BlockIdSchema = z.string().regex(/^[A-Z][A-Z0-9]{0,7}$/, 'must be a block id: a capital letter, then up to 7 capitals or digits');
export const SeedBlockIdSchema = z.enum(BLOCK_IDS);

/* ------------------------------------------------------------------ primitives */

export const Slug = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/, 'must be a lowercase slug: a-z, 0-9, "-" and "."');

export function isRealIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1]!;
  return d <= dim;
}

export const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
  .refine(isRealIsoDate, 'is not a real calendar date');

/** A clock time, "09:30": a block's start in a template or on a date, a busy event's start. */
export const ClockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'a time is HH:MM, 00:00 to 23:59');

export function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export const HttpUrl = z.string().refine(isHttpUrl, 'must be an absolute http(s) URL');

export const Text = z.string().trim().min(1);

/**
 * Section 7, rule 1: never invent a URL. A link is either verified (url set, urlVerified
 * true, lastVerified dated) or absent (url null, urlVerified false, searchHint set).
 * There is deliberately no third state: an unverified URL cannot be written into the seed.
 */
const linkFields = {
  url: HttpUrl.nullable(),
  urlVerified: z.boolean(),
  searchHint: Text.optional(),
  lastVerified: IsoDate.optional(),
};

interface LinkLike {
  url: string | null;
  urlVerified: boolean;
  searchHint?: string | undefined;
  lastVerified?: string | undefined;
}

function checkLink(v: LinkLike, ctx: z.RefinementCtx): void {
  if (v.url === null) {
    if (v.urlVerified) ctx.addIssue({ code: 'custom', path: ['urlVerified'], message: 'must be false when url is null' });
    if (!v.searchHint) ctx.addIssue({ code: 'custom', path: ['searchHint'], message: 'is required when url is null (brief section 7, rule 1)' });
  } else {
    if (!v.urlVerified) ctx.addIssue({ code: 'custom', path: ['url'], message: 'an unverified url may not be stored: verify it, or set url to null and add a searchHint' });
    if (!v.lastVerified) ctx.addIssue({ code: 'custom', path: ['lastVerified'], message: 'is required when a url is set' });
  }
}

/* ------------------------------------------------------------------ units */

export const CHECKLIST_KINDS = ['video', 'reading', 'homework', 'project'] as const;
export type ChecklistKind = (typeof CHECKLIST_KINDS)[number];

const UnitSchema = z.strictObject({
  id: Slug,
  title: Text,
  section: Text.optional(),
  url: HttpUrl.optional(),
  /** A lesson checklist's fields (data/units/<id>.json, ZOOMCAMP-CHECKLIST): the module the unit belongs to. */
  group: z.string().min(1).optional(),
  kind: z.enum(CHECKLIST_KINDS).optional(),
  /** A video's own link, inside the course's playlist. */
  video: HttpUrl.optional(),
  /** Optional or outdated units neither count toward progress nor become "current". */
  optional: z.boolean().optional(),
  outdated: z.boolean().optional(),
  /** The unit's own estimate; otherwise 15 minutes a video, 2 h a homework, 20 h a project, 30 minutes a reading. */
  hours: z.number().positive().max(200).optional(),
});
export type Unit = z.infer<typeof UnitSchema>;

/**
 * A lesson checklist as a JSON file in data/units/ (the shape of ml-zoomcamp-checklist.json): modules of items, each a
 * video, a reading, a homework or a project, with the progress the user had when the file was made (`status`), which is
 * seeded once into their item state.
 */
const ChecklistItemSchema = z.strictObject({
  id: Slug,
  title: Text,
  kind: z.enum(CHECKLIST_KINDS),
  video: HttpUrl.nullable().optional(),
  notes: HttpUrl.optional(),
  hours: z.number().positive().max(200).optional(),
  optional: z.boolean().optional(),
  outdated: z.boolean().optional(),
  status: z.enum(['done', 'current', 'todo']).default('todo'),
});
export const ChecklistFileSchema = z.strictObject({
  resource: Slug,
  title: Text,
  playlist: HttpUrl.optional(),
  repo: HttpUrl.optional(),
  source_note: Text.optional(),
  modules: z.array(z.strictObject({ id: z.string().min(1), title: Text, folder: z.string().optional(), items: z.array(ChecklistItemSchema).min(1) })).min(1),
});
export type ChecklistFile = z.infer<typeof ChecklistFileSchema>;

/** A checklist file's items as units, in order: the module's title is the section, its id the group. */
export function checklistUnits(file: ChecklistFile): Unit[] {
  return file.modules.flatMap((m) =>
    m.items.map((item): Unit => {
      const unit: Unit = { id: item.id, title: item.title, section: m.title, group: m.id, kind: item.kind };
      if (item.notes) unit.url = item.notes;
      if (item.video) unit.video = item.video;
      if (item.optional) unit.optional = true;
      if (item.outdated) unit.outdated = true;
      if (item.hours) unit.hours = item.hours;
      return unit;
    }),
  );
}

const UnitGroupSchema = z.strictObject({
  section: Text,
  items: z.array(z.strictObject({ id: Slug, title: Text, url: HttpUrl.optional() })).min(1),
});

/** YAML may nest units under `section` headings; the app always sees a flat list. */
export const UnitsInput = z.array(z.union([UnitGroupSchema, UnitSchema])).transform((entries): Unit[] => {
  const flat: Unit[] = [];
  for (const entry of entries) {
    if ('items' in entry) {
      for (const item of entry.items) flat.push({ ...item, section: entry.section });
    } else {
      flat.push(entry);
    }
  }
  return flat;
});

function checkUniqueUnitIds(units: Unit[] | undefined, ctx: z.RefinementCtx): void {
  if (!units) return;
  const seen = new Set<string>();
  for (const u of units) {
    if (seen.has(u.id)) ctx.addIssue({ code: 'custom', path: ['units'], message: 'duplicate unit id "' + u.id + '"' });
    seen.add(u.id);
  }
}

/* ------------------------------------------------------------------ collections */

export const TrackSchema = z.strictObject({
  id: TrackIdSchema,
  /** Set on a track the user created in the app. */
  source: z.literal('user').optional(),
  name: Text,
  /**
   * Colour family. Sixteen tracks are too many to tell apart by hue, so tracks share the eight
   * validated categorical slots of the palette (src/index.css, --series-1 to --series-8):
   * the slot gives the colour, the name gives the identity.
   */
  family: Text,
  slot: z.literal([1, 2, 3, 4, 5, 6, 7, 8]),
  summary: Text,
});
export type Track = z.infer<typeof TrackSchema>;

export const ResourceSchema = z
  .strictObject({
    id: Slug,
    title: Text,
    /** The name lists show, when the full title is long: "ML Zoomcamp" for "DataTalksClub Machine Learning Zoomcamp". */
    short: Text.optional(),
    provider: Text,
    type: z.enum(RESOURCE_TYPES),
    ...linkFields,
    tracks: z.array(TrackIdSchema).min(1),
    level: z.enum(LEVELS),
    cost: z.enum(COSTS),
    estHours: z.number().min(0).max(2000),
    prerequisites: z.array(Slug).default([]),
    units: UnitsInput.optional(),
    /** Set by the validator from a lesson checklist file (data/units/<id>.json), never written in YAML. */
    checklistMeta: z.strictObject({ playlist: HttpUrl.optional(), seedDone: z.array(Slug) }).optional(),
    /** Row of the credential map this resource counts towards (required once it is planned). */
    subject: Slug.optional(),
    summary: Text.optional(),
    /** Optional "stretch" material: scheduled last, and the first thing to drop. */
    stretch: z.boolean().optional(),
    /** A reference work: consulted, not completed. Carries no scheduled hours. */
    reference: z.boolean().optional(),
    /** A site that keeps publishing (a blog, a newsletter): the Library's "Blogs to follow" shelf. */
    blog: z.boolean().optional(),
    /** roadmap.sh nodes this resource teaches; finishing it ticks them. */
    covers: z.array(NodeRef).optional(),
    /** Resources that can take its place on the plan (fast.ai or CS231n): offered first by Swap. */
    alternatives: z.array(Slug).optional(),
    /** Set on a resource the user added in the app. */
    source: z.literal('user').optional(),
  })
  .superRefine((v, ctx) => {
    checkLink(v, ctx);
    checkUniqueUnitIds(v.units, ctx);
    if (v.prerequisites.includes(v.id)) ctx.addIssue({ code: 'custom', path: ['prerequisites'], message: 'a resource cannot require itself' });
  });
export type Resource = z.infer<typeof ResourceSchema>;

const BlockFocus = z.strictObject({ A: Text, B: Text, C: Text, D: Text, E: Text });

export const PhaseSchema = z
  .strictObject({
    id: Slug,
    year: z.literal([1, 2, 3, 4, 5]),
    stage: z.literal([1, 2]),
    title: Text,
    start: IsoDate,
    end: IsoDate,
    goal: Text,
    /** The phase-table cell for each lane, shown as that lane's heading. */
    focus: BlockFocus,
    /** The year's theme, shown as the phase's subtitle: "Year 1 · Foundations". */
    theme: Text.optional(),
    /** A few names that say what the phase is about, for its row on Plan: "C, C++, 6.006, deep learning". */
    topics: Text.optional(),
    /** The five-year map's card: one line per lane (D's work is what ships), what ships, and the credentials. */
    map: z
      .strictObject({
        A: Text,
        B: Text,
        C: Text,
        E: Text,
        ships: Text,
        credentials: Text,
      })
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.end < v.start) ctx.addIssue({ code: 'custom', path: ['end'], message: 'must not be before start' });
    const isStageOne = v.stage === 1;
    const isEarlyYear = v.year <= 3;
    if (isStageOne !== isEarlyYear) ctx.addIssue({ code: 'custom', path: ['stage'], message: 'years 1-3 are stage 1, years 4-5 are stage 2' });
  });
export type Phase = z.infer<typeof PhaseSchema>;

const PlanEntryInput = z
  .strictObject({
    resource: Slug.optional(),
    project: Slug.optional(),
    id: Slug.optional(),
    note: Text.optional(),
    /**
     * The hours this appearance carries. Needed when an item is split (a capstone over two lanes, a book over two
     * years), and for part of a course, such as selected lectures.
     */
    hours: z.number().positive().optional(),
  })
  .superRefine((v, ctx) => {
    if (Boolean(v.resource) === Boolean(v.project)) ctx.addIssue({ code: 'custom', message: 'needs exactly one of "resource" or "project"' });
  });

/** plan.yaml is written phase, then lane, then an ordered list; ids and `order` are derived from it. */
export const PlanPhaseInputSchema = z.strictObject({
  phase: Slug,
  lanes: z.strictObject({
    A: z.array(PlanEntryInput).default([]),
    B: z.array(PlanEntryInput).default([]),
    C: z.array(PlanEntryInput).default([]),
    D: z.array(PlanEntryInput).default([]),
    E: z.array(PlanEntryInput).default([]),
    H: z.array(PlanEntryInput).default([]),
  }),
});
export type PlanPhaseInput = z.infer<typeof PlanPhaseInputSchema>;

export const PlanItemSchema = z.strictObject({
  id: Slug,
  phaseId: Slug,
  block: BlockIdSchema,
  resourceId: Slug.optional(),
  projectId: Slug.optional(),
  order: z.number(),
  note: Text.optional(),
  hours: z.number().positive().optional(),
});
export type PlanItem = z.infer<typeof PlanItemSchema>;

export const ProjectSchema = z.strictObject({
  id: Slug,
  title: Text,
  cadence: z.enum(CADENCES),
  tracks: z.array(TrackIdSchema).min(1),
  brief: Text,
  acceptance: z.array(Text).min(1),
  source: Text.optional(),
  /** Only ever a verified link. When it cannot be verified, `source` alone is the hint. */
  sourceUrl: HttpUrl.optional(),
  estHours: z.number().min(0.5).max(1000),
  phaseId: Slug.optional(),
  /** 1 = software (years 1-3), 2 = electrical + mechanical (years 4-5). Derived from phaseId when omitted. */
  stage: z.literal([1, 2]).optional(),
  /** The running number the brief gives each monthly project, 1 to 59. */
  number: z.number().int().min(1).optional(),
  skills: z.array(Text).default([]),
  /** roadmap.sh nodes this project practises; shipping it ticks them. */
  covers: z.array(NodeRef).optional(),
  subject: Slug.optional(),
  /** Stage 2 builds need physical hardware: what to have on the bench. The budget is a user field. */
  parts: z.array(Text).optional(),
});
type ProjectParsed = z.infer<typeof ProjectSchema>;
/** After loading, every project knows its stage. */
export type Project = Omit<ProjectParsed, 'stage'> & { stage: 1 | 2 };

export const PaperSchema = z
  .strictObject({
    id: Slug,
    title: Text,
    authors: Text.optional(),
    year: z.number().int().min(1900).max(2100).optional(),
    ...linkFields,
    tracks: z.array(TrackIdSchema).min(1),
    group: z.enum(PAPER_GROUPS),
    estHours: z.number().min(0.5).max(40).default(3),
    note: Text.optional(),
    /** Set on a paper the user added in the app. */
    source: z.literal('user').optional(),
  })
  .superRefine(checkLink);
export type Paper = z.infer<typeof PaperSchema>;

export const PaperSourceSchema = z
  .strictObject({ id: Slug, title: Text, ...linkFields, summary: Text.optional() })
  .superRefine(checkLink);
export type PaperSource = z.infer<typeof PaperSourceSchema>;

export const CertSchema = z
  .strictObject({
    id: Slug,
    title: Text,
    vendor: Text,
    subject: Slug,
    /** url is the exam or certificate page on the vendor site. */
    ...linkFields,
    /** Price exactly as the vendor states it on the verified page; null when not published or not verifiable. */
    cost: Text.nullable(),
    targetYear: z.literal([1, 2, 3, 4, 5]),
    targetQuarter: z.string().regex(/^20[0-9][0-9]-Q[1-4]$/, 'must look like 2027-Q3'),
    prepResources: z.array(Slug).default([]),
    /** committed = on the plan, optional = only if useful, investigate = check eligibility first */
    mode: z.enum(CERT_MODES),
    /** Years the credential stays valid. null = does not expire. Omitted = the vendor does not say. */
    validityYears: z.number().positive().nullable().optional(),
    notes: Text.optional(),
  })
  .superRefine(checkLink);
export type Cert = z.infer<typeof CertSchema>;

export const SubjectSchema = z.strictObject({
  id: Slug,
  title: Text,
  tracks: z.array(TrackIdSchema).min(1),
  certs: z.array(Slug).default([]),
  /** Shown in place of a certificate when no credible one exists ("none exist", "none official"). */
  certNote: Text.optional(),
  milestones: z
    .array(z.strictObject({ id: Slug, title: Text, projects: z.array(Slug).default([]) }))
    .default([]),
  /** `licence` rows (the FE exam) are investigate-only and need no portfolio milestone. */
  kind: z.enum(['subject', 'licence']).default('subject'),
});
export type Subject = z.infer<typeof SubjectSchema>;

/* ------------------------------------------------------------------ roadmap.sh tracks */

/** A node is its label; `{ label, optional: true }` marks one the coverage rule leaves out (vendor-specific, engine-specific). */
const RoadmapNodeInput = z.union([Text, z.strictObject({ label: Text, optional: z.literal(true) })]);

export const RoadmapSchema = z.strictObject({
  id: z.enum(ROADMAP_IDS),
  title: Text,
  url: HttpUrl,
  /** 1 = inference and AI engineering, 2 = software architecture, 3 = graphics (the brief's priority order). */
  priority: z.literal([1, 2, 3]),
  /** The credential-map row whose done state, with 90 % of the nodes, makes the roadmap "mastered". */
  subject: Slug,
  note: Text.optional(),
  sections: z
    .array(
      z.strictObject({
        title: Text,
        /** The phase that teaches this part of the roadmap. */
        phaseId: Slug,
        nodes: z.array(RoadmapNodeInput).min(1),
      }),
    )
    .min(1),
});
export type RoadmapInput = z.infer<typeof RoadmapSchema>;

export interface RoadmapNode {
  /** The slug of the label, unique within its roadmap. */
  id: string;
  label: string;
  optional: boolean;
}
export interface Roadmap extends Omit<RoadmapInput, 'sections'> {
  sections: { title: string; phaseId: string; nodes: RoadmapNode[] }[];
}

/* ------------------------------------------------------------------ settings defaults */

const Weekday = z.number().int().min(0).max(6);

export const BlockDefSchema = z.strictObject({
  id: BlockIdSchema,
  name: Text,
  /** The block's minutes in a template that does not set its own (the Full day template sets none). */
  minutes: z.number().int().min(0).max(720),
  /** 0 = Sunday, 6 = Saturday. A block is left out on the other weekdays, whatever the day's template says. */
  days: z.array(Weekday).min(1),
  summary: Text,
  /** Names this block had in earlier curricula: settings that still carry one are brought up to date. */
  formerNames: z.array(Text).optional(),
  /** A colour from the track palette, by track id. Omitted: the lane's default colour. */
  colour: SeedTrackIdSchema.optional(),
  /** The track time in this block is logged against when its item has none (a block the user added). */
  track: TrackIdSchema.optional(),
});
export type BlockDef = z.infer<typeof BlockDefSchema>;

/** A named day: which blocks run and for how long. A block listed without minutes takes the block's own. */
export const DayTemplateSchema = z.strictObject({
  id: Slug,
  name: Text,
  /** `start`: the block's clock time on days of this template; without one it follows the block before it. */
  blocks: z.array(z.strictObject({ block: BlockIdSchema, minutes: z.number().int().min(0).max(720).optional(), start: ClockTime.optional() })),
});
export type DayTemplate = z.infer<typeof DayTemplateSchema>;

const SettingsDefaultsObject = z.strictObject({
  blocks: z.array(BlockDefSchema).min(1).max(16),
  /** Day templates (Full day, University day, Weekend, Exam week, Rest day by default). */
  templates: z.array(DayTemplateSchema).min(1),
  /** The template of each weekday, Sunday first. */
  pattern: z.array(Slug).length(7),
  /** On `day`, the content of `block` is replaced by the weekly review and paper reading. */
  review: z.strictObject({ day: Weekday, block: BlockIdSchema, title: Text }),
  weekStartsOn: z.literal([0, 1]),
  /** Minutes at which a day reaches heatmap level 1, 2, 3 and 4. */
  heatmapThresholds: z.tuple([z.number().int().min(1), z.number().int(), z.number().int(), z.number().int()]),
  streak: z.strictObject({
    minMinutes: z.number().int().min(1),
    /** A day also counts from this share of its planned minutes, whichever of the two is lower. */
    percent: z.number().min(1).max(100),
    freezesPerMonth: z.number().int().min(0).max(31),
    autoFreeze: z.boolean(),
  }),
  /** `relative`: a day's intensity is its share of what it planned. `absolute`: minutes against heatmapThresholds. */
  heatmapMode: z.enum(['relative', 'absolute']),
  /** The project catalogue: the daily challenge in Block B (on or off), and the weekdays of Block D's weekly slot. */
  catalogue: z.strictObject({ dailyChallenge: z.boolean(), weeklyDays: z.array(z.number().int().min(0).max(6)).max(7) }),
  backupReminderDays: z.number().int().min(1),
  /** One paper a week from the first phase of `fromYear`, or from `fromPhase` when it is set (the research cadence starts in Foundations II). */
  paperCadence: z.strictObject({ fromYear: z.literal([1, 2, 3, 4, 5]), fromPhase: Slug.optional(), perWeek: z.number().positive() }),
  forecast: z.strictObject({ paceWindowDays: z.number().int().min(7) }),
  /** Hours of the projects block set aside each week for the weekly mini-build; the rest goes to the monthly project. */
  weeklyBuildHours: z.number().min(0).max(40),
});

/**
 * data/settings.yaml: everything editable under Settings, with the defaults a fresh install starts from.
 */
export const SettingsDefaultsSchema = SettingsDefaultsObject.superRefine((v, ctx) => {
  const ids = v.blocks.map((b) => b.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['blocks'], message: 'block ids must be unique' });
  // The five lanes of the first plan are always defined; a later lane (H) is required where the plan uses it (validate.ts).
  for (const id of BLOCK_IDS.slice(0, 5)) if (!ids.includes(id)) ctx.addIssue({ code: 'custom', path: ['blocks'], message: 'must define block ' + id + ': the curriculum plans into it' });
  const templateIds = new Set(v.templates.map((t) => t.id));
  if (templateIds.size !== v.templates.length) ctx.addIssue({ code: 'custom', path: ['templates'], message: 'template ids must be unique' });
  for (const t of v.templates) {
    for (const b of t.blocks) if (!ids.includes(b.block)) ctx.addIssue({ code: 'custom', path: ['templates'], message: 'template "' + t.id + '" names block ' + b.block + ', which is not defined' });
  }
  v.pattern.forEach((id, day) => {
    if (!templateIds.has(id)) ctx.addIssue({ code: 'custom', path: ['pattern', day], message: 'names template "' + id + '", which is not defined' });
  });
  const t = v.heatmapThresholds;
  const ascending = t[0] < t[1] && t[1] < t[2] && t[2] < t[3];
  if (!ascending) ctx.addIssue({ code: 'custom', path: ['heatmapThresholds'], message: 'must be strictly ascending' });
});
export type SettingsDefaults = z.infer<typeof SettingsDefaultsSchema>;

/**
 * A block as settings saved by an earlier build may have it. Until pull request #6 the Practice block P carried
 * `role: practice`; such a block is dropped when the settings are read (src/lib/settings.ts, withoutPractice).
 */
export const StoredBlockDefSchema = BlockDefSchema.extend({ role: z.literal('practice').optional() });

/**
 * Settings saved before version 2 (the flexibility brief) have no templates, weekly pattern, heatmap mode or
 * streak percentage. They still parse, from a backup, a sync or IndexedDB, and are brought up to date when read
 * (src/db/settings.ts, upgradeSettings). Settings saved while Practice existed (until pull request #6) also carry
 * its block and a `practice` section (period, questions a subject, Start with); both parse and are dropped on read.
 */
export const StoredCoreSchema = SettingsDefaultsObject.extend({
  blocks: z.array(StoredBlockDefSchema).min(1).max(16),
  templates: SettingsDefaultsObject.shape.templates.optional(),
  pattern: SettingsDefaultsObject.shape.pattern.optional(),
  heatmapMode: SettingsDefaultsObject.shape.heatmapMode.optional(),
  /** Retired with Practice (pull request #6): read, never written. */
  practice: z.record(z.string(), z.unknown()).optional(),
  catalogue: SettingsDefaultsObject.shape.catalogue.optional(),
  streak: SettingsDefaultsObject.shape.streak.extend({ percent: z.number().min(1).max(100).optional() }),
});
export type StoredCore = z.infer<typeof StoredCoreSchema>;

/* ------------------------------------------------------------------ goals */

/** "Ship my inference server by 30 June 2028": a date, and the items or roadmap nodes it depends on. */
export const GoalSchema = z.strictObject({
  id: Slug,
  title: Text,
  date: IsoDate,
  /** Resource or project ids, or roadmap nodes (`roadmap/node`). */
  links: z.array(z.string().min(1)).default([]),
});
export type Goal = z.infer<typeof GoalSchema>;

/* ------------------------------------------------------------------ the seed */

export interface Seed {
  tracks: Track[];
  settings: SettingsDefaults;
  phases: Phase[];
  resources: Resource[];
  plan: PlanItem[];
  projects: Project[];
  papers: Paper[];
  paperSources: PaperSource[];
  certs: Cert[];
  subjects: Subject[];
  roadmaps: Roadmap[];
}

/**
 * The shape the browser sees. The unit checklists are served separately (see
 * scripts/lib/vite-plugin-seed.ts), so a resource carries only the count, which is all a progress bar needs.
 */
/** A resource as the app sees it: its checklist split off (count only), except a resource of the user's, which keeps its own. */
export type AppResource = Omit<Resource, 'units'> & { unitCount: number; customUnits?: Unit[]; checklist?: ChecklistSummary };

/**
 * What the main bundle knows of a lesson checklist (its units load later): the units that count, with their hours,
 * which videos they are, the playlist, and the progress the file was made with (seeded once, src/db/checklist.ts).
 */
export interface ChecklistSummary {
  counted: { id: string; hours: number; video: boolean }[];
  playlist?: string;
  seedDone: string[];
}
/** A project as the app sees it: with the number of milestones its tech doc has, which count toward its progress. */
export type AppProject = Project & { milestoneCount?: number };
export type AppSeed = Omit<Seed, 'resources' | 'projects'> & {
  resources: AppResource[];
  projects: AppProject[];
  /** Set once the user's plan edits are applied (src/lib/plan.ts): items taken off the plan, restorable. */
  dropped?: PlanItem[];
  goals?: Goal[];
  /** Plan edits that name something the curriculum no longer has, reported once in Settings. */
  patchProblems?: string[];
};
