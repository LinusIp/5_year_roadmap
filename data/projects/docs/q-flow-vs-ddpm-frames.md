# Research question: Does flow matching beat DDPM at equal compute on your simulator's rendered frames

**Goal.** A pre-registered, falsifiable comparison of flow matching and DDPM, trained with the same network and the same compute on frames rendered by your own simulator, ending in a two-page report in research/ that says which wins, by how much, and at which sampling budgets; a negative result counts.

**Why.** Inference Engineering roadmap: `inference-engineering/diffusion-models`, `inference-engineering/image-generation-arch` and `inference-engineering/few-step-image-generation`. Skills: experiment design and scientific writing, specifically holding everything fixed except the training objective and sampler. It reuses the code of m-ddpm-scratch and asks the question of m-flow-matching on your own data instead of a public benchmark.

**Scope.** MVP: one dataset of 64×64 frames from your engine, one U-Net, DDPM (epsilon prediction, ancestral and DDIM samplers) against flow matching (linear path, velocity prediction, Euler and Heun samplers), equal training images seen, three seeds each, evaluation at 10, 25, 50 and 100 function evaluations. Stretch: a physics-aware metric (do sampled frames show plausible object counts and positions?), a rectified-flow reflow step, 128×128.

**Architecture.** Phases rather than components: a question with a written prediction; a frozen protocol (data, network, budget, metrics); a baseline run that checks the pipeline reproduces a sensible DDPM result; the two training arms; an evaluation pass; the report. Every run is a config file plus a seed, and results land in one table.

```
engine ─▶ 20k frames ─┬─▶ DDPM arm (3 seeds) ──┐
                      └─▶ flow arm (3 seeds) ──┼─▶ samplers × NFE ─▶ FID/KID ─▶ report
              same U-Net, same images seen ────┘
```

**Stack.** Python 3.12, PyTorch, your engine's Python bindings or a frame dump, a clean-fid style FID and KID computation with a fixed reference set, Weights & Biases for runs, one GPU.

**Milestones.** Question, prediction and protocol written down (3 h) · frame dataset and shared U-Net baseline (7 h) · DDPM and flow-matching runs at matched compute with three seeds (12 h) · evaluation across samplers and step counts (4 h) · two-page report and review notes (4 h). Total 30 h.

**Done when.** A hypothesis and a numeric prediction (for example "flow matching reaches at least 15 % lower FID than DDPM at 25 steps, and the gap is under 5 % at 100 steps") are committed before the first training run. The experiment could prove it wrong: both arms see the same number of images with the same network, optimiser and seeds, and FID is computed on 10,000 samples against the same held-out frames. Code, configs and the frame dataset (or the command that regenerates it) are in the repository. The two-page report is in research/ in the data repo and is discussed in the quarterly review.

**Measure and report.** FID and KID against sampling steps for each method and sampler (mean and range over seeds); training loss curves on a shared compute axis; wall-clock per sample at each step count; nearest-training-frame distances to check for memorisation; a grid of samples at 10 and 50 steps.

**Pitfalls.** Unequal compute hidden in different batch sizes or step counts. Tuning one arm's learning rate and not the other's. Computing FID on too few samples to separate the arms. A dataset so easy that both saturate. Writing the hypothesis after seeing the curves.

**References.** ddpm, ddim, flow-matching, rectified-flow, improved-ddpm, annotated-diffusion, m-ddpm-scratch, m-flow-matching, schulman-research-guide.

**Write-up.** The FID-against-steps chart for both methods, the results table with seed spreads, sample grids, the prediction quoted next to the outcome, and one paragraph on why straighter paths do or do not matter at this scale.
