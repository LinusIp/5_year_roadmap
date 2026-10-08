/**
 * npm run validate:data
 * Exits 1 on any schema error, duplicate id, dangling reference or missing credential-map row.
 * `npm run build` runs this first, so an invalid curriculum can never be built or deployed.
 */
import { loadSeed } from './lib/load-seed.ts';

const { seed, errors, warnings } = loadSeed();

for (const w of warnings) console.warn('warning  ' + w);

if (!seed) {
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
  ['roadmap.sh roadmaps', seed.roadmaps.length + ' (' + seed.roadmaps.reduce((n, r) => n + r.sections.reduce((m, s) => m + s.nodes.length, 0), 0) + ' nodes)'],
];
console.log('/data is valid');
for (const [label, value] of lines) console.log('  ' + label.padEnd(20) + value);
if (warnings.length > 0) console.log('  ' + warnings.length + ' warning' + (warnings.length === 1 ? '' : 's') + ' (see above)');
