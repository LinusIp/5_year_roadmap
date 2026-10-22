# The Atlas Library import, seventh file (pull request #29)

`scratch/import-atlas.ts` upserted the 13,839-row `atlas-resources.jsonl` into `data/`. Its first 12,744 rows are the
file of pull request #27, unchanged: every one found its entry again and nothing was filled. Of the 1,095 rows it
adds (1,017 electrical, mechanical, nuclear, chemical and aerospace engineering, 69 physics simulation, 9 robotics),
1,094 are new (`data/resources/library-atlas-7.yaml`) and one matched an entry the Library had. No URL was changed.
Every new row is dated 2026-10-21 and all but 78 carry priority 4.

| Shelf | Added | Before | After |
|---|---|---|---|
| Courses | 212 | 833 | 1,045 |
| Books | 76 | 504 | 580 |
| Papers | 44 | 4,382 | 4,426 |
| Articles (with docs and tutorials) | 456 | 3,965 | 4,421 |
| Blogs | 15 | 366 | 381 |
| Practice | 291 | 2,752 | 3,043 |

Resources: 12,751 to 13,845. By track: engineering 397 to 1,413, simulation 326 to 395, robotics 517 to 526. By
type: 291 practice, 190 docs, 176 articles, 121 video courses, 91 courses, 90 tutorials, 76 books, 44 papers, 15
blogs. The 69 simulation rows serve the game-developer roadmap; the rest name no roadmap and no research area.

## Merged into an entry the Library had

An entry's own fields stay; the import only fills ones it had empty.

| Import id | Library entry | By | Filled |
|---|---|---|---|
| `ocw-mit-3-091sc-sadoway-2010` | `mit-3-091` (`data/resources/physics.yaml`) | URL (the same OCW page) | priority |

`edx-cornellx-engineering-simulations` has the URL of the CornellX certificate in `data/certs.yaml`; a certificate is
not a Library entry, so the course is a new row and the certificate keeps its own.

## A prerequisite that names itself

`linuxcnc-kinematics` gives its own short title, "LinuxCNC Kinematics", as what to read first. A resource cannot
come after itself (the schema refuses it), so the runner leaves that one as text in "Do first", as it does any
`after` it cannot resolve. 731 of the new rows got a soft prerequisite the Library resolves; 142 keep the text.

## Links

The new rows' links were checked by a one-off `links-atlas-7` job on the pull request; the report is in
DECISIONS.md ("The Atlas Library's seventh file"). No URL was changed; nothing is marked until someone has opened it.
