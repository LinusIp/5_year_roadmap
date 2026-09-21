import { defineConfig } from 'vitest/config';
import { atlasSeed } from './scripts/lib/vite-plugin-seed.ts';

// The user lives in UTC+5. Every day-boundary test runs in that zone so that a
// regression to UTC-based dates fails loudly (00:30 local is still "yesterday" in UTC).
process.env.TZ = 'Asia/Tashkent';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [atlasSeed()],
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    environment: 'node',
    setupFiles: ['tests/unit/setup.ts'],
  },
});
