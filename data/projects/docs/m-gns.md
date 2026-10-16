# GNS reimplementation on data from your 2D engine, with a generalisation study

**Goal.** A graph-network simulator trained on trajectories from your own 2D rigid-body engine, evaluated by rollout error against the engine in and out of the training distribution, with a report on where and how it breaks.

**Why.** No roadmap.sh roadmap covers learned simulators, so this project builds skills rather than nodes: graph networks, learned simulators, and generalisation studies. It reimplements the encoder-processor-decoder of the GNS paper and reuses your project 32 engine as a source of exact ground truth, which no public dataset gives you. The research card `q-gns-object-counts` asks the question this project answers first.

**Scope.** MVP: a trajectory generator in your 2D engine with scenes of 3–8 boxes and circles falling and colliding in a walled box, 1,000 training and 100 test trajectories of 300 steps, bodies represented as particles on their outline plus a centre node, a GNS with 10 message-passing steps predicting accelerations, noise injection on input velocities, multi-step rollouts. Out-of-distribution tests: 12–16 bodies, unseen shapes (triangles, hexagons), a larger box. Stretch: a rigidity projection that restores each body's shape after every step; a comparison with a body-level graph.

**Architecture.** The generator steps the engine at a fixed timestep and saves positions per particle and per body. A graph builder connects particles within a radius, adds edges to walls as distance features, and feeds five past velocities per node. The encoder embeds nodes and edges, the processor runs message passing, and the decoder outputs an acceleration per particle, integrated with semi-implicit Euler. Rollouts feed predictions back as inputs for hundreds of steps and are compared with the engine.

```
2D engine ─▶ trajectories ─▶ graph builder (radius, walls, history)
                                      │
             encoder ─▶ processor (×10) ─▶ decoder ─▶ acceleration
                                                        │
                     rollout ◀── integrate ◀────────────┘ ─▶ error vs engine
```

**Stack.** Your 2D engine with a scene-dump mode or Python bindings, Python 3.12, PyTorch with PyTorch Geometric (or JAX with Jraph), NumPy, Weights & Biases, one GPU.

**Milestones.** Trajectory generator in your 2D engine, committed to the repository (5 h) · Graph builder and encoder-processor-decoder network (10 h) · Training with noise injection and one-step validation (8 h) · Rollouts and the generalisation study on more objects and new shapes (7 h) · Report on where it breaks (5 h). Total 35 h.

**Done when.** The generator regenerates the dataset from a seed and is in the repository. On the in-distribution test set, mean position error over 100-step rollouts stays below 5 % of the box width. Rollout error against horizon (1 to 300 steps) is reported for the test set and each out-of-distribution set, with the ratio to in-distribution error. The report classifies failures (interpenetration, bodies losing shape, energy gain, wall leaks) with an example of each.

**Measure and report.** One-step and rollout position error against horizon for every test set; error against object count from 3 to 16; kinetic energy over a rollout against the engine's; inference time per step against the engine's step time; the effect of noise injection on rollout error.

**Pitfalls.** Training without noise, which gives excellent one-step error and rollouts that explode. Unnormalised inputs and targets, so the network learns the scale instead of the physics. A connectivity radius too small to see a collision before it happens. Leaking test scenes into training through the same seed range. Reporting only one-step error.

**References.** paper-learning-to-simulate, meshgraphnets, cs224w, pbdl-book, q-gns-object-counts, m15.

**Write-up.** Side-by-side GIFs of the engine and the learned simulator, in and out of distribution, the error-against-horizon chart for every test set, the failure gallery, and what you would change to make it generalise.
