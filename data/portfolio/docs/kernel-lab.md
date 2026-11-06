# Kernel lab: beat the baseline

**Goal.** A benchmark repo of GPU kernels, each written in plain CUDA, Triton and CuTe, with one harness that checks every kernel against PyTorch, times it against cuBLAS, PyTorch SDPA or a copy kernel, and keeps the Nsight Compute evidence for every optimisation step.

**Why.** Kernel engineers are judged on numbers and on how they explain them. A public log that takes a GEMM from 1% to 90%+ of cuBLAS, with profiler evidence at each step, is what NVIDIA's Kernel Libraries and Deep Learning Performance teams screen for. Its best kernels move into nanoserve.

**Scope.** MVP: the SGEMM ladder (naive, coalesced, shared-memory tiling, 2D register tiling, vectorised loads, warp tiling); an FP16/BF16 tensor-core GEMM with WMMA, then mma.sync with ldmatrix and cp.async, then CuTe; softmax, RMSNorm, LayerNorm and a decode-shaped attention forward; Triton versions of the same kernels with their PTX kept. Stretch: a FlashAttention-style forward that beats SDPA on one shape, or an FP8 block-scaled GEMM, and one fix merged upstream in CUTLASS, Triton or FlashInfer. Hopper (TMA and wgmma) and B200 (tcgen05) paths only on rented GPUs; the DGX Spark's GB10 has neither.

**Architecture.** The kernel sources build into one nanobind module. The harness feeds each implementation random inputs, checks its output against PyTorch, flushes L2, warms up and times it with CUDA events, then appends one row per run to a results CSV next to its baseline. Nsight Compute runs on demand for one shape, and the README tables, the roofline chart and the per-step percentages are rebuilt from the CSV.

**Stack.** CUDA C++, CUTLASS and CuTe, Triton, CMake and nvcc, nanobind, PyTorch for the references, Nsight Compute with NVTX ranges, compute-sanitizer, pandas and matplotlib.

**Milestones.** SGEMM ladder (64 h) · Tensor cores (72 h) · Memory-bound kernels (56 h) · Triton versions (40 h) · Stretch (48 h) · Total 280 h.

**Done when.** FP16 GEMM reaches at least 80% of cuBLAS at 4096³. Softmax, RMSNorm, LayerNorm and decode attention reach at least 85% of the bandwidth a plain copy kernel measures on the same GPU. Every kernel has a correctness test against PyTorch and a committed Nsight Compute report.

**Measure and report.** GFLOP/s and the percentage of cuBLAS for every SGEMM step from 1024 to 8192; FP16 GEMM at 4096³ and 8192³; GB/s as a share of copy bandwidth for the memory-bound kernels; each Triton kernel as a share of your CUDA one; and for each step, the two or three Nsight Compute metrics that explain it, such as DRAM throughput, bank conflicts or tensor-pipe utilisation.

**Pitfalls.** Timing without CUDA events, warm-up runs and an L2 flush. Comparing SGEMM against cuBLAS with TF32 switched on; set the float32 matmul precision to "highest". Reading Nsight Compute durations as timings, when it locks clocks to base by default. Expecting mma.sync kernels to match cuBLAS on Hopper or B200, where cuBLAS uses wgmma or tcgen05. Judging DGX Spark bandwidth against HBM figures instead of its own copy speed.

**References.** siboehm-cuda-matmul, book-pmpp-4e, docs-cute-cpp, article-colfax-cutlass-wgmma, triton-tutorials, paper-roofline, video-gpu-mode, docs-nsight-compute-profiling-guide, cuda-programming-guide.

**Write-up.** The step-by-step SGEMM table with the profiler evidence behind each jump, the roofline chart, the tensor-core path from WMMA to CuTe, the memory-bound kernels against the copy kernel, and what the Triton PTX showed next to yours.
