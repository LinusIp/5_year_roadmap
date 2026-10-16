/**
 * Exposes the validated curriculum to the app as two virtual modules:
 *
 *   virtual:atlas-seed    everything except the unit checklists, with a `unitCount` on each resource
 *   virtual:atlas-units   the checklists themselves, keyed by resource id
 *
 * The split matters: the 968 unit rows are two fifths of the payload but are only needed once an item is
 * opened, while `unitCount` is enough for every progress bar. The app imports the second module
 * dynamically, so it becomes its own chunk and never delays Today.
 *
 * Two more lazy modules carry what only one screen needs:
 *
 *   virtual:atlas-questions  the practice bank (data/questions/), for the Practice screen
 *   virtual:atlas-docs       the projects' tech docs (data/projects/docs/), for a project's sheet
 *
 * The practice subjects and topics (small) ride in the seed, for Today, Settings and the roadmaps.
 *
 * A schema error or a duplicate id in /data fails `vite build` (and shows the overlay in dev).
 */
import { normalizePath } from 'vite';
import type { Plugin } from 'vite';
import { loadDocs } from './load-docs.ts';
import { loadQuestions } from './load-questions.ts';
import { parseDoc } from '../../src/lib/project-doc.ts';
import { DATA_DIR, loadSeedOrThrow, splitSeed } from './load-seed.ts';

export { splitSeed } from './load-seed.ts';

const SEED_ID = 'virtual:atlas-seed';
const UNITS_ID = 'virtual:atlas-units';
const QUESTIONS_ID = 'virtual:atlas-questions';
const DOCS_ID = 'virtual:atlas-docs';
const RESOLVED = new Map([SEED_ID, UNITS_ID, QUESTIONS_ID, DOCS_ID].map((id) => [id, '\0' + id]));

function questionsOrThrow() {
  const { bank, errors } = loadQuestions();
  if (!bank) throw new Error('The question bank in data/questions/ is invalid:\n  - ' + errors.join('\n  - '));
  return bank;
}

/** JSON.parse of a string literal starts up markedly faster than a large object literal. */
function asModule(value: unknown): string {
  return 'export default JSON.parse(' + JSON.stringify(JSON.stringify(value)) + ');';
}

export function atlasSeed(): Plugin {
  return {
    name: 'atlas-seed',
    resolveId(id) {
      return RESOLVED.get(id);
    },
    load(id) {
      if (![...RESOLVED.values()].includes(id)) return undefined;
      const seed = loadSeedOrThrow();
      if (id === RESOLVED.get(QUESTIONS_ID)) return asModule(questionsOrThrow());
      if (id === RESOLVED.get(DOCS_ID)) return asModule(loadDocs(seed).docs);
      const { app, units } = splitSeed(seed);
      if (id !== RESOLVED.get(SEED_ID)) return asModule(units);
      // A doc's milestones are checkboxes that count toward the project's progress, so the count rides in the seed.
      const { docs } = loadDocs(seed);
      const projects = app.projects.map((p) => {
        const count = docs[p.id] ? (parseDoc(docs[p.id]!).doc?.milestones.length ?? 0) : 0;
        return count > 0 ? { ...p, milestoneCount: count } : p;
      });
      return asModule({ ...app, projects, practiceSubjects: questionsOrThrow().subjects });
    },
    configureServer(server) {
      server.watcher.add(DATA_DIR);
      const onChange = (file: string): void => {
        if (!normalizePath(file).includes('/data/') || !(file.endsWith('.yaml') || file.endsWith('.md'))) return;
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
