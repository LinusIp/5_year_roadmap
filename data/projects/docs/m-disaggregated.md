# Disaggregated prefill and decode prototype with KV transfer

**Goal.** A prototype that runs prefill and decode on separate GPU workers, moves each request's KV cache from one to the other, and measures what that does to time to first token and inter-token latency under a mixed workload, against a colocated baseline.

**Why.** Inference Engineering roadmap: `inference-engineering/disaggregation`, `inference-engineering/kv-cache-storage` and `inference-engineering/indep-component-scaling`, with `inference-engineering/prefill-and-decode-phases` underneath. Skills: disaggregated serving, KV transfer and scheduling. Prefill is compute-bound and decode is memory-bound; splitting them lets each be sized and batched for its own bottleneck, at the price of moving the cache.

**Scope.** MVP: two GPUs, one prefill worker and one decode worker built from your project 24 server, KV transfer over NCCL point-to-point, a router that sends new requests to prefill and hands them to decode, a workload mixing short chat prompts with 4,000-token documents. Stretch: two decode workers fed by one prefill worker; chunked prefill in the colocated baseline as a fairer comparison; transfer overlapped layer by layer with prefill.

**Architecture.** The router assigns each request to the prefill worker, which runs the prompt, samples the first token, and streams it back. The prefill worker then sends the KV blocks for every layer to the decode worker, which allocates blocks, receives the cache into them, and adds the request to its continuously batched decode loop. A transfer manager tracks in-flight caches so neither side frees memory early.

```
client ─▶ router ─▶ prefill worker ─▶ first token ─▶ client
                        │ KV blocks (NCCL send/recv)
                        ▼
                  decode worker ─▶ tokens ─▶ client
```

**Stack.** Python 3.12, PyTorch with `torch.distributed` (NCCL), your inference server's model runner and KV cache manager, a 1–3B Llama-architecture model, an asyncio load generator, Nsight Systems.

**Milestones.** Colocated baseline and a mixed-workload generator (6 h) · Separate prefill and decode workers (8 h) · Paged KV transfer between workers over NCCL (10 h) · Router, then TTFT and ITL under mixed load against the baseline (8 h) · Transfer cost analysis and comparison with DistServe and Splitwise (8 h). Total 40 h.

**Done when.** Greedy outputs from the disaggregated system match the colocated server token for token on 20 prompts. Under the mixed workload at three request rates, the benchmark reports TTFT and ITL at p50 and p99 for both systems. The transfer cost is measured per request and checked against the arithmetic (for a 3B model with grouped-query attention, roughly 110 KB per token, about 450 MB for a 4,000-token prompt). The write-up states at which load disaggregation wins on p99 ITL and by how much, or why it never does on two GPUs.

**Measure and report.** TTFT and ITL at p50 and p99 against request rate for colocated and disaggregated; goodput as requests per second meeting a TTFT and ITL target; KV transfer time and bandwidth against prompt length; GPU utilisation of each worker.

**Pitfalls.** A colocated baseline without chunked prefill or any batching policy, which makes disaggregation look better than it is. Blocking the decode loop while a transfer lands. Mismatched block layouts between workers, which yields fluent garbage rather than an error. Counting the transfer in neither TTFT nor ITL. Freeing the prefill copy before the decode side confirms receipt.

**References.** distserve, splitwise, mooncake, nvidia-dynamo, pagedattention, vllm-docs, m-inference-server.

**Write-up.** A latency-against-load chart for both designs, the transfer-cost table against prompt length, a timeline of one request across both workers, and a comparison table of your design with DistServe and Splitwise.
