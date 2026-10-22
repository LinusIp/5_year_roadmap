# Prep progress — NVIDIA internship 2027

Running log for the coach in `AGENTS.md`. Newest session at the top of the log.

## Now

| | |
|---|---|
| Phase | **1** (started early, 2026-10-22; planned Nov–Dec 2026) |
| Next gate | Tiny GPT trains and I can explain every tensor shape; **Project A public with numbers** |
| Fast lane | Project A minimum viable version (20 tasks × 3 runs + results table) before the role 1 window |
| Next deadline | Role 1 (JR2025834) applications: mid-Nov to early Dec 2026, about **3.5–6 weeks** from 2026-10-22 |

## Gate status

| Phase | Gate | Status |
|---|---|---|
| 1 | Tiny GPT trains, every tensor shape explained | not started |
| 1 | Project A public with a results table | not started |
| 2 | Cache-tiled CPU matmul beats naive, measured; hand-written Makefile | — |
| 3 | Tiled GEMM benchmarked against cuBLAS on the RTX 3050 Ti | — |
| 4 | First PR merged; flagship benchmarks published | — |

## Projects

| Project | Role | Status | Repo |
|---|---|---|---|
| A — Measured dev-productivity agent | 1 | not started | — |
| B — GPU issue-analysis report | 2 | — | — |
| 1 — Tiny GPT | all | not started | — |
| 2 — CUDA kernel ladder | 3 | — | — |
| 3 — CuTe DSL kernels | 3 | — | — |
| 4 — Mini inference engine | 3 | — | — |

## Referral checklist (role 1)

- [ ] Project A public with a results table
- [ ] Pinned repos: clean READMEs, tests, passing CI
- [ ] One-page resume tailored to role 1
- [ ] 1–2 blog posts on the work
- [ ] Forwardable package: job ID, resume, GitHub link, 3 lines on fit

## Open questions (answer in the first working session)

- Is WSL2 Ubuntu with Python 3.12 and a working `nvidia-smi` already set up?
- Which LLM API will Project A's agent call, and what is the budget? (20 tasks × 3 runs × several variants
  adds up; estimate tokens per run before scaling.)
- Which developer bottleneck for Project A? Coach's suggestion: **reproduce-and-fix a failing test** in small
  Python repos, because the pass/fail check is free (the test passes or not).

## Risks

- **Project A timeline is tight.** About 3.5 weeks to the start of the role 1 window, with Python not yet
  fluent. The plan is to scope to the minimum viable version and ship it public; improvements come after.
- The posting can close at any time. A shipped small version beats an unshipped good one.

## Log

### 2026-10-22 — setup

- Done: coach setup committed to `prep/` (AGENTS.md, CLAUDE.md, this file, `projects/`, `notes/`,
  `interview/`). Kept separate from the Atlas app's own PROGRESS.md and DECISIONS.md.
- Learned: —
- Blockers: the open questions above.
- Next step: answer the open questions, then Project A step 1 (pick the bottleneck, define the task format,
  write the first 3 tasks by hand).
