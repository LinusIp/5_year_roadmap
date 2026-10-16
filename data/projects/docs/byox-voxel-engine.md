# Build your own voxel engine

**Goal.** Infinite, editable voxel terrain in your own OpenGL or Vulkan renderer: chunks generated and greedily meshed on background threads, streamed in and out around the player, frustum-culled, and fast enough for 60 FPS at 1080p.

**Why.** Game Developer roadmap: `game-developer/frustum`, `game-developer/culling`, `game-developer/spatial-partitioning`, `game-developer/aabb` and `game-developer/opengl`. Skills: mesh generation, data layout for millions of cells, job systems and thread-safe hand-off to the GPU, and profiling a frame.

**Scope.** MVP: 32×32×32 chunks in a hash map keyed by chunk coordinates, noise-based terrain, face culling against neighbours, greedy meshing, a worker pool for generation and meshing, upload on the render thread, per-chunk frustum culling, block placing and breaking by ray-cast. Stretch: ambient occlusion per vertex, a texture atlas or array, level of detail for distant chunks, saving edited chunks.

**Architecture.** The world manager decides which chunks should exist within the view radius around the player and queues generation jobs. Workers fill voxel arrays from noise, then mesh each chunk (needing its six neighbours' borders) and return vertex data. The render thread uploads finished meshes, frees chunks that left the radius, culls chunk AABBs against the frustum and draws. Edits change a voxel and re-queue the chunk and any neighbour sharing that face.

```
player pos ─▶ world manager ─▶ job queue ─▶ workers: noise ─▶ greedy mesh
                                                                │
 screen ◀── draw ◀── frustum cull ◀── GPU buffers ◀── upload ◀──┘
```

**Stack.** C++20, your OpenGL 4.5 renderer (or Vulkan), GLFW, a noise library or your own simplex noise, std::thread with a lock-free or mutex-guarded queue, Tracy or RenderDoc for profiling.

**Milestones.** Chunk data, terrain noise and a naive mesher (6 h) · greedy meshing with neighbour-aware face culling (8 h) · background worker pool and chunk streaming (9 h) · frustum culling and block editing with ray-casts (7 h) · profiling, measurements and write-up (5 h). Total 35 h.

**Done when.** Flying 2 km in a straight line streams chunks continuously with no frame over 33 ms caused by generation or meshing, at a view distance of at least 12 chunks. Greedy meshing cuts triangle count against the face-culled naive mesher by a measured factor of at least 3 on the same terrain. Placing or breaking a block updates the mesh within one frame of the job completing, with no cracks at chunk borders. The scene holds 60 FPS at 1080p on your GPU.

**Measure and report.** Triangles per chunk for naive, face-culled and greedy meshing; mesh time per chunk; chunks generated per second with 1, 2, 4 and 8 workers; frame time p50 and p99 while flying; GPU memory for meshes; share of chunks culled by the frustum.

**Pitfalls.** Calling OpenGL from worker threads, where the context does not exist. Meshing a chunk before its neighbours exist, leaving walls of faces at the borders. Greedy merging faces that differ in texture or lighting. Re-meshing only the edited chunk when the edit sits on its border. Float precision jitter far from the origin.

**References.** learnopengl, game-engine-architecture, rtr4, iq-articles, w-gfx-perlin-terrain, w-gfx-instancing, m18.

**Write-up.** A fly-through GIF with chunk borders toggled on, the triangle-count table for the three meshers, frame-time charts with different worker counts, and what level of detail or GPU-driven meshing would change.
