# The Atlas Library import, eighteenth file: the coverage pass (pull request #55)

The 7,740-row `atlas-resources.jsonl` is the 7,679-row file after the audit's coverage pass: every track was checked
for every resource type (blog, course, video course, book, article, tutorial, docs, paper, practice), and
engineering by sub-area (electrical, mechanical, aerospace, fusion and accelerators, nuclear, materials). 61 new
verified 4–5★ rows fill the thin cells, and 23 existing rows changed in place: 13 moved to the track they belong to,
2 were retyped and 8 had their `why` reworded so the engineering sub-chips find them. 7,482 of the 7,740 rows (96.7%)
are rated 4 or 5. No row was removed.

`scratch/import-atlas.ts` upserted it into `data/`: 7,678 rows found their entry again (7,444 by id, 194 by URL, 37 by
title on the same shelf, 3 by a checked pair), 2 were left out as before (the Unity certifications the plan already
tracks), and 60 are new (`data/resources/library-atlas-18.yaml`; 4 paid). The 61st new row, Seeing Theory's
tutorial row, is the Library's `seeing-theory` already (the same URL), so it merged into it.

| Shelf | Before | After |
|---|---|---|
| Courses | 800 | 815 |
| Books | 760 | 765 |
| Papers | 2,320 | 2,319 |
| Articles (with docs and tutorials) | 2,444 | 2,470 |
| Blogs | 194 | 210 |
| Tools | 40 | 40 |
| Practice | 1,225 | 1,224 |

Resources: 7,691 to 7,751 (and the 92 papers of the reading queue). By track: quantum 121 to 141, engineering 890 to
915, DevOps 245 to 255, game dev 138 to 146, robotics 250 to 255, simulation 277 to 280, math 389 to 381, systems
1,033 to 1,031, architecture 576 to 575; the others are unchanged. By roadmap: software-architect 1,082 to 1,089,
game-developer 708 to 719, ai-engineer 1,782 to 1,785, none 3,188 to 3,227; ai-agents and inference-engineering are
unchanged. Paid rows: 300 to 304.

**Changed in place.** For the changed ids the file's track, type, why, priority and quality were taken, progress kept
by id (the Library's own import files hold 22 of the 23):

- To quantum: `notes-aaronson-democritus`, `course-ibm-basics-quantum-information`,
  `course-ibm-fundamentals-quantum-algorithms`, `docs-qiskit`, `paper-de-wolf-quantum-lecture-notes`,
  `course-berkeley-cs191-vazirani`, `notes-childs-quantum-algorithms`, `quantum-country`,
  `preskill-ph219-quantum-computation` (from math and systems).
- To engineering: MIT 22.01 (`course-mit-22-01-nuclear-eng`, from math).
- To DevOps: Pro Git (`book-pro-git`, from systems, with the file's roadmap, software-architect) and Accelerate
  (`book-accelerate`, from architecture).
- Retyped: Shewchuk's conjugate-gradient explainer (`paper-cg-without-agonizing-pain`) from paper to article, Lode's
  raycasting tutorial (`lode-raycasting`) from practice to tutorial (an article on the Library's shelves).
- `why` reworded: MIT 16.842, Hutchinson's thin-film fracture notes, Elmer's GUI tutorials, Ciechanowski's gears,
  Cornell SimCafe, Ellis' print tuning guide, BYU's flexible machines course, the modal-space articles.
- **Not changed**: the Missing Semester. The file's `course-missing-semester` is the plan's own `missing-semester`
  (`data/resources/cs-core.yaml`, the same URL, on the plan in Block B), and the curated rows keep their finer
  fields, as in every import: its track stays `swe`. It gained the file's roadmap, which it lacked.

The rows that came after a row the last pass removed now carry that row's name as their "do first" text, a field
they lacked (25 rows).

**Grades.** Priority and quality from the file on every row it matches: 7 entries took a new grade.

## Coverage: 4–5★ rows per track and type

The file's tracks and types, as the coverage pass counted them (inference is its own track in the file; the Library
files it under AI with the inference tag). Every cell holds at least 3.

| Track | blog | course | video-course | book | article | tutorial | docs | paper | practice |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ai | 33 | 42 | 49 | 93 | 183 | 34 | 70 | 1114 | 349 |
| architecture | 18 | 14 | 20 | 51 | 205 | 7 | 116 | 62 | 46 |
| devops | 7 | 8 | 4 | 10 | 41 | 15 | 106 | 7 | 13 |
| engineering | 35 | 129 | 59 | 156 | 119 | 45 | 135 | 133 | 111 |
| gamedev | 8 | 4 | 11 | 12 | 56 | 7 | 16 | 11 | 21 |
| graphics | 9 | 20 | 8 | 11 | 59 | 23 | 37 | 55 | 59 |
| hardware | 7 | 13 | 8 | 14 | 9 | 13 | 33 | 62 | 46 |
| inference | 12 | 7 | 9 | 9 | 121 | 54 | 120 | 238 | 121 |
| languages | 14 | 16 | 21 | 62 | 80 | 24 | 136 | 41 | 67 |
| math | 14 | 39 | 50 | 154 | 25 | 3 | 7 | 58 | 16 |
| quantum | 7 | 9 | 4 | 9 | 6 | 5 | 13 | 80 | 8 |
| robotics | 9 | 7 | 7 | 10 | 7 | 5 | 25 | 124 | 55 |
| simulation | 6 | 18 | 10 | 25 | 8 | 25 | 58 | 55 | 81 |
| systems | 32 | 43 | 42 | 101 | 148 | 40 | 156 | 267 | 188 |

## Coverage: the Engineering path's sub-chips

The 4–5★ rows of the engineering track each chip finds (title and summary; Practice is the Practice shelf), and the
blogs among them. Every chip has well over 3 rows. The pass checked its own sub-areas (electrical, mechanical,
aerospace, fusion and accelerators, nuclear, materials), which do not line up with the Library's eleven chips: four
chips have fewer than 3 blogs, **Thermo-fluids (2), Design & CAD (2), Manufacturing (2) and Control (0)**, so the data
can be filled there.


| Engineering sub-chip | 4–5★ rows | of them blogs |
|---|---:|---:|
| Mechanics | 144 | 4 |
| Materials | 100 | 3 |
| Thermo-fluids | 93 | 2 |
| Design & CAD | 98 | 2 |
| Manufacturing | 44 | 2 |
| Electronics & PCB | 262 | 15 |
| Power & energy | 197 | 8 |
| Control | 98 | 0 |
| Aerospace | 162 | 5 |
| Chemical & nuclear | 214 | 7 |
| Practice | 220 | 6 |

## The quick filters

No quick filter, area chip or track filter shows 0. The ones this file moved: Aerospace 231 to 238, Fusion &
accelerators 268 to 276, Mechanics & materials 454 to 466, Compact power & energy conversion 197 to 202, Scientific
computing 213 to 218, Research & science 534 to 526 (the quantum rows left math for quantum, and Physics 169 to 161
with them), Research skills 83 to 86, Build & ship 112 to 113 (Game builds 8 to 9); on the Engineering path every
chip grew (Mechanics 138 to 144 … Chemical & nuclear 209 to 219); Blogs by track: engineering 22 to 35, graphics 14
to 16, robotics 8 to 9; the Quantum path's list 121 to 141, DevOps' 245 to 255.

## Links

`npm run check:links -- --in data/resources/library-atlas-18.yaml` ran on the pull request's runner in a one-off
`links-atlas-18` job (run 42187018201), since the container cannot resolve the hosts; the job is removed before the merge.
60 distinct URLs of the new rows: 53 ok, 1 failed, 6 to check by hand.

- **Failed**: CMU 15-466's course page on graphics.cs.cmu.edu, a TLS error (the runner could not verify the site's
  certificate chain), not a missing page. Open it in a browser before changing anything; nothing here edits the data.
- **Check by hand** (403, the site turned the checker away): MathWorks (Moler's "Stiff Differential Equations"),
  Sergey Levine's Substack essay, OpenFOAM's tutorial guide, TMS (the JOM article on the Titanic's steel), symmetry
  magazine and FYFD.

Every URL is the file's; none was changed.
