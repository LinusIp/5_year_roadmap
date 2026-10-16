# The live formats of 2026-10-08

Made by the build that was live before the briefs of 2026-10-16 (`main` at 941cdec), with its own code, so that
tests/unit/live-upgrade.test.ts upgrades exactly what an existing user has:

| File | What |
|---|---|
| `indexeddb.json` | The IndexedDB as Dexie left it: version 20 (Dexie version 2), every store, index and row |
| `backup.json` | Settings › Export of the same data (backup format 1) |
| `atlas-data/` | The files GitHub Sync wrote to the data repository: settings without a version, plan.json version 1, items, three days, a review, a project |

The data: two item states, a project shipped with its repository, a paper, three days of log (one entry removed,
so a tombstone), a block's minutes and the streak changed, the theme, a plan item moved and one removed, a resource
of the user's, the week's build, a finished weekly review, and changes still waiting in the outbox.

To make it again: `git worktree add scratch/old 941cdec`, link `node_modules`, copy `generate.ts.txt` to
`scratch/old/tests/unit/zz-live-fixture.test.ts` and run it there with `npx vitest run`.
