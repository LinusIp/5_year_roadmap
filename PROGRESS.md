# Progress

Atlas is built milestone by milestone (brief, section 8). One commit per milestone; this file is updated
with each. "Verified" means it was run, not assumed.

| # | Milestone | Status |
|---|---|---|
| 1 | Scaffold | **done** |
| 2 | Data | **done** |
| 3 | Today + logging | **done** |
| 4 | Heatmap + streaks | **done** |
| 5 | Roadmap | **done** |
| 6 | Library, Papers, Certifications | **done** |
| 7 | Projects | next |
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

## Milestone 5 — Roadmap

- **Timeline**: Stage 1 (software, years 1-3) and Stage 2 (electrical and mechanical, years 4-5), each phase
  a card with its dates, goal, progress and forecast, opening onto five lanes. The phase containing today is
  open and marked "Now".
- **Lanes** show the phase-table focus, their own progress, and hours planned against hours available, with
  over-budget lanes flagged rather than hidden.
- **Items**: title, provider, hours, unit progress, status (to do, in progress, done, dropped), a "blocked"
  mark while a prerequisite is unfinished, and a unit checklist that loads from its own chunk on first open.
  Ticking a unit here moves Today on, and the other way round.
- **Forecast**: at the pace of the last 28 days, when does each lane's remaining work finish, against the
  phase's end? Verdicts are "on track", "N weeks behind", "N weeks early", and — when nothing has been logged
  lately — "no hours logged lately" instead of a made-up date. Each phase shows its projected finish.
- **Re-plan** lays the unfinished work out again from today and shows the diff first: every move, from which
  phase to which, and why. It never drops an item, never places one before a phase holding its prerequisite,
  fills each lane only up to the hours it has, and says plainly what will not fit before 31 August 2031.
- **Editing**: drag to reorder a lane (or the arrow buttons, for the keyboard), add an item from the library
  or a new one of your own, and take items off the roadmap. Edits are stored as patches over the curriculum,
  never as copies of it, and Today schedules from the edited plan.

A bug the tests caught on the way: re-planning moved items between phases but left the ones that stayed at
their old positions, so an item moved in could share `order` 10 with one already there. It now emits those
reorders too, and two property tests pin it down — no two items of a lane ever share a position after
applying, and re-planning an already re-planned roadmap changes nothing.

Verified on this machine:

- `npm test`: 128 unit tests, 31 new — progress maths, the forecast verdicts, the re-planner's three rules
  against the real curriculum, and the user layer over the seed (patches, removals, custom items, a patch
  whose item has gone).
- `npm run test:e2e`: 25 Playwright tests, 8 new — both stages and all six phases, unit ticks moving the
  item, lane and phase bars and Today with them, a status change counting, the forecast appearing once hours
  are logged, re-plan's diff → cancel → apply → no-op, reorder surviving a reload, an added item reaching
  Today, and a removed item staying in the library.

## Milestone 6 — Library, Papers, Certifications

- **Library**: all 191 resources and anything you add, with full-text search (titles, providers, summaries
  and your own notes) and filters for type, track, provider, level, cost and status, all kept in the URL so
  a filtered view can be bookmarked. Items without a verified link carry a "find link" badge.
- **Item pages** (`/library/:id`), for resources and projects alike: status, the full unit checklist, notes
  in Markdown, where the item sits on the roadmap, its prerequisites, the credential-map row it counts
  towards, and editable estimated hours. Your own resources can be deleted; edits to seed resources can be
  undone.
- **Projects** show their brief, acceptance criteria as a checklist, repository, demo and write-up fields,
  and for stage 2 builds the parts list and a budget field. **A project cannot be marked done until its
  repository link is filled in** — on its page and in the Roadmap's status menu — and clearing the link
  reopens it, so the rule keeps holding.
- **Papers**: the reading queue with its four statuses, a three-sentence summary field that counts its
  sentences, "key idea" and "what I would try", the one-a-week cadence from year 2, and the sources to find
  more.
- **Certifications**: cards by year with target quarter, the vendor's price, prep resources, exam link and
  status; a credential link and expiry date once earned, with a renewal warning in the last 90 days. The FE
  exam shows as "check eligibility first", never as a goal. The **credential map** puts every subject beside
  its certificates and portfolio milestones; a milestone follows its linked projects until you set it.
- **Markdown** is rendered by a 150-line renderer that returns React elements and never builds an HTML
  string, so nothing typed into a note can inject markup; links are limited to http(s) and mailto.
- **Pages load on demand**: every page except Today is its own chunk (3 to 28 kB), which brought the main
  chunk back from 818 kB to 729 kB.

Two real bugs the end-to-end tests caught:

- The note preview sat inside a `<button>` (click to edit). Button content is presentational, so a note's
  headings and links were invisible to screen readers, and a link inside a button is invalid HTML. The
  preview is a plain block now; the Write tab switches back.
- A notes field decided between preview and write before the item's state had arrived from IndexedDB, so
  after a reload every saved note showed as raw Markdown. Editors now mount once their value is known. The
  project budget field had the same flaw and got the same fix.

Verified on this machine:

- `npm test`: 154 unit tests, 26 new — the Markdown parser including injection attempts, search ranking,
  the project done rule, the credential map, expiry warnings and the reading cadence.
- `npm run test:e2e`: 38 Playwright tests, 13 new — search and filters in the URL, the find-link path,
  Markdown notes surviving a reload and rendering safely, adding a resource, editable estimates, no
  horizontal scroll at 380 px on seven pages, the repository rule in both places, a paper moving through
  the queue, certificate status reaching the credential map, a milestone following its project, and a
  library item linking to its row in the map.
