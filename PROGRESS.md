# Progress

Atlas is built milestone by milestone (brief, section 8). One commit per milestone; this file is updated
with each. "Verified" means it was run, not assumed.

| # | Milestone | Status |
|---|---|---|
| 1 | Scaffold | **done** |
| 2 | Data | next |
| 3 | Today + logging | |
| 4 | Heatmap + streaks | |
| 5 | Roadmap | |
| 6 | Library, Papers, Certifications | |
| 7 | Projects | |
| 8 | Reviews + stats, export/import, backup reminder, PWA/offline | |
| 9 | Optional GitHub integration + `log:export` | |
| 10 | Polish | |

## Milestone 1 — Scaffold

Built:

- Vite 8 + React 19 + TypeScript 7 + Tailwind CSS 4. Runtime dependencies: `react`, `react-dom`, `dexie`,
  `dexie-react-hooks`, `zod`. Nothing else ships to the browser.
- Hash router (`src/router`), responsive layout: sidebar from 1024 px, bottom bar + "More" sheet below it,
  down to 380 px. Skip link, focus moves to the page on navigation, one visible focus style.
- Theme: dark by default, light available, no flash on load; the choice is stored with the settings in
  IndexedDB.
- Dexie database (`src/db/db.ts`) with every user-state table, and Zod schemas for all of it
  (`src/db/types.ts`) so a backup import can be validated before it touches the database.
- Zod schemas for the curriculum (`src/seed/schema.ts`), the cross-file validator
  (`src/seed/validate.ts`), the YAML loader, `npm run validate:data`, and the Vite plugin that serves the
  validated curriculum to the app.
- Real `data/tracks.yaml`, `data/settings.yaml` and `data/phases.yaml`. The other files are empty lists
  until milestone 2, so the brief's content quotas are switched off by one constant
  (`REQUIRE_COMPLETE` in `scripts/lib/load-seed.ts`) and switched on with the data.
- Generated service worker + web manifest + icons (registration is wired in milestone 8).
- CI (`.github/workflows/ci.yml`): validate data, typecheck, unit tests, build, Playwright smoke tests.
  Deploy (`deploy.yml`): build and publish to GitHub Pages on every push to `main`.

Verified on this machine:

- `npm run build` passes (validate:data, typecheck, vite build, service worker generated).
- `npm test`: 26 unit tests pass (validator rules, hash routing, service worker behaviour, data model).
- `npm run test:e2e`: 3 Playwright smoke tests pass against the production build (navigation, theme
  persistence across reload, no horizontal overflow at 380 px).
- Looked at it in a browser in both themes, at 1280 px and at 380 px.

Needs you, once: in the GitHub repository, **Settings > Pages > Build and deployment > Source = "GitHub
Actions"**. Until that is set, the deploy workflow fails at its last step.
