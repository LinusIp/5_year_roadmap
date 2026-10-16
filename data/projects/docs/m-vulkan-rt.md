# Vulkan ray tracing and PBR demo

**Goal.** Hardware ray tracing in your own Vulkan engine: acceleration structures for a dynamic scene, ray-traced shadows and reflections, and a physically based material model, benchmarked against the rasterized path.

**Why.** Game Developer roadmap: `game-developer/real-time-ray-tracing`, `game-developer/vulkan-ray-tracing` and `game-developer/physically-based-rendering`. Skills: Vulkan ray tracing (BLAS/TLAS, shader binding tables, ray queries) and PBR (Cook-Torrance, GGX, energy conservation). It turns the Vulkan model viewer of project `m22` into a renderer that can show glossy reflections and contact-correct shadows, which the Stage 1 capstone needs for its demo scenes.

**Scope.** MVP: one bottom-level acceleration structure (BLAS) per mesh, one top-level structure (TLAS) rebuilt or refitted per frame for moving instances, ray-traced hard and soft shadows, single-bounce reflections, a metallic-roughness GGX material with image-based ambient light, a toggle between raster and ray-traced passes. Stretch: multi-bounce reflections with a roughness cutoff, a temporal denoiser, BLAS refit for skinned meshes.

**Architecture.** The scene graph produces instance transforms each frame. An acceleration-structure manager builds a BLAS once per mesh and updates the TLAS from the instance list. A G-buffer pass rasterizes primary visibility (position, normal, albedo, metallic-roughness). A ray-tracing pass launches shadow and reflection rays from G-buffer pixels through the shader binding table. A lighting pass combines them with the PBR BRDF and tone-maps to the swapchain.

```
scene graph ─▶ AS manager (BLAS once, TLAS per frame)
     │                         │
     ▼                         ▼
 G-buffer ─▶ RT pass (shadow + reflection rays) ─▶ PBR lighting ─▶ tonemap ─▶ swapchain
```

**Stack.** C++20, Vulkan 1.3 with `VK_KHR_acceleration_structure`, `VK_KHR_ray_tracing_pipeline` and `VK_KHR_ray_query`, GLSL compiled to SPIR-V, glTF 2.0 assets (Sponza and the Khronos sample models), RenderDoc and Nsight Graphics for captures. Needs an RT-capable GPU (RTX 20 series, RX 6000 or newer).

**Milestones.** BLAS and TLAS for a static scene with a ray-traced debug view (8 h) · per-frame TLAS update for moving instances (5 h) · ray-traced shadows with soft-shadow sampling (5 h) · GGX metallic-roughness materials and ray-traced reflections (10 h) · timing against the raster path, video and write-up (7 h). Total 35 h.

**Done when.** At least 50 instances move every frame and the TLAS update keeps shadows and reflections correct, with no stale geometry. PBR materials pass a white-furnace test (a rough sphere under uniform light loses no more than 5 % of energy). Shadows and reflections can be toggled between raster (shadow map, screen-space reflections) and ray-traced versions in the same build. The repository is public with a video of a dynamic scene.

**Measure and report.** Frame time in ms for each pass (G-buffer, AS update, RT shadows, RT reflections, lighting) at 1080p and 1440p, raster against ray-traced; TLAS rebuild against refit cost for 50, 500 and 5 000 instances; GPU memory for acceleration structures; image differences between the two paths on three fixed camera views.

**Pitfalls.** Shader binding table strides and alignment that do not match `shaderGroupHandleAlignment`. Self-intersection acne from shadow rays started without a normal offset. Missing memory barriers between the AS build and the trace. Building a fresh TLAS every frame when a refit would do. Treating GGX roughness as alpha instead of alpha = roughness squared.

**References.** khronos-vulkan-samples, vkguide, pbr-book, rtr4, rtiow, m22, roadmap-game-developer.

**Write-up.** A side-by-side video of raster and ray-traced paths, the per-pass timing table at 1080p, the rebuild-against-refit chart, and one paragraph on what a denoiser would let you cut from the ray budget.
