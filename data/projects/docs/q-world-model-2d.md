# Research question: Can a 50 M-parameter world model trained on your 2D engine predict one second of rigid-body motion within tolerance

**Goal.** A pre-registered experiment that trains a 50 M-parameter transformer world model on trajectories from your 2D rigid-body engine and tests whether its one-second rollouts stay within a tolerance you fix in advance, broken down by scene type; it ends in a two-page report in research/, and a negative result counts.

**Why.** No roadmap.sh node covers world models; the skills are experiment design and scientific writing, plus sequence modelling of physics and rollout evaluation. It is the small, cheap version of cap-research, with world-models and paper-learning-to-simulate as the background and m15 as the data source.

**Scope.** MVP: state-based prediction (each body a token of position, angle, velocities, shape and size), scenes of 2 to 10 bodies in four types (free flight, single collisions, stacks, resting contact), 60 Hz data, autoregressive rollout for 60 steps, a constant-velocity baseline and a gravity-only ballistic baseline. Stretch: a pixel-based variant, conditioning on applied forces, a smaller and a larger model for a mini scaling curve.

**Architecture.** Phases: a question with a tolerance and prediction written down; a frozen protocol (scene mix, splits, model size, budget, metrics); data generation; training; rollout evaluation per scene type and horizon; the report. The model attends over the body tokens of the last k frames and predicts each body's change of state for the next frame.

```
2D engine ─▶ trajectories (60 Hz) ─▶ train/val/test by scene seed
                                        │
          last k frames ─▶ transformer (50 M) ─▶ Δstate ─▶ rollout × 60
                                                           │
                   engine ground truth ─▶ error vs horizon ◀┘ ─▶ report
```

**Stack.** Python 3.12, PyTorch, your engine's Python bindings, NumPy, Weights & Biases, one 24 GB GPU for a training run of a few hours.

**Milestones.** Question, tolerance and prediction written down (3 h) · dataset from the 2D engine and the two baselines (6 h) · 50 M-parameter model trained (9 h) · rollout evaluation by horizon and scene type (6 h) · two-page report and review notes (6 h). Total 30 h.

**Done when.** The tolerance and prediction are committed first, for example "after 60 steps, at least 80 % of bodies are within 0.1 m and 10° of ground truth on free-flight and single-collision scenes, and under 50 % on stacks". The experiment could prove it wrong: test scenes come from seeds never used in training, the parameter count is checked at 50 M ± 10 %, and the baselines are scored on the same scenes. Code, configs and the data generator are in the repository. The two-page report is in research/ in the data repo and is discussed in the quarterly review.

**Measure and report.** Share of bodies within tolerance at 0.25, 0.5 and 1 s per scene type; position and angle error against horizon for the model and both baselines; energy and momentum drift in rollouts; interpenetration depth; parameter count, training tokens and inference time per step.

**Pitfalls.** Splitting train and test by frame instead of by scene, so the model has seen the future. Measuring one-step error only. Predicting absolute positions instead of deltas, which wastes capacity. Angle wrap-around at ±π. A tolerance chosen after looking at the errors.

**References.** world-models, paper-learning-to-simulate, meshgraphnets, dreamerv3, pbdl-book, m15, cap-research, schulman-research-guide.

**Write-up.** The error-against-horizon chart per scene type with both baselines, side-by-side rollout videos (model against engine), the prediction quoted next to the outcome, and which scenes would need more data or a different architecture.
