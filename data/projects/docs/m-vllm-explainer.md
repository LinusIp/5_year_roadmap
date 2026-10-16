# Read vLLM's scheduler and PagedAttention source, and write the explainer

**Goal.** A published explainer that follows one request through vLLM, from the HTTP entry point to the attention kernel, with your own diagrams of block tables, copy-on-write and preemption, backed by an experiment you can rerun.

**Why.** Inference Engineering roadmap: `inference-engineering/pagedattention` and `inference-engineering/kv-cache-storage`, with `inference-engineering/vllm` and `inference-engineering/continuous-batching` along the way. Reading a large, fast-moving codebase is its own skill: you learn where the real decisions live, and your own server from project 24 gets a reference to argue with. Technical writing is the second skill: the explainer is the deliverable.

**Scope.** MVP: one pinned vLLM release, one small model, one request traced with file and function references, PagedAttention's block tables and copy-on-write drawn by you, a preemption experiment with logs. Stretch: the same trace with prefix caching on; a side-by-side of vLLM's scheduler and SGLang's RadixAttention.

**Architecture.** The trace follows the request through five layers, and the explainer gets one section per layer. The OpenAI-compatible API server tokenises and hands the request to the engine client. The engine core runs a loop: the scheduler picks which requests run this step under a token budget, the KV cache manager allocates blocks and fills the block table, the model runner builds the batch, and the attention backend reads keys and values through the block table. Outputs are detokenised and streamed back.

```
HTTP ─▶ API server ─▶ engine core loop
                        │
          scheduler ─▶ KV cache manager (block table)
                        │
          model runner ─▶ attention kernel ─▶ tokens ─▶ client
```

**Stack.** vLLM built from source at a pinned commit, Python 3.12 with debugpy or VS Code breakpoints, a 0.5–1B model on one GPU, `py-spy` for stack samples, Excalidraw or similar for diagrams, and Markdown for the post.

**Milestones.** Build vLLM from source with a debugger attached and a tiny model (3 h) · Trace one request from the API server through the scheduler to the kernel, with file and function references (5 h) · Block manager, block tables and copy-on-write, drawn and checked against the code (4 h) · Preemption and swapping experiment under memory pressure (4 h) · Write, review and publish the explainer (4 h). Total 20 h.

**Done when.** The explainer names the file and function for every hop of the request, at a commit hash stated at the top. Each diagram is matched by a log line or breakpoint screenshot that shows the same state. The preemption experiment reproduces on demand: with the KV cache shrunk by `gpu_memory_utilization` and 64 concurrent long prompts, the logs show at least one preempted request that later completes with output identical to an unpreempted run. It is published as a blog post or a long README.

**Measure and report.** Block size and the number of KV blocks available for your model and GPU, and the arithmetic behind it (bytes per token of KV cache); how many requests were preempted at 16, 32 and 64 concurrent users; the latency cost of preemption, measured as p99 end-to-end latency with and without memory pressure.

**Pitfalls.** vLLM moves fast: pin one commit or the references rot before you publish. The V1 engine runs the core in a separate process, so a breakpoint in the API server never sees the scheduler; attach to the right process. V0 offered both swapping to CPU and recomputation, V1 preempts by recomputing; say which one your version does and show it. Copy-on-write only appears when blocks are shared (parallel sampling, beam search or prefix caching), so design the experiment to trigger it.

**References.** vllm-docs, pagedattention, orca, sglang-radixattention, kipply-inference-arithmetic, m-inference-server.

**Write-up.** The request trace as a numbered list with links into the pinned source, three diagrams (request path, block table, copy-on-write), the preemption log excerpt and its latency table, and a closing section on what your project 24 server would need to adopt paged blocks.
