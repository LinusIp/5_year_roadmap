# Tensor-parallel inference across two GPUs, by hand (NCCL)

**Goal.** A transformer split across two GPUs by your own column- and row-parallel linear layers and NCCL all-reduce, matching single-GPU outputs, with latency, throughput and communication time measured at several batch sizes.

**Why.** Inference Engineering roadmap: `inference-engineering/tensor-parallelism`, `inference-engineering/pipeline-parallelism`, `inference-engineering/multi-node-inference` and `inference-engineering/instances-and-interconnects`. Skills: NCCL collectives, distributed inference and PyTorch. Every serving engine has a `--tensor-parallel-size` flag; after this project you know what it costs, where the all-reduces sit, and why the interconnect decides whether it pays off.

**Scope.** MVP: a Llama-architecture model of 1–3B parameters, attention heads and MLP columns split over two ranks, two all-reduces per layer, greedy decoding with a KV cache on each rank, a benchmark at batch sizes 1, 4, 16 and 64 and prompt lengths 128 and 2,048. Stretch: a two-stage pipeline-parallel version for comparison, overlapping communication with compute, the same run on NVLink and on PCIe.

**Architecture.** One process per GPU launched by `torchrun`, each loading only its shard of the weights. In attention, the QKV projection is column-parallel (each rank owns half the heads and their KV cache) and the output projection is row-parallel, followed by an all-reduce. The MLP does the same: gate and up projections column-parallel, down projection row-parallel, then an all-reduce. Embeddings and the final norm are replicated; the logits are gathered on rank 0 for sampling and the token is broadcast.

```
rank 0: x ─▶ [QKV cols 0] ─▶ attn ─▶ [O rows 0] ─┐
                                                  ├─ all-reduce ─▶ MLP (same) ─▶ …
rank 1: x ─▶ [QKV cols 1] ─▶ attn ─▶ [O rows 1] ─┘
```

**Stack.** Python 3.12, PyTorch with `torch.distributed` on the NCCL backend, Hugging Face weights in safetensors, CUDA events and Nsight Systems for timing, two GPUs on one machine (rented by the hour if needed).

**Milestones.** Single-GPU reference model and a comparison harness (4 h) · Column- and row-parallel linear layers with NCCL collectives, unit-tested (8 h) · Sharded attention and MLP blocks with per-rank KV cache, outputs matching (8 h) · Benchmarks at several batch sizes, with communication timed separately (8 h) · Write-up on when tensor parallelism helps and when pipeline parallelism would be better (7 h). Total 35 h.

**Done when.** In float32 the two-GPU logits match the single-GPU model within 1e-4 maximum absolute difference; in bfloat16 greedy outputs match token for token on 20 prompts of 256 tokens. The benchmark script reports latency and throughput on one and two GPUs at four batch sizes and two prompt lengths. Communication time is measured separately from compute with CUDA events around each all-reduce and confirmed in an Nsight Systems trace.

**Measure and report.** Time to first token and inter-token latency on one and two GPUs; tokens per second against batch size; all-reduce time per layer and its share of the step; achieved all-reduce bandwidth against the link's nominal bandwidth; memory per GPU for weights and KV cache.

**Pitfalls.** Splitting the fused QKV weight naively, so a rank gets all of Q and none of K. Head counts with grouped-query attention that do not divide evenly by the world size. Timing on the host without synchronising, which hides the all-reduce. Forgetting that the gain at batch 1 is bound by memory bandwidth while at batch 64 it is bound by the interconnect. Ranks diverging because each sampled its own token.

**References.** scaling-book, ultra-scale-playbook, kipply-inference-arithmetic, nsight-compute-docs, vllm-docs, m-inference-server.

**Write-up.** Latency and throughput charts for one against two GPUs, a stacked bar of compute and communication per decode step, the Nsight trace of one layer, and a decision table for tensor against pipeline parallelism by model size, batch and interconnect.
