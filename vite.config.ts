import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { atlasSeed } from './scripts/lib/vite-plugin-seed.ts';
import { atlasServiceWorker } from './scripts/lib/vite-plugin-sw.ts';

// Relative base: the build works under https://<user>.github.io/<repo>/ and at any other
// path without a rebuild. Routing is hash-based, so deep links survive static hosting.
export default defineConfig({
  root: import.meta.dirname,
  base: './',
  plugins: [atlasSeed(), react(), tailwindcss(), atlasServiceWorker()],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  server: { port: 5173, strictPort: false },
  preview: { port: 4173, strictPort: true },
});
