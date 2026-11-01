# The Atlas Library import, fourteenth file (pull request #49)

`scratch/import-atlas.ts` upserted the 17,848-row `atlas-resources.jsonl` into `data/`. 17,284 of its rows found their
entry again (17,016 by id, 215 by URL, 49 by title on the same shelf, 4 by a checked pair), 3 were left out as before
(their ids are certifications the plan already tracks in `data/certs.yaml`), and 561 are new
(`data/resources/library-atlas-14.yaml`): the engineering-physics foundations and software depth round, 565 rows of
which 4 were already in the Library under another id. Circuits and electronics (MIT 6.301, 6.331, 6.013, 6.641,
6.776, 6.007, 6.071J, Ulaby's and Ellingson's open texts, Analog Devices' MT tutorials and op-amp handbook, TI's
cookbook and pocket reference, Jim Williams, Tektronix's probe primer, Ott, Pozar and Steer, Spieler's detector
electronics, the CAS-CERN power converter chapters), continuum mechanics (MIT's fluids, turbulence and structures
courses, Kundu, Brennen's multiphase, cavitation and pump books, Kelly and Bower, Landau and Lifshitz, fracture and
fatigue, NASA's fracture-control standard), mathematics for physics (complex analysis, PDE theory, Lie groups and
representations, differential geometry, asymptotics, the DLMF, Woit, Teschl, Skinner), scientific computing
(spectral, finite-volume and finite-element methods, stiff ODEs, PETSc, SUNDIALS, hypre, AMReX, MFEM, FEniCS,
Firedrake, Dedalus, Clawpack, PIC, UQ and V&V with Dakota and OpenTURNS, scientific ML with PINNs, neural operators
and DeepXDE, the Julia SciML stack), nuclear engineering (MIT 22.xx, MCNP, SCALE, FLUKA, PHITS, FISPACT-II, Geant4,
NJOY, TENDL, the IAEA safety standards and the Fukushima report, the NRC fault-tree handbook, accelerator-driven
systems), materials science (MIT 3.xx, DoITPoMS, superconductors and REBCO, tungsten plasma-facing components,
superalloys and ablatives, DFT and ML interatomic potentials), research writing (Whitesides, Gopen and Swan, figures
and colour, LaTeX and Typst, reviewing and rebuttals, posters, grants), formal methods (TLA+, Alloy, model checking,
seL4, CompCert, Verus, Iris, Frama-C, SPARK and DO-178C, the NASA formal-methods tools) and software depth (CPython
internals and free-threading, FSDP2, DTensor and pipelining, cluster schedulers, checkpointing, Unreal and Godot
architecture, rollback netcode). 43 of the new rows are paid books (a **Paid** badge, out of Up next until owned);
the rest are free. No URL was changed by hand; the file's URLs were copied exactly. The file corrected none of the
Library's own rows.

| Shelf | Added | Before | After |
|---|---|---|---|
| Courses | 87 | 1,253 | 1,340 |
| Books | 109 | 1,022 | 1,131 |
| Papers | 70 | 5,151 | 5,221 |
| Articles (with docs and tutorials) | 202 | 6,002 | 6,204 |
| Blogs | 10 | 419 | 429 |
| Practice | 83 | 3,461 | 3,544 |

Resources: 17,257 to 17,818. By track: engineering 2,030 to 2,210, simulation 547 to 634, AI 6,756 to 6,858, math
665 to 737, languages 822 to 885, architecture 1,384 to 1,406, systems 2,286 to 2,301, game dev 235 to 247, DevOps
696 to 704; the other tracks are unchanged (the import's own count by first track: engineering 180, simulation 87, AI
78, math 72, languages 63, inference 24, architecture 22, systems 15, game dev 12, DevOps 8). By type of the new rows:
125 docs, 109 books, 83 practice, 71 courses, 70 papers, 52 articles, 25 tutorials, 16 video courses, 10 blogs.
Roadmaps of the new rows: 99 game-developer, 78 ai-engineer, 35 software-architect, 24 inference-engineering, 325
none; research areas: 5 world-models, 4 diffusion, 3 inference, 1 genai, 548 none. Years: 77 in year 1, 215 in year
2, 269 in year 3; 71 beginner, 212 intermediate, 278 advanced. 265 rows got a soft prerequisite the Library resolves;
201 keep the text.

**Merged this round:** 4 new merges, rows the Library already had: MIT 6.013 Electromagnetics and Applications into
`mit-6-013` and LTspice into `ltspice` (by URL, filling the short title, the year, the priority and for 6.013 the
summary), Learning the Art of Electronics into `learning-the-art-of-electronics` (by URL, filling the short title,
year, note, first step and priority) and the CAS-CERN power converters proceedings into `cas-power-converters-2014`
(by title). The 212 URL merges, 45 title merges and 4 checked pairs of the earlier files matched again
(`scratch/atlas14-report.json` lists them).

**Four quick filters and a sub-chip**, from `src/lib/foundations.ts` (the registry in `src/lib/quick-filters.ts`),
each a list of words read on an item's title and summary and held to the tracks its cluster lives in:

- **Electronics & EM** 394: circuits, op amps and data converters, RF and microwave, EMC, signal integrity and
  probing, fields and waves, detector front ends, on the engineering, hardware, math and simulation tracks. No areas.
- **Mechanics & materials** 1,032: on the engineering, simulation and math tracks, with four areas as chips: Fluids
  276, Solids 242, Materials 261, Nuclear 366. Every row of the cluster is in at least one. "Flow" (a chip-design
  flow), "structures" (an accelerating structure), "radiation" (synchrotron radiation), "material" alone and the fusion
  words (Fusion & accelerators has them) count only in their phrases.
- **Scientific computing** 393: numerical methods and the solver libraries, HPC for science, UQ and V&V, scientific ML
  (on the AI track only PINNs, neural operators, interatomic potentials and PDE benchmarks). "DNS" (the name system),
  "mesh" (a service mesh) and "solvers" (SAT solvers) are left out.
- **Formal methods** 162: TLA+ and PlusCal, model checking, proof assistants, separation logic, seL4, CompCert,
  Verus, Iris, Frama-C, SPARK, DO-178C, the NASA tools, deterministic simulation testing. "Proof" (proof of stake,
  proof of work), "proving" and "fairness" count only in their phrases; "Lean" only as Lean 4, the Lean prover or
  mathlib (lean manufacturing stays out).
- **Research writing**, a sixth area of Research & science: papers and abstracts, grants, posters and talks, reviews
  and rebuttals, LaTeX and Typst, figures and colour maps; 69 rows (61 new), which join the filter on the research
  tracks (Research & science: 840 to 964). A "posterior" is not a poster, and a LaTeX résumé template on the
  architecture track stays a career row.

The CPython internals, the distributed-training rows and the netcode rows are in no new filter (the prompt names none
for them); the mathematics-for-physics rows that name an analysis, a proof or a theory are in Research & science.

**The quick filters**, now twenty-two rows, with their counts: Developer essentials 392, Compact power & energy
conversion 511, Security & defence 733, Agents & MCP 1,028, Certificates 49, Career & interviews 100, Research skills
187, Communication 287, Open source 48, Mandarin (the language) 24, Build & ship 134, Build it yourself 279,
Low-level & performance 797, Research & science 964, GPU & CUDA 805, SDK & API design 233, Fusion & accelerators 587,
Aerospace 495, Electronics & EM 394, Mechanics & materials 1,032, Scientific computing 393, Formal methods 162.

**Links.** The container cannot reach these sites (every request fails to resolve), so the pull request's CI ran
`npm run check:links -- --in data/resources/library-atlas-14.yaml` in a one-off `links-atlas-14` job; the job was
removed before the merge. LINKS-RESULT
