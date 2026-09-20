# Progress

Atlas is built milestone by milestone (brief, section 8). One commit per milestone; this file is updated
with each. "Verified" means it was run, not assumed.

| # | Milestone | Status |
|---|---|---|
| 1 | Scaffold | **done** |
| 2 | Data | **done** |
| 3 | Today + logging | next |
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

## Milestone 2 — Data

The whole curriculum of the brief is now in `/data`, as YAML that the app reads and you can edit.

| | |
|---|---|
| Phases | 6 (Y1-P0, Y1-P1, Y2, Y3, Y4, Y5), covering 2026-09-21 to 2031-08-31 with no gap |
| Resources | 191 courses, books, lecture series and repositories |
| Plan items | 183 across five lanes and six phases |
| Projects | 220: 5 capstones, 56 numbered monthly builds, 9 block A builds, 19 spare build-your-own-x cards, and 135 weekly mini-builds (41 of them stage 2) |
| Papers | 42 in four groups, plus 14 places to find more |
| Certifications | 41 cards |
| Credential map | 28 subjects, every one with a certificate or a portfolio milestone, most with both |
| Unit checklists | 968 lecture, chapter and lab rows across 38 courses |

How the links were handled (brief, section 7):

- Every URL in `/data` was fetched and its page title compared with the resource before it was written
  down. Where that could not be done, the entry has `url: null`, a `searchHint` and a note saying what
  happened. Four entries are in that state: IBM Quantum Learning (the platform refuses this machine), MIT
  2.006 (not on OCW or MIT Learn), the MITx 6.002x certificate (the edX page no longer resolves) and
  Shadertoy (bot challenge).
- `npm run check:links` checks all 1,211 URLs, including every unit link. 1,208 answer 200. The three that
  answer 403 — nandland.com, realtimerendering.com and the Feynman Lectures — are bot challenges; each was
  opened in a browser and its card says so. The check never fails the build.
- The 968 unit rows were read from the courses' own syllabus pages by `npm run fetch:units`, not typed out.
- Certification names, prices and availability were read off each vendor's page; `cost: null` means the
  vendor did not publish a price there. Worth knowing: IBM retired the Qiskit v0.2X certification on
  2025-09-30 and replaced it with the v2.X exam; MITx has moved from edX to MIT Learn and the 6.002x
  certificate page no longer resolves (that card is marked "investigate"); AWS is mid-rotation on two exam
  versions; SOLIDWORKS now calls the CSWA "Design Associate"; Autodesk's tiers are Associate, Professional
  and Expert. The discontinued TensorFlow Developer Certificate is absent, and `validate:data` rejects it
  if anyone adds it back.

Verified on this machine:

- `npm run validate:data`: valid, 0 errors, 0 warnings.
- `npm test`: 38 unit tests pass, 12 of them asserting the brief's own promises against the real
  curriculum — the stage split, credential coverage, the three cadences, prerequisite order, and that no
  unverified link is stored.
- `npm run build` passes. The bundle is 594 kB (172 kB gzipped); the 968 unit rows are split into a chunk
  that loads only when an item is opened.
