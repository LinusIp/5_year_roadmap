/**
 * Exposes the validated curriculum as `virtual:atlas-seed`.
 * A schema error or a duplicate id in /data fails `vite build` (and shows the overlay in dev).
 */
import { normalizePath } from 'vite';
import type { Plugin } from 'vite';
import { DATA_DIR, loadSeedOrThrow } from './load-seed.ts';

const VIRTUAL_ID = 'virtual:atlas-seed';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

export function atlasSeed(): Plugin {
  return {
    name: 'atlas-seed',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const seed = loadSeedOrThrow();
      // JSON.parse of a string literal is markedly faster to start up than a large object literal.
      return 'export default JSON.parse(' + JSON.stringify(JSON.stringify(seed)) + ');';
    },
    configureServer(server) {
      server.watcher.add(DATA_DIR);
      const onChange = (file: string): void => {
        if (!normalizePath(file).includes('/data/') || !file.endsWith('.yaml')) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('change', onChange);
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}
