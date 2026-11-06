# kvroute: a cluster serving router

**Goal.** A control plane in Rust in front of a fleet of vLLM or nanoserve workers. It routes each request to the worker most likely to hold its KV-cache prefix, can split prefill from decode, autoscales on queue depth and keeps the fleet inside its latency targets.

**Why.** In 2026 and 2027 serving moved from one engine to many: disaggregated prefill and decode, KV-cache-aware routing and shared KV stores, as in NVIDIA Dynamo, llm-d and Mooncake. A measured version of this is system-design proof that matches real production work, and it fits the AI Agents and Backend Infrastructure role.

**Scope.** MVP: an OpenAI-compatible gateway; round-robin and least-load routing with health checks, retries before the first token and Prometheus metrics; a prefix index fed by the workers' KV events; prefill and decode pools with KV transfer over TCP; KEDA autoscaling on queue depth; k6 load tests and an SLO dashboard. Stretch: NIXL over RDMA through vLLM's NixlConnector, admission control under overload, multi-model and LoRA routing, and a chaos test that kills a worker mid-stream.

**Architecture.** The gateway hands each request to the router, which tokenises the prompt, hashes it in 16-token blocks and asks the prefix index how many leading blocks each worker already caches. It scores every worker on the blocks still to prefill plus its active decode load and sends the prompt to a prefill worker; the KV cache then moves to a decode worker that streams the reply. Workers publish KV events that keep the index current, and queue metrics drive the autoscaler.

**Stack.** Rust with tokio, axum and tonic, the Hugging Face tokenizers crate, ZeroMQ for vLLM's KV events, vLLM and nanoserve workers, Kubernetes with KEDA, Prometheus, Grafana, OpenTelemetry and k6.

**Milestones.** Router (40 h) · Prefix-aware routing (56 h) · Disaggregation (64 h) · Operations (40 h) · Stretch (24 h) · Total 224 h.

**Done when.** Prefix-aware routing cuts p50 time to first token by a measured amount against round-robin on the same cluster. The system survives a worker kill with no dropped non-streaming requests. A one-page capacity model is written and matches the load tests within 15%.

**Measure and report.** Prefix-cache hit rate and time to first token at p50 and p99 for round-robin, least-load and prefix-aware routing, on a multi-turn chat trace and a shared-system-prompt trace; router overhead at p99 at 500 requests per second; goodput at the time-to-first-token and per-token targets for disaggregated against co-located serving; errors during a worker kill.

**Pitfalls.** Trusting the engine's own block hashes, which can change between versions and be seeded per process: rehash the token ids yourself. Pure cache affinity, which piles a hot prefix onto one worker. Retrying a half-streamed reply, which duplicates text. Treating the index as the truth, when events arrive late: a miss must only cost a slower prefill. Renting big GPUs too early, when several small workers can share one GPU while you develop.

**References.** paper-distserve, paper-splitwise, paper-mooncake, paper-sglang-radixattention, docs-llm-d, vllm-docs, docs-dynamo-router-design, repo-nixl, k6-docs.

**Write-up.** The routing-policy comparison table first, then the architecture and the scoring function, the capacity model against the measured curve, the worker-kill test, and what disaggregation did and didn't buy on this hardware.
