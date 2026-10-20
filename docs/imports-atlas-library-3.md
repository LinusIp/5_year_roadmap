# The Atlas Library import, third file (pull request #22)

`scratch/import-atlas.ts` upserted the 3,811-row `atlas-resources.jsonl` into `data/`. Its first 3,386 rows are the
file of pull request #21, unchanged: every one found its entry again (`docs/imports-atlas-library.md`,
`docs/imports-atlas-library-2.md`) and nothing was filled. Of the 425 rows it adds, 418 are new
(`data/resources/library-atlas-3.yaml`) and 7 matched an entry the Library had; those kept everything they had and
took only the fields they were missing. No URL was changed.

## The 7 rows the Library already had

| Import id | Library entry | Matched by | Fields filled |
|---|---|---|---|
| `ngspice` | `ngspice` | id | short, fromYear, after, priority |
| `project-f-fpga` | `project-f` | url | after, priority |
| `course-mit-5-60-thermo-kinetics` | `mit-5-60` | url | summary, priority |
| `mit-8-02-spring-2019-teal` | `mit-8-02` | url | (none) |
| `repo-brax` | `brax` | url | short, fromYear, after, priority, roadmap |
| `mit-8-04-quantum-physics-i-2013-adams` | `mit-8-04-adams` | url | short, fromYear, doFirst, priority |
| `course-mitx-8-370-1x` | `mitx-8-370` | url | priority |

## Kept apart

Titles alike enough to match, read by hand and found to be different works (`NOT_SAME`):

| Import id | Library entry | Why |
|---|---|---|
| `fitzpatrick-computational-physics-329` | `newman-computational-physics-chapters` | Fitzpatrick's PHY 329 notes, not Newman's book |
| `tong-topics-in-quantum-mechanics` | `tong-quantum-mechanics` | Tong's Topics in Quantum Mechanics, a course after his Quantum Mechanics |
| `tong-supersymmetric-qm` | `tong-quantum-mechanics` | Tong's Supersymmetric Quantum Mechanics |

Near misses below the threshold were read too and are different works: Susskind's Theoretical Minimum courses
(Cosmology and Black Holes, 2011, is not Cosmology, 2013; Advanced Quantum Mechanics is not Quantum Mechanics), David
Tong's other lecture notes, and IBM's Qiskit tutorials and Composer pages beside its documentation.
