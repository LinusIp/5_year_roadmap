# Fused attention kernel in Triton, benchmarked against FlashAttention

**Goal.** A fused attention forward kernel in Triton with tiling and online softmax, causal and non-causal, matching PyTorch to tolerance, benchmarked against FlashAttention and plain PyTorch across sequence lengths and head sizes, with memory traffic and arithmetic intensity worked out for each implementation.

**Why.** It is the kernel that made long contexts affordable, written by you. It covers `inference-engineering/flashattention`, `inference-engineering/kernel-selection-and-fusion` and `inference-engineering/attention-variants`, and builds Triton, attention and the GPU memory hierarchy.

**Scope.** MVP: forward pass in FP16 and BF16 over batch, heads, sequence and head dim; head dims 64 and 128; causal and non-causal masks; autotuned block sizes; a correctness suite against PyTorch's `scaled_dot_product_attention` in its math backend; benchmarks from 512 to 16 384 tokens against FlashAttention-2 (the flash-attn package) and naive PyTorch that materialises the score matrix. Stretch: the backward pass, grouped-query attention, a sliding-window variant, FP8.

**Architecture.** The grid has one program per query block and batch-head pair. Each program loads its Q block into SRAM, then loops over K and V blocks: it computes the scaled scores, applies the causal mask, updates the running maximum and normaliser (online softmax), rescales the accumulator and adds P·V. At the end it divides by the normaliser and writes O, plus the log-sum-exp a backward pass would need. Causal programs skip blocks wholly above the diagonal.

```
program(q_block):  load Q ─▶ SRAM
  for kv_block:  load K, V ─▶ S = QKᵀ·scale ─▶ mask ─▶ update m, l ─▶ acc = acc·α + P·V
  O = acc / l ─▶ HBM
naive:  QKᵀ ─▶ HBM (N×N) ─▶ softmax ─▶ HBM ─▶ ·V ─▶ HBM
```

**Stack.** Python 3.12, Triton 3, PyTorch 2.x, flash-attn 2, `triton.testing` for benchmarks, Nsight Compute, one Ampere or newer GPU.

**Milestones.** Naive PyTorch attention and the test suite (3 h) · Triton matmul and softmax warm-ups from the tutorials (4 h) · fused forward kernel with online softmax (9 h) · causal masking, block skipping and autotuning (5 h) · benchmarks and memory-traffic analysis (5 h) · write-up (4 h). Total 30 h.

**Done when.** Outputs match PyTorch's math backend within a max absolute error of 2e-2 in FP16 and 3e-2 in BF16, over at least 100 random shapes including lengths that are not multiples of the block size. Benchmarks cover sequence lengths 512, 1k, 2k, 4k, 8k and 16k at head dims 64 and 128, causal and not, for your kernel, FlashAttention-2 and naive PyTorch. Your kernel beats naive PyTorch from 2k tokens on and reaches a stated fraction of FlashAttention-2's TFLOP/s (aim for 60 % or more). The length at which naive attention runs out of memory is recorded.

**Measure and report.** TFLOP/s and time per call against sequence length for all three; HBM bytes moved, computed by hand and checked in Nsight Compute, for naive and fused attention; the arithmetic intensity of each and where it sits on the roofline; peak memory; where your kernel loses time to FlashAttention.

**Pitfalls.** Online-softmax rescaling in the wrong order, correct for one KV block and wrong for many. Masking with negative infinity and getting NaN on fully masked rows. Accumulating in FP16 instead of FP32. Autotune results cached for one shape and reused for another. Benchmarks that include Triton's first-call compilation.

**References.** triton-tutorials, flashattention, flashattention-2, gpu-mode-lectures, horace-he-brrr, roofline.

**Write-up.** The TFLOP/s-against-sequence-length chart, the memory-traffic table, a diagram of the tiling with online softmax, and one paragraph on what FlashAttention does that your kernel does not.
