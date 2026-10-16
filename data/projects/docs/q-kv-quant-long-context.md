# Research question: How does KV-cache quantization degrade long-context retrieval

**Goal.** A pre-registered experiment that quantizes the KV cache of an open long-context model to 8 and 4 bits under several schemes and measures retrieval accuracy against context length and needle depth, ending in a two-page report in research/; a negative result counts.

**Why.** Inference Engineering roadmap: `inference-engineering/kv-cache`, `inference-engineering/post-training-quantization`, `inference-engineering/quantization-approaches`, `inference-engineering/measuring-quality-impact` and `inference-engineering/long-context-handling`. Skills: experiment design and scientific writing, applied to a memory-for-quality trade-off every serving stack has to make.

**Scope.** MVP: one model with at least a 32k context (a Llama 3.x or Qwen 2.5 model of 3–8B), an fp16 cache baseline, int8 per-token, int4 per-token, and int4 with per-channel keys and per-token values; single-needle retrieval at 4k, 8k, 16k and 32k tokens and five depths; a multi-key variant with distractors. Stretch: 64k context, fp8, keeping the first tokens or a recent window in full precision.

**Architecture.** Phases: a question with a written prediction; a frozen protocol (model, schemes, lengths, depths, prompts, scoring); the evaluation harness and fp16 baseline; quantization inserted in the cache write path (quantize on write, dequantize on read); the sweep; the report. Each cell of the sweep is a fixed set of prompts with exact-match scoring.

```
haystack + needle ─▶ prefill ─▶ KV write ─▶ quantize (scheme) ─▶ cache
                                                                   │
           answer ◀── decode ◀── dequantize on read ◀──────────────┘
score: length × depth × scheme ─▶ heatmaps ─▶ report
```

**Stack.** Python 3.12, PyTorch, your inference server from m-inference-server or Hugging Face transformers with a custom cache class, vLLM's fp8 cache as a cross-check, one 24 GB or larger GPU.

**Milestones.** Question, prediction and protocol written down (3 h) · retrieval harness and fp16 baseline (8 h) · quantization schemes in the cache path, checked on short prompts (8 h) · sweep over lengths, depths and schemes (6 h) · two-page report and review notes (5 h). Total 30 h.

**Done when.** A hypothesis and prediction are committed before the sweep, for example "int8 stays within 2 points of fp16 at every length; int4 per-token loses more than 20 points at 32k; per-channel keys recover at least half of that loss". The experiment could prove it wrong: at least 50 prompts per cell, identical prompts across schemes, greedy decoding. Code, prompts and raw outputs are in the repository. The two-page report is in research/ in the data repo and is discussed in the quarterly review.

**Measure and report.** Accuracy heatmaps (length against depth) per scheme and their difference from fp16; multi-key accuracy; KV memory per token and the longest context that fits in a fixed budget; perplexity on a long document per scheme; any change in decode speed.

**Pitfalls.** Outlier channels in the keys that ruin per-token int4, which is the effect to measure, not a bug. Dequantization in a different dtype than the baseline. Prompts whose answers the model guesses without the needle. Too few prompts per cell, so heatmaps show noise. Running out of memory at the longest length and silently truncating.

**References.** kipply-inference-arithmetic, pagedattention, llm-int8, smoothquant, vllm-docs, m-inference-server, m-quant-study, schulman-research-guide.

**Write-up.** The heatmap grid, the memory-against-accuracy chart, the prediction quoted next to the outcome, and a recommendation for which scheme to ship at which context length.
