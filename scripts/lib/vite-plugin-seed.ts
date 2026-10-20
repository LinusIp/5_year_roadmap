/**
 * Exposes the validated curriculum to the app as two virtual modules:
 *
 *   virtual:atlas-seed    everything except the unit checklists, with a `unitCount` on each resource, and except
 *                         the Library's long tail
 *   virtual:atlas-units   the checklists themselves, keyed by resource id
 *   virtual:atlas-library the resources only the Library shows (`splitLibrary`, ATLAS-LIBRARY), loaded right after
 *                         the first screen
 *
 * The split matters: the 968 unit rows are two fifths of the payload but are only needed once an item is
 * opened, while `unitCount` is enough for every progress bar. The app imports the second module
 * dynamically, so it becomes its own chunk and never delays Today.
 *
 * More lazy modules carry what only some screens need:
 *
 *   virtual:atlas-docs       the projects' tech docs (data/projects/docs/), for a project's sheet
 *   virtual:atlas-catalogue  the three-tier project catalogue (data/projects/*.jsonl), every field
 *   virtual:atlas-catalogue-index  one small entry per catalogue item, for Today, the Deck and the Library list
 *   virtual:atlas-designs    a loader per bucket; virtual:atlas-designs/<n> holds the designs of bucket n
 *
 * A schema error or a duplicate id in /data fails `vite build` (and shows the overlay in dev).
 */
import { normalizePath } from 'vite';
import type { Plugin } from 'vite';
import { loadCatalogue } from './load-catalogue.ts';
import { loadDesigns } from './load-designs.ts';
import { loadDocs } from './load-docs.ts';
import { DESIGN_BUCKETS, designBucket } from '../../src/seed/design.ts';
import { entryOf } from '../../src/seed/catalogue.ts';
import { parseDoc } from '../../src/lib/project-doc.ts';
import { DATA_DIR, loadSeedOrThrow, splitLibrary, splitSeed } from './load-seed.ts';

export { splitSeed } from './load-seed.ts';

const SEED_ID = 'virtual:atlas-seed';
const UNITS_ID = 'virtual:atlas-units';
const LIBRARY_ID = 'virtual:atlas-library';
const DOCS_ID = 'virtual:atlas-docs';
const CATALOGUE_ID = 'virtual:atlas-catalogue';
const CATALOGUE_INDEX_ID = 'virtual:atlas-catalogue-index';
const DESIGNS_ID = 'virtual:atlas-designs';
const BUCKET_IDS = Array.from({ length: DESIGN_BUCKETS }, (_, n) => DESIGNS_ID + '/' + n);
const RESOLVED = new Map([SEED_ID, UNITS_ID, LIBRARY_ID, DOCS_ID, CATALOGUE_ID, CATALOGUE_INDEX_ID, DESIGNS_ID, ...BUCKET_IDS].map((id) => [id, '\0' + id]));

/** JSON.parse of a string literal starts up markedly faster than a large object literal. */
function asModule(value: unknown): string {
  return 'export default JSON.parse(' + JSON.stringify(JSON.stringify(value)) + ');';
}

export function atlasSeed(): Plugin {
  // Read once for all sixteen bucket modules; a change under /data clears it.
  let designsRead: ReturnType<typeof loadDesigns> | null = null;
  return {
    name: 'atlas-seed',
    resolveId(id) {
      return RESOLVED.get(id);
    },
    load(id) {
      if (![...RESOLVED.values()].includes(id)) return undefined;
      if (id === RESOLVED.get(DESIGNS_ID)) {
        // One dynamic import per bucket, so each becomes its own chunk.
        return 'export default [' + BUCKET_IDS.map((b) => '() => import(' + JSON.stringify(b) + ')').join(', ') + '];';
      }
      const seed = loadSeedOrThrow();
      const bucket = BUCKET_IDS.findIndex((b) => RESOLVED.get(b) === id);
      if (bucket >= 0) {
        designsRead ??= loadDesigns(seed, loadCatalogue(seed).items);
        const { designs, errors } = designsRead;
        if (errors.length > 0) throw new Error('The designs in data/projects/design/ are invalid:\n  - ' + errors.join('\n  - '));
        return asModule(Object.fromEntries(Object.entries(designs).filter(([key]) => designBucket(key) === bucket)));
      }
      if (id === RESOLVED.get(DOCS_ID)) return asModule(loadDocs(seed).docs);
      if (id === RESOLVED.get(CATALOGUE_ID) || id === RESOLVED.get(CATALOGUE_INDEX_ID)) {
        const { items, errors } = loadCatalogue(seed);
        if (errors.length > 0) throw new Error('The project catalogue in data/projects/*.jsonl is invalid:\n  - ' + errors.join('\n  - '));
        return asModule(id === RESOLVED.get(CATALOGUE_ID) ? items : items.map(entryOf));
      }
      const { app, units } = splitSeed(seed);
      if (id === RESOLVED.get(UNITS_ID)) return asModule(units);
      const { core, library } = splitLibrary(app);
      if (id === RESOLVED.get(LIBRARY_ID)) return asModule(library);
      // A doc's milestones are checkboxes that count toward the project's progress, so the count rides in the seed.
      const { docs } = loadDocs(seed);
      const projects = core.projects.map((p) => {
        const count = docs[p.id] ? (parseDoc(docs[p.id]!).doc?.milestones.length ?? 0) : 0;
        return count > 0 ? { ...p, milestoneCount: count } : p;
      });
      return asModule({ ...core, projects });
    },
    configureServer(server) {
      server.watcher.add(DATA_DIR);
      const onChange = (file: string): void => {
        if (!normalizePath(file).includes('/data/') || !(file.endsWith('.yaml') || file.endsWith('.md') || file.endsWith('.jsonl'))) return;
        designsRead = null;
        for (const resolved of RESOLVED.values()) {
          const mod = server.moduleGraph.getModuleById(resolved);
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('change', onChange);
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}
