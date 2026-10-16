# Latent diffusion on a small dataset with your own VAE

**Goal.** A VAE you trained that compresses 128×128 images to a 16×16×4 latent, a diffusion model trained in that latent space, and a comparison of compute and sample quality with pixel-space diffusion from project 47 on the same data.

**Why.** Inference Engineering roadmap: `inference-engineering/image-generation-arch`, with `inference-engineering/diffusion-models` underneath. Skills: VAEs and latent diffusion, the recipe behind Stable Diffusion. Moving diffusion into a learned latent space is why image generation became affordable; doing it at small scale shows exactly where the savings come from and what the autoencoder costs in quality.

**Scope.** MVP: a 128×128 dataset of 30,000–70,000 images (CelebA faces or AFHQ animals), a convolutional VAE with downsampling factor 8, a small KL weight and a perceptual loss, the encoded dataset cached to disk, the project 47 U-Net adapted to 4-channel latents, DDIM sampling, and project 47's pixel-space model retrained at 128×128 for the same GPU-hours as the baseline. Stretch: a patch discriminator for sharper reconstructions; text or attribute conditioning with cross-attention; the VAE swapped for a pretrained one to isolate its effect.

**Architecture.** The VAE encoder maps each image to a mean and variance in latent space; the decoder maps latents back to pixels. After training, the whole dataset is encoded once and the latents are scaled to unit variance. The diffusion model trains on those latents exactly as in project 47. Sampling runs the reverse process in latent space and decodes once at the end.

```
image ─▶ VAE encoder ─▶ z (16×16×4) ─▶ scale ─▶ cached latents
                                                    │
                     diffusion U-Net (train) ◀──────┘
noise ─▶ DDIM in latent space ─▶ unscale ─▶ VAE decoder ─▶ image ─▶ FID
```

**Stack.** Python 3.12, PyTorch 2.x, your project 47 code, the `lpips` package for the perceptual loss, clean-fid, Weights & Biases, one 24 GB GPU.

**Milestones.** Dataset pipeline at 128×128 and the pixel-space baseline started (4 h) · VAE with KL and perceptual loss, reconstruction quality reported (10 h) · Latent statistics, scaling factor and the cached encoded dataset (3 h) · Diffusion model trained in latent space, with samples (10 h) · Compute and quality comparison with pixel-space diffusion, public repository and write-up (8 h). Total 35 h.

**Done when.** VAE reconstructions on a held-out set reach at least 25 dB PSNR, with LPIPS and reconstruction FID reported. The latent diffusion model produces recognisable samples with FID reported on 10,000 samples. At equal GPU-hours, the comparison table shows training throughput, sampling time per image and FID for latent against pixel-space diffusion. The repository is public and every number comes from a script in it.

**Measure and report.** VAE PSNR, LPIPS and reconstruction FID (the floor latent diffusion cannot beat); training images per second and memory for latent against pixel space; FID against GPU-hours for both; sampling time per image at 50 DDIM steps including decoding.

**Pitfalls.** Skipping the latent scaling factor, so the noise schedule meets latents with a variance far from one. A KL weight that is too large, giving blurry reconstructions, or none, giving a latent space the diffusion model cannot fit. Augmenting the cached latents with flips that do not commute with the encoder. Comparing against a pixel baseline trained for fewer hours. Judging the VAE by mean squared error alone.

**References.** latent-diffusion, paper-vae, ddpm, ddim, sander-dieleman-blog, diffusers-repo, stanford-cs236, m-ddpm-scratch.

**Write-up.** Reconstruction pairs from the VAE, sample grids from both models, the compute and quality table, a chart of FID against GPU-hours, and a paragraph on what a larger downsampling factor would trade.
