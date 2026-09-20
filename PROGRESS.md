# Progress

Atlas is built milestone by milestone (brief, section 8). One commit per milestone; this file is updated
with each. "Verified" means it was run, not assumed.

| # | Milestone | Status |
|---|---|---|
| 1 | Scaffold | **done** |
| 2 | Data | **done** |
| 3 | Today + logging | **done** |
| 4 | Heatmap + streaks | **done** |
| 5 | Roadmap | next |
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

## Milestone 3 — Today and logging

Today answers the question the app exists for: what exactly do I do in my 8 hours today?

- **Five block cards**, each showing the specific item that block is on, down to the next lecture,
  chapter or lab: Block E to MIT 18.06 to "Lecture 1: The geometry of linear equations (1 of 35)". Each
  lane is an ordered queue and a block is on its first unfinished item, so falling behind never makes
  work disappear. When a lane runs out, the next phase's is pulled forward and the card says so.
- **Logging**: a start/stop timer (one at a time, stored in the database so it survives a reload), typed
  minutes that accept `90`, `1h30` or `1.5h`, a "done" toggle per block, and a "unit done" button that
  ticks the current lecture and moves the card on to the next.
- **Quick-add** for anything off the plan, with its own track, block and minutes.
- **The day's numbers**: minutes logged against the 8-hour target, the week against 56 hours, the streak
  with its at-risk warning, and blocks finished.
- **End of day**: a one-line reflection, an energy rating of 1 to 5, and a freeze-day checkbox.
- **Sundays** replace the projects block with the weekly review and paper reading, as the brief asks.
- Any past day can be opened and edited with the arrows in the header.

Two details worth recording:

- **Every date is a local calendar date.** In UTC+5, `toISOString()` calls 00:30 on the 21st "the 20th",
  which would file late-night work under the wrong day and break the streak. `src/lib/dates.ts` never
  touches UTC, and the tests run in Asia/Tashkent so a regression fails loudly.
- **Writes are shown before they land.** IndexedDB is fast but asynchronous, and a controlled checkbox
  bound straight to a live query snaps back for a frame after every click. `useOptimistic` holds the value
  the user chose until the stored one catches up.

Verified on this machine:

- `npm test`: 81 unit tests, 43 of them new — local dates and DST, the streak and freeze rules, heatmap
  levels, and the scheduler against the real curriculum.
- `npm run test:e2e`: 11 Playwright tests. The eight new ones drive the real UI with the clock pinned to
  2026-09-21 in UTC+5 and check the brief's acceptance criteria: the five blocks and their items, logging
  by hand and by timer, a unit tick moving the card on, the quick-add, a reflection and freeze surviving a
  reload, a full day turning the streak on, and Sunday's review.
- `npm run build` passes. Main chunk 723 kB (210 kB gzipped) plus the 191 kB unit chunk (29 kB gzipped),
  which now materialises because Today loads it.

## Milestone 4 — Heatmap and streaks

- **The grid**: one SVG rect per day, columns are weeks, 53 columns to a year, five intensity steps at the
  thresholds from Settings (0, 1-119, 120-299, 300-419, 420+). Every cell is a real button, so the grid is
  reachable by keyboard and reads its day and total to a screen reader.
- **Year switcher** for 2026 to 2031, plus an all-five-years view that stacks one grid per year with that
  year's totals. The first and last years are clipped to the plan, so 2026 starts on 21 September.
- **Track filter**: sixteen chips, each with its track's colour. Filtering recounts the minutes, so a day
  can drop from level 4 to level 1, and the cell's label still says what the whole day came to.
- **Click a day** for its detail: minutes per block, the items touched, free-text entries, the reflection
  and the energy rating, with a link that opens that day on Today for editing.
- **Counters**: current streak (with an at-risk warning), longest streak, total logged, and freezes spent
  this month out of the allowance.
- **Freeze days** are drawn with a dashed outline rather than a colour, so they read as "held" rather than
  as a small amount of work.
- **Hours per track and per block** under the grid, each track in its own colour.

The choice worth recording: the ramp is a single blue hue, not GitHub's green, because intensity encodes
magnitude. Both ramps pass the ordinal checks against their own surface — monotone lightness, visible
steps, and a lightest step that still clears 2:1. A track filter changes which minutes are counted, never
the hue, so "more time" always reads the same way.

Verified on this machine:

- `npm test`: 97 unit tests, 16 of them new (grid geometry, week-start rows, intensity levels, the track
  filter, freeze marking, month labels, the whole 1,806-day plan in one grid).
- `npm run test:e2e`: 17 Playwright tests, 6 new — an empty state instead of a blank grid, 8 hours logged
  turning a cell to the top intensity and the streak to 1, the day detail and its edit link, the track
  filter, the stacked all-years view, and a freeze day's marking.
- Looked at it with 100 days of generated logs, then cleared them.
