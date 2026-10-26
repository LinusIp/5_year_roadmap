# The Atlas Library import, tenth file (pull request #34)

`scratch/import-atlas.ts` upserted the 15,364-row `atlas-resources.jsonl` into `data/`. 15,104 of its rows found their
entry again (14,857 by id, 211 by URL, 32 by title on the same shelf, 4 by a checked pair), and 260 are new
(`data/resources/library-atlas-10.yaml`): the books round (184 paid books, each `cost: paid` with `note: Paid`, the
publisher's or author's page as the link, plus the one Coursera specialization that has no free audit) and the
agents, MCP and harnesses cluster (76 free rows: Rust and C++ agent and MCP building blocks, llama.cpp tool calling
and grammars, sandboxing, OpenTelemetry in Rust). No URL was changed by hand; the file's URLs were copied exactly.

**The quality audit.** Twelve rows the audit removed (broken, paywalled, superseded or thin) left their files, and the
rows that came after them no longer name them: `blog-azom`, `paper-liquid-metal-piston-mhd`,
`article-transformer-family-v1` (superseded by `article-transformer-family-v2`), `blog-hashicorp`, `paper-pfnn`,
`paper-tiled-clustered-forward-shading`, `article-mocz-wave-equation`, `docs-nsa-wpa3-technical-report`,
`article-wafer-kernelarena`, `blog-gdandtbasics-advice`, `docs-nvidia-cuda-training`, `article-nrc-bwr`. Version 8 of
the database drops the progress a device kept on them. Thirteen rows of the Library's own files took the audit's
corrections to their catalogue fields: `stanford-cs103` and `docs-agner-instruction-tables` and
`article-llnl-achieving-fusion-ignition` (track), `paper-fast-file-system-unix`, `course-gem5-bootcamp-2024` and
`purdue-me274-visualizing-mechanics` (url), `article-together-custom-spec-decoding` (title), `paper-framepack` (title,
provider), `article-kleppmann-json-crdt-move` (provider, type), `article-crdb-parallel-commits` and
`paper-wbench-interactive` (provider), `ned-names-values-talk` (type), `course-coursera-plett-bms-specialization`
(now paid). The 58 curated rows and queue papers whose file version differs (the file's coarser types and tracks,
"Operating Systems: Three Easy Pieces" without the authors, MapReduce at its older Google address, Kafka at an MIT
mirror) kept what they had: the file's vocabulary cannot express a curated row, and their links were checked by hand.

| Shelf | Added | Before | After |
|---|---|---|---|
| Courses | 0 | 1,099 | 1,098 |
| Books | 190 | 637 | 827 |
| Papers | 1 | 4,856 | 4,855 |
| Articles (with docs and tutorials) | 32 | 4,934 | 4,960 |
| Blogs | 0 | 398 | 395 |
| Practice | 37 | 3,237 | 3,274 |

Resources: 15,110 to 15,358 (260 added, 12 removed); paid: 28 to 213. By track: AI 6,138 to 6,242, architecture
1,101 to 1,147, systems 1,918 to 1,954, engineering 1,846 to 1,863, languages 587 to 600, math 494 to 510, hardware
396 to 410, DevOps 537 to 539, robotics 526 to 527, simulation 531 to 530. By type of the new rows: 190 books, 37
practice, 22 docs, 5 tutorials, 5 articles, 1 paper. Roadmaps of the new rows: 55 software-architect, 52 ai-engineer,
43 ai-agents, 12 inference-engineering, 2 game-developer, 96 none; none names a research area. 106 rows got a soft
prerequisite the Library resolves; 28 keep the text.

**Merged by title (32), each a paid or newer edition of a book or course the Library had:** stanford-cs229-2018 →
stanford-cs229, fsdl-2022 → fsdl, mit-65940-efficientml → mit-6-5940, pbrt-4ed → pbr-book, mit-6042j-math-for-cs-ocw →
mit-6-042j, course-hf-diffusion-models → hf-diffusion-course, paper-3d-gaussian-splatting → paper-3dgs,
article-kipply-inference-arithmetic → kipply-inference-arithmetic, course-stanford-cs149 → cs149, course-stanford-cs336
→ stanford-cs336, course-3b1b-essence-linear-algebra → 3b1b-linear-algebra, course-3b1b-essence-calculus →
3b1b-calculus, book-bishop-prml → prml, course-modern-robotics-coursera → modern-robotics,
course-mit-18-02sc-multivariable-calculus → mit-18-02, course-mit-18-03sc-differential-equations → mit-18-03,
course-mit-6-041sc-probability → mit-6-041, course-harvard-stat-110 → harvard-stat-110,
course-mit-8-03sc-vibrations-and-waves → mit-8-03, feedback-systems-astrom-murray → feedback-systems,
book-physics-based-deep-learning → pbdl-book, course-harvard-cs50ai → cs50-ai, course-stanford-cs230 → cs230,
course-stanford-cs224w → cs224w, book-dspguide-scientist-engineer → dspguide, course-stanford-cs224w-site → cs224w,
book-algorithm-design-manual-3e → skiena-adm, book-effective-modern-cpp → effective-modern-cpp, book-tour-of-cpp-3e
→ tour-of-cpp, book-real-time-collision-detection → ericson-rtcd, book-strang-intro-linear-algebra-6e →
strang-ila-book, repo-rust-mcp-sdk → repo-mcp-rust-sdk. A merge fills only what the entry was missing: an entry the
Library had free stays free with its own link. The 211 URL merges are rows whose id changed in the file for an entry
the Library already had under its earlier id (`scratch/atlas10-report.json` lists them).

**"Agents & MCP"**, a row on the Library's home (`src/lib/agents.ts`): 1,017 resources named by the prompt's words
in the software tracks, with six area chips: Harness & loop 353, Evals 251, Tools & sandbox 155, Frameworks 132, MCP
69, Books 20; 307 are in none of the five word areas.

**Links.** The 260 new links were checked on the runner by a one-off `links-atlas-10` job, twice, with the same result
each time: 236 fine, 4 failed (three Rig docs pages, 404; Nilsson's Quest for AI PDF at Stanford, a timeout) and 20 to
open by hand (publishers' pages that refuse scripts: Simon & Schuster, Princeton, Macmillan, Packt, Chelsea Green,
Rutgers); the list is in DECISIONS.md. The hosts the earlier follow-up asked for (the Berkeley Lab roofline pages, the NCFMF films, MIT OCW
2.008, Orfanidis, libp2p, STAT 414, Childs) have been `MANUAL_OK` in `scripts/lib/link-policy.ts` since pull request
#22, with tensorflow.org, Wooledge and CSAIL as script-side hosts; nothing changed there.
