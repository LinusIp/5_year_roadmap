# Daily practice, more resources, more projects with tech docs (paste into the coding agent in the Atlas repo)

Three additions:
1. **Daily question sets** for **linear algebra, calculus and physics only**, running **until 31 January 2027** (the end of the current phase).
2. **More resources**, verified with your link verifier.
3. **More projects**, and a **brief tech doc for every project**, new and existing.

Rules from earlier still apply:
- Defaults keep the current look.
- Everything new syncs to the data repo.
- No drive, volume or label commands; scripts go in `scratch/`.
- Work on a `practice` branch, merge only when green, then confirm CI, the deploy and the live site.

---

## 1. Daily practice

### What the user sees
- All practice lives in **its own block, "Practice"**, separate from the coding and study blocks A–E. Its row on Today reads, for example: **"Practice · 9 questions · linear algebra, calculus, physics"**. Tapping it opens **Practice**, one question per screen, in the existing design system.
- Practice never appears inside a coding block, and coding work never counts toward the Practice block.
- Each question screen has: the question, the answer input, **Check** (the only filled button), **Hint** (hints reveal one at a time), and **Show solution**. After checking, the worked solution appears in place, followed by **Next**.
- The set ends with a summary: score, time, the topics, what comes back for review and when, and **Done**, which logs the minutes to the Practice block.
- Practice is also reachable from Library → Practice, where the user can practise any subject or topic on demand: "10 questions on eigenvalues".

### Scope and dates
- **Subjects:** linear algebra, calculus and physics only. No other subjects in this round.
- **Period:** from the day this ships until **31 January 2027**. Store both dates as settings: `practice.start` and `practice.end`, editable in Settings → Practice.
- **After the end date:** the Practice block disappears from the day templates and Today, and no set appears. Library → Practice stays usable on demand, and the history stays in Activity.
- The bank format must still allow other subjects later without a schema change, but write questions for these three only.

### How a daily set is built
- **The Practice block:** a new block **P**, default **45 minutes**, track `math` (and `physics` for its physics questions), its own colour. It sits after Block E in "Later today" and in the day templates: Full day 45 min, University day 30 min, Weekend 45 min, Exam week 45 min, Rest day none. Like every block, it is editable through the flexibility settings. It exists only between `practice.start` and `practice.end`.
- **All three subjects every day, in one set:** 9 questions by default, 3 per subject (2 new + 1 review each), about 40–45 minutes. Group them by subject in the order linear algebra → calculus → physics, with a small subject label at the top of each question. The count is adjustable in Settings to 3–5 per subject.
- **The sets don't follow a plan item.** Block E is on 18.06 until January, while calculus and 8.01 are only scheduled from February 2027, so the sets would otherwise never reach them. Calculus and physics work through the topics below in order, at the user's pace.
- **Linear algebra** follows 18.06 when the user is on it: if the lane item is at lecture 9, new questions come from lectures 1–9, weighted to the latest. Otherwise it uses the topic order below.
- **New questions** come from each subject's current topic. A topic counts as done after 15 questions at ≥ 80 %; then that subject moves on.
- **Review questions** are chosen by spaced repetition within each subject. Missed items return after 1, 3, 7, 21 and 60 days; items answered right step forward.
- **Adaptive difficulty:** each topic has a rating that moves with the user's results, Elo-style. New questions are picked within ±1 level of it, and the rating shows in the topic list.
- Sets for a given date are deterministic (seeded by the date), so two devices produce the same set.
- On rest days, or when the Practice block is skipped, there is no set and no penalty.
- **Time:** the set's minutes count only toward the Practice block. Block E keeps its normal plan item (18.06 lectures) and its full time. The default day becomes 8 h 45 min while Practice runs; if the user wants to stay at 8 h, the day template can shorten another block.
- Heatmap, streak and stats treat Practice like any other block. Activity's "Practice" segment shows its minutes separately from coding.

### Topics, in order

| Subject | Topics |
|---|---|
| Linear algebra (18.06 level) | vectors and linear combinations · dot product, lengths, angles · matrices and elimination · matrix multiplication and inverses · LU factorisation · vector spaces and subspaces · column space and null space · solving Ax = b, rank · independence, basis, dimension · the four fundamental subspaces · orthogonality and projections · least squares · Gram–Schmidt and QR · determinants · eigenvalues and eigenvectors · diagonalisation and powers of matrices · symmetric matrices · positive definite matrices · SVD · linear transformations and change of basis |
| Calculus (18.01 + 18.02 level) | limits and continuity · derivatives and rules · chain rule and implicit differentiation · applications: rates, linear approximation, optimisation · integrals and the fundamental theorem · substitution and integration by parts · applications: areas, volumes, work, averages · exponentials, logarithms, L'Hôpital · sequences and series, Taylor series · vectors and the dot/cross product · partial derivatives and gradients · directional derivatives and tangent planes · multivariable optimisation and Lagrange multipliers · double and triple integrals · line integrals and Green's theorem · flux, divergence and curl (intro) |
| Physics (8.01 level, mechanics) | units, dimensions, vectors · 1D and 2D kinematics · projectile motion · Newton's laws and free-body diagrams · friction and inclines · circular motion · work and kinetic energy · potential energy and conservation · momentum, impulse and collisions · centre of mass · rotational kinematics · torque and moment of inertia · angular momentum · rolling motion · static equilibrium · gravitation and orbits · simple harmonic motion · damped and driven oscillations (intro) |

### Question types
- **Multiple choice.** Options are shuffled per set.
- **Numeric**, with tolerance (absolute or relative), required units, and unit conversion. 9.81 m/s² equals 981 cm/s².
- **Symbolic expression.** For example, the derivative of x²·sin x. Check equivalence by evaluating both expressions at random points, using a small expression parser such as math.js. No CAS.
- **Vector or matrix** answers, element-wise with tolerance. Optionally "up to scaling", for eigenvectors.
- **Multi-part chained** questions, where part b uses the user's answer to part a. Mark part b correct if it follows correctly from a wrong a, and flag that.
- **Proof or derivation**, self-graded: the user writes, reveals the model solution, and marks "got it / partly / missed". This feeds spaced repetition the same way.
- **Estimation** (Fermi-style, mainly physics): correct within a stated factor, for example 2×.

### Content: the question bank
- Store questions in `data/questions/<subject>/<topic>.yaml`, validated with Zod like the rest of the seed.
- Each question has these fields:
  - `id`, `subject`, `topic`, `covers` (resource unit ids and roadmap node ids)
  - `difficulty` (1–5), `type`, `prompt` (Markdown + KaTeX)
  - `answer` and `tolerance` / `units` / `equivalence` as the type needs
  - `hints` (1–3, progressive), `solution` (full worked steps, Markdown + KaTeX, optional inline SVG diagram)
  - `source`, `license`, `estMinutes`
- **Parameterised templates** keep sets from repeating. A question can declare `params`, for example `a, b, c, d` integers in ranges, with constraints like "eigenvalues are integers". The answer and solution are computed by code from the params, and the date seed picks the params. Use templates wherever a question has a numeric core: eigenvalues, determinants, least squares, derivatives, integrals, Taylor coefficients, kinematics, collisions, orbits.
- **Every answer is machine-checked before it ships.** Add `npm run verify:questions`, which runs a Python script in `scratch/` with SymPy/NumPy: it recomputes every fixed answer and every template's answer over 200 random parameter draws. CI fails on any mismatch.
- **Size at launch:** at least 200 questions or templates per subject (600 in total). Every topic in the table is covered at difficulties 1–4, and at least 40 % of each subject is parameterised templates. That is enough for about 110 daily sets without repeats before review.
- **Copyright:** write questions originally. Adapting MIT OCW problems (18.06, 18.01SC, 18.02SC, 8.01SC) is fine under CC BY-NC-SA, with attribution in `source` and `license`. Do not copy problems from copyrighted textbooks (Strang's book, Stewart, Halliday, Morin and so on); cite the chapter they practise instead.
- Write the schema in `data/questions/SCHEMA.md` so the same bank can be reused by the user's separate practice-platform project later.

### Rendering and tracking
- Math renders with **KaTeX**, bundled locally so it works offline. Diagrams are inline SVG in the solution.
- Answers are stored per question with date, result, time and hints used: `state/practice.json` plus per-day entries in the day log, synced like everything else.
- **Stats:** in Activity, a "Practice" segment shows accuracy per subject and topic, the weakest five topics, questions due for review, and practice minutes.
- **Roadmap and credentials:** a topic with ≥ 85 % accuracy over its last 20 questions auto-ticks the roadmap nodes it `covers`, the same as finishing a resource.

---

## 2. More resources

Add these to the catalogue. Run each one through the link verifier you built last time: it must fetch the page and confirm the title. Store any that fail as `url: null` with a search hint. Free and open sources first. Mark each one as a course, book, problem source or tool, and map each to tracks and, where it fits, to question topics.

- **Linear algebra**
  - Axler, *Linear Algebra Done Right* (open-access edition)
  - Strang, *Introduction to Linear Algebra* (book site, problem sets)
  - Jim Hefferon, *Linear Algebra* (free, with answers)
  - Boyd & Vandenberghe, *Introduction to Applied Linear Algebra* (VMLS, free)
  - Halmos, *Linear Algebra Problem Book*
  - 3Blue1Brown (already listed)
- **Calculus and differential equations**
  - Paul's Online Math Notes (calculus I–III, DE, with practice problems)
  - OpenStax *Calculus* volumes 1–3
  - MIT 18.01SC / 18.02SC problem sets with solutions
  - Khan Academy (calculus, multivariable, DE)
- **Probability**
  - Blitzstein & Hwang, *Introduction to Probability* (free PDF)
  - Seeing Theory (Brown)
  - Stat 110 problem sets (already listed)
- **Physics**
  - OpenStax *University Physics* volumes 1–3
  - HyperPhysics
  - Physics LibreTexts
  - Morin, *Problems and Solutions in Introductory Mechanics*
  - MIT 8.01/8.02 problem sets with solutions
  - Walter Lewin lectures
  - Susskind (already listed)
  - David Tong's lecture notes (Cambridge: classical dynamics, E&M, quantum)
- **Proofs and discrete math**
  - *Book of Proof* (Hammack, free)
  - MIT 6.042J problem sets
- **DSA practice**
  - CSES Problem Set
  - NeetCode 150 (already listed)
  - Codeforces EDU
  - USACO Guide
- **ML math and numeracy**
  - *Mathematics for Machine Learning* exercises
  - "The Matrix Calculus You Need for Deep Learning" (Parr & Howard)
  - Scaling Book exercises
  - "Transformer Math 101" (EleutherAI)
- **System design practice**
  - system-design-primer exercises
  - Hello Interview (free pages)
  - *Designing Data-Intensive Applications* chapter questions
- **EE/ME problems**
  - *All About Circuits* textbook and worksheets
  - MIT 6.002 / 2.001 / 2.003 problem sets with solutions
  - *Engineering Statics: Open and Interactive* (free)

---

## 3. More projects, each with a brief tech doc

### The tech doc
Every project gets a doc in `data/projects/docs/<projectId>.md`: 300–700 words, Markdown, rendered in the project sheet under the brief. Use this template exactly:

```
# <Title>
**Goal.** One sentence: what exists at the end.
**Why.** Skills and roadmap nodes it builds (link ids).
**Scope.** MVP (must) · Stretch (optional), as two short lists.
**Architecture.** Components and data flow, as a short list plus one small ASCII diagram.
**Stack.** Languages, libraries, hardware.
**Milestones.** 3–6 steps with hour estimates that add up to the project's estHours. These become checkboxes.
**Done when.** Acceptance criteria and the tests or benchmarks that prove them.
**Measure and report.** The numbers the write-up must include (e.g. TTFT p50/p99, FPS at 1080p, energy drift after 10⁶ steps).
**Pitfalls.** 3–5 things that usually go wrong.
**References.** Links by catalogue id only (no raw URLs), so they stay verified.
**Write-up.** What the repo README must show: demo GIF or chart, results table, what you'd do next.
```

- Milestone checkboxes count toward the project's progress.
- A project still needs a repo URL to be marked done, as before.
- Add a "Copy as README skeleton" action that copies the doc's Goal, Architecture, Stack and Done-when as a starting README for the project's repo.

**Example to set the quality bar.** Write this one first, then match its depth everywhere:

```
# Inference server from scratch
**Goal.** A Python/PyTorch server that streams tokens from a 1–3B model over HTTP with a KV cache and continuous batching.
**Why.** Inference Engineering roadmap: prefill & decode, KV cache, continuous batching, request queueing, latency metrics.
**Scope.** MVP: single GPU, greedy and top-p sampling, streaming SSE, KV cache, continuous batching. Stretch: paged KV blocks, prefix caching, int8 weights.
**Architecture.** HTTP layer → request queue → scheduler (admits requests into the running batch each step) → model runner (prefill new requests, decode running ones) → KV cache manager → token streamer.
  client ─▶ API ─▶ queue ─▶ scheduler ─▶ runner ─▶ KV cache
                                   ▲            │
                                   └── tokens ◀─┘
**Stack.** Python 3.12, PyTorch, FastAPI, a Llama-architecture checkpoint from Hugging Face.
**Milestones.** Naive generate loop (3 h) · KV cache (4 h) · static batching (4 h) · continuous batching scheduler (8 h) · streaming API (3 h) · benchmark + write-up (6 h). Total 28 h.
**Done when.** 50 concurrent requests stream correctly; outputs match HF generate for greedy decoding; throughput beats static batching by ≥ 2× at 32 concurrent users.
**Measure and report.** TTFT and ITL p50/p99, tokens/s vs concurrency (1–64), GPU memory used by the KV cache.
**Pitfalls.** Off-by-one positions after prefill; padding masks in batched decode; forgetting to free finished sequences' cache; measuring with warm-up included.
**References.** p-orca, p-pagedattn, a-anyscale-cb, a-kipply, vllm-docs.
**Write-up.** Throughput-vs-concurrency chart, latency table, one paragraph on what PagedAttention would change.
```

### Write docs for every existing project
That's all ~84 in the catalogue. For Stage 2 hardware projects, also fill a **Parts and budget** section with an approximate part list and cost range.

### Add these new projects
Each needs a brief, acceptance criteria, estHours, cadence, phase, tracks, `covers` and its tech doc. Place them where they fit the phase table, and add them to the Deck pool.

| Area | Project | Cadence | Phase |
|---|---|---|---|
| Math | Linear algebra library in C++ (LU, QR, Cholesky, SVD by Jacobi; tested against NumPy) | M | Y1-P1 |
| Math | Visual explainers with your own renderer: eigenvectors, change of basis, Fourier series | M | Y1-P1 |
| Math | Autodiff library with higher-order derivatives and a Jacobian/Hessian checker | M | Y1-P1 |
| Math | Monte Carlo integration + variance reduction study (importance, stratified, control variates) | W | Y2 |
| Physics | ODE solver suite: Euler, RK4, adaptive RK45, symplectic leapfrog; energy-drift study on a pendulum and Kepler orbit | M | Y1-P1 |
| Physics | N-body simulation, Barnes–Hut, then CUDA; 10⁵ bodies at interactive rates | M | Y2 |
| Physics | Orbital mechanics sandbox (two-body, patched conics, Hohmann transfers) | M | Y2 |
| Physics | 1D/2D Schrödinger solver (split-step Fourier) with visualiser: tunnelling, harmonic oscillator | M | Y3 |
| Physics | E&M field visualiser: point charges, dipoles, Biot–Savart on GPU | W | Y2 |
| Inference | Constrained decoding engine: JSON-schema / grammar to FSM, token masking in your server | M | Y2 |
| Inference | Prefix caching with a radix tree in your inference server; hit-rate vs latency study | M | Y2 |
| Inference | KV-cache compression study: int8/int4 KV, sliding window, StreamingLLM sinks; quality vs memory | R | Y3 |
| Inference | CPU int8/int4 GEMM kernels with SIMD (AVX2/NEON), compared with llama.cpp | M | Y2 |
| Inference | MoE layer from scratch + toy expert parallelism across 2 processes | M | Y3 |
| Inference | In-browser inference with WebGPU (own WGSL matmul + a small model) | M | Y3 |
| Inference | Nsight profiling report of one vLLM decode step: where every microsecond goes | R | Y3 |
| AI | LoRA from scratch: train, merge, serve multiple adapters with per-request routing | M | Y2 |
| AI | Your own eval harness: 3 custom benchmarks + regression CI for prompts and models | M | Y1-P1 |
| AI | Coding agent with sandboxed execution, MCP tools and an eval suite of 50 tasks | M | Y2 |
| AI | HNSW vector index from scratch; recall/latency vs FAISS | M | Y2 |
| AI | Tiny scaling-law study: 6 model sizes on one dataset, fit loss vs compute | R | Y3 |
| Systems | Distributed rate limiter (token bucket, sliding window) with Redis and a Raft-backed variant | M | Y3 |
| Systems | Log-structured message queue with consumer groups and replay | M | Y3 |
| Systems | S3-like object store with erasure coding (Reed–Solomon) | C | Y3 |
| Systems | Consistent hashing + SWIM gossip membership; chaos test with node kills | M | Y3 |
| Systems | L4/L7 load balancer in Go or Rust (round-robin, least-connections, health checks) | M | Y2 |
| Systems | CRDT collaborative text editor (RGA or Yjs-style), offline-first | M | Y3 |
| Systems | Time-series database (Gorilla compression, downsampling) | M | Y3 |
| Systems | Architecture case study: multi-tenant SaaS with 5 ADRs, a capacity model and a skeleton repo | M | Y3 |
| Graphics | GPU-driven renderer: compute culling + indirect draws, 100k objects | M | Y3 |
| Graphics | Clustered forward lighting with 1 000+ lights | M | Y3 |
| Graphics | GPU path tracer with BVH and a simple denoiser | M | Y3 |
| Graphics | Procedural terrain with hydraulic erosion on the GPU | M | Y2 |
| Graphics | 3D Gaussian splatting viewer in Vulkan | M | Y3 |
| Simulation | Tetrahedral FEM soft body (co-rotational) | M | Y3 |
| Simulation | FLIP fluid on the GPU with surface reconstruction | M | Y3 |
| Simulation | Networked rigid-body physics with rollback | M | Y3 |
| Simulation | Differentiable 2D physics: optimise a launch angle by gradient descent | R | Y3 |
| EE | Software-defined radio receiver (RTL-SDR, FM demodulation in Python then C) | M | Y4 |
| EE | PID tuning app talking to a real motor over serial, with step-response plots | M | Y4 |
| ME | FEA validation: model, simulate, 3D-print and load-test a cantilever; compare deflection | M | Y5 |
| ME | Wind-tunnel-in-a-box: CFD of a small airfoil vs a simple smoke/flow test | M | Y5 |

---

## Tests and docs
- **Unit tests:**
  - set builder: deterministic per date, all three subjects per set in fixed order, 2 new + 1 review per subject, difficulty window, topic progression, linear algebra following 18.06 progress, no set after `practice.end`
  - spaced-repetition intervals and Elo updates
  - each answer checker: numeric with units and tolerance, symbolic equivalence, matrix up to scaling, chained parts, estimation factor
  - template parameter generation honours its constraints
  - accuracy-based roadmap ticks
  - project doc parser and milestone progress
- **`npm run verify:questions`** runs in CI. **`npm run validate:data`** checks that every project has a doc with all template sections and that its milestone hours add up.
- **E2E tests:**
  - do today's set with one wrong, one hint, one revealed
  - with the clock set to 1 February 2027, the Practice block is gone from Today and the templates
  - minutes logged to the Practice block only; Block E and the coding blocks unchanged
  - review item scheduled
  - practise a topic from Library
  - open a project doc, tick a milestone, copy the README skeleton
  - everything survives reload and two-device sync on the fake GitHub
- Screenshot baselines for a question screen, a solution and the set summary. Lighthouse accessibility stays at 100, including KaTeX output (use its MathML for screen readers).
- Update README, DECISIONS.md and PROGRESS.md.

Finish with a short summary:
- questions per subject (linear algebra, calculus, physics) and how many are templates
- projects added and docs written
- resources added and how many failed verification
- test counts
- anything you couldn't verify
