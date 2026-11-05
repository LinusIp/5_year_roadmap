# nanoserve: an LLM inference engine from scratch

**Goal.** A single-GPU engine in C++20 and CUDA that loads Llama 3.2 1B/3B or Qwen3 1.7B/4B from safetensors and serves it through an OpenAI-compatible API, with a paged KV cache, continuous batching and kernels you wrote, benchmarked against llama.cpp and vLLM.

**Why.** Inference is the largest GPU workload in 2027, and teams hire people who know where the milliseconds go. Wrappers around vLLM are common; an engine whose scheduler, KV cache and kernels are your own is rare at intern level. It is one of the three projects for the 2027 applications.

**Scope.** MVP: one decoder family (RMSNorm, RoPE, grouped-query attention, SwiGLU) in BF16, greedy and top-p sampling, SSE streaming, a paged KV cache with 16-token blocks, continuous batching with chunked prefill, and CUDA graphs for decode. Stretch: speculative decoding with a draft model or EAGLE, prefix caching with a radix tree, and a W4A16 or FP8 GEMM. Out of scope: multi-GPU serving (Project 4), training, and image or audio inputs.

**Architecture.** Each step, the scheduler admits waiting requests up to a token budget, the block manager reserves KV pages for them, and the model runner sends one mixed prefill-and-decode batch to the GPU. The sampler turns the logits into tokens, which stream back to the client and return to the scheduler for the next step. The diagram follows one request.

**Stack.** C++20 and CUDA, cuBLASLt for BF16 GEMMs, FlashInfer as the attention reference, tokenizers-cpp, cpp-httplib or Drogon for HTTP, nanobind for the Python test bindings, Nsight Systems and Nsight Compute.

**Milestones.** Correct forward pass (56 h) · KV cache and decode loop (56 h) · Continuous batching (64 h) · Fast kernels (96 h) · Stretch (64 h) · Total 336 h.

**Done when.** Decode throughput is within 80% of llama.cpp on the same GPU and model, at batch 1 and batch 32. Time to first token and inter-token latency are reported at p50 and p99 under a load generator. Output matches the PyTorch reference on a fixed prompt set: logits within 1e-3 in FP32 debug mode, and the same first 64 greedy tokens on at least 95% of 200 prompts in BF16.

**Measure and report.** Decode tokens per second at batch 1 and 32 against llama.cpp; time to first token and time per output token at p50 and p99 at 1, 4 and 16 requests per second against vLLM on the same GPU; KV memory wasted against ideal packing; one Nsight Systems trace per release.

**Pitfalls.** BF16 drift: keep RMSNorm, softmax and accumulation in FP32. Leaked KV blocks: in debug builds, check after every step that no block has two owners. Spending weeks on kernels before the engine works end to end: ship on cuBLASLt and FlashInfer first, then swap in your own kernels one at a time behind a flag. A 3B model in BF16 needs about 6 GB for its weights alone, so use a GPU with 12 GB or more, or the DGX Spark.

**References.** paper-pagedattention-vllm, paper-orca-continuous-batching, paper-flashattention-2, repo-llm-c, nano-vllm, paper-eagle, llama-cpp, repo-flashinfer.

**Write-up.** The results table against llama.cpp and vLLM first, then the scheduler and KV-cache design with its diagram, one Nsight Systems trace explained, what each kernel swap bought, and the limits that remain.
