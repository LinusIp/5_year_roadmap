/**
 * npm run validate:data
 * Exits 1 on any schema error, duplicate id, dangling reference or missing credential-map row.
 * `npm run build` runs this first, so an invalid curriculum can never be built or deployed.
 */
import { loadDocs } from './lib/load-docs.ts';
import { checkBankAgainstSeed, loadQuestions } from './lib/load-questions.ts';
import { loadSeed } from './lib/load-seed.ts';

const result = loadSeed();
const { seed } = result;
const errors = [...result.errors];
const warnings = [...result.warnings];

// The practice bank (data/questions/) and the projects' tech docs (data/projects/docs/) are checked here too, with
// the launch quotas of the practice brief: 200 per subject, 40 % templates, every topic at difficulties 1 to 4.
const bank = loadQuestions(undefined, { requireQuotas: true });
errors.push(...bank.errors);
warnings.push(...bank.warnings);
const docs = seed ? loadDocs(seed, undefined, { requireAll: true }) : null;
if (docs) {
  errors.push(...docs.errors);
  warnings.push(...docs.warnings);
}
if (seed && bank.bank) errors.push(...checkBankAgainstSeed(bank.bank, seed));

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
  ['practice questions', bank.stats.subjects.map((s) => s.id + ' ' + s.questions + ' (' + s.templates + ' templates)').join(', ')],
  ['tech docs', Object.keys(docs?.parsed ?? {}).length + ' of ' + seed.projects.filter((p) => p.cadence !== 'weekly').length + ' projects'],
  ['roadmap.sh roadmaps', seed.roadmaps.length + ' (' + seed.roadmaps.reduce((n, r) => n + r.sections.reduce((m, s) => m + s.nodes.length, 0), 0) + ' nodes)'],
];
console.log('/data is valid');
for (const [label, value] of lines) console.log('  ' + label.padEnd(20) + value);
if (warnings.length > 0) console.log('  ' + warnings.length + ' warning' + (warnings.length === 1 ? '' : 's') + ' (see above)');
