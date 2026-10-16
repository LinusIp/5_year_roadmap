# Research question: How far does a GNS-style simulator generalise to object counts it never saw

**Goal.** A pre-registered study of a graph-network simulator trained on scenes from your 2D engine with a limited range of object counts and tested on fewer and many more objects, ending in a two-page report in research/ that maps where it holds and where it breaks; a negative result counts.

**Why.** No roadmap.sh node covers learned simulation; the skills are experiment design and scientific writing, plus graph neural networks and rollout evaluation. Resources: paper-learning-to-simulate is the method, cs224w the background, and m-gns supplies the model and data pipeline this question extends.

**Scope.** MVP: circles (then boxes) in a walled arena from the 2D engine; training on 4 to 16 objects; testing at 2, 24, 32, 48 and 64; a GNS with radius-graph message passing predicting accelerations; a constant-velocity baseline; a density control that separates "more objects" from "more crowded". Stretch: a second shape set, noise-injection ablations, a model trained on a wider range for comparison.

**Architecture.** Phases: a question with a written prediction; a frozen protocol (counts, density control, metrics, seeds); data generation from the engine; training the GNS and the baseline; a sweep over test counts; the report. Arena size scales with count in one test series (density fixed) and stays fixed in the other (density grows).

```
2D engine ─▶ scenes N=4..16 ─▶ train GNS ─▶ model
                                              │
test N ∈ {2, 24, 32, 48, 64} × {fixed density, fixed arena} ─▶ rollouts ─▶ errors ─▶ report
```

**Stack.** Python 3.12, PyTorch with PyTorch Geometric or hand-written message passing, your engine's Python bindings, NumPy, Weights & Biases, one GPU.

**Milestones.** Question, prediction and protocol written down (3 h) · datasets at every object count from the 2D engine (6 h) · GNS and constant-velocity baseline trained (8 h) · generalisation sweep with density control and three seeds (7 h) · two-page report and review notes (6 h). Total 30 h.

**Done when.** A hypothesis and prediction are committed before the sweep, for example "at fixed density, 100-step rollout error at 48 objects stays within 1.5× the in-range error; at fixed arena size it exceeds 3×". The experiment could prove it wrong: the test counts and both density series are fixed in advance, with 50 held-out scenes per setting and three training seeds. Code, configs and the scene generator are in the repository. The two-page report is in research/ in the data repo and is discussed in the quarterly review.

**Measure and report.** One-step acceleration error and rollout position error at 10, 50 and 100 steps, normalised by object radius, for every count and both density series; the ratio to in-range error; penetration depth and energy drift in rollouts; the same for the baseline; inference time against object count.

**Pitfalls.** Confounding count with density, then crediting the wrong one. Normalisation statistics computed on the training range that saturate on dense scenes. A connectivity radius that gives far more neighbours per node at high counts. Reporting only one-step error, which hides rollout blow-ups. Cherry-picking the rollout video.

**References.** paper-learning-to-simulate, meshgraphnets, cs224w, pbdl-book, m-gns, m15, schulman-research-guide.

**Write-up.** The error-against-count chart for both density series with the baseline, three rollout videos (in range, mild and far out of range), the prediction quoted next to the outcome, and what would make the model generalise further.
