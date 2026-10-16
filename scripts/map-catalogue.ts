/**
 * npm run map:catalogue [-- --check]
 *
 * Writes `refs` (resource ids) and `covers` (roadmap.sh nodes) into every line of data/projects/*.jsonl, from the
 * reviewed keyword table in scripts/lib/catalogue-mapping.ts. Items no rule matches get none: never a guess.
 * --check fails when the files are not what the table gives (CI-friendly), and writes nothing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mapItem } from './lib/catalogue-mapping.ts';
import { DATA_DIR } from './lib/load-seed.ts';
import { CATALOGUE_FILES, RawCatalogueItemSchema } from '../src/seed/catalogue.ts';

/** One line of JSON in the files' own style: a space after every comma and colon. */
function format(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(format).join(', ') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).map(([k, v]) => JSON.stringify(k) + ': ' + format(v)).join(', ') + '}';
  return JSON.stringify(value);
}

const check = process.argv.includes('--check');
let changed = 0;
let mappedRefs = 0;
let mappedCovers = 0;
let total = 0;
for (const name of CATALOGUE_FILES) {
  const path = join(DATA_DIR, 'projects', name);
  const before = readFileSync(path, 'utf8');
  const lines = before.split('\n').map((line) => {
    if (!line.trim()) return line;
    const json = JSON.parse(line) as Record<string, unknown>;
    const { refs, covers } = mapItem(RawCatalogueItemSchema.parse(json));
    total++;
    if (refs.length) mappedRefs++;
    if (covers.length) mappedCovers++;
    delete json.refs;
    delete json.covers;
    if (refs.length) json.refs = refs;
    if (covers.length) json.covers = covers;
    return format(json);
  });
  const after = lines.join('\n');
  if (after !== before) {
    changed++;
    if (!check) writeFileSync(path, after);
  }
}
console.log(total + ' items: ' + mappedRefs + ' with refs, ' + mappedCovers + ' with covers' + (changed ? (check ? '; ' + changed + ' file(s) out of date' : '; ' + changed + ' file(s) written') : '; up to date'));
process.exit(check && changed ? 1 : 0);
