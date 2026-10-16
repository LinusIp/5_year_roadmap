/**
 * node scripts/check-design.ts [id ...] [--quiet]
 *
 * Checks data/projects/design/<id>.yaml against src/seed/design.ts (scripts/lib/load-designs.ts): its shape, and the
 * rules for its weight. With ids, only those; without, every design and the items that should have one.
 */
import { loadCatalogue } from './lib/load-catalogue.ts';
import { loadDesigns } from './lib/load-designs.ts';
import { loadSeedOrThrow } from './lib/load-seed.ts';

const args = process.argv.slice(2);
const wanted = args.filter((a) => !a.startsWith('--'));
const seed = loadSeedOrThrow();
const { items } = loadCatalogue(seed);
const { designs, errors } = loadDesigns(seed, items, undefined, wanted.length > 0 ? wanted : undefined);
for (const e of errors) console.log(e);
if (!args.includes('--quiet')) for (const id of Object.keys(designs)) console.log(id + ': ok');
console.log(Object.keys(designs).length + ' designs read, ' + errors.length + ' problem' + (errors.length === 1 ? '' : 's'));
process.exitCode = errors.length > 0 ? 1 : 0;
