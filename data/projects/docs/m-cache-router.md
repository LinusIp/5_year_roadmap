# Cache-aware router in Go or Rust in front of vLLM replicas, with autoscaling

**Goal.** A router in Go or Rust that sends each request to the vLLM replica most likely to hold its prefix in cache, scales replicas on queue depth down to zero, and beats round-robin on cache hit rate, time to first token and cost in a benchmark.

**Why.** Inference Engineering roadmap: `inference-engineering/cache-aware-routing`, `inference-engineering/routing-and-load-balancing`, `inference-engineering/autoscaling`, `inference-engineering/scale-to-zero` and `inference-engineering/cold-starts`. Skills: Go or Rust, load balancing and autoscaling. Prefix caching only helps if the request lands where the prefix is; at fleet scale, routing is where the cache hit rate is won or lost.

**Scope.** MVP: three or more vLLM replicas with prefix caching, an OpenAI-compatible proxy that streams responses, a per-replica approximate prefix index, a score that trades prefix match against load, a round-robin mode for comparison, an autoscaler driven by queue depth with scale to zero and request buffering during cold starts. Stretch: replicas reporting their cache contents instead of the router guessing; session affinity with fallback; LoRA-aware routing.

**Architecture.** The router hashes each prompt into fixed-size blocks of tokens and looks up, for every replica, the longest run of block hashes it has recently sent there. It scores replicas by matched prefix length minus a penalty for queue depth, forwards to the best one, and streams the response back. A metrics poller reads each replica's waiting and running requests. The autoscaler adds a replica when the average queue depth stays above a threshold, removes idle ones after a cool-down, and holds requests while a replica starts from zero.

```
clients ─▶ router ─(prefix index + load score)─▶ vLLM replica 1..N
              │                                        │
              └── autoscaler ◀── queue depth, metrics ─┘
                      │
                 Kubernetes (scale deployments, 0..N)
```

**Stack.** Go (net/http with streaming) or Rust (axum, tokio), vLLM with prefix caching and its Prometheus metrics, a 1–3B model, Kubernetes on a GPU node pool (or Docker Compose for development), Prometheus and Grafana, a Python load generator.

**Milestones.** Three vLLM replicas with prefix caching, metrics and a round-robin proxy (6 h) · Workload generator with shared system prompts and multi-turn sessions (5 h) · Prefix-aware routing balanced against load (12 h) · Autoscaler on queue depth with scale to zero and cold-start buffering (10 h) · Benchmark against round-robin and the design doc (7 h). Total 40 h.

**Done when.** On a workload of 200 multi-turn sessions sharing 20 system prompts, routing raises the prefix cache hit rate by at least 2× over round-robin and lowers p50 TTFT by at least 30 % at the same request rate, measured by the benchmark script in the repository. A load step from idle to 20 requests per second brings replicas up from zero with no request failing; idle replicas scale back to zero after the cool-down. The design doc covers the scoring function, its failure modes, and the trade-offs you made.

**Measure and report.** Prefix cache hit rate, TTFT and ITL at p50 and p99 for round-robin and cache-aware routing; load imbalance across replicas as the coefficient of variation of queue depth; cold-start time from zero to first token; GPU-hours and cost per million tokens for each policy over the same hour-long trace.

**Pitfalls.** Routing purely on prefix match, which piles every request onto one hot replica. A prefix index that never forgets, so it routes to replicas that evicted that cache long ago. Hashing characters instead of tokens, so block boundaries disagree with the engine's. Scale-down that kills a replica mid-stream. Measuring cold start without counting the model download and load.

**References.** sglang-radixattention, vllm-docs, sglang-docs, nvidia-dynamo, kubernetes-tutorials, prometheus-docs, m26.

**Write-up.** Hit-rate and TTFT charts for both policies, a Grafana timeline of a scale-from-zero event, the cost table, and the design doc's trade-off section in the README.
