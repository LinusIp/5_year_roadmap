# The Atlas Library import, sixth file (pull request #27)

`scratch/import-atlas.ts` upserted the 12,744-row `atlas-resources.jsonl` into `data/`. Its first 11,389 rows are the
file of pull request #25, unchanged: every one found its entry again and nothing was filled. Of the 1,355 rows it
adds (515 developer essentials, 840 gap fill), 1,349 are new (`data/resources/library-atlas-6.yaml`) and six matched
an entry the Library had. No URL was changed. Two ids ended in a hyphen, which the schema's slug rule refuses; the
runner trims it (`article-jvns-in-a-git-repository-where-do-your-files`,
`article-github-git-db-internals-iv-distributed`).

## Merged into an entry the Library had

An entry's own fields stay; the import only fills ones it had empty.

| Import id | Library entry | By | Filled |
|---|---|---|---|
| `course-aws-skill-builder` | `aws-skill-builder` | URL | note ("Free tier"), priority, roadmap |
| `learn-go-with-tests` | `learn-go-with-tests` | id | summary, priority |
| `video-mit-6-042j-fall-2010` | `mit-6-042j` | URL (the same OCW page) | nothing |
| `tutorial-scientific-python-lectures` | `scientific-python-lectures` | URL | summary, priority |
| `paper-catto-iterative-dynamics-gdc2005` | `paper-iterative-dynamics` (Papers queue) | URL (the same PDF) | short, summary, level, fromYear, priority, roadmap |
| `paper-baraff-witkin-large-steps-cloth` | `paper-large-steps-cloth` (Papers queue) | URL (the same PDF) | short, summary, level, fromYear, priority, roadmap |

## Kept apart

`paper-pinns-raissi-part2`, "Physics Informed Deep Learning (Part II): Data-driven Discovery of Nonlinear Partial
Differential Equations", matched `paper-pinn`, Part I, by title: the two differ in a bracketed roman numeral, which
the word comparison drops. Roman numerals in brackets now count as numbers, as the years of two SIGGRAPH courses do
(pull request #25), so the pair is two papers.
