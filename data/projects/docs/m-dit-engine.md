# A small DiT trained on frames rendered by your engine

**Goal.** A dataset of at least 50,000 frames rendered by your own engine from a seeded script that regenerates it, and a diffusion transformer trained on it at two model sizes, with samples and a quality comparison.

**Why.** Inference Engineering roadmap: `inference-engineering/video-generation-models`, through the transformer backbone that image and video generators now share. Skills: DiT, synthetic data and transformers. It is the first time your simulator feeds a generative model, which is the core loop of the research capstone: your engine makes the data, and the ground truth is known exactly.

**Scope.** MVP: a headless render path in your OpenGL or Vulkan engine (projects 33 and 34), scenes randomised by a seed (object count, shapes, colours, camera, lighting), 50,000 frames at 128×128 with their scene parameters saved alongside, frames encoded with the project 48 VAE, a DiT with patchify, adaLN-Zero and conditioning on scene parameters, two sizes (about 30M and 130M parameters) trained for the same steps. Stretch: short clips with a temporal axis; physics from your 2D engine driving motion; flow-matching training instead of epsilon prediction.

**Architecture.** A generator script samples scene parameters from a seed, renders each frame off-screen and writes images and a parameter file in shards. An encoder pass turns frames into latents with the VAE. The DiT splits each latent into 2×2 patches, adds positional embeddings, and runs transformer blocks whose layer norms are modulated by the timestep and condition embedding. A probe network trained on real frames reads object count and colour from samples to check that conditioning works.

```
seed ─▶ scene sampler ─▶ engine (headless) ─▶ frames + params
                                                  │
                         VAE encoder ─▶ latents ◀─┘
latents ─▶ patchify ─▶ DiT blocks (adaLN-Zero ◀ t, params) ─▶ ε̂
samples ─▶ VAE decoder ─▶ FID + probe accuracy
```

**Stack.** Your engine in C++ with a headless context, Python bindings or a command-line generator, PyTorch 2.x for the DiT, the project 48 VAE, clean-fid, Weights & Biases, one 24 GB GPU.

**Milestones.** Headless rendering and a seeded generator for 50,000 frames with parameters (8 h) · Frames encoded with the VAE into a cached latent dataset (3 h) · DiT with patchify, adaLN-Zero and parameter conditioning (8 h) · Two model sizes trained at a fixed budget (9 h) · Evaluation, samples, public repository and write-up (7 h). Total 35 h.

**Done when.** Running the generator with the same seed reproduces the dataset with identical checksums, and the generator is in the public repository. Both DiT sizes produce samples with FID reported on 10,000 samples against held-out rendered frames, and the larger one is better at equal training steps or the write-up explains why not. Conditioning works: the probe reads the requested object count correctly from at least 80 % of samples from the larger model.

**Measure and report.** Rendering throughput in frames per second and dataset size on disk; FID against training steps for both sizes; parameter counts and training FLOPs; probe accuracy for object count and colour on real frames and on samples; sampling time per frame.

**Pitfalls.** Renders that differ between runs because of uninitialised buffers, threading order or driver state, which breaks the reproducibility claim. A dataset with too little variety, which the model memorises. Forgetting the zero initialisation of adaLN-Zero's final layers, which slows training. Comparing sizes at different batch sizes or learning rates. Mixing gamma-encoded and linear colour between the renderer and the VAE.

**References.** dit, facebookresearch-dit, latent-diffusion, diffusers-repo, sora-report, m22, m-latent-diffusion.

**Write-up.** A grid of real frames next to samples from both sizes, the FID-against-steps chart, the probe table, the command that regenerates the dataset, and a paragraph on what extending to video clips would require.
