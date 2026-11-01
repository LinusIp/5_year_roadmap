# The Atlas Library import, sixteenth file: "four stars and up" (pull request #51)

The 7,640-row `atlas-resources.jsonl` is the 16,448-row file after the audit's "four stars and up" pass
(`ATLAS-QUALITY-AUDIT.md`, 1 November 2026): every row graded, and each row rated 3 or lower checked against the rest of
the library. A row whose topic a 4 or 5 row already covers was removed (8,499); 43 were replaced by 24 new, verified
resources; 92 that are the only coverage of a needed topic stayed (62 raised to 4); and the rows on topics asked for
(interview prep, speaking, certificates, Mandarin, build and ship, the roadmap.sh pages, harness research, the curated
paid books) were never removed. 7,242 of the 7,640 rows (95%) are rated 4 or 5.

`scratch/import-atlas.ts` upserted it into `data/`: 7,614 rows found their entry again (7,380 by id, 190 by URL, 41 by
title on the same shelf, 3 by a checked pair), 3 were left out as before (certifications the plan already tracks), and
23 are new (`data/resources/library-atlas-16.yaml`).

| Shelf | Before | After |
|---|---|---|
| Courses | 1,290 | 803 |
| Books | 1,074 | 745 |
| Papers | 4,984 | 2,308 |
| Articles (with docs and tutorials) | 5,573 | 2,498 |
| Blogs | 338 | 168 |
| Tools | 41 | 40 |
| Practice | 3,214 | 1,180 |

Resources: 16,422 to 7,650. By track: AI 6,141 to 2,611, systems 2,300 to 1,021, engineering 1,986 to 889,
architecture 1,227 to 633, languages 846 to 509, math 695 to 388, robotics 539 to 245, graphics 544 to 282, simulation
603 to 272, DevOps 583 to 253, hardware 395 to 197, game dev 247 to 131, quantum 211 to 116, physics 19 to 17; the small
curated tracks (career, chemistry, controls, electrical, embedded, mechanical, software engineering) are unchanged. By
roadmap: ai-engineer 3,865 to 1,756, software-architect 2,287 to 1,146, inference-engineering 1,590 to 673,
game-developer 1,396 to 687, ai-agents 744 to 219, none 6,540 to 3,169. Paid rows: 361 to 285.

**Removed.** 8,795 rows the Library held that the new file no longer has left `data/`
(`docs/imports-atlas-library-16-removed.md` lists them by track: AI 2,616, systems 1,279, engineering 1,099, inference
922, architecture 595, languages 337, simulation 332, DevOps 331, math 311, robotics 296, graphics 262, hardware 203,
game dev 116, quantum 96). Five rows the file dropped stay, as the prompt asks for a row on the plan, and because the
data still names the other four: ML Zoomcamp is on the plan; Kaggle Learn is in five projects' references and two
project docs; build-your-own-x is the Build Your Own X project's reference; the CuTe DSL notebooks and the WSL setup
guide are steps of the internships. The removal now reaches every data file, the curated ones too (24 rows of
`library-additions.yaml`, 41 of `library-more.yaml`, 2 of `problems-and-books.yaml`), and the rows that named a removed row
as what comes first no longer name it, in either YAML style.

**A device keeps its progress on a removed row,** as in the quality pass and as the prompt asks: a status, a note or a
log on one stays in the database and in backups, no screen shows it, and it comes back if the row does.

**Added.** 23 rows, all free: DiLoCo, the Ray paper, CARLA, DAgger, PySR, Token Merging, RouteLLM, Docling, the Tauri v2
docs, JSON Schema's reference, an in-memory computing review, a review of HTS AC-loss modelling, superconductor digital
electronics, Handley's LEO routing paper ("Delay is not an option"), the Tektronix XYZs of oscilloscopes, NVIDIA's open
GPU kernel modules, the ZipCPU clock-domain-crossing notes, a chiplet EDA survey, an efficient diffusion survey,
PhyWorld's video physical-law study, the plasma focus and sheared-flow Z-pinch updates, and Glaser et al.'s 2015
"Training Schrödinger's cat" review of quantum optimal control.

**Merged.** The build-your-own-x repository row into the Library's `build-your-own-x` (by URL). The matcher had also
read Glaser et al.'s 2015 review as Koch et al.'s 2022 report on the same field (the two titles share a subtitle); the
review replaced the report, so the pair is now listed as distinct (`NOT_SAME` in `scripts/lib/resource-import.ts`): the
review is its own row and the report left with the others.

**Grades.** Priority and quality from the file on every row it matches, in any data file: 1,730 entries took a new grade,
907 a new priority. Every row of the file is graded: 1,265 rated 5 (canon), 5,977 rated 4, 260 rated 3, 133 rated 2 and
5 rated 1. The file keeps 23 of the grade-3 rows at priority 1 or 2. No catalogue field changed this time.

**The quick filters**, with their counts after the pass: Developer essentials 148, Compact power & energy conversion
196, Security & defence 178, Agents & MCP 244, Certificates 49, Career & interviews 64, Research skills 84,
Communication 156, Open source 34, Mandarin (the language) 24, Build & ship 122, Build it yourself 166, Low-level &
performance 420, Research & science 532, GPU & CUDA 395, SDK & API design 88, Fusion & accelerators 267, Aerospace 231,
Electronics & EM 210, Mechanics & materials 452, Scientific computing 209, Formal methods 98.

**Tests that counted the old library** now count this one: the quick filters' floors, the Security & defence tagged
rows (92), the link checker's listed addresses (5: the 2.008, libp2p and STAT 414 rows and one of the three roofline
pages left), and the e2e checks that searched for a row now gone (The Eureka Machine, YARA, Gradient Episodic Memory,
Bullshark, Eisner's "Find Problems", codecrafters, LFD111x) search for one still there.

**Links.** The container cannot reach these sites, so the pull request's CI ran `npm run check:links -- --in
data/resources/library-atlas-16.yaml` in a one-off `links-atlas-16` job, removed before the merge. 23 distinct URLs of the new rows: 20 ok, 0 failed, 3 to check by hand (run 41315535478): 403s from Tektronix (the
XYZs of oscilloscopes PDF), MDPI (the plasma focus update) and UCL Discovery (Handley's LEO routing paper), hosts that
turn scripts away, never counted as broken. Every URL is the file's; none was changed.
