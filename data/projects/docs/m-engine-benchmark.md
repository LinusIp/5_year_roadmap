# One 7B model benchmarked across llama.cpp, vLLM and TensorRT-LLM

**Goal.** The same 7B-class instruct model served by llama.cpp, vLLM and TensorRT-LLM on the same GPU, measured with one benchmark tool for time to first token, inter-token latency, throughput and p50/p99 across concurrency levels, with cost per million tokens and a recommendation for two workloads.

**Why.** It turns engine marketing into numbers you trust. It covers `inference-engineering/vllm`, `inference-engineering/tensorrt-llm`, `inference-engineering/performance-benchmarking`, `inference-engineering/locust`, `inference-engineering/latency-vs-throughput`, `inference-engineering/cost-estimation` and `inference-engineering/end-to-end-metrics`, and builds benchmarking discipline across three serving stacks.

**Scope.** MVP: one model (for example Llama 3.1 8B or Qwen2.5 7B Instruct) in BF16 on vLLM and TensorRT-LLM and in the closest llama.cpp format (F16 GGUF, or a stated quantisation); two prompt sets (chat: about 200 tokens in and 200 out; long context: about 2 000 in and 200 out); concurrency 1, 4, 16 and 64; one load generator against each engine's OpenAI-compatible endpoint; a cost model. Stretch: FP8 on all three, speculative decoding, a CPU-only llama.cpp run, a Locust soak test.

**Architecture.** A harness starts one engine at a time in a container with pinned versions and identical sampling settings, warms it up, then drives it with a streaming client that timestamps every token. Each run writes rows of engine, prompt set, concurrency, request id, TTFT, every inter-token gap and token counts. A notebook computes percentiles, throughput and cost and draws the charts.

```
prompts ─▶ load generator (streaming, timestamps) ─▶ engine endpoint
                                                    ├─ llama.cpp server
                                                    ├─ vLLM
                                                    └─ TensorRT-LLM (trtllm-serve)
results.csv ─▶ notebook ─▶ percentiles, tokens/s, cost per M tokens, charts
```

**Stack.** One NVIDIA GPU with 24–80 GB (a rented L40S, A100 or H100), Docker, vLLM, TensorRT-LLM, llama.cpp built with CUDA, one load tool for all three (vLLM's serving benchmark, genai-perf, or Locust with a streaming client), pandas and Matplotlib.

**Milestones.** Model, prompt sets, harness and the vLLM baseline (6 h) · llama.cpp server with the matched model (4 h) · TensorRT-LLM engine build and serving (7 h) · full sweeps across concurrency and prompt sets (6 h) · cost model, charts and write-up (7 h). Total 30 h.

**Done when.** All three engines serve the same model with identical prompts, max tokens and greedy sampling after a warm-up, and any precision difference is stated. For each engine, prompt set and concurrency level, TTFT and ITL at p50 and p99, output tokens per second and requests per second come from the same tool over at least 200 requests. Cost per million output tokens follows from the hourly GPU price and measured throughput. The write-up recommends an engine for interactive chat (p99 TTFT under 500 ms) and one for offline batch work (most tokens per dollar).

**Measure and report.** The full table for 3 engines × 2 prompt sets × 4 concurrency levels; throughput-against-latency curves; GPU memory used; engine build or load time; cost per million tokens at each engine's best operating point.

**Pitfalls.** Comparing a 4-bit llama.cpp model against BF16 vLLM without saying so. Different default batch limits or KV-cache memory fractions skewing the result. Counting tokens with different tokenizers. Including warm-up or CUDA graph capture in the numbers. A load generator that saturates its own CPU and becomes the bottleneck.

**References.** vllm-docs, tensorrt-llm-docs, llama-cpp, databricks-inference-best-practices, kipply-inference-arithmetic, batching-effects-gpt.

**Write-up.** The throughput-latency chart for the three engines, the full results table, the cost table, both recommendations, and the exact versions and flags so anyone can rerun it.
