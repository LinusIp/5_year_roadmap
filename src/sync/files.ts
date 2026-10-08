/**
 * The files of the data repository: how local records become text, and how text becomes records again.
 *
 * Plain JSON and Markdown, so the repository can be read and edited by hand and outlives the app. JSON is
 * canonical (keys sorted, two-space indent, a final newline), so an unchanged record is an unchanged file and
 * a commit only shows what changed. Everything read back is validated with the same schemas as a backup.
 */
import { z } from 'zod';
import { canonical } from '../db/backup-file.ts';
import {
  CertStateSchema, CustomEntitySchema, DayLogSchema, MilestoneStateSchema, OverrideSchema, PaperStateSchema,
  ReplanRecordSchema, ReviewSchema, StoredSettingsSchema, UserItemStateSchema, WeekPickSchema,
} from '../db/types.ts';
import type { DayLog, Review, StoredSettings, UserItemState } from '../db/types.ts';
import { formatRange, monthName } from '../lib/dates.ts';
import type { Project } from '../seed/schema.ts';

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function toJson(value: unknown): string {
  return JSON.stringify(canonical(value), null, 2) + '\n';
}

function parseJson<T>(text: string, schema: z.ZodType<T>, what: string): ParseResult<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: what + ' is not valid JSON' };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: what + ': ' + parsed.error.issues.slice(0, 3).map((i) => (i.path.join('.') || '(top)') + ' ' + i.message).join('; ') };
  return { ok: true, value: parsed.data };
}

const byRefId = <T extends { refId: string }>(rows: readonly T[]): T[] => [...rows].sort((a, b) => a.refId.localeCompare(b.refId));

/* ------------------------------------------------------------------ state/items.json */

export const ItemsFileSchema = z.strictObject({
  format: z.literal('atlas-items'),
  version: z.literal(1),
  itemStates: z.array(UserItemStateSchema),
  paperStates: z.array(PaperStateSchema),
  certStates: z.array(CertStateSchema),
  milestoneStates: z.array(MilestoneStateSchema),
});
export type ItemsFile = z.infer<typeof ItemsFileSchema>;
export type ItemsData = Omit<ItemsFile, 'format' | 'version'>;

export function renderItems(data: ItemsData): string {
  return toJson({
    format: 'atlas-items',
    version: 1,
    itemStates: byRefId(data.itemStates),
    paperStates: byRefId(data.paperStates),
    certStates: byRefId(data.certStates),
    milestoneStates: byRefId(data.milestoneStates),
  });
}

export function parseItems(text: string): ParseResult<ItemsData> {
  const result = parseJson(text, ItemsFileSchema, 'state/items.json');
  if (!result.ok) return result;
  const { format: _format, version: _version, ...data } = result.value;
  return { ok: true, value: data };
}

/* ------------------------------------------------------------------ state/plan.json */

export const PlanFileSchema = z.strictObject({
  format: z.literal('atlas-plan'),
  version: z.literal(1),
  overrides: z.array(OverrideSchema),
  customEntities: z.array(CustomEntitySchema),
  replans: z.array(ReplanRecordSchema),
  weekPicks: z.array(WeekPickSchema),
});
export type PlanFile = z.infer<typeof PlanFileSchema>;
export type PlanData = Omit<PlanFile, 'format' | 'version'>;

export function renderPlan(data: PlanData): string {
  const byKind = <T extends { kind: string; id: string }>(rows: readonly T[]): T[] => [...rows].sort((a, b) => (a.kind + '/' + a.id).localeCompare(b.kind + '/' + b.id));
  return toJson({
    format: 'atlas-plan',
    version: 1,
    overrides: byKind(data.overrides),
    customEntities: byKind(data.customEntities),
    replans: [...data.replans].sort((a, b) => a.id.localeCompare(b.id)),
    weekPicks: [...data.weekPicks].sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
  });
}

export function parsePlan(text: string): ParseResult<PlanData> {
  const result = parseJson(text, PlanFileSchema, 'state/plan.json');
  if (!result.ok) return result;
  const { format: _format, version: _version, ...data } = result.value;
  return { ok: true, value: data };
}

/** The newest change in the plan file, for last-writer-wins. */
export function planUpdatedAt(data: PlanData): string {
  let newest = '';
  for (const row of [...data.overrides, ...data.customEntities, ...data.replans, ...data.weekPicks]) {
    if ((row.updatedAt ?? '') > newest) newest = row.updatedAt!;
  }
  return newest;
}

/* ------------------------------------------------------------------ state/settings.json */

export function renderSettings(settings: StoredSettings): string {
  return toJson(settings);
}

export function parseSettings(text: string): ParseResult<StoredSettings> {
  return parseJson(text, StoredSettingsSchema, 'state/settings.json');
}

/* ------------------------------------------------------------------ log/YYYY/MM/YYYY-MM-DD.json */

export function renderDay(log: DayLog): string {
  return toJson(log);
}

export function parseDay(text: string, path: string): ParseResult<DayLog> {
  return parseJson(text, DayLogSchema, path);
}

/* ------------------------------------------------------------------ reviews/*.md */

/**
 * A review is Markdown to read on GitHub, with the record itself as front matter (JSON is valid YAML), so it
 * reads back exactly.
 */
export function renderReview(review: Review): string {
  const lines = ['---', JSON.stringify(canonical(review)), '---', ''];
  const start = review.periodStart;
  if (review.kind === 'week') lines.push('# Week of ' + formatRange(start, addSix(start)));
  else if (review.kind === 'month') lines.push('# ' + monthName(Number(start.slice(5, 7)) - 1) + ' ' + start.slice(0, 4));
  else lines.push('# ' + review.id.slice('quarter:'.length).replace('-', ' '));
  lines.push('');
  if (review.completedAt) lines.push('Reviewed on ' + review.completedAt + '.', '');
  if (review.snapshot) {
    const hours = (m: number): string => (m / 60).toFixed(1).replace(/\.0$/, '') + ' h';
    lines.push(hours(review.snapshot.totalMinutes) + ' of ' + hours(review.snapshot.targetMinutes) + ', ' + review.snapshot.daysCounted + ' days counted.', '');
  }
  const next = review.kind === 'week' ? 'next week' : review.kind === 'month' ? 'next month' : 'next quarter';
  const sections: [string, string | undefined][] = [
    ['What worked', review.worked],
    ["What didn't", review.didnt],
    ['What changes ' + next, review.changes],
  ];
  if (review.kind === 'month' && review.projectShipped !== undefined) lines.push('A project shipped: ' + (review.projectShipped ? 'yes' : 'no') + '.', '');
  if (review.question) sections.unshift(["This quarter's research question", review.question]);
  if (review.reportUrl) lines.push('Report: ' + review.reportUrl, '');
  for (const [title, text] of sections) {
    if (!text?.trim()) continue;
    lines.push('## ' + title, '', text.trim(), '');
  }
  return lines.join('\n').trimEnd() + '\n';
}

function addSix(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

export function parseReview(text: string, path: string): ParseResult<Review> {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!m) return { ok: false, error: path + ' has no front matter' };
  return parseJson(m[1]!, ReviewSchema, path);
}

/* ------------------------------------------------------------------ projects/<id>.md (generated) */

export function renderProject(project: Project, state: UserItemState | undefined): string {
  const done = new Set(state?.unitsDone ?? []);
  const lines = ['# ' + project.title, ''];
  const facts = [
    project.number !== undefined ? 'No. ' + project.number : null,
    project.cadence === 'weekly' ? 'Weekly build' : project.cadence === 'monthly' ? 'Monthly project' : project.cadence === 'research' ? 'Research' : 'Capstone',
    project.estHours + ' h',
    'Status: ' + (state?.status ?? 'todo'),
  ].filter(Boolean);
  lines.push(facts.join(' · '), '');
  if (state?.repoUrl) lines.push('Repository: ' + state.repoUrl);
  if (state?.demoUrl) lines.push('Demo: ' + state.demoUrl);
  if (state?.repoUrl || state?.demoUrl) lines.push('');
  lines.push(project.brief.trim(), '', '## Done when', '');
  project.acceptance.forEach((criterion, i) => lines.push('- [' + (done.has('criterion-' + (i + 1)) ? 'x' : ' ') + '] ' + criterion));
  lines.push('');
  if (state?.writeUp?.trim()) lines.push('## Write-up', '', state.writeUp.trim(), '');
  if (state?.notes?.trim()) lines.push('## Notes', '', state.notes.trim(), '');
  return lines.join('\n').trimEnd() + '\n';
}

/* ------------------------------------------------------------------ README.md */

export function renderReadme(appUrl: string): string {
  return `# Atlas data

This private repository is where [Atlas](${appUrl}) keeps your learning log and progress. Atlas writes it; you can
read it here, edit it by hand, or take it elsewhere. Every study session is one commit.

| Path | What is in it |
|---|---|
| \`state/items.json\` | The status, ticked units, notes and links of every course, book, project, paper, certificate and milestone |
| \`state/plan.json\` | Your edits to the plan: moved and added items, re-plans, the builds you picked |
| \`state/settings.json\` | Blocks, heatmap thresholds, streak rules and theme. Never the token. |
| \`log/YYYY/MM/YYYY-MM-DD.json\` | One day: the time logged, blocks done, reflection and energy |
| \`log/YYYY/MM/YYYY-MM-DD.md\` | The same day to read on GitHub, generated |
| \`reviews/\` | Weekly (\`2026-W41.md\`), monthly (\`2026-10.md\`) and quarterly (\`2027-Q1.md\`) reviews |
| \`projects/\` | Each project's write-up, links and checklist, generated |
| \`research/\` | Your quarterly research reports. Atlas never writes here. |

Editing by hand: keep the JSON valid and the ids as they are. Atlas reads \`state/\`, \`log/\` and \`reviews/\` back
on its next sync; a file it cannot read is left alone and named in Settings. The Markdown day files and project
pages are rewritten from the JSON, so edit the JSON instead.
`;
}
