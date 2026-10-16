# Atlas data

This private repository is where [Atlas](https://linusip.github.io/5_year_roadmap/) keeps your learning log and progress. Atlas writes it; you can
read it here, edit it by hand, or take it elsewhere. Every study session is one commit.

| Path | What is in it |
|---|---|
| `state/items.json` | The status, ticked units, notes and links of every course, book, project, paper, certificate and milestone |
| `state/plan.json` | Your edits to the plan: moved and added items, re-plans, the builds you picked |
| `state/settings.json` | Blocks, heatmap thresholds, streak rules and theme. Never the token. |
| `log/YYYY/MM/YYYY-MM-DD.json` | One day: the time logged, blocks done, reflection and energy |
| `log/YYYY/MM/YYYY-MM-DD.md` | The same day to read on GitHub, generated |
| `reviews/` | Weekly (`2026-W41.md`), monthly (`2026-10.md`) and quarterly (`2027-Q1.md`) reviews |
| `projects/` | Each project's write-up, links and checklist, generated |
| `research/` | Your quarterly research reports. Atlas never writes here. |

Editing by hand: keep the JSON valid and the ids as they are. Atlas reads `state/`, `log/` and `reviews/` back
on its next sync; a file it cannot read is left alone and named in Settings. The Markdown day files and project
pages are rewritten from the JSON, so edit the JSON instead.
