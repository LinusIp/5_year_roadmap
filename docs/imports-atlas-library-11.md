# The Atlas Library import, eleventh file (pull request #35)

`scratch/import-atlas.ts` upserted the 15,961-row `atlas-resources.jsonl` into `data/`. 15,371 of its rows found their
entry again (15,117 by id, 212 by URL, 38 by title on the same shelf, 4 by a checked pair), 3 were left out (their ids
are certifications the plan already tracks in `data/certs.yaml`: `cert-aws-cloud-practitioner`,
`cert-unity-associate-programmer`, `cert-unity-professional-programmer`, and ids are unique across kinds), and 587 are
new (`data/resources/library-atlas-11.yaml`): the plan gap fill. Inference-stack depth (TensorRT-LLM, Dynamo, Triton
Inference Server, PyTorch internals), interview prep, research skills, diffusion inference and hands-on image
generation, video and 3D generation tooling, communication (public speaking, pitching and fundraising, technical
writing, blogging), open-source contribution, Mandarin basics, certificates and backend auth, observability and
testing. 46 of the new rows are paid (`cost: paid`, `note: Paid`): 35 certificate exams and 11 books. No URL was
changed by hand; the file's URLs were copied exactly. The file corrected none of the Library's own rows this time.

| Shelf | Added | Before | After |
|---|---|---|---|
| Courses | 78 | 1,098 | 1,176 |
| Books | 16 | 827 | 843 |
| Papers | 70 | 4,855 | 4,925 |
| Articles (with docs and tutorials) | 318 | 4,960 | 5,278 |
| Blogs | 4 | 395 | 399 |
| Practice | 101 | 3,274 | 3,375 |

Resources: 15,358 to 15,945; paid: 213 to 259. By track: AI 6,242 to 6,518, architecture 1,147 to 1,278, inference
(within AI, tagged) 1,471 to 1,594 by roadmap, DevOps 539 to 604, graphics 479 to 531, languages 600 to 638, systems
1,954 to 1,968, robotics 527 to 531, engineering 1,863 to 1,866, math 510 to 512, game dev 229 to 231. By type of the
new rows: 148 docs, 147 articles, 101 practice, 70 papers, 67 courses, 23 tutorials, 16 books, 11 video courses, 4
blogs. Roadmaps of the new rows: 190 software-architect, 153 ai-engineer, 123 inference-engineering, 54
game-developer, 6 ai-agents, 61 none; 59 name diffusion as their research area, 4 generative AI, 2 world models, 1
inference. 278 rows got a soft prerequisite the Library resolves; 151 keep the text.

**Merged by title this round (6):** authzed-annotated-zanzibar → paper-zanzibar, cert-hf-mcp-course → course-hf-mcp,
docs-trtllm-disagg-serving → article-trtllm-disaggregated-serving, article-nvidia-dynamo-kv-bottlenecks →
docs-dynamo-kv-offloading, repo-cppcon-back-to-basics → cppcon-back-to-basics,
article-nielsen-principles-effective-research → nielsen-principles. The 32 title merges of the tenth file matched
again, as did the 212 URL merges (`scratch/atlas11-report.json` lists them). A merge fills only what the entry was
missing.

**The quick filters**, now one list of ten rows under the shelves (`src/lib/quick-filters.ts`), with their counts:
Developer essentials 344, Compact power & energy conversion 394, Security & defence 718, Agents & MCP 1,023,
Certificates 49 (35 paid exams, 9 free to learn with a paid certificate, 5 free), Career & interviews 94, Research
skills 144, Communication 257, Open source 47, Mandarin (the language) 24.

**Links.** The 587 new links were checked on the runner by a one-off `links-atlas-11` job, twice; the report is in
DECISIONS.md.
