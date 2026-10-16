# Atlas: master instructions for a new coding agent

You are taking over **Atlas**, a working learning-platform repository (React + TypeScript + Vite, GitHub Pages, GitHub Sync). Earlier agents built it. Your job has three steps: **look first, then do the work below, then push everything to GitHub.**

## Rules (all stages)

- **Never** run drive, volume, partition or label commands. Write multi-line scripts as files in the git-ignored `scratch/` folder and run the file. No backticks or heredocs in cmd/PowerShell.
- Don't break what works:
  - A fresh install still looks like the mockups.
  - Existing user data (IndexedDB and the `atlas-data` repo) must load and migrate, never be lost.
  - The redesign acceptance tests and Lighthouse accessibility 100 must keep passing.
- Never invent URLs. Anything you add goes through the existing link verifier, or is stored as `url: null` with a search hint.
- Ask the user only before something irreversible. Otherwise decide, and record the decision in DECISIONS.md.

## Step 0: Put the briefs in the repo

The user gives you these files. Copy them into `briefs/` at the repo root and commit them first as "Add briefs":

| File | What it is |
|---|---|
| `MASTER-PROMPT.md` | this file |
| `FLEXIBILITY-PROMPT.md` | flexible schedule, plan editing, pace, layout |
| `PRACTICE-AND-PROJECTS-PROMPT.md` | Practice block (linear algebra, calculus, physics until 31 Jan 2027), new resources, tech docs for existing projects |
| `catalogue/daily-easy.jsonl` | 254 easy coding challenges |
| `catalogue/weekly-medium.jsonl` | 112 medium coding challenges + 250 medium builds |
| `catalogue/monthly-advanced.jsonl` | 304 advanced real-case projects |
| `catalogue/*.md` | the same three catalogues in readable form, for reference only |

## Step 1: Look first (no code changes yet)

1. Read README.md, PROGRESS.md and DECISIONS.md, every file in `briefs/`, `git log --oneline -30`, the `data/` folder and the source tree. Read the schema and validator files first.
2. Run the build, `validate:data`, unit tests, e2e tests, and `verify:questions` if it exists. Record the baseline counts.
3. Write `briefs/PLAN.md`. It must cover:
   - **Current state:** what exists, test counts, anything already broken.
   - **Conflicts between briefs,** and how you'll resolve them. The resolutions below are binding.
   - **Ordered task list** for Steps 2–4, each task with its branch name and done check.
   - **Risks:** data migrations, sync format changes, bundle size, list performance with ~1,700 projects.
4. Commit PLAN.md and push. Then continue straight on; don't wait for approval.

**Binding resolutions:**
- **Supersede the project table.** In PRACTICE-AND-PROJECTS-PROMPT.md, the table "Add these new projects" (section 3) is **superseded by the catalogue**; don't add those 42. Its other parts still apply: the Practice block, the resources, and a full tech doc for every *existing* project.
- **Kinds of work and difficulty:** daily = easy, weekly = medium, monthly = advanced.
  - Daily and weekly coding challenges are algorithm-style.
  - Weekly builds are medium mini-projects.
  - Monthly projects are real-case projects (AI, inference, services, systems and networking, graphics, DevOps/architecture/security, hardware).
- **Practice block vs coding:** the math/physics Practice block stays separate from all coding blocks. Coding challenges never appear in it.

## Step 2: Flexibility
Implement `briefs/FLEXIBILITY-PROMPT.md` in full, on branch `flex`.

## Step 3: Practice, resources, tech docs for existing projects
Implement `briefs/PRACTICE-AND-PROJECTS-PROMPT.md` on branch `practice`, applying the resolutions above.

## Step 4: The three-tier project catalogue
On branch `catalogue`.

### Import and schema
- **Copy** the three JSONL files to `data/projects/` and add loaders.
- **Extend the project schema** with:
  - `kind`: `challenge | build | case`
  - `difficulty`: `easy | medium | advanced`
  - the new cadence `daily`
  - the fields each kind carries:
    - **challenge:** `topic, statement, input, output, constraints, examples, hints, approach, complexity, edgeCases, tags, estMinutes`
    - **build:** `level, stack, goal, approach[], doneWhen, measure, pitfalls, parts?, prereq?, domain`
    - **case:** `scenario, functional, nonFunctional, constraints, architecture, components, stack, data, milestones, deliverables, doneWhen, measure, pitfalls, stretch, parts?, domain`
  - Inspect a few lines of each file to confirm the exact shapes, especially `architecture`, `components` and `measure`, and normalise them in the loader.
- **`validate:data`:**
  - ids are unique across the catalogue and all existing projects
  - difficulty matches cadence
  - challenge examples are present
  - case milestones sum to `estHours`
  - every `prereq` resolves
  - no URLs anywhere in text
- **Existing projects** keep their numbering, phases, capstones and user state. The catalogue is a **pool**, not plan items.
- Add `refs` (resource ids) and `covers` (roadmap nodes) with a reviewed keyword-mapping script. Leave them empty when unsure; never invent ids.

### Where each tier lives

**Daily easy challenge**
- A row inside **Block B (languages)**: "Daily challenge · Merge the meeting slots · easy · 25 min".
- It's picked deterministically per date from unsolved easy challenges, rotating topics. Offer the language of the current Block B item as the suggested language.
- After all 254 are done, cycle again with "solve in another language".
- **Skip** gives another pick, up to 3 times a day. **Not today** hides it. A setting turns the daily challenge off.

**Challenge screen**
- Shows statement, input/output, constraints and examples.
- **Hints** reveal one at a time. **Show approach** reveals the approach and complexity.
- Has a notes field, a solution link field, and **Mark solved** (the screen's one filled button).
- Optional runner: if Pyodide can be lazy-loaded without growing the main bundle, add "Run my Python against the examples". Otherwise skip it and note that in DECISIONS.md.

**Weekly medium**
- Block D gets a **weekly slot**: one medium build per week, plus one medium challenge, shown on the weekend by default and configurable.
- A build needs a repo URL to be done. A challenge doesn't.

**Monthly advanced**
- A real-case project in Block D's **monthly queue**, alongside the plan's existing monthly projects.
- The project sheet renders the case as a brief tech doc: scenario, requirements, constraints, architecture, data, milestones as checkboxes, deliverables, done when, measure, pitfalls, stretch, and parts for hardware.
- Keep "Copy as README skeleton". A case needs a repo URL to be marked done.

### Finding and picking
- **Deck:** Daily / Weekly / Monthly chips (or "Easy · Medium · Advanced"), domain or topic chips, and This phase / Earlier / Everything. Shuffle, Skip and Take it as before.
- **Library → Projects:** search plus filters for kind, difficulty, domain or topic, track, phase, level and hours. Virtualise the list, since it holds about 1,700 items with everything included.
- **Activity → Projects:**
  - solved and done counts per tier and domain
  - challenge topics with solve rates
  - the daily-challenge streak, kept separate from the study streak

### Tests
- **Unit:**
  - loaders and normalisation
  - validator errors
  - daily pick: deterministic, no repeats until exhausted, topic rotation, skip limit
  - weekly slot logic
  - Deck filters
  - refs and covers
- **E2E:**
  - solve today's challenge (hints, approach, mark solved) inside Block B
  - take and finish a weekly build with a repo URL
  - take a monthly case, tick milestones, copy the README skeleton
  - filter Library to advanced Y2 inference cases
  - everything survives reload and two-device sync on the fake GitHub
- **Screenshot baselines:** challenge screen, case sheet, Deck with Daily selected.
- **Lighthouse:** accessibility stays at 100 on the long Library list.

## Step 5: Ship
For each stage:
1. Merge into `main` only when the build, `validate:data`, `verify:questions`, unit tests and e2e tests are all green locally.
2. Push.
3. Wait for CI and the Pages deploy to pass.
4. Check that the live site serves the new build, using the in-app update prompt if the service worker holds the old one.

After the last stage:
- Update README, PROGRESS.md and DECISIONS.md.
- Make sure `git status` is clean, then push all branches and tags.
- Confirm that `main` on GitHub equals your local `main`.

**Finish with a short summary:**
- what shipped in each step
- catalogue counts per tier, kind and domain
- questions per subject
- resources added, and how many failed verification
- test counts
- links to the CI and deploy runs
- anything you couldn't verify
