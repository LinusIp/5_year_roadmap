# The live formats of 2026-10-18, before the fixed daily schedule

Made by the build that was live before the daily schedule (pull request #9, `1fab4eb`), with its own code, so that
tests/unit/daily-schedule.test.ts switches exactly what a user of that build has:

| File | What |
|---|---|
| `atlas-data/state/settings.json` | Settings (version 3) as GitHub Sync wrote them: the 8 h day of blocks A to E, Core at 90 minutes, a start time on the Full day, a weekly busy class, a day change (Graphics at 19:00 on 20 October) and a schedule history |
| `atlas-data/log/2026/10/2026-10-17.json` | A day with Block A (done) and Block D minutes |
| `backup.json` | Settings › Export of the same data |

To make it again: `git worktree add scratch/old 1fab4eb`, link `node_modules`, copy `generate.ts.txt` to
`scratch/old/tests/unit/zz-live-1018.test.ts` and run it there with `npx vitest run`.
