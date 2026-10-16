# GPTQ and AWQ quantization study: quality against speed

**Goal.** One model quantized with GPTQ and AWQ at 8 and 4 bits, every variant measured for perplexity, two task evals, memory, latency and throughput on the same hardware, with a quality-against-speed chart and advice on when each method is worth it.

**Why.** Quantization is the cheapest speed-up in inference and the easiest to get wrong. It covers `inference-engineering/post-training-quantization`, `inference-engineering/quantization-approaches` and `inference-engineering/measuring-quality-impact`, and builds quantization, evaluation and benchmarking.

**Scope.** MVP: one 7–8B model (or 1–3B on a small GPU); five variants, the BF16 baseline plus GPTQ and AWQ at 8 and 4 bits with group size 128; the same calibration set for both methods; WikiText-2 perplexity; two task evals with lm-evaluation-harness (for example ARC-Challenge and GSM8K); serving benchmarks in vLLM. Check first that your toolkit supports 8-bit AWQ (llm-compressor's AWQ recipes can; AutoAWQ is 4-bit only). Stretch: group-size and calibration-set ablations, an FP8 KV cache, SmoothQuant W8A8 as a third method.

**Architecture.** A quantize script loads the BF16 model, runs GPTQ or AWQ on the shared calibration set (128 samples of 2 048 tokens), and saves each variant with its config. An eval script runs perplexity and the lm-eval tasks on every variant. A benchmark script serves each variant in vLLM and measures memory, TTFT, ITL and throughput at fixed concurrency. Everything lands in one results table.

```
BF16 model ─▶ quantize (GPTQ | AWQ × 8 | 4 bit, shared calibration) ─▶ variants/
variants ─▶ eval: perplexity, lm-eval tasks ───────┐
variants ─▶ vLLM bench: memory, TTFT, ITL, tok/s ──┴─▶ results.csv ─▶ charts
```

**Stack.** Python, PyTorch, llm-compressor or GPTQModel for GPTQ, llm-compressor or AutoAWQ for AWQ, lm-evaluation-harness, vLLM, one GPU with 24 GB or more, pandas and Matplotlib.

**Milestones.** Baseline evals and benchmark in BF16 (5 h) · GPTQ 8-bit and 4-bit variants (6 h) · AWQ 8-bit and 4-bit variants (6 h) · quality evals for every variant (6 h) · speed and memory benchmarks (4 h) · charts and write-up (3 h). Total 30 h.

**Done when.** All five variants exist and are evaluated with identical settings. Perplexity on a held-out set (WikiText-2 test, 2 048-token windows) and at least two lm-eval tasks are reported for each, with the change from BF16 and its standard error. Weight memory, peak GPU memory, TTFT, ITL and output tokens per second at batch 1 and at 32 concurrent requests are reported for each on the same GPU. The write-up states which variant you would ship for a memory-bound laptop and for a throughput-bound server.

**Measure and report.** Perplexity and task-accuracy deltas against BF16; memory in GB; latency and throughput at batch 1 and at 32; quantization time per method; a Pareto chart of quality against tokens per second.

**Pitfalls.** Calibration data that overlaps the perplexity test set. Perplexities computed with different context lengths or strides. A 4-bit kernel slower than BF16 at large batch, misread as a bad quantization rather than a compute-bound kernel. A different tokenizer or chat template between variants. Treating a 0.3-point task delta as real when the standard error is 1 point.

**References.** gptq, awq, llm-int8, smoothquant, nvidia-modelopt, vllm-docs, w-ml-quantise-model.

**Write-up.** The Pareto chart, the full results table, the variant you would ship and why, and one paragraph on what activation quantization would change.
