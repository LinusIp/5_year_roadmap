# Research question: Does speculative decoding help more on code than on prose at equal acceptance rate

**Goal.** A pre-registered experiment that runs draft-target speculative decoding on code and prose prompts, compares speed-up within matched acceptance-rate bins, and tests whether code's acceptances come in longer runs; it ends in a two-page report in research/, and a negative result counts.

**Why.** Inference Engineering roadmap: `inference-engineering/draft-target-decoding`, `inference-engineering/speculation-algorithms`, `inference-engineering/tokens-per-second` and `inference-engineering/performance-benchmarking`. Skills: experiment design and scientific writing; separating a mean effect from a distributional one. The standard analysis assumes independent acceptances, so equal acceptance rate implies equal speed-up; the question is whether real code breaks that assumption.

**Scope.** MVP: one draft and target pair from the same family (for example 0.5B and 7B), 200 code prompts and 200 prose prompts, draft lengths 2 to 8, greedy and temperature 0.7, per-token acceptance logs, comparison within acceptance-rate bins of width 0.05. Stretch: EAGLE as a second drafter, a third domain (maths), n-gram speculation.

**Architecture.** Phases: a question with a written prediction; a frozen protocol (models, prompts, lengths, bins, metrics); an instrumented decoder that records, for every step, how many draft tokens were accepted; baseline timing without speculation; the sweep; the analysis comparing tokens per step and wall-clock speed-up at matched acceptance, plus the autocorrelation of acceptances; the report.

```
prompts (code | prose) ─▶ draft γ tokens ─▶ target verifies ─▶ accept k
                                  ▲                               │
                                  └──────────── log k per step ◀──┘
logs ─▶ bin by acceptance rate ─▶ tokens/step, speed-up, run lengths ─▶ report
```

**Stack.** Python 3.12, PyTorch, your speculative decoder from m-spec-decoding (vLLM's implementation as a cross-check), Hugging Face checkpoints, pandas and matplotlib for analysis, one GPU.

**Milestones.** Question, prediction and protocol written down (3 h) · prompt sets and non-speculative baseline timings (5 h) · decoder instrumented to log acceptance per step (7 h) · sweep over draft lengths, temperatures and domains (8 h) · binned analysis and two-page report (7 h). Total 30 h.

**Done when.** A hypothesis and prediction are committed before the sweep, for example "within the same acceptance-rate bin, code yields at least 10 % more tokens per target step than prose, because accepted tokens are positively autocorrelated". The experiment could prove it wrong: identical models, lengths and hardware for both domains, at least 5 bins with 20 or more sequences each, and the independence-model prediction computed for comparison. Code, prompts and logs are in the repository. The two-page report is in research/ in the data repo and is discussed in the quarterly review.

**Measure and report.** Acceptance rate per domain; tokens per target step and wall-clock speed-up per bin and domain, with confidence intervals; the independence model's predicted tokens per step against the measured value; lag-1 autocorrelation of acceptance and the distribution of accepted run lengths; the best draft length per domain.

**Pitfalls.** Comparing domains at different mean acceptance and calling it a domain effect. Prompts of different lengths, so prefill time skews the speed-up. Measuring with warm-up included. Sampling bugs that make speculative output differ from the target's own distribution. Code prompts that are mostly boilerplate a single model memorised.

**References.** speculative-decoding-leviathan, speculative-sampling-chen, eagle, medusa, vllm-docs, m-spec-decoding, schulman-research-guide.

**Write-up.** The speed-up-against-acceptance chart for both domains with the independence curve, the run-length histograms, the prediction quoted next to the outcome, and what it means for choosing draft lengths per request.
