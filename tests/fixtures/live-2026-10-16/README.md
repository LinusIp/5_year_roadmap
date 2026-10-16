# The live formats of 2026-10-16, with Practice

Made by the build that was live with Practice (pull request #5, `af1e1b3`), with its own code, so that
tests/unit/live-upgrade.test.ts loads exactly what a user of that build has after Practice is removed:

| File | What |
|---|---|
| `atlas-data/state/settings.json` | Settings as GitHub Sync wrote them: block P (`role: practice`) in the blocks, every template, the layout's order, a pace and the schedule history, and `core.practice` with Start with |
| `atlas-data/state/practice.json` | Two practice answers |
| `atlas-data/log/2026/10/2026-10-16.json` | A day with Practice minutes on block P |
| `backup.json` | Settings › Export of the same data (backup format 1), practice answers and a review with P minutes included |

To make it again: `git worktree add scratch/old af1e1b3`, link `node_modules`, copy `generate.ts.txt` to
`scratch/old/tests/unit/zz-live-1016.test.ts` and run it there with `npx vitest run`.
