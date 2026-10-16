# Three merged pull requests to vLLM, SGLang, diffusers or MuJoCo

**Goal.** Three non-trivial pull requests that change behaviour or performance, each linked to an issue and carrying tests, reviewed and merged into vLLM, SGLang, diffusers or MuJoCo, and listed with links in the portfolio.

**Why.** Inference Engineering roadmap, depending on the project chosen: `inference-engineering/vllm`, `inference-engineering/sglang` or `inference-engineering/transformers-and-diffusers`. Skills: open source and code review: reading a large codebase's conventions, scoping a change a maintainer will accept, writing the tests they ask for, and answering review well. Merged work in the tools of the field is also the strongest public signal a portfolio can carry.

**Scope.** MVP: one project chosen (two at most), built from source with its test suite passing locally, three issues picked from good-first-issue, help-wanted or bugs you hit in earlier projects, at least one discussed with maintainers before you start, three merged pull requests with tests. Stretch: a performance pull request with a benchmark in its description; reviewing other contributors' pull requests; becoming a regular contributor to one area.

**Architecture.** The work is a pipeline you run three times. Each issue moves from candidate to claimed (a comment or discussion with a maintainer), to a branch with a failing test that reproduces it, to a fix, to a draft pull request that passes CI, to review rounds, to merged. A tracking file in the portfolio repository records each stage with dates and links.

```
issues ─▶ shortlist ─▶ discuss ─▶ failing test ─▶ fix ─▶ PR (CI green)
                                                         │
                         portfolio ◀── merged ◀── review rounds
```

**Stack.** Git and the GitHub CLI, the chosen project's build (Python with CUDA for vLLM and SGLang, Python for diffusers, C++ and CMake for MuJoCo), pytest or the project's test runner, pre-commit hooks and linters as the project configures them.

**Milestones.** Choose the project, build from source and run its test suite (5 h) · Shortlist issues and discuss one with maintainers before starting (5 h) · First pull request, implemented, tested and through review (10 h) · Second pull request (10 h) · Third pull request, and the portfolio entries (10 h). Total 40 h.

**Done when.** Three pull requests are merged, each changing behaviour or performance (not documentation or typos). Each links an issue and adds or extends tests that fail without the change. At least one issue thread shows the discussion with maintainers before the first commit. Any performance pull request includes a before-and-after benchmark in its description. The portfolio lists all three with links.

**Measure and report.** For each pull request: lines changed, tests added, review rounds, days from first commit to merge, and for performance changes the measured gain; the time spent on setup and on waiting, so the next contribution can be planned better.

**Pitfalls.** Picking issues that are too large, so the first pull request stalls for weeks. Starting work on an issue someone has already claimed. Ignoring the contribution guide (formatting, signed-off commits, changelog entries), which costs review rounds. Opening pull requests near a release freeze. Counting on fast reviews: start the first pull request in the first week, since merge time is outside your control.

**References.** vllm-docs, sglang-docs, diffusers-repo, mujoco-docs, github-actions-docs, m-vllm-explainer.

**Write-up.** A portfolio section with the three pull requests: one paragraph each on the problem, the change, the tests and what review taught you, plus a table of the measures above.
