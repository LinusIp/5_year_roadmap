# GPU fluid (SPH or FLIP) in Vulkan compute

**Goal.** A particle fluid that runs in Vulkan compute shaders in your own engine, with at least 100,000 particles at interactive frame rates, rendered in real time and validated on a dam break against a reference.

**Why.** Game Developer roadmap: `game-developer/vulkan`, `game-developer/spatial-partitioning` and `game-developer/dynamics`. Skills: fluid simulation and Vulkan compute: neighbour search on the GPU, parallel prefix sums and sorting, and keeping a simulation stable at real-time step sizes. It is the fluid solver the stage 1 capstone engine ships with.

**Scope.** MVP (SPH, the plan below): weakly compressible or position-based SPH in 3D, a uniform-grid neighbour search built every frame by counting sort, density, pressure, viscosity and boundary particles for walls, a dam-break scene, particles drawn as sphere impostors. If FLIP is chosen instead, the grid steps become particle-to-grid transfer, a pressure solve with Jacobi or multigrid, and grid-to-particle transfer, with the same validation. Stretch: screen-space fluid rendering with a smoothed depth and thickness pass; divergence-free SPH; two-way coupling with rigid bodies.

**Architecture.** Particle state lives in storage buffers. Each step runs a fixed chain of compute dispatches separated by barriers: hash each particle to a cell, count per cell, prefix-sum the counts, scatter particles into sorted order, compute densities from neighbours in the 27 surrounding cells, compute pressure and viscosity forces, integrate and resolve boundaries. The graphics pass reads the sorted positions directly.

```
particles ─▶ hash ─▶ count ─▶ prefix sum ─▶ scatter (sorted)
                                                  │
          integrate ◀── forces ◀── density ◀──────┘
              │
              └─▶ render (impostors) ─▶ swapchain
```

**Stack.** C++20 and Vulkan 1.3 from project 34, GLSL compute shaders compiled with glslc, a CPU reference implementation in C++ or NumPy, Dear ImGui for parameters, RenderDoc and GPU timestamps, Python with Matplotlib for the validation plots.

**Milestones.** CPU reference SPH for correctness on small scenes (6 h) · Compute pipeline with particle buffers and a counting-sort spatial grid (10 h) · Density, pressure and viscosity kernels with boundary handling (8 h) · Real-time rendering of the particles (7 h) · Dam-break validation against a reference, profiling, video and README (9 h). Total 40 h.

**Done when.** The GPU solver matches the CPU reference's densities within 0.1 % on a 10,000-particle scene after 100 steps. 100,000 particles run at 60 frames a second or more on your GPU with rendering, and the README reports the frame rate at 250,000 and 1,000,000. In the dam break, the surge front position against time stays within 10 % of the Martin and Moyce experimental data in dimensionless units, plotted together. Average density error stays below 3 %. The repository is public with a video.

**Measure and report.** GPU time per kernel (hash, sort, density, forces, integrate, render) from timestamp queries; frame time against particle count; density error and maximum velocity over time; the dam-break front plot against the reference; the largest stable time step.

**Pitfalls.** A grid cell size that does not equal the kernel radius, so neighbours are missed or the search triples in cost. Particle deficiency at walls, which makes fluid stick or leak; boundary particles need their own density contribution. A time step above the CFL limit, which explodes rather than degrades. Barriers missing between dependent dispatches, which shows up only on some GPUs. Float atomics or unsorted access patterns that waste most of the memory bandwidth.

**References.** bridson-fluid-sim, ten-minute-physics, paper-stable-fluids, vkguide, khronos-vulkan-samples, m22.

**Write-up.** A video of the dam break and an interactive pour, the dam-break validation plot, the per-kernel timing chart, the frame-time-against-particles table, and a paragraph on what switching between SPH and FLIP would change.
