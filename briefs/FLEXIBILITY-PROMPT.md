# Make Atlas flexible (paste into the coding agent in the existing repo)

Atlas works, but it assumes the same 8-hour day, a fixed plan, a fixed pace and a fixed layout. Real life has university days, exam weeks, rest days, changed interests and weeks where you fall behind. Make four things flexible: the **daily schedule**, the **plan and curriculum**, the **pace**, and the **layout**.

## Ground rules

- **Defaults don't change.** A fresh install must look and behave exactly like today's build and the mockups. Every new option lives behind an "Edit" or "Change" action inside a sheet, never as new clutter on the main screens. Today keeps exactly one filled button.
- **Nothing is ever lost.** Removing a plan item marks it `dropped` (restorable); every plan edit can be undone; logged history is never rewritten by a schedule change.
- **User edits are an overlay on the seed curriculum**, never edits to the seed itself, so curriculum updates from the repo still merge in and the user's changes survive them.
- **Everything new syncs.** Schedule, plan edits, pace settings and layout go into `state/settings.json` and `state/plan.json` in the data repo with the existing merge rules. Bump the settings schema to v2 with a migration from v1, covered by tests.
- **Shell rules as before:** no drive, volume or label commands; scripts go in `scratch/` as files; no backticks or heredocs in cmd/PowerShell.
- Work on a branch `flex`, push it as you go, merge to `main` only when build, unit and e2e are green, then confirm CI, the Pages deploy and the live site.

## 1. Daily schedule

**Day templates.** A template is a named list of blocks with minutes, e.g.:

| Template | Blocks |
|---|---|
| Full day (default) | A 2 h · B 1 h · C 2 h · D 2 h · E 1 h |
| University day | A 1 h · B 30 m · C 1 h · E 30 m |
| Weekend | A 2 h · C 2 h · D 3 h |
| Exam week | B 30 m · E 1 h |
| Rest day | none |

- Ship these five; the user can add, rename, duplicate and delete templates.
- **Weekly pattern:** each weekday gets a template (default: Full day every day, Sunday as today's review behaviour).
- **Date overrides:** pick a date or a range and give it a template ("Exam week 12–19 Dec", "Rest day 31 Dec"). Overrides beat the weekly pattern.
- **Blocks are open-ended:** add a block, rename it, recolour it, pick its track, delete it. A–E stay as the defaults.

**Changing today** (one quiet "Change today" action on Today, opening a sheet):
- switch today's template;
- change one block's minutes;
- skip a block (it disappears from Later today for this date only);
- move a block to tomorrow or swap two blocks' items;
- mark today a rest day.

**What depends on the schedule:**
- Today's "X of Y h" and the weekly target come from the day's template, not a fixed 8 h / 56 h.
- Streak rule becomes: a day counts if the user logs **≥ 60 min or ≥ 50 % of that day's planned minutes**, whichever is lower (both numbers editable). Rest days and days with 0 planned minutes never break the streak and don't use freezes.
- Heatmap intensity is relative to the day's plan (0 / <25 % / <60 % / <100 % / ≥100 %), with an option to switch back to absolute minutes.
- Forecasts use planned minutes per lane per day from the schedule, so an exam week visibly pushes finish dates.

## 2. Plan and curriculum, editable in the app

All of this from Plan and Library, no YAML editing:

- **Add** any Library item to a lane at a chosen position ("Add to plan" in the item sheet → pick phase, lane, position).
- **Remove** an item (status `dropped`, shown in a collapsed "Dropped" group with Restore).
- **Reorder** within a lane (drag on desktop, long-press then drag on phone, plus "Move up / Move down" for keyboard users).
- **Swap** an item for an alternative. Add an optional `alternatives: [resourceId]` field to seed items and fill it for the obvious cases (fast.ai ↔ CS231n, learncpp ↔ A Tour of C++, vkguide ↔ vulkan-tutorial, CS229 ↔ Ng's ML Specialization, Stat 110 ↔ 6.041, SolidWorks ↔ Fusion/Onshape). The sheet shows alternatives first, then search.
- **Create custom** resources, projects, papers and tracks (title, link, hours, units as a pasted list, tracks, credential row). Custom items carry `source: "user"` and get the same validation as seed items.
- **Edit phases:** rename, change dates (later phases shift, with a diff preview), add a phase, split a phase, change a lane's focus text.
- **Goals:** user-defined goals with a date and linked items or roadmap nodes ("Ship my inference server by 30 June 2028"). Plan → Timeline shows each goal once as a row with on track / at risk, computed from the forecast.
- **Undo:** every plan edit pushes onto an undo stack (last 50), with a toast "Moved CS231n to Year 2 · Undo".
- Prerequisites stay enforced: an edit that would schedule an item before its prerequisite shows the conflict and offers to move the prerequisite too.

Storage: a list of patches in `plan.json` (`add`, `drop`, `restore`, `move`, `swap`, `editPhase`, `addPhase`, `custom`, `goal`), applied in order over the seed at load. Seed items a patch refers to but that no longer exist are reported once in Settings, never crash.

## 3. Pace and catch-up

- **Per-lane pace** in the lane sheet: normal, relaxed (−25 %), intense (+25 %), or a custom minutes-per-day that overrides the template for that lane.
- **Pause a lane** from a date, with a resume date or "until I resume". While paused, its minutes go to a chosen lane (default: the highest-priority active lane, using the roadmap priority inference → architecture → graphics) or to free time.
- **Stretch or compress a phase**: drag its end date or type it; preview the diff of what moves.
- **Carry-over, not debt:** unfinished planned minutes don't pile onto tomorrow. They go into a per-lane "behind by" figure. Catch-up is opt-in with a cap: "Add up to 30 min/day to this lane until caught up".
- **Re-plan offers three choices** with a preview diff, never applied silently:
  1. push dates back;
  2. redistribute across lanes;
  3. drop or defer lowest-priority items (by roadmap priority, then optional items first).
- **Ahead of schedule:** when a lane finishes early, offer "Start the next item now" or "Give the time to another lane".
- The Sunday weekly review shows one pace suggestion at most ("Core is 9 days behind — stretch Foundations II by a week?") with Apply / Not now.

## 4. Layout and views

Settings → **Layout**, with a live preview of Today:

- **Today:** toggle the stats line, the Later today list, the weekly-review line and the footer; choose **Compact** (titles only) or **Detailed** (titles plus meta and progress line); choose what "Now" picks (first unfinished block, or a fixed order you set).
- **Tabs:** pick 3–5 tabs from Today, Plan, Library, Activity, Projects, Map, Reviews, and their order. Today is always first.
- **Blocks:** rename, recolour (from the track palette, contrast-checked), reorder.
- **Plan:** default segment (Timeline / Projects / Papers / Credentials / Roadmaps); show or hide dropped items.
- **General:** first day of week, 24 h or 12 h time, density (comfortable / compact, which only changes row padding and stays ≥ 44 px tap targets), theme (light / dark / system).
- Everything has "Reset to default", per section.

## Tests and docs

- **Unit:**
  - template resolution (weekday pattern vs date override vs today's change);
  - planned-minutes and target maths;
  - the new streak rule incl. rest days;
  - relative heatmap levels;
  - patch application over the seed (each patch type, missing references, order);
  - undo;
  - prerequisite conflicts;
  - pause and redistribution;
  - the three re-plan strategies;
  - the catch-up cap;
  - settings v1 → v2 migration;
  - sync merge of the new settings and plan files.
- **E2E:**
  - change today to University day and see the targets change;
  - skip and move a block;
  - add an exam-week override and see the forecast shift;
  - add, reorder, swap, drop and restore a plan item, then undo;
  - create a custom resource and goal;
  - pause a lane and resume it;
  - accept a re-plan preview;
  - switch to compact Today and change tabs;
  - reset layout;
  - all of it surviving a reload and a two-device sync against the fake GitHub.
- The redesign acceptance tests must still pass with defaults. Add a screenshot baseline for Today in compact mode and for the Change today sheet.
- Update README (a "Making it yours" section with screenshots), DECISIONS.md and PROGRESS.md.

Finish with a short summary: what changed, test counts, anything you couldn't verify, and where each new option lives in the app.
