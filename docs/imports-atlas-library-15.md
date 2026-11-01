# The Atlas Library import, fifteenth file: the quality pass (pull request #50)

The 16,448-row `atlas-resources.jsonl` is the 17,848-row file after a quality audit (`ATLAS-QUALITY-AUDIT.md`, 1 November
2026): a hand-graded sample of 535 rows, then every row of the ten weakest tracks re-graded on a strict 1 to 5 scale. It
dropped 1,418 rows, added 18 classics, gave 12,794 rows a `quality` grade, moved 7,164 priorities (936 canon rows to
priority 1, the grade-3 rows to 3 or lower) and fixed 62 catalogue fields. `scratch/import-atlas.ts` upserted it into
`data/`: 16,429 rows found their entry again (16,164 by id, 214 by URL, 47 by title on the same shelf, 4 by a checked
pair), 3 were left out as before (certifications the plan already tracks), and 16 are new
(`data/resources/library-atlas-15.yaml`); the other 2 of the 18 classics were already in the Library under another id.

| Shelf | Before | After |
|---|---|---|
| Courses | 1,340 | 1,290 |
| Books | 1,131 | 1,074 |
| Papers | 5,221 | 4,984 |
| Articles (with docs and tutorials) | 6,204 | 5,573 |
| Blogs | 429 | 338 |
| Practice | 3,544 | 3,214 |

Resources: 17,818 to 16,422. By track: AI 6,858 to 6,141, engineering 2,210 to 1,986, architecture 1,406 to 1,227,
DevOps 704 to 583, languages 885 to 846, math 737 to 695, simulation 634 to 603, hardware 425 to 395, quantum 223 to
211, systems 2,301 to 2,300; graphics, robotics and game dev are unchanged. By roadmap: ai-engineer 4,289 to 3,865,
software-architect 2,571 to 2,287, inference-engineering 1,713 to 1,590, game-developer 1,426 to 1,396, ai-agents 929
to 744, none 6,890 to 6,540. Paid rows: 380 to 361.

**Removed.** 1,412 rows the Library held that the new file no longer has left `data/`
(`docs/imports-atlas-library-15-removed.md` lists them by track: AI 608, engineering 224, architecture 180, inference
123, DevOps 121, math 42, languages 39, hardware 31, simulation 31, quantum 12, systems 1). The audit graded them 1 or 2
(thin, dated, superseded, marketing, duplicates, aggregator lists) or dropped them from its sample (a browser
extension, a launch post, a newsletter, a logistics-only course page). One more was dropped but stays: `30-days-of-python`
is on the plan (phase 1, lane B) with its units and its certificate. 182 rows that named a removed row as what comes
first no longer name it. The other 5 dropped rows were not in the Library under their own id.

**A device keeps its progress on a removed row.** Unlike the twelve rows of the books round, whose progress version 8
of the database deletes, the prompt does not ask for it, and the user's progress is never overwritten: a status, a note
or a log on a removed row stays in the database and in backups, no screen shows it, and it comes back if the row does
(`tests/e2e/quality-pass.spec.ts`).

**Added.** 16 classics, all free: T5, UL2, ELECTRA, DeBERTa, GELU, GLU variants, Universal Transformers, Mistral 7B,
the PyTorch paper, DCGAN, pix2pix, CycleGAN, OpenAI's CLIP and Meta's Segment Anything code, Akidau's Streaming 101 and
NXP's I2C specification. Merged: the Data-Driven Science and Engineering companion into `brunton-databook` and the
official DreamerV3 code into `dreamerv3-code` (by URL).

**Grades.** Priority and quality now come from the file on every row it matches, in any data file (the curated ones
and the reading queue too): 12,790 entries took a grade, 7,164 a new priority. Quality: 936 rows graded 5 (canon), 4,585
graded 4, 7,162 graded 3, 129 graded 1 or 2 but kept for a topic asked for (interview prep, speaking, certificates,
Mandarin, the roadmap.sh pages, build and ship); 3,636 rows the pass did not re-grade (systems, graphics, robotics, game
dev) count as 4. Canon by track: AI 333, engineering 148, inference 122, languages 81, math 69, architecture 65,
simulation 42, hardware 40, quantum 22, DevOps 14. The file keeps 62 of its grade-3 rows at priority 1 or 2.

**Corrections.** 62 catalogue fields of the audit's fixed rows, on the rows the Library's own import files hold: 25
summaries (overstated "why" text), 23 titles (18 code repositories now end in "(code)", 5 titles that were wrong), 10
URLs (dead or mirror links replaced with the canonical page: the Red Book, the Akamai paper, CUB, Basilisk, PyRK, DoITPoMS,
HLSL, Sundström's book, rust-vmm, Mocz's n-body code), 6 rows now paid (five of Philip Mocz's Medium tutorials and one
Raschka post), 4 levels, 4 types and 4 providers. Every URL is the file's; none was changed by hand.

**In the app.** A row graded 5 wears a **Canon** badge (in lists, in its sheet and in a paper's sheet), and every shelf,
quick filter and search has a **Canon only** toggle beside Level and Roadmap (`canon=1` in the URL). Every list reads by
priority, then quality (highest first, an ungraded row as 4), then year and level. In a path's optional list and in the
Research view the rows graded 3 or lower wait, folded, under **More resources**; Up next never suggests one, though the
plan keeps its own (ML Zoomcamp and the three roadmap.sh pages stay where they are). `validate:data` accepts `quality` only
as an integer from 1 to 5.

**The quick filters**, with their counts after the pass: Developer essentials 364, Compact power & energy conversion
459, Security & defence 639, Agents & MCP 840, Certificates 49, Career & interviews 91, Research skills 165,
Communication 264, Open source 43, Mandarin (the language) 24, Build & ship 135, Build it yourself 271, Low-level &
performance 791, Research & science 916, GPU & CUDA 774, SDK & API design 195, Fusion & accelerators 542, Aerospace 465,
Electronics & EM 363, Mechanics & materials 958, Scientific computing 384, Formal methods 160.

**Not done here.** The audit recommends a `physics` track (moving 400 to 600 rows out of math and engineering) and a
career or meta track for the architecture track's career and frontend rows, both left for approval; neither is in the
prompt, so the tracks are unchanged.

**Links.** The container cannot reach these sites, so the pull request's CI ran `npm run check:links -- --in
data/resources/library-atlas-15.yaml` and the ten corrected URLs in a one-off `links-atlas-15` job, removed before the
merge. 16 distinct URLs of the new rows, all 16 ok; of the ten corrected URLs, 9 ok and 1 failed (run 41300552527). The
failure is the audit's own replacement for CUB (`docs-cub`): `https://nvidia.github.io/cccl/cub/index.html` answered 404
to the checker, where the old `/cccl/unstable/cub/` link was the one it replaced. Open it in a browser before changing
anything: nothing here edits the data, and the file's URL stands as given. Every URL is the file's; none was changed.
