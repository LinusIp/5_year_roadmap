# Research capstone: a world model trained on your engine's data, served by your stack, written up as a workshop paper

**Goal.** A 6–8 page workshop-style paper, arXiv-ready and reviewed by two people you asked, about an action-conditioned world model trained on data from your own 3D engine, evaluated against the engine's ground-truth physics over increasing horizons, and served through your own inference stack with latency reported.

**Why.** Inference Engineering roadmap: `inference-engineering/video-generation-models` and `inference-engineering/video-generation-inference`, for the model and its serving. Beyond the roadmap, it builds the skills of world models, research and scientific writing in one piece of work. Year 3's threads meet here: the engine (`cap-stage-1`), diffusion and DiT (projects 47–50), DreamerV3 and GNS (51–52), and the inference stack (`cap-inference`). The engine's exact state is what makes the evaluation stronger than pixel metrics alone.

**Scope.** MVP: one research question with a pre-registered hypothesis (for example, how far physical consistency holds as the horizon grows, and whether it depends on model size or training data volume); a dataset of 100,000 or more short clips with actions and engine states, generated through the Python bindings; one world model family (a latent DiT or a DreamerV3-style RSSM) at two or three sizes; evaluation against ground truth from 1 to 64 steps ahead; serving through your stack; the paper and two outside reviews. Stretch: a second model family as a baseline; planning with the world model on a simple task; releasing the dataset.

**Architecture.** The engine's Python bindings generate clips from seeded scenes with random actions and save frames, actions and full physical state. The world model encodes frames to latents and predicts future latents given actions. Evaluation decodes predictions and compares them with the engine's frames (pixel and perceptual metrics) and, through a probe that reads object states from frames, with the engine's states (positions, velocities, energy). The trained model is exported to your inference stack, which streams predicted frames to a client.

```
engine (Python bindings) ─▶ clips: frames, actions, states
                                   │
                 world model (train, sizes S/M/L) ─▶ predictions
                                   │
     eval vs ground truth (PSNR, LPIPS, probe-state error × horizon)
                                   │
      your inference stack ─▶ client (latency)       paper ◀── results
```

**Stack.** Your engine with Python bindings, PyTorch 2.x, the VAE and DiT code from projects 48 and 50 or the RSSM from project 51, Weights & Biases, rented GPUs for the larger runs, your serving stack, LaTeX in a workshop template, Zotero.

**Milestones.** Question, related work and pre-registered hypotheses (15 h) · Dataset generation through the engine's Python bindings (25 h) · World model training at several sizes, with ablations (45 h) · Evaluation against engine ground truth over increasing horizons (25 h) · Serving through your inference stack, with latency (15 h) · Paper, two reviews and revision (25 h). Total 150 h.

**Done when.** The dataset regenerates from a seed with the script in the repository. Predictions are evaluated at horizons 1, 4, 16 and 64 against the engine, with pixel, perceptual and probe-state errors reported over three seeds. The served model streams predictions with time per predicted frame at p50 and p99 reported. The paper is 6–8 pages in workshop format, states the hypothesis and whether it held, and has been revised after comments from two reviewers you asked online.

**Measure and report.** PSNR, LPIPS and probe-state error against horizon for each model size; energy and momentum drift of the probe-read states against the engine's; training compute per model; serving latency and frames per second; dataset size and generation time.

**Pitfalls.** A question chosen after the results. Too little variety in the generated scenes, so the model memorises them. Pixel metrics that reward blurry predictions; the state probe is there to catch that. Starting the paper in the last two weeks. Spending the budget on scale instead of the evaluation that makes the paper worth reading.

**References.** dreamerv3, diamond, genie, world-models, dit, td-mpc2, cosmos, schulman-research-guide, cap-stage-1, cap-inference.

**Write-up.** The paper as a PDF in the repository, the error-against-horizon figure, a video of predicted against real rollouts, the serving latency table, the reviewers' main comments with your responses, and next steps.
