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
export const BLOCK_IDS = ['A', 'B', 'C', 'D', 'E'] as const;
export const RESOURCE_TYPES = ['course', 'lectures', 'book', 'tutorial', 'article', 'paper', 'repo', 'cert'] as const;
export const LEVELS = ['intro', 'intermediate', 'advanced'] as const;
export const COSTS = ['free', 'audit-free', 'paid'] as const;
/** The brief's four cadences: a weekly mini-build, a monthly project, research (a reimplementation, a quarterly question, a paper), a yearly capstone. */
export const CADENCES = ['weekly', 'monthly', 'research', 'capstone'] as const;
export const PAPER_GROUPS = ['classics', 'llm', 'systems', 'graphics-sim', 'inference', 'generative'] as const;
export const ROADMAP_IDS = ['inference-engineering', 'ai-engineer', 'ai-agents', 'software-architect', 'game-developer'] as const;

/** A roadmap.sh node an item teaches: "inference-engineering/kv-cache". */
const NodeRef = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must look like roadmap-id/node-id');
export const CERT_MODES = ['committed', 'optional', 'investigate'] as const;

export type TrackId = (typeof TRACK_IDS)[number];
export type BlockId = (typeof BLOCK_IDS)[number];
export type ResourceType = (typeof RESOURCE_TYPES)[number];
export type Cadence = (typeof CADENCES)[number];

export const TrackIdSchema = z.enum(TRACK_IDS);
export const BlockIdSchema = z.enum(BLOCK_IDS);

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

const UnitSchema = z.strictObject({
  id: Slug,
  title: Text,
  section: Text.optional(),
  url: HttpUrl.optional(),
});
export type Unit = z.infer<typeof UnitSchema>;

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
    /** Row of the credential map this resource counts towards (required once it is planned). */
    subject: Slug.optional(),
    summary: Text.optional(),
    /** Optional "stretch" material: scheduled last, and the first thing to drop. */
    stretch: z.boolean().optional(),
    /** A reference work: consulted, not completed. Carries no scheduled hours. */
    reference: z.boolean().optional(),
    /** roadmap.sh nodes this resource teaches; finishing it ticks them. */
    covers: z.array(NodeRef).optional(),
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
  minutes: z.number().int().min(0).max(720),
  /** 0 = Sunday, 6 = Saturday. */
  days: z.array(Weekday).min(1),
  summary: Text,
  /** Names this block had in earlier curricula: settings that still carry one are brought up to date. */
  formerNames: z.array(Text).optional(),
});
export type BlockDef = z.infer<typeof BlockDefSchema>;

export const SettingsDefaultsSchema = z
  .strictObject({
    blocks: z.array(BlockDefSchema).length(5),
    /** On `day`, the content of `block` is replaced by the weekly review and paper reading. */
    review: z.strictObject({ day: Weekday, block: BlockIdSchema, title: Text }),
    weekStartsOn: z.literal([0, 1]),
    /** Minutes at which a day reaches heatmap level 1, 2, 3 and 4. */
    heatmapThresholds: z.tuple([z.number().int().min(1), z.number().int(), z.number().int(), z.number().int()]),
    streak: z.strictObject({
      minMinutes: z.number().int().min(1),
      freezesPerMonth: z.number().int().min(0).max(31),
      autoFreeze: z.boolean(),
    }),
    backupReminderDays: z.number().int().min(1),
    /** One paper a week from the first phase of `fromYear`, or from `fromPhase` when it is set (the research cadence starts in Foundations II). */
    paperCadence: z.strictObject({ fromYear: z.literal([1, 2, 3, 4, 5]), fromPhase: Slug.optional(), perWeek: z.number().positive() }),
    forecast: z.strictObject({ paceWindowDays: z.number().int().min(7) }),
    /** Hours of the projects block set aside each week for the weekly mini-build; the rest goes to the monthly project. */
    weeklyBuildHours: z.number().min(0).max(40),
  })
  .superRefine((v, ctx) => {
    const ids = v.blocks.map((b) => b.id).join('');
    if (ids !== 'ABCDE') ctx.addIssue({ code: 'custom', path: ['blocks'], message: 'must define blocks A, B, C, D, E in that order' });
    const t = v.heatmapThresholds;
    const ascending = t[0] < t[1] && t[1] < t[2] && t[2] < t[3];
    if (!ascending) ctx.addIssue({ code: 'custom', path: ['heatmapThresholds'], message: 'must be strictly ascending' });
  });
export type SettingsDefaults = z.infer<typeof SettingsDefaultsSchema>;

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
export type AppResource = Omit<Resource, 'units'> & { unitCount: number };
export type AppSeed = Omit<Seed, 'resources'> & { resources: AppResource[] };
