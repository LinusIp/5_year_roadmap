# splat: a real-time Gaussian splatting renderer

**Goal.** A renderer that draws trained 3D Gaussian Splatting scenes in real time with its own CUDA tile rasteriser and a Vulkan viewer, and trains new scenes from your own phone photos with its own backward pass.

**Why.** It joins graphics, CUDA and AI, the three things NVIDIA cares about most, in one demo you can show in a video. Neural rendering and world simulation are where graphics is heading.

**Scope.** MVP: a Vulkan renderer with a camera, a mesh pipeline and a compute pass, following vkguide; a .ply loader; preprocessing that projects each Gaussian to a 2D ellipse; binning with one global radix sort; a 16 × 16 tile rasteriser with front-to-back blending; the backward pass; a PyTorch trainer with densification; COLMAP poses from your own photos. Stretch: CUDA and Vulkan interop with no host copy, Mip-Splatting anti-aliasing and a WebGPU viewer.

**Architecture.** Each frame, preprocessing projects every Gaussian to a 2D ellipse, works out its view-dependent colour from spherical harmonics and drops the ones off-screen. Binning gives every Gaussian a 64-bit key for each tile it touches, with the tile id in the high bits and the depth in the low bits, and one radix sort orders them all. Each tile's thread block then blends its list front to back and stops once a pixel is nearly opaque. The viewer shows the image; in training, the loss against the photo drives the backward pass and an Adam step.

**Stack.** C++, CUDA and CUB, Vulkan and GLFW, PyTorch with a custom autograd Function, COLMAP, and gsplat and the original implementation as references.

**Milestones.** Vulkan foundations (48 h) · Splat loader and sorter (40 h) · CUDA rasteriser (64 h) · Training (88 h) · Stretch (40 h) · Total 280 h.

**Done when.** A 1M-Gaussian scene renders at 60 FPS or more at 1080p on a consumer GPU. Training on your own scene reaches a PSNR within 1 dB of gsplat. A demo video of the result is published.

**Measure and report.** Image match against the reference renderer, with PSNR above 40 dB on the same scene and camera; frame times along a fixed camera path; training time with PSNR, SSIM and LPIPS against gsplat on your own scene and one public scene; gradient error against FP64 finite differences on tiny scenes; memory per million Gaussians.

**Pitfalls.** A wrong gradient still trains, only worse, so run the gradient checks on tiny scenes before any training. Degenerate ellipses: add 0.3 to the 2D covariance diagonal and clamp alpha at 0.99, as the original does. Densification blowing up the number of Gaussians. Blurry photos or moving objects ruining COLMAP's poses. Starting on interop before the plain viewer works.

**References.** paper-3d-gaussian-splatting, repo-graphdeco-gaussian-splatting, repo-gsplat, course-3dv-2024-3dgs-tutorial, vkguide, khronos-vulkan-tutorial-docs, paper-mip-splatting, docs-cub, docs-colmap.

**Write-up.** The demo video first, then how the tile rasteriser works with its timings, how the backward pass was checked, the comparison with gsplat, and what interop changed in the frame time.
