# Research capstone: a small world model with an original result

**Goal.** Train an action-conditioned diffusion world model on a small environment, answer one research question nobody has published an answer to under a pre-registered design, make the model playable in real time, and write it up as a 6–8 page workshop paper with code that regenerates every figure.

**Why.** It turns "built things" into "found something". A short arXiv paper or a workshop acceptance on world models, the stated research direction, is the strongest single item a second- or third-year student can have. The inference skills from nanoserve and the kernel lab also make the model run in real time, which most research code does not.

**Scope.** MVP: reproduce DIAMOND on one Atari game; pick one question, for example how sampling-step count trades off against long-horizon consistency, whether a learned latent beats pixel space at equal compute, or whether diffusion forcing removes compounding error in 1,000-step rollouts; test it with three or more seeds, a fixed compute budget and ablations; distil the sampler to 1–4 steps for an interactive demo at 20 FPS or more; write the paper. Out of scope: state-of-the-art claims, large video models and a new RL algorithm.

**Architecture.** Episodes recorded from the real game train an EDM-style denoiser that predicts the next frame from past frames and actions. Sampled in a few steps, it becomes a world model you can play with a keyboard or train an agent inside. Experiments compare the baseline with one idea under the question, metric, seeds and budget fixed in a pre-registration file, and only those runs feed the paper's figures.

**Stack.** PyTorch (JAX optional), Gymnasium and ale-py, NumPy memmap or WebDataset, Hydra configs, Weights & Biases, rliable, LPIPS and FVD, pygame and LaTeX.

**Milestones.** Reproduce (96 h) · Pick a question (24 h) · Experiment properly (160 h) · Make it fast (72 h) · Write it up (96 h) · Total 448 h.

**Done when.** The paper is on arXiv with code that reproduces every figure. A playable real-time demo exists. One researcher outside your university has read it and given feedback.

**Measure and report.** The reproduced score against DIAMOND's on the chosen game; the pre-registered metric for every arm, as interquartile means with bootstrap intervals over at least three seeds; error against rollout horizon; the demo's frame rate with the distilled sampler.

**Pitfalls.** An off-by-one between frames and actions quietly ruins everything after it, so test the data first. Starting the new idea before the baseline reproduces. Unequal budgets, which measure tuning effort instead of the idea. Reporting the best seed. Running experiments up to the deadline: freeze them about four weeks before, and only write after that.

**References.** paper-world-models-ha, paper-diamond, repo-diamond, paper-gamengen, paper-diffusion-forcing, paper-genie, repo-dreamerv3-official, paper-edm, paper-rliable.

**Write-up.** The paper itself, plus a blog post with the demo video, the pre-registration and what changed from it, and the figures regenerated from the logged runs.
