/**
 * node scripts/check-docs.ts [project-id …] — checks the tech docs in data/projects/docs/ (all of them, or the
 * ones named). validate:data runs the same checks; this is the quick loop for writing docs.
 */
import { loadDocs } from './lib/load-docs.ts';
import { loadSeedOrThrow } from './lib/load-seed.ts';

const ids = process.argv.slice(2);
const seed = loadSeedOrThrow();
const { errors, warnings, parsed } = loadDocs(seed);
const relevant = (line: string): boolean => ids.length === 0 || ids.some((id) => line.includes('/' + id + '.md'));
const shown = errors.filter(relevant);
if (ids.length === 0) for (const w of warnings) console.warn('warning: ' + w);
for (const id of ids) {
  const doc = parsed[id];
  if (doc) console.log(id + ': ' + doc.words + ' words, ' + doc.milestones.length + ' milestones, ' + doc.milestones.reduce((s, m) => s + m.hours, 0) + ' h');
  else if (!shown.some((l) => l.includes('/' + id + '.md'))) console.log(id + ': no doc yet');
}
if (shown.length > 0) {
  console.error(shown.length + ' problem' + (shown.length === 1 ? '' : 's') + ':\n  - ' + shown.join('\n  - '));
  process.exit(1);
}
console.log('docs ok: ' + Object.keys(parsed).length + ' parsed');
