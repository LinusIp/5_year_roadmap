# The Atlas Library import, fifth file (pull request #25)

`scratch/import-atlas.ts` upserted the 11,389-row `atlas-resources.jsonl` into `data/`. Its first 10,436 rows are the
file of pull request #24, unchanged: every one found its entry again (`docs/imports-atlas-library-4.md` and the
earlier lists) and nothing was filled, except one. Of the 953 rows it adds, all 953 are new
(`data/resources/library-atlas-5.yaml`): none matched an entry by URL, and the eleven that matched one by title were
read and are other works. No URL was changed.

## Two bracketed years are two offerings

Eight of the eleven title matches were SIGGRAPH's "Advances in Real-Time Rendering in Games" courses of 2015 to 2022
against the Library's 2023 course: the years sit in brackets, which the word comparison drops. The numbers of two
bracketed parts now have to agree before titles are compared, as the numbers of the words already did ("GPU Gems 2"
and "GPU Gems 3"); a title without brackets beside one with brackets says nothing. Every title match of the earlier
imports holds under the rule but one: MIT 8.02's Spring 2007 offering (`mit-802-electricity-magnetism`) had merged
into the Library's `mit-8-02`, whose page is the Spring 2019 offering, and is its own row now, as 6.851's Spring 2014
videos and 15-721's Spring 2024 lectures are beside their courses (pull request #24). That makes 954 rows added.

## Kept apart

| Import id | Library entry | Why |
|---|---|---|
| `video-callen-intro-plasma-physics` | `course-epfl-plasma-physics-intro` | Callen's lectures, not EPFL's course |
| `docs-crfm-helm` | `docs-helm` | HELM, the evaluation framework, not Helm, the Kubernetes package manager |
| `nersc-roofline-docs` | `docs-roofline-crd` | NERSC's roofline page, not Berkeley Lab's |

The eight SIGGRAPH courses are apart by the rule above.
