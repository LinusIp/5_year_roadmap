# A lab notebook for every research day

**Goal.** From year 3, a dated notebook entry for every Block D day spent on a research card, saying what ran, what broke and what changed, each linked to the run, commit or data it talks about, and read back at every quarterly review.

**Why.** No roadmap.sh node covers it; the skill is research habits: keeping a record good enough to reconstruct any result months later, and noticing patterns in your own work. Resources: schulman-research-guide and nielsen-principles on how productive researchers work, hamming-you-and-your-research on reviewing your own direction, and wandb for linking runs.

**Scope.** MVP: one Markdown file per day in research/ in the data repo (or the card's notes), a fixed template, a link to at least one commit, run or dataset per entry, and a quarterly read-back note. Stretch: a small script that lists research days without an entry, tags for recurring problems, a monthly one-paragraph digest.

**Architecture.** Each research day produces runs (experiment tracker), commits (code repository) and data (files or datasets). The entry template has four parts: plan for the day, what ran (with links), what broke or surprised you, and what changes next. Entries live next to the research card they belong to. At the quarterly review, all entries of the quarter are read in order and condensed into a short note of lessons and open questions.

```
research day ─▶ runs, commits, data ─▶ entry (plan / ran / broke / next)
                                          │ links
quarterly review ◀── read back all entries ◀┘ ─▶ lessons note
```

**Stack.** Markdown in the data repository, git commit hashes, Weights & Biases run links, the app's card notes, optionally a 30-line Python script that compares logged Block D days with notebook files.

**Milestones.** Template and linking conventions set up (2 h) · first month of entries (2 h) · second month of entries (2 h) · third month of entries (2 h) · quarterly read-back and lessons note (2 h). Total 10 h.

**Done when.** Every research day of one quarter has an entry, which the checking script (or a manual count against the Block D log) confirms: zero missing days. Every entry links at least one run, commit or dataset, and a random sample of five links all resolve. The read-back note exists and is discussed at the quarterly review, with at least three concrete changes to how you work.

**Measure and report.** Research days in the quarter and entries written; share of entries with working links; median entry length; the most frequent kinds of breakage; how many times the notebook answered a question you would otherwise have lost (count them as they happen).

**Pitfalls.** Writing entries days later from memory, which records what you wish had happened. Links to local paths or unpushed commits that die. Entries so long that they stop being written after week two. Logging only successes. Never reading the notebook back, which turns it into a diary.

**References.** schulman-research-guide, nielsen-principles, hamming-you-and-your-research, karpathy-phd-guide, wandb, m-research-report-1.

**Write-up.** A short note in research/ with one sample entry, the quarter's counts, the lessons list from the read-back, and what you will change in the template.
