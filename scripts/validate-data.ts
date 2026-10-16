/**
 * npm run validate:data
 * Exits 1 on any schema error, duplicate id, dangling reference or missing credential-map row.
 * `npm run build` runs this first, so an invalid curriculum can never be built or deployed.
 */
import { loadCatalogue } from './lib/load-catalogue.ts';
import { loadDesigns } from './lib/load-designs.ts';
import { loadDocs } from './lib/load-docs.ts';
import { loadSeed } from './lib/load-seed.ts';

const result = loadSeed();
const { seed } = result;
const errors = [...result.errors];
const warnings = [...result.warnings];

// The projects' tech docs (data/projects/docs/) are checked here too.
const docs = seed ? loadDocs(seed, undefined, { requireAll: true }) : null;
if (docs) {
  errors.push(...docs.errors);
  warnings.push(...docs.warnings);
}
// The three-tier project catalogue (data/projects/*.jsonl): unique ids across it and the curriculum, difficulty
// matching cadence, examples, milestones adding up, prerequisites that resolve, no URLs.
const catalogue = seed ? loadCatalogue(seed) : null;
if (catalogue) errors.push(...catalogue.errors);
// The designs (data/projects/design/): one per case, build and documented plan project, each within its weight's
// counts, its flow and talksTo resolving, every core component on the flow, decisions with an alternative, no URLs.
const designs = seed && catalogue ? loadDesigns(seed, catalogue.items) : null;
if (designs) errors.push(...designs.errors);

for (const w of warnings) console.warn('warning  ' + w);

if (!seed || errors.length > 0) {
  console.error('\n/data is invalid: ' + errors.length + ' problem' + (errors.length === 1 ? '' : 's') + '\n');
  for (const e of errors) console.error('error    ' + e);
  console.error('');
  process.exit(1);
}

const unverified = seed.resources.filter((r) => r.url === null).length;
const weekly = seed.projects.filter((p) => p.cadence === 'weekly');
const lines: [string, string | number][] = [
  ['phases', seed.phases.length],
  ['resources', seed.resources.length + ' (' + unverified + ' without a verified link)'],
  ['plan items', seed.plan.length],
  ['projects', seed.projects.length + ' (' + weekly.length + ' weekly, ' + weekly.filter((p) => p.stage === 2).length + ' of them stage 2)'],
  ['papers', seed.papers.length],
  ['certifications', seed.certs.length],
  ['credential-map rows', seed.subjects.length],
  ['tech docs', Object.keys(docs?.parsed ?? {}).length + ' of ' + seed.projects.filter((p) => p.cadence !== 'weekly').length + ' projects'],
  ['project catalogue', catalogueSummary()],
  ['designs', designSummary()],
  ['roadmap.sh roadmaps', seed.roadmaps.length + ' (' + seed.roadmaps.reduce((n, r) => n + r.sections.reduce((m, s) => m + s.nodes.length, 0), 0) + ' nodes)'],
];
console.log('/data is valid');
for (const [label, value] of lines) console.log('  ' + label.padEnd(20) + value);
if (warnings.length > 0) console.log('  ' + warnings.length + ' warning' + (warnings.length === 1 ? '' : 's') + ' (see above)');

function catalogueSummary(): string {
  const items = catalogue?.items ?? [];
  const count = (kind: string, difficulty: string): number => items.filter((i) => i.kind === kind && i.difficulty === difficulty).length;
  return items.length + ': daily ' + count('challenge', 'easy') + ' challenges; weekly ' + count('challenge', 'medium') + ' challenges, ' + count('build', 'medium') + ' builds; monthly ' + count('case', 'advanced') + ' cases';
}

function designSummary(): string {
  const weights = designs?.weights ?? new Map();
  const ids = Object.keys(designs?.designs ?? {});
  const kind = new Map((catalogue?.items ?? []).map((i) => [i.id, i.kind]));
  const count = (k: string): number => ids.filter((id) => (kind.get(id) ?? 'plan') === k).length;
  return ids.length + ' of ' + weights.size + ': ' + count('case') + ' cases, ' + count('build') + ' builds (light), ' + count('plan') + ' plan projects';
}
