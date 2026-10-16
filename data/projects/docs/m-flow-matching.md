# Flow matching against DDPM at equal compute: a report

**Goal.** A workshop-style report, with code, that trains flow matching and DDPM with the same network, data and compute budget, and shows over several seeds which gives better samples at each number of sampling steps, by how much, and why.

**Why.** Inference Engineering roadmap: `inference-engineering/diffusion-models` and `inference-engineering/few-step-image-generation`. Skills: flow matching and experiment design. Flow matching has largely replaced epsilon-prediction diffusion in new image and video models; the question worth answering yourself is whether it wins at equal compute or only at equal steps, and the controlled comparison is the research skill this project trains. It also sets up the research card `q-flow-vs-ddpm-frames`.

**Scope.** MVP: the project 47 U-Net and CIFAR-10, one config fixing architecture, optimiser, batch size, training steps and the moving average for both methods; conditional flow matching with straight (rectified) paths and velocity prediction; DDPM with epsilon prediction; Euler and Heun samplers for flow matching, DDPM ancestral and DDIM samplers for diffusion; three seeds per method. Stretch: a logit-normal timestep distribution; one reflow step; the same study on frames from your engine.

**Architecture.** A shared trainer takes a method plugin that defines how to sample a time, build the noisy input and compute the target. Everything else (network, data order per seed, steps, precision) is identical. Samplers are counted by network function evaluations (NFE) so Heun's two evaluations per step are charged fairly. An evaluation grid samples every checkpoint at each NFE and computes FID.

```
config (shared) ─▶ trainer ─┬─ plugin: flow matching (v target)
                            └─ plugin: DDPM (ε target)
checkpoints × seeds ─▶ samplers @ NFE {4…1000} ─▶ FID grid ─▶ report
```

**Stack.** Python 3.12, PyTorch 2.x, your project 47 code, clean-fid, Weights & Biases sweeps, one 24 GB GPU, LaTeX in the workshop template for the report.

**Milestones.** Shared network, data and compute budget fixed in one config (4 h) · Flow-matching objective with Euler and Heun ODE samplers (6 h) · Both methods trained at equal compute over three seeds (8 h) · Sample quality against sampling steps for both, with spread (6 h) · Short report in the style of a workshop paper (6 h). Total 30 h.

**Done when.** Both methods train with identical architecture, steps, batch size and GPU-hours, verified by the logged config and wall-clock time. FID on 10,000 samples is reported at NFE 4, 8, 16, 32, 64, 128 and 1,000 for both, as mean and standard deviation over three seeds. The report states at which NFE the methods differ by more than the seed spread and gives at least one explanation tested by an experiment (for example, trajectory curvature measured on both). The report is four pages or fewer in workshop format.

**Measure and report.** FID against NFE for each method and sampler with error bars; training loss curves for both; average trajectory straightness for both models; wall-clock time per sample; the number of runs and total GPU-hours.

**Pitfalls.** Giving one method a better tuned learning rate, sampler or moving-average decay, which turns the comparison into a tuning contest. Charging Heun one evaluation per step. Using ancestral DDPM at few steps instead of DDIM, which makes diffusion look worse than it is. One seed per method, so the noise in FID decides the result. Different time conventions (t = 0 as data or as noise) mixed between code paths.

**References.** flow-matching, rectified-flow, ddpm, ddim, score-sde, sander-dieleman-blog, m-ddpm-scratch, q-flow-vs-ddpm-frames.

**Write-up.** The report itself, with the FID-against-NFE figure as its centrepiece; a README with the commands that reproduce every run, a sample grid for both methods at 8 and 64 NFE, and the question you would test next.
