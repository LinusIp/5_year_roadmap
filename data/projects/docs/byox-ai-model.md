# Build your own AI model

**Goal.** A character- or token-level GPT trained from scratch by following one from-scratch tutorial end to end, its published result reproduced, plus one change of your own (dataset, architecture or training recipe) whose effect is measured over several seeds.

**Why.** Inference Engineering roadmap: `inference-engineering/neural-networks`, `inference-engineering/transformer-blocks` and `inference-engineering/attention-mechanism`; AI Engineer roadmap: `ai-engineer/training`. Skills: reading a training loop line by line, reproducing a number before changing anything, and running a controlled ablation. It is the habit every later research card depends on: first match the baseline, then move one variable.

**Scope.** MVP: one tutorial (Karpathy's "Let's build GPT" or makemore series is the default) reproduced in your own repository, its reported validation loss matched, then exactly one change with three seeds on each side. Stretch: a second change, a scaling sweep over three model widths, or a short sampling demo on Hugging Face Spaces.

**Architecture.** A data module tokenises the corpus and serves random fixed-length windows. The model is a decoder-only transformer (embedding, N blocks of attention and MLP, final norm, head). A trainer runs AdamW with a learning-rate schedule, logs train and validation loss, and saves checkpoints. An experiment runner launches the baseline and the variant with the same seeds and budget, and a notebook turns the logs into plots.

```
corpus ─▶ tokenizer ─▶ batches ─▶ model ─▶ loss ─▶ AdamW
                                    │                 │
              config + seed ────────┘   logs ─▶ plots ┘
```

**Stack.** Python 3.12, PyTorch, NumPy, tiktoken or a character tokenizer, Weights & Biases or a CSV logger, one consumer GPU (or Colab) for runs of under an hour each.

**Milestones.** Read the tutorial and set up data and the training loop (6 h) · reproduce the tutorial's model and its validation loss (8 h) · pick the change and write the prediction down (2 h) · run baseline and variant with three seeds each (8 h) · analysis, plots and write-up (6 h). Total 30 h.

**Done when.** Your reproduction lands within 0.05 nats (or 3 %) of the tutorial's reported validation loss at the same token budget. The change is run against the baseline with three seeds each at the same compute, and the difference in final validation loss is reported with its spread; a negative or null result is a valid outcome. Samples from both models are in the repository.

**Measure and report.** Validation loss curves for baseline and variant (mean and range over seeds); final loss at equal tokens and at equal wall-clock; parameter count and tokens per second; for a dataset change, loss on a held-out slice of the original data too.

**Pitfalls.** Changing two things at once (a new dataset and a new learning rate) and crediting one of them. Comparing at equal steps when the variant processes more tokens per step. A single seed whose noise is larger than the effect. Validation windows that overlap the training text. Forgetting to switch dropout off in evaluation.

**References.** karpathy-zero-to-hero, paper-attention, paper-adam, stanford-cs336, m11, wandb.

**Write-up.** The reproduction number next to the tutorial's, the loss-curve plot with seed bands for baseline and variant, a small table of final losses, a few samples from each model, and one paragraph on why the change helped or did not.
