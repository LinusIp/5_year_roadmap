# Atlas

A local-first personal learning platform for one five-year plan (2026-09-21 to 2031-08-31). It answers
one question every morning: **what exactly do I do in my 8 hours today?**

No backend, no account, and no network calls unless you turn on the optional GitHub calendar. Everything
you log stays in your browser (IndexedDB) and can be exported to a single JSON file.

> Build status: see [PROGRESS.md](PROGRESS.md). Choices and assumptions: see [DECISIONS.md](DECISIONS.md).

## Run it

Requires Node 22.18 or newer (the scripts use Node's built-in TypeScript support).

```bash
npm i
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload; editing a file under `data/` reloads the app. |
| `npm run build` | `validate:data`, then typecheck, then the production build into `dist/`. |
| `npm test` | Unit tests (Vitest), run in UTC+5 on purpose. |
| `npm run test:e2e` | Builds, then runs the Playwright smoke tests against the production build. |
| `npm run validate:data` | Validates everything under `data/`. Fails on schema errors, duplicate ids, dangling references. |
| `npm run check:links` | Requests every URL in `data/` and prints a report. Never fails the build. |
| `npm run log:export` | Writes each logged day from a backup to `learning-log/YYYY/MM/DD.md` (see below). |
| `npm run fetch:units` | Rebuilds the lecture and chapter checklists from the courses own syllabus pages. |

## Deploy

Pushing to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`). One-time setup in
the repository: **Settings > Pages > Build and deployment > Source = "GitHub Actions"**.

## GitHub (optional)

Both halves are off until you use them.

**Your GitHub calendar beside the Atlas one.** In Settings > GitHub, paste a
[fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) with no
permissions added: reading your contribution calendar needs none. Atlas checks it with GitHub, then keeps
it in this browser's IndexedDB. It is never exported, never written to the repository, and sent only to
`api.github.com`. The Activity page then draws your contributions under the Atlas heatmap, over the same
days and in the same columns, and counts the days both were active. The calendar is cached for an hour and
stays visible offline.

**A public learning log.** To keep your GitHub graph green with honest work, export a backup (Settings >
Export everything), then run:

```bash
npm run log:export
```

It reads the newest `atlas-backup-*.json` in this folder or in your Downloads folder (or the file you name),
and writes one Markdown file per day with time logged: `learning-log/YYYY/MM/DD.md`, with what you worked
on, for how long, and what you finished and shipped. Reflections and energy ratings stay out unless you add
`--reflections`. Days without time get no file, and unchanged days are not rewritten, so each commit shows
only what is new. `learning-log/` is ignored by this repository: make it a repository of its own (the script
prints the commands) and push it to a public one. `--out <folder>` writes somewhere else, such as a clone you
already have.

## Editing the curriculum

Everything you study lives in `data/`, as YAML. Nothing about it is hard-coded in the app, and your logs,
statuses and notes reference items by id, so editing the curriculum never loses them.

| File | What is in it |
|---|---|
| `data/phases.yaml` | The six phases, and the focus of each lane in each |
| `data/plan.yaml` | Which item sits in which lane of which phase, in order |
| `data/resources/*.yaml` | Courses, books, lecture series and repositories |
| `data/units/*.yaml` | The lecture, chapter and lab checklist of one resource (the file name is its id) |
| `data/projects/*.yaml` | Capstones, monthly builds and the weekly mini-build pool |
| `data/papers.yaml`, `data/paper-sources.yaml` | The reading queue, and where to find more |
| `data/certs.yaml`, `data/subjects.yaml` | Certifications, and the credential map |
| `data/settings.yaml` | The defaults a fresh install starts from |

After an edit, run `npm run validate:data`. It fails on a schema error, a duplicate id, a dangling
reference, a prerequisite cycle, an item planned before its prerequisite, or a roadmap item with no row in
the credential map. Two rules are worth knowing up front:

- **ids must be unique across resources, projects, papers and certs**, because a log entry references them
  without saying which kind it means;
- **a URL is either verified or absent.** Set `url: null` with a `searchHint` rather than writing down a
  link you have not opened; the app then shows the item with a "find link" badge.
