# Inference capstone: your own serving stack, end to end, benchmarked against vLLM

**Goal.** One serving stack you built, deployed on Kubernetes: your server with paged KV cache, continuous batching, speculative decoding and quantized weights (each switchable), behind your cache-aware router and autoscaler, published with an honest benchmark against vLLM on the same hardware.

**Why.** Inference Engineering roadmap: `inference-engineering/continuous-batching`, `inference-engineering/autoscaling`, `inference-engineering/cost-estimation` and `inference-engineering/testing-and-deployment`. Skills: inference serving, GPU systems and benchmarking. Years 2 and 3 built the parts in separate repositories (projects 24, 26, 27 and 43); the capstone makes them one system, where the interactions (speculation inside continuous batching, quantized kernels with paged attention) are the hard part.

**Scope.** MVP: one open model of 3–8B parameters; paged KV cache and continuous batching in your server; draft-model speculative decoding; int4 or int8 weights; each behind a flag; the router and autoscaler from project 43 pointing at your server; Helm charts; a benchmark harness that drives your stack and vLLM with identical traces; documentation. Stretch: prefix caching with a radix tree, EAGLE-style speculation, tensor parallelism from project 41, an OpenAI-compatible tool-call endpoint.

**Architecture.** Requests enter the router, which picks a replica by prefix and load. Each replica runs your server: an API layer, a scheduler with continuous batching and paged KV blocks, a model runner that can verify draft tokens and load quantized weights. The autoscaler watches queue depth and scales replicas. A benchmark controller replays the same trace against your stack and a vLLM deployment of the same model on the same GPU type and collects metrics.

```
trace ─▶ bench ─┬─▶ router ─▶ your server ×N (paged KV, CB, spec, int4)
                │       └── autoscaler ◀── metrics
                └─▶ vLLM ×N (same GPUs)
                          ▼
              TTFT, ITL, throughput, p99, $/1M tokens
```

**Stack.** Python and PyTorch for the server, Triton or CUDA kernels where you wrote them, Go or Rust for the router, Kubernetes with a GPU node pool, Helm, Prometheus and Grafana, vLLM at a pinned version as the baseline, ShareGPT-style and synthetic traces.

**Milestones.** Server core: paged KV cache and continuous batching behind feature flags (28 h) · Speculative decoding and quantized weights integrated and switchable (24 h) · Router and autoscaler deployed with the server on Kubernetes (24 h) · Benchmark harness and runs against vLLM on the same hardware (24 h) · Cost model, documentation and the write-up of the benchmark method (20 h). Total 120 h.

**Done when.** With speculation on or off, greedy outputs match token for token on 50 prompts, and with quantization on, eval accuracy is within 2 points of the full-precision model. A test matrix runs every combination of the four flags in CI on a small model. The stack deploys from the repository with one Helm command, and the autoscaler scales from one to three replicas under load. The benchmark reports TTFT, ITL, throughput, p99 latency and cost per million tokens for your stack and vLLM at concurrency 1, 8, 32 and 128 on the same GPU type, gap included. The repository is public with documentation.

**Measure and report.** TTFT and ITL at p50 and p99; output tokens per second against concurrency; p99 end-to-end latency; cost per million tokens from the measured throughput and the GPU's hourly price; the contribution of each feature, switched on one at a time; speculative acceptance rate and int4 quality loss.

**Pitfalls.** Benchmarking vLLM with defaults you did not read while your stack is tuned, or the other way round. Speculation that is correct alone and wrong once continuous batching mixes sequences of different lengths. Quantized kernels slower than float16 at the batch sizes that matter. Spending the budget on a fourth feature instead of the benchmark and documentation. Cost figures that ignore idle replicas.

**References.** m-inference-server, m-spec-decoding, m-quant-study, m-cache-router, vllm-docs, pagedattention, orca, eagle, awq, kubernetes-tutorials.

**Write-up.** An architecture diagram, the benchmark method in enough detail to rerun it, the comparison table and charts against vLLM, a per-feature ablation chart, the cost table, and an honest section on where vLLM wins and why.
