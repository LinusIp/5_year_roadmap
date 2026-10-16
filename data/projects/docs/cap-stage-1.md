# Stage 1 capstone: sim engine v1

**Goal.** One engine you can show and use: a Vulkan renderer, a GPU physics solver for rigid bodies, soft bodies and fluids in one world, Python bindings that generate datasets for your research, five reproducible demo scenes, a ROS 2-driven robot, documentation and a portfolio site.

**Why.** It consolidates all of Block A. Skills: Vulkan, engine architecture, collision detection (broadphase, GJK/EPA), constraint solvers (sequential impulses, XPBD), ROS 2 and technical writing. It folds in projects `m22`, `m27`, `m34`, `m-gpu-fluid`, `m-vulkan-rt` and `m-sim-arm-ros`, and its Python bindings feed the world-model work of `cap-research`.

**Scope.** MVP: scene graph with PBR materials and shadows, driven by the engine's own fixed-step frame loop; rigid bodies with stacking and XPBD cloth or soft bodies in the same world; GPU fluid as a third solver; Python bindings (step, set state, read state, render to an array); five scenes reproducible from the command line; a ROS 2 bridge and a simulated arm or mobile base compared with MuJoCo or Gazebo; API docs and an architecture write-up; a portfolio site. Stretch: two-way rigid–fluid coupling, headless rendering on a server, a scene editor.

**Architecture.** A core owns the world, the fixed-step loop and the job system. Physics runs as stages: broadphase, narrowphase, rigid solver, XPBD solver, fluid solver, with shared contact data. The renderer reads an immutable snapshot of transforms each frame. A bindings layer exposes the core to Python; a bridge exposes it to ROS 2. Scenes are data files loaded by both the app and the bindings.

```
 scene file ─▶ core (world, fixed step, jobs)
                 │
   ┌─────────────┼───────────────┬──────────────┐
   ▼             ▼               ▼              ▼
 physics     renderer       Python bindings   ROS 2 bridge
 (rigid, XPBD, fluid)  (Vulkan, PBR)  (datasets)  (robot)
```

**Stack.** C++20, Vulkan 1.3 with compute shaders, GLSL to SPIR-V, pybind11 or nanobind, NumPy, ROS 2 Jazzy, CMake, GitHub Actions for builds and golden-image tests, MuJoCo or Gazebo for the comparison, a static site generator for the portfolio. Nothing to buy beyond the GPU you already have.

**Milestones.** Renderer consolidation: scene graph, PBR, shadows on the engine frame loop (45 h) · one physics world with rigid, XPBD and GPU fluid solvers (60 h) · Python bindings and a dataset generator (35 h) · ROS 2 bridge and robot compared with MuJoCo or Gazebo (45 h) · five demo scenes with frame-time benchmarks (25 h) · API docs, architecture write-up and portfolio site (40 h). Total 250 h.

**Done when.** All six acceptance criteria hold. A 1 000-box pyramid stacks and rests without jitter; cloth drapes over a moving rigid body. Each of five scenes runs with one command and reports frame time; the main scene holds 60 FPS at 1080p. A Python script generates 10 000 labelled frames with states and is bit-identical across two runs with the same seed. The robot's joint trajectories match MuJoCo or Gazebo within a stated tolerance (for example 2° RMS) over a 10-second task. Someone else adds a scene by following your docs. The portfolio has a write-up for every Stage 1 monthly project worth showing.

**Measure and report.** Frame time split into physics stages and render passes for every scene; bodies, particles and constraints against frame time; dataset throughput in frames per second; robot trajectory error against the reference simulator; determinism checks across runs and machines.

**Pitfalls.** Renderer and physics sharing mutable state, so frames tear or race. Non-determinism from parallel reductions that breaks dataset reproducibility. Bindings that copy whole buffers every step. A bridge that runs on wall time. Scope creep: an editor before the docs are written.

**References.** vkguide, game-engine-architecture, ericson-rtcd, catto-box2d-publications, ten-minute-physics, bridson-fluid-sim, mujoco-docs, ros2-tutorials, m27, m34, m-gpu-fluid.

**Write-up.** A two-minute reel of the five scenes, the frame-time table, an architecture diagram, the robot comparison plot, a dataset example, and a section on what v2 changes.
