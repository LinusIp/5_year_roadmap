# minitrain: a distributed training framework

**Goal.** A small framework on PyTorch that trains GPT models from 125M to 1B parameters with data, sharded, tensor and pipeline parallelism written on raw torch.distributed collectives, with loss curves that match single-GPU training and scaling measured on real multi-node hardware.

**Why.** Most students have trained a model on one GPU. Few can explain why an all-reduce stalls, how FSDP shards optimiser state, or what a pipeline bubble costs. Scaling curves you produced yourself, shown next to torchtitan's, are strong proof for training-infrastructure and performance roles.

**Scope.** MVP: a nanoGPT-style baseline with BF16 and gradient accumulation; your own data parallel with bucketed all-reduce started from autograd hooks; ZeRO-1, 2 and 3; Megatron-style column- and row-parallel linears; a 1F1B pipeline schedule; sharded checkpoints with resume. Stretch: activation checkpointing, an FP8 training path and a written comparison with torchtitan. Out of scope: mixture-of-experts, context parallelism and custom kernels.

**Architecture.** A mesh maps every rank to a pipeline stage, a data-parallel replica and a tensor-parallel rank, and creates one process group per axis. In each step, micro-batches flow forward through the stages, the tensor-parallel layers all-reduce inside every layer, gradients flow back, and gradient buckets are all-reduced across replicas while backward is still running. Under ZeRO the replicas also split the optimiser state, then the gradients and finally the parameters.

**Stack.** Python and PyTorch, NCCL through torch.distributed, torchrun, torch.distributed.checkpoint, NumPy memmap shards of FineWeb-Edu, Weights & Biases, Nsight Systems.

**Milestones.** Single-GPU baseline (32 h) · Data parallel (56 h) · Sharding (64 h) · Tensor and pipeline parallel (80 h) · Stretch (48 h) · Total 280 h.

**Done when.** Data-parallel weak scaling from 1 to 8 GPUs is at least 85% efficient. A 1B model trains with ZeRO where plain data parallel runs out of memory. Every parallel mode's loss curve stays within the spread of three single-GPU seeds.

**Measure and report.** Tokens per second per GPU at 1, 2, 4 and 8 GPUs; MFU, taken as 6 × parameters × tokens per second over peak BF16 FLOP/s, next to torchtitan on the same model and hardware; model-state memory per GPU against the ZeRO formulas (16Ψ bytes for plain data parallel, 4Ψ + 12Ψ/N for ZeRO-1, 2Ψ + 14Ψ/N for ZeRO-2 and 16Ψ/N for ZeRO-3); the measured pipeline bubble against (p − 1)/(m + p − 1).

**Pitfalls.** A rank that skips a collective hangs every rank, so set NCCL timeouts and use TORCH_DISTRIBUTED_DEBUG=DETAIL while developing. A missing all-reduce in a tensor-parallel backward still trains, only worse, so the equivalence tests run on every change. On the DGX Spark cluster each node has one GPU, so tensor parallel crosses the network; time it on a rented NVLink node. Each Spark has 128 GB, so a 1B model fits without sharding: cap the memory per process to show what ZeRO saves.

**References.** ultrascale-playbook, scaling-book, paper-zero, paper-megatron-lm, paper-pytorch-fsdp, repo-torchtitan, docs-nccl, paper-gpipe, repo-nanogpt.

**Write-up.** The scaling and memory charts first, then how each parallel mode works with its equivalence test, the Nsight Systems trace that shows communication hidden behind compute, and where your numbers trail torchtitan's and why.
