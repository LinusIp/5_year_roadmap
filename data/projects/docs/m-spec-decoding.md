# Speculative decoding from scratch, compared with EAGLE

**Goal.** Draft-target speculative decoding written by you in PyTorch, tested to reproduce the target model's output distribution, measured for acceptance rate and speed-up across draft lengths and prompt types, and compared with an EAGLE implementation on the same target model.

**Why.** Speculation is the main latency lever while decoding is memory-bound. It covers `inference-engineering/draft-target-decoding`, `inference-engineering/eagle` and `inference-engineering/speculation-algorithms`, and builds speculative decoding, sampling and PyTorch.

**Scope.** MVP: a target and a small draft from one family sharing a tokenizer (for example Llama 3.1 8B with Llama 3.2 1B, or Qwen2.5 7B with 0.5B); KV caches for both; draft k tokens, verify them in one target forward pass, accept each with probability min(1, p/q), and on rejection resample from the normalised max(0, p − q); greedy and temperature sampling; draft lengths 1–8; three prompt types (code, chat, summarisation); EAGLE through its reference code or an engine's EAGLE support, on the same target. Stretch: adaptive draft length, tree verification, a prompt-lookup n-gram drafter.

**Architecture.** The draft runs k autoregressive steps and records its probabilities q. The target runs one forward pass over the prefix plus the k drafted tokens and yields p at every position. The verifier walks the positions, accepting each token with probability min(1, p/q); at the first rejection it samples from the residual and stops; if all k pass it samples one bonus token from the target. Both KV caches roll back to the accepted length.

```
prefix ─▶ draft × k ─▶ t1…tk, q1…qk
                            │
prefix + t1…tk ─▶ target (one pass) ─▶ p1…pk+1
                            │
verifier: accept with min(1, p/q) ── reject ─▶ sample max(0, p−q) ─▶ roll back KV
```

**Stack.** Python 3.12, PyTorch, Hugging Face Transformers for the checkpoints, your own KV-cache handling, the EAGLE reference repository or an engine with EAGLE support, one GPU with 24 GB or more.

**Milestones.** Baseline target decoding with KV cache and timing (4 h) · draft loop and verification with rejection sampling (8 h) · distribution test and KV rollback (5 h) · sweeps over draft length and prompt type (5 h) · EAGLE on the same target and prompts (4 h) · write-up (4 h). Total 30 h.

**Done when.** With greedy decoding the output is token-for-token identical to the target alone on 50 prompts. With temperature 1, at least 10 000 tokens sampled at fixed prefixes give a distribution that a chi-squared test does not distinguish from the target's at p = 0.01, with total variation distance under 0.01. Acceptance rate and wall-clock speed-up are reported for draft lengths 1, 2, 4 and 8 on three prompt types, and the same measurements are made for EAGLE.

**Measure and report.** Acceptance rate and mean tokens accepted per target pass; tokens per second and speed-up over target-only decoding at batch 1; the speed-up predicted from acceptance rate and draft cost against the measured one; how the speed-up shrinks at batch 4 and 16.

**Pitfalls.** p and q computed after different temperature or top-p processing. Forgetting the bonus token when every draft is accepted. KV caches not rolled back on rejection, corrupting later positions. Reporting speed-up only on code, where acceptance is highest. A draft with a different tokenizer.

**References.** speculative-decoding-leviathan, speculative-sampling-chen, eagle, medusa, vllm-docs, m-inference-server.

**Write-up.** A chart of speed-up against draft length per prompt type, the EAGLE comparison table, the distribution test, and a paragraph on when speculation stops paying (large batches, high temperature).
