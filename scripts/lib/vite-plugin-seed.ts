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
 * A schema error or a duplicate id in /data fails `vite build` (and shows the overlay in dev).
 */
import { normalizePath } from 'vite';
import type { Plugin } from 'vite';
import { DATA_DIR, loadSeedOrThrow } from './load-seed.ts';
import type { Seed, Unit } from '../../src/seed/schema.ts';

const SEED_ID = 'virtual:atlas-seed';
const UNITS_ID = 'virtual:atlas-units';
const RESOLVED = new Map([
  [SEED_ID, '\0' + SEED_ID],
  [UNITS_ID, '\0' + UNITS_ID],
]);

export function splitSeed(seed: Seed): { app: unknown; units: Record<string, Unit[]> } {
  const units: Record<string, Unit[]> = {};
  const resources = seed.resources.map((resource) => {
    const { units: list, ...rest } = resource;
    if (list && list.length > 0) units[resource.id] = list;
    return { ...rest, unitCount: list?.length ?? 0 };
  });
  return { app: { ...seed, resources }, units };
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
      if (id !== RESOLVED.get(SEED_ID) && id !== RESOLVED.get(UNITS_ID)) return undefined;
      const { app, units } = splitSeed(loadSeedOrThrow());
      return asModule(id === RESOLVED.get(SEED_ID) ? app : units);
    },
    configureServer(server) {
      server.watcher.add(DATA_DIR);
      const onChange = (file: string): void => {
        if (!normalizePath(file).includes('/data/') || !file.endsWith('.yaml')) return;
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
