# PLAN: flexibility, practice, the three-tier catalogue

Written on 2026-10-16, after Step 1 (look first) of `MASTER-PROMPT.md`. Nothing in the app had been changed
when this was written.

## 1. Current state

**What exists.** Atlas is a local-first React 19 + TypeScript 7 + Vite 8 PWA with Dexie/IndexedDB, Zod-validated
YAML curriculum served as build-time virtual modules (`virtual:atlas-seed`, lazy `virtual:atlas-units`), a
hand-written hash router and service worker, and GitHub Sync to a private `atlas-data` repository
(`state/items.json`, `state/plan.json`, `state/settings.json`, `log/…`, `reviews/…`, `projects/…`). Plan edits are
already an overlay over the seed (`overrides` + `customEntities` tables, applied by `resolveSeed` in
`src/lib/plan.ts`), and a re-plan already exists (one strategy: push overflow into later phases).

| | Count |
|---|---|
| Resources | 291 |
| Plan items | 231 (12,431 h) |
| Projects | 245: 82 numbered (1–82), 28 other monthly/research/capstone, 135 weekly mini-builds |
| Papers, certs, credential rows | 92, 42, 29 |
| roadmap.sh roadmaps | 5 (553 nodes) |

**Baseline, measured on this machine (Linux, Node 24, Chromium 140 from `/opt/pw-browsers`):**

| Check | Result |
|---|---|
| `npm run validate:data` | valid, 0 errors |
| `npm run typecheck` | clean |
| `npm test` | **222 passed** (19 files) |
| `vite build` | passes; main chunk 288 kB (92 kB gz), seed chunk 615 kB (165 kB gz), units 206 kB |
| `npm run test:e2e` | **74 passed, 4 failed**. The 4 are the screenshot comparisons, whose baselines were drawn by Edge on Windows; CI skips them (`process.env.CI`), so CI's count is 74/74. Not a regression. |
| `verify:questions` | does not exist yet |

**Already broken or missing:** nothing functional. Two environment facts shape the work:

- **No outbound web access here.** The agent proxy refuses every host outside the package registries, and
  WebFetch cannot resolve them either. The link verifier cannot confirm any new page, so every new resource is
  stored as `url: null` with a `searchHint` (the briefs' own fallback), and the summary will say so.
- **Branches.** This session may only push to its designated branch, `claude/new-session-2cjn2k`. The stages are
  built in order on that branch (one commit series per stage, `flex` → `practice` → `catalogue`); local `flex`,
  `practice` and `catalogue` branches mark each stage's end but are not pushed. Merging into `main` (which is what
  triggers CI and the Pages deploy) needs the user's go-ahead, asked for at the end. CI only runs on `main` and
  on pull requests, so "wait for CI and the deploy" cannot be done from here without that.

## 2. Conflicts between the briefs, and how they are resolved

Binding (from MASTER-PROMPT):

1. **The 42-project table** in PRACTICE-AND-PROJECTS §3 is superseded by the catalogue. Not added. The Practice
   block, the resources and the tech docs for existing projects still apply.
2. **Daily = easy, weekly = medium, monthly = advanced.** Daily and weekly challenges are algorithm-style; weekly
   builds are medium mini-projects; monthly cases are real-case projects.
3. **Practice stays separate from coding.** Challenges never appear in the Practice block; practice minutes never
   count toward coding blocks.

Found while reading, decided here (each also goes into DECISIONS.md):

4. **"Defaults don't change" vs the Practice block.** FLEXIBILITY says a fresh install looks exactly like today;
   PRACTICE adds a sixth row and makes the default day 8 h 45 min while practice runs. Resolution: the Practice
   block exists only between `practice.start` (the ship date, 2026-10-16) and `practice.end` (2027-01-31). Every
   existing acceptance and screenshot test pins the clock to 2026-09-21, before `practice.start`, so they keep
   testing the unchanged default. Today must still fit one 390 × 844 screen with six rows; if it does not, the
   "Later today" list gets tighter, not the mockup's Now card.
5. **The verify script "in `scratch/`"** vs `scratch/` being git-ignored (CI could never run it). Resolution:
   `scripts/verify-questions.py`, tracked, run by `npm run verify:questions`; CI installs SymPy and NumPy.
6. **"Every project gets a doc" ("~84")**: there are 82 numbered projects and 28 other monthly, research and
   capstone cards. Docs are written for all **110 non-weekly** projects. The 135 weekly mini-builds are one-line
   cards; they stay without docs (the catalogue's 250 medium builds now carry that role with structured fields).
7. **Open-ended blocks** (FLEXIBILITY) vs `BlockId = 'A'…'E'` across the schemas, day logs, reviews and sync.
   Resolution: a block id becomes any short id (`/^[A-Z][A-Z0-9]{0,7}$/`); A–E stay the defaults and P is the
   Practice block. Old data stays valid because the new rule is a superset.
8. **Pyodide runner.** Atlas promises no network calls outside GitHub Sync, and Pyodide is ~10 MB fetched from a
   CDN. Bundling it would dwarf the app. Resolution: skipped; DECISIONS.md says why.
9. **Catalogue tracks** use `inference` and `research`, which are not Atlas tracks. Resolution: the loader maps
   `inference → ai` and `research → ai`; the original domain survives in `domain`.
10. **Catalogue phase ids** are written `Y1-P0`; Atlas uses `y1-p0`. The loader lower-cases them.
11. **"No URLs anywhere in text"** for the catalogue: checked as `http(s)://` and `www.`; bare tool names such as
    `draw.io` (in `svc-stride-threat-model`'s stack) are not links.
12. **The doc template's ASCII diagram** is indented by two spaces in the example, which Markdown would reflow.
    Docs put the diagram in a fenced code block.
13. **The example doc's references** (`p-orca`, `p-pagedattn`, `a-anyscale-cb`, `a-kipply`) are not catalogue ids.
    References must resolve (validator), so docs cite only ids that exist.

## 3. Ordered task list

Done check for every stage: `npm run build`, `npm run validate:data`, `npm run verify:questions` (from stage 3),
`npm test`, `npm run test:e2e` green locally; then commit and push to the session branch.

### Stage 2: flexibility (branch `flex`)

| # | Task | Done check |
|---|---|---|
| F1 | **Schema widening.** `BlockId` → short id; `MinutesByBlock` → record; day logs, reviews, timer, sync accept any block. | old backups and fixtures still parse (unit) |
| F2 | **Settings v2.** `version: 2`; `core.templates` (Full day, University day, Weekend, Exam week, Rest day), `core.pattern` (7 weekdays), `schedule.overrides` (date ranges), `schedule.days` (per-date changes: template, minutes, skip, move, swap, rest), blocks with colour and track, streak `percent`, heatmap `mode`, per-lane `pace`, `pauses`, `catchUp`, `layout`, `practice`. Defaults in `data/settings.yaml`. **v1 → v2 migration** on read and on pull, Full day built from the user's own v1 minutes. | migration tests; fresh install equals today's build (e2e acceptance) |
| F3 | **Day resolution** (`src/lib/day-plan.ts`): weekday pattern < date override < today's change. `planForDay`, targets, weekly target and Today's "X of Y h" from it. | unit: resolution order, planned-minutes maths |
| F4 | **Streak, heatmap, forecast** on planned minutes: counts at ≥ min(60 min, 50 % of plan); rest/0-plan days never break and spend no freeze; relative heatmap levels with an absolute switch; forecast uses per-lane planned minutes per day (pace, pauses, overrides). | unit |
| F5 | **Change today** sheet (one quiet action on Today): switch template, change one block's minutes, skip, move to tomorrow, swap two blocks' items, rest day. | e2e |
| F6 | **Schedule editor** in Settings: templates (add, rename, duplicate, delete), weekly pattern, date overrides, blocks (add, rename, recolour, track, delete, reorder). | e2e |
| F7 | **Plan patches.** New `planPatches` table and `state/plan.json` v2 with `patches` (`add`, `drop`, `restore`, `move`, `swap`, `editPhase`, `addPhase`, `custom`, `goal`), applied in order over the seed. DB v3 converts existing plan-item overrides and custom plan items into patches; a v1 `plan.json` from another device is converted on pull. Missing references reported once in Settings. | unit: each patch type, order, missing refs, migration, sync |
| F8 | **Plan editing UI**: add to plan (phase, lane, position), drop/restore (collapsed "Dropped" group), reorder (drag, long-press, Move up/down), swap (alternatives first, then search; `alternatives` seeded for the six named pairs), custom resources/projects/papers/tracks, phase edits (rename, dates with diff preview, add, split, lane focus), goals with on track/at risk on the Timeline, prerequisite conflicts with "move the prerequisite too". **Undo**: last 50 edit groups, toast with Undo. | unit + e2e |
| F9 | **Pace**: per-lane pace (normal/relaxed/intense/custom), pause with redistribution, stretch/compress a phase, "behind by" carry-over, opt-in catch-up cap, re-plan with three strategies and a preview diff, ahead-of-schedule offer, one pace suggestion in the Sunday review. | unit + e2e |
| F10 | **Layout** settings with live Today preview: Today toggles, compact/detailed, Now order; 3–5 tabs; Plan default segment, show dropped; week start, 12/24 h, density, theme; per-section reset. | e2e |
| F11 | Tests, screenshot baselines (compact Today, Change today sheet), README "Making it yours", DECISIONS, PROGRESS. | all green |

### Stage 3: practice, resources, tech docs (branch `practice`)

| # | Task | Done check |
|---|---|---|
| P1 | **Question bank format**: `data/questions/<subject>/<topic>.yaml`, Zod schema, `SCHEMA.md`; params/let/require templates; types mc, numeric (tolerance, units), expression, vector/matrix (up to scale), multipart (chained), proof (self-graded), estimate (factor). Lazy `virtual:atlas-questions` chunk. | validate:data |
| P2 | **Engine** (`src/lib/practice/`): seeded sampler, mathjs evaluation and unit conversion, checkers, set builder (deterministic per date, 3 subjects in order, 2 new + 1 review each, ±1 difficulty window, topic progression at 15 questions ≥ 80 %, 18.06 lecture tracking), spaced repetition (1, 3, 7, 21, 60 days), Elo per topic. mathjs and KaTeX load only with Practice. | unit |
| P3 | **`npm run verify:questions`**: Node draws 200 parameter sets per template with the app's own engine and writes what the app would show; `scripts/verify-questions.py` recomputes each with SymPy/NumPy from an independent `verify` expression. Added to CI. | passes; a planted wrong answer fails it (unit) |
| P4 | **Content**: ≥ 200 questions or templates per subject (≥ 600), every topic at difficulties 1–4, ≥ 40 % templates. Written originally; OCW adaptations attributed. Parallel writers, one per subject half. | verify:questions, validate:data |
| P5 | **Practice block P** (45 min; per template; only between `practice.start` and `practice.end`), Today row, question screen (Check is the one filled button, Hint, Show solution, Next), set summary and Done logging minutes to P only, Library → Practice on demand, `state/practice.json` synced, Activity → Practice segment, roadmap auto-ticks at ≥ 85 % over the last 20. | e2e incl. 1 Feb 2027 clock |
| P6 | **Resources**: the ~35 listed, typed, mapped to tracks and question topics, `url: null` + `searchHint` (no web access here). | validate:data |
| P7 | **Tech docs** for all 110 non-weekly projects in `data/projects/docs/<id>.md` (exact template, Parts and budget for stage 2 hardware), lazy chunk, rendered in the project sheet, milestone checkboxes counting toward progress, "Copy as README skeleton". validate:data checks every section and that milestone hours add up to estHours. | validate:data + e2e |
| P8 | Tests, screenshot baselines (question, solution, summary), docs. | all green |

### Stage 4: the catalogue (branch `catalogue`)

| # | Task | Done check |
|---|---|---|
| C1 | Copy the three JSONL files to `data/projects/`; schema for `challenge`, `build`, `case`; loader normalisation (phase ids, tracks, `measure` string-or-list → list, `parts` string-or-list → list, milestone ids); validator rules (unique ids across everything, difficulty ↔ cadence, examples present, milestones = estHours, prereqs resolve, no URLs). Lazy chunk plus a small index for Today. | validate:data, unit |
| C2 | `refs` and `covers` by a reviewed keyword-mapping script (`scripts/map-catalogue.ts`), written into the JSONL; empty when unsure. | unit |
| C3 | **Daily challenge** row in Block B (deterministic pick per date, topic rotation, no repeats until exhausted, "solve in another language" cycle, Skip ×3, Not today, setting to turn off, suggested language from Block B's item), **challenge screen** (hints one at a time, Show approach, notes, solution link, Mark solved), daily-challenge streak. | unit + e2e |
| C4 | **Weekly slot** in Block D (one medium build + one medium challenge, weekend by default, configurable; build needs a repo URL). **Monthly queue** with cases rendered as a tech doc, milestone checkboxes, README skeleton, repo URL to finish. | unit + e2e |
| C5 | **Deck** chips (Daily/Weekly/Monthly, domain/topic, This phase/Earlier/Everything); **Library → Projects** with search, filters and a virtualised list (~1,700 rows); **Activity → Projects** counts, topic solve rates, daily streak. | unit + e2e, Lighthouse a11y 100 on the long list |
| C6 | Tests, screenshot baselines (challenge, case sheet, Deck on Daily), README/PROGRESS/DECISIONS, final summary. | all green |

## 4. Risks

- **Data migrations.** Settings v1 → v2 and plan overrides → patches touch every existing install. Mitigation:
  migrations are pure functions with unit tests on real v1 shapes (including a v1 backup and a v1 `plan.json`
  from another device); the old tables are read, never deleted, in the Dexie upgrade; backups keep
  `formatVersion` 1 readable and import v1 files through the same migration.
- **Sync format changes.** A device on the old build reading `settings.json` v2 or `plan.json` v2 would refuse
  them (strict schemas) and report "could not be read" rather than corrupt anything. New fields are additive
  where possible; the formats carry `version` so the next reader knows.
- **Bundle size.** mathjs (~170 kB gz) and KaTeX (~75 kB gz + fonts) load only with Practice; the question bank,
  the tech docs and the 920-item catalogue each get their own lazy chunk. Today loads a small catalogue index for
  the daily row. Target: main chunk grows by under 40 kB gz.
- **List performance with ~1,700 projects.** Library → Projects uses a windowed list (fixed row height, only
  visible rows mounted) and precomputed lower-cased search text; filters run on the index, not on full records.
- **Today's one-screen rule** with a sixth (Practice) and the daily-challenge row. Measured by the existing
  acceptance test with the clock inside the practice period.
- **Content correctness.** 600+ questions written in bulk. Every answer is recomputed by SymPy over 200 draws per
  template; a question without a `verify` expression fails validation (proofs excepted).
- **Scope.** Each stage is large. Order is fixed (flex → practice → catalogue); content writers run in parallel
  with the code so the stages do not wait on each other.
