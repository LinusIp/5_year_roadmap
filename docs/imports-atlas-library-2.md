# The Atlas Library import, second file (pull request #21)

`scratch/import-atlas.ts` upserted the 3,386-row `atlas-resources.jsonl` into `data/`. Its first 2,408 rows are the
file of pull request #20, unchanged: every one found its entry again (`docs/imports-atlas-library.md`) and nothing
was filled. Of the 978 rows it adds, 927 are new (`data/resources/library-atlas-2.yaml`) and 51 matched an entry the
Library had; those kept everything they had and took only the fields they were missing. No URL was changed.

## The 51 rows the Library already had

| Import id | Library entry | Matched by | Fields filled |
|---|---|---|---|
| `repo-mlabonne-llm-course` | `mlabonne-llm-course` | url | short, summary, fromYear, priority, roadmap |
| `repo-practical-tutorials-project-based-learning` | `project-based-learning` | url | short, summary, fromYear, priority, roadmap |
| `course-harvard-cs50x` | `cs50x` | url | priority |
| `course-harvard-cs50ai` | `cs50-ai` | title | short, fromYear, after, priority, roadmap |
| `book-sicp-mit-press` | `sicp` | url | short, fromYear, after, priority |
| `course-missing-semester` | `missing-semester` | url | priority |
| `course-stanford-cs144` | `stanford-cs144` | url | summary, priority |
| `practice-sqlbolt` | `sqlbolt` | url | priority |
| `book-automate-boring-stuff` | `automate-the-boring-stuff` | url | priority |
| `tutorial-tour-of-go` | `tour-of-go` | url | priority |
| `course-stanford-cs230` | `cs230` | title | short, fromYear, after, priority, roadmap |
| `course-stanford-cs224w` | `cs224w` | title | short, fromYear, doFirst, priority, roadmap |
| `course-mit-6002-circuits-electronics` | `mit-6-002` | url | priority |
| `course-mit-6003-signals-systems` | `mit-6-003` | url | summary, priority |
| `course-mit-6302-feedback-systems` | `mit-6-302` | url | short, fromYear, after, priority |
| `book-allaboutcircuits-textbook` | `all-about-circuits` | title | fromYear, priority, url, urlVerified, lastVerified |
| `book-dspguide-scientist-engineer` | `dspguide` | title | short, fromYear, priority |
| `book-think-dsp` | `think-dsp` | url | short, summary, fromYear, doFirst, priority |
| `video-phils-lab` | `phils-lab` | url | summary, after, priority |
| `tutorial-nandland` | `nandland` | url | after, priority |
| `tutorial-fpga4fun` | `fpga4fun` | url | short, summary, fromYear, after, priority |
| `article-nvidia-mastering-llm-inference-optimization` | `nvidia-inference-optimization` | url | short, fromYear, tags, after, priority, roadmap |
| `article-databricks-llm-inference-perf-engineering` | `databricks-inference-best-practices` | url | short, fromYear, tags, doFirst, priority, roadmap |
| `docs-sglang-structured-outputs` | `docs-openai-structured-outputs` | title | tags |
| `mit-1801sc-single-variable-calculus` | `mit-18-01` | url | summary, priority |
| `mit-18065-matrix-methods` | `mit-18-065` | url | summary, priority |
| `seeing-theory-brown` | `seeing-theory` | url | short, fromYear, priority |
| `hefferon-linear-algebra` | `hefferon-linear-algebra` | update | fromYear, priority |
| `pauls-online-math-notes` | `pauls-online-math-notes` | update | fromYear, priority |
| `boyd-vmls-applied-linear-algebra` | `vmls-book` | url | fromYear, priority |
| `mit-801sc-classical-mechanics` | `mit-8-01` | url | summary, priority |
| `mit-802-electricity-magnetism` | `mit-8-02` | title | priority |
| `mit-804-quantum-physics-i` | `mit-8-04` | url | summary, priority |
| `david-tong-lecture-notes` | `tong-lecture-notes` | url | fromYear, doFirst, priority |
| `ocw-mit-2-001-mechanics-materials-i` | `mit-2-001` | url | summary, priority |
| `ocw-mit-2-002-mechanics-materials-ii` | `mit-2-002` | url | short, summary, fromYear, priority |
| `ocw-mit-2-003sc-engineering-dynamics` | `mit-2-003` | url | priority |
| `ocw-mit-2-004-dynamics-control-ii` | `mit-2-004` | url | priority |
| `ocw-mit-2-007-design-manufacturing-i` | `mit-2-007` | url | short, summary, fromYear, doFirst, priority |
| `ocw-mit-2-12-intro-robotics` | `mit-2-12` | url | doFirst, priority |
| `ocw-mit-2-086-numerical-computation-me` | `mit-2-086` | url | priority, roadmap |
| `book-engineering-statics-baker-haynes` | `engineering-statics-open` | url | fromYear, priority |
| `tutorial-onshape-learning-center` | `onshape-learning-center` | url | note, priority |
| `docs-cadquery` | `cadquery-docs` | url | after, priority |
| `docs-calculix` | `calculix` | url | short, fromYear, after, priority, roadmap |
| `mit-8-05-quantum-physics-ii-2013` | `mit-8-05` | url | summary, priority |
| `mit-8-06-quantum-physics-iii-2018` | `mit-8-06` | url | short, summary, fromYear, priority |
| `theoretical-minimum-classical-mechanics` | `susskind-classical-mechanics` | url | priority |
| `theoretical-minimum-quantum-mechanics` | `susskind-quantum-mechanics` | url | short, summary, fromYear, after, priority |
| `physics-libretexts` | `physics-libretexts` | update | short, fromYear, priority |
| `hyperphysics` | `hyperphysics` | update | short, fromYear, priority |
