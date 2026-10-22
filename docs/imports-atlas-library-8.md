# The Atlas Library import, eighth file (pull request #30)

`scratch/import-atlas.ts` upserted the 14,547-row `atlas-resources.jsonl` into `data/`. Its first 13,839 rows are the
file of pull request #29, unchanged: every one found its entry again and nothing was filled. All 708 rows it adds are
new (`data/resources/library-atlas-8.yaml`); none matched an entry the Library had, by id, URL, checked pair or
title. No URL was changed. The rows are dated 2026-10-21 (643) and 2026-10-22 (65).

| Shelf | Added | Before | After |
|---|---|---|---|
| Courses | 38 | 1,045 | 1,083 |
| Books | 35 | 580 | 615 |
| Papers | 332 | 4,426 | 4,758 |
| Articles (with docs and tutorials) | 207 | 4,421 | 4,628 |
| Blogs | 2 | 381 | 383 |
| Practice | 94 | 3,043 | 3,137 |

Resources: 13,845 to 14,553. By track: engineering 1,413 to 1,846, simulation 395 to 531, math and physics 407 to
494, hardware 329 to 376, AI 4,577 to 4,582. By type: 332 papers, 106 articles, 94 practice, 86 docs, 35 books, 29
courses, 15 tutorials, 9 video courses, 2 blogs. Priority: 433 rows at 4, 183 at 3, 87 at 2, 5 at 1. The 136
simulation rows serve the game-developer roadmap and the five AI rows ai-engineer; eight name world models and four
diffusion as their research area. 529 rows got a soft prerequisite the Library resolves; 85 keep the text.

What they are: the energy and extreme physics cluster of the prompt. NASA technical reports (68) on radioisotope and
space nuclear power and propulsion; the CERN Accelerator School (20) and CERN on particle accelerators;
semiconductor physics and devices; conductors and superconductors; compact and aneutronic fusion with direct energy
conversion; thermoelectrics, thermophotovoltaics, thermionics, MHD and Stirling conversion; pulsed power and
high-energy-density physics at Sandia, Los Alamos and INL; materials for extreme environments; high-power storage
and high-voltage engineering, with OSHA and IEEE IRDS references.

## Where they show

"Compact power & energy conversion" (`src/lib/energy.ts`) grows from 75 to 388 resources: engineering 201,
simulation 96, math and physics 83, hardware 6, mechanical 2. On the Engineering path the area chips now read
Electronics & PCB 446, Power & energy 375, Chemical & nuclear 281, Aerospace 227, Thermo-fluids 213, Mechanics 211,
Design & CAD 204, Control 209, Materials 180, Practice 171 by keyword and 353 on the shelf, Manufacturing 109, over
1,895 resources; 208 name no area.

## Links

The new rows' links were checked by a one-off `links-atlas-8` job on the pull request; the report is in
DECISIONS.md ("The Atlas Library's eighth file"). No URL was changed; nothing is marked until someone has opened it.
