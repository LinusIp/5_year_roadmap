# Inference server from scratch

**Goal.** A Python/PyTorch server that streams tokens from a 1–3B model over HTTP with a KV cache and continuous batching.

**Why.** Inference Engineering roadmap: `inference-engineering/prefill-and-decode-phases`, `inference-engineering/kv-cache`, `inference-engineering/continuous-batching`, `inference-engineering/request-queueing`, `inference-engineering/time-to-first-token` and `inference-engineering/inter-token-latency`. It is the first time the model, the scheduler and the network meet in code you own, and every later inference project (speculative decoding, paged KV, tensor parallelism) plugs into it.

**Scope.** MVP: single GPU, greedy and top-p sampling, streaming over server-sent events, a KV cache, continuous batching, a load-test script. Stretch: paged KV blocks, prefix caching, int8 weights.

**Architecture.** An HTTP layer accepts requests and puts them on a queue. A scheduler admits waiting requests into the running batch at every step, as long as KV memory allows. The model runner prefills the new requests and decodes one token for every running one. A KV cache manager hands out and frees per-sequence cache. A streamer pushes each new token to its client and retires finished sequences.

```
client ─▶ API ─▶ queue ─▶ scheduler ─▶ runner ─▶ KV cache
                              ▲            │
                              └── tokens ◀─┘
```

**Stack.** Python 3.12, PyTorch, FastAPI with server-sent events, a Llama-architecture checkpoint from Hugging Face, and Locust or a small asyncio client for load.

**Milestones.** Naive generate loop matching Hugging Face output (4 h) · KV cache with a measured speed-up (6 h) · static batching with padding masks (6 h) · continuous batching scheduler (12 h) · streaming API with TTFT and ITL logging (4 h) · load test, benchmark and write-up (8 h). Total 40 h.

**Done when.** Greedy outputs match Hugging Face `generate` token for token on 20 prompts. 50 concurrent requests stream to completion with no dropped or interleaved tokens. Continuous batching beats static batching on throughput by at least 2× at 32 concurrent users, measured by the load-test script that ships in the repository.

**Measure and report.** Time to first token and inter-token latency at p50 and p99; tokens per second against concurrency from 1 to 64; GPU memory held by the KV cache as the batch grows; the speed-up of the KV cache over recomputing attention.

**Pitfalls.** Position ids off by one after prefill. Padding masks forgotten in batched decode, which silently corrupts shorter sequences. Finished sequences that never give their cache back. Benchmarks that include model warm-up or the first CUDA graph capture. Reporting averages where the percentiles tell the story.

**References.** vllm-docs, orca, pagedattention, sglang-docs.

**Write-up.** A throughput-against-concurrency chart for static and continuous batching, the latency table, a short trace of one request through the scheduler, and one paragraph on what PagedAttention would change in the cache manager.
