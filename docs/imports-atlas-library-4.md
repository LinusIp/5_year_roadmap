# The Atlas Library import, fourth file (pull request #24)

`scratch/import-atlas.ts` upserted the 10,436-row `atlas-resources.jsonl` into `data/`. Its first 3,811 rows are the
file of pull request #22 and its next 226 the harness additions of pull request #23, unchanged: every one found its
entry again (`docs/imports-atlas-library.md`, `-2.md`, `-3.md`, `docs/imports-atlas-harness.md`) and nothing was
filled. Of the 6,399 rows it adds, 6,388 are new (`data/resources/library-atlas-4.yaml`) and 11 matched an entry the
Library had (10 by URL, 1 by title); those kept everything they had and took only the fields they were missing. No URL
was changed. One row's id carried a capital (`practice-cisMine-parallel-cuda`); the Library's ids are lowercase slugs,
so it is `practice-cismine-parallel-cuda`.

## The 11 rows the Library already had

| Import id | Library entry | Matched by | Fields filled |
|---|---|---|---|
| `repo-cs-video-courses` | `cs-video-courses` | url | short, summary, fromYear, priority, roadmap |
| `docs-dealii-tutorial-programs` | `dealii-tutorials` | url | short, fromYear, after, priority, roadmap |
| `video-bangerth-fem-lectures` | `bangerth-dealii-lectures` | url | summary, after, priority, roadmap |
| `practice-diffusers-repo` | `diffusers-repo` | url | short, fromYear, after, priority, roadmap |
| `course-stanford-cs224w-site` | `cs224w` | title | (none) |
| `repo-nvidia-dynamo` | `nvidia-dynamo` | url | tags, after, priority, roadmap |
| `book-jurafsky-martin-slp3` | `slp3` | url | short, fromYear, priority, roadmap |
| `repo-khronos-vulkan-samples` | `khronos-vulkan-samples` | url | summary, priority, roadmap |
| `khronos-vulkan-tutorial-docs` | `khronos-vulkan-tutorial` | url | short, fromYear, after, priority, roadmap |
| `paper-imagen-video` | `imagen-video` | url | short, summary, level, fromYear, priority, roadmap, research |
| `repo-v-jepa` | `jepa-code` | url | short, fromYear, doFirst, priority, roadmap, research |

## The title rule, tightened

The first run matched 30 new rows by title and 29 of them were other works: one-word short titles ("GEM" the gym and
GEM the continual-learning method, Griffin, Ouroboros, Eagle, UniSim, Bullshark, BYOL, CAMEL, QuEST, TabPFN), two-word
titles once their bracketed part is dropped ("Structured outputs (Gemini API)" and SGLang's, "Prompt engineering
(OpenAI API)" and Lilian Weng's, "Function calling (Mistral cookbook)" and OpenAI's, "Matmul Tutorial (TT-Lang)" and
Tilus's), and a title read against a short title ("Bevy ECS (crate README)" against "Bevy ECS"). The rule now needs
full titles alike with three words in common (or the same two words when neither title had a bracketed part), or
short titles alike when each has two words or more, and never reads a title against a short title. Every title match
of the earlier imports still holds under it.

## Kept apart

Twelve pairs still matched on their full titles; read by hand, eleven are different works (`NOT_SAME`):

| Import id | Library entry | Why |
|---|---|---|
| `article-sanglard-doom3-bfg-review` | `article-sanglard-doom3-review` | the Doom3 BFG edition review, not the Doom3 one |
| `docs-pytorch-fsdp2-tutorial` | `tutorial-pytorch-fsdp` | the FSDP2 tutorial, not FSDP's |
| `mit-6851-spring14` | `mit-6851-advanced-data-structures` | the Spring 2014 videos, not OCW's 2012 lectures |
| `paper-approaches-to-crdts` | `paper-crdts-shapiro` | a survey of approaches, not Shapiro's paper |
| `paper-crdt-overview-preguica` | `paper-crdts-shapiro` | Preguiça's overview, not Shapiro's paper |
| `paper-qwen2-5-coder` | `paper-qwen2-5-report` | the Coder report, not the Qwen2.5 report |
| `paper-qwen2-5-vl` | `paper-qwen2-5-report` | the VL report |
| `paper-qwen25-1m` | `paper-qwen2-5-report` | the 1M report |
| `repo-cphb-source` | `competitive-programmers-handbook` | the book's LaTeX source, not the PDF |
| `repo-mitmath-1806-2025` | `mit-18-06` | the 2025 course repo, not OCW's 2010 course |
| `video-cmu-15721-spring2024` | `cmu-15721-advanced-databases` | the Spring 2024 lectures, not the course site |

The twelfth, `course-stanford-cs224w-site`, is CS224W's course site and the Library's `cs224w` is the same course
(its 2020 site), so it merged, as the row for the course did in pull request #21.
