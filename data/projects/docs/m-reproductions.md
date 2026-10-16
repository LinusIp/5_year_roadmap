# Three reproductions: Attention Is All You Need, a FlashAttention microbenchmark, DDPM on CIFAR-10

**Goal.** Three small-scale reproductions, each with its claim stated up front, the code and logs in one repository, and an honest account of what matched: a translation transformer scored with BLEU, FlashAttention's memory and speed advantage in a microbenchmark, and DDPM samples on CIFAR-10 scored with FID.

**Why.** Inference Engineering roadmap: `inference-engineering/attention-mechanism`, `inference-engineering/transformer-blocks`, `inference-engineering/flashattention` and `inference-engineering/diffusion-models`. Skills: reproducing papers, experiment design and PyTorch. This is the first research-cadence project: the habit it builds (write the claim, fix the budget, compare against the number in the paper, explain the gap) is the one every later report depends on.

**Scope.** MVP: a base-size transformer trained on IWSLT14 German-English or Multi30k against a GRU-with-attention baseline; naive attention against FlashAttention (through PyTorch's scaled-dot-product attention or the flash-attn package) across sequence lengths; a DDPM U-Net trained on CIFAR-10 with FID on 10,000 samples. Stretch: label smoothing and checkpoint averaging ablations; your own Triton FlashAttention forward in the benchmark; FID on 50,000 samples.

**Architecture.** One repository, three folders sharing a small harness. Each experiment reads a config, logs to Weights & Biases, saves checkpoints, and writes a results JSON that a report script turns into tables and plots. A claims file lists, for each paper, the headline number, the scale you can afford, and the result you expect at that scale.

```
claims.md ─▶ configs ─▶ train / bench ─▶ checkpoints, logs
                                 │
                       eval (BLEU, ms/GB, FID) ─▶ results.json ─▶ report
```

**Stack.** Python 3.12, PyTorch 2.x, sacreBLEU, the flash-attn package or PyTorch SDPA backends, clean-fid, Weights & Biases, one 24 GB GPU.

**Milestones.** Claims, budgets and metrics written down for each paper (3 h) · Translation transformer and baseline trained, BLEU reported (12 h) · FlashAttention microbenchmark across sequence lengths (7 h) · DDPM trained on CIFAR-10 with samples and FID (13 h) · Three write-ups: matched, did not match, and why (5 h). Total 40 h.

**Done when.** The transformer beats the GRU baseline on the same data and tokenizer and lands within 3 BLEU of a published small-model number for that dataset. FlashAttention uses memory that grows linearly with sequence length while naive attention grows quadratically, and runs at least 2× faster at sequence length 4,096 in the forward and backward pass. DDPM reaches FID 30 or better on 10,000 samples against the training set. Each write-up states the paper's number, yours, and the reasons for the gap.

**Measure and report.** BLEU (sacreBLEU, detokenised) for both models with training time; attention time and peak memory against sequence length from 512 to 16,384 at head dimensions 64 and 128; DDPM FID against training steps, sample grids at three checkpoints, GPU-hours for each experiment.

**Pitfalls.** Tokenised BLEU compared with detokenised BLEU, which can differ by several points. Benchmarks without synchronisation or warm-up, so you time the launch rather than the kernel. Comparing FID computed on different sample counts or with different Inception weights. Forgetting the exponential moving average of DDPM weights, which costs a lot of sample quality. Learning-rate warm-up dropped from the transformer, which then diverges.

**References.** paper-attention, flashattention, ddpm, annotated-diffusion, ml-reproducibility-challenge, keshav-how-to-read, wandb, m11.

**Write-up.** A results table with the paper's number next to yours for each reproduction, the attention memory and speed plots, a CIFAR-10 sample grid, and a section per paper on what did not match and what you would try next.
