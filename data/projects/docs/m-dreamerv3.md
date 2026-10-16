# DreamerV3 reimplementation on a MuJoCo task

**Goal.** Your own DreamerV3: a world model that learns the dynamics of a MuJoCo control task and an actor-critic that learns to act inside it, with learning curves compared against the published numbers and imagined rollouts shown next to real ones.

**Why.** Game Developer roadmap: `game-developer/reinforcement-learning`. Skills: model-based reinforcement learning, world models, and JAX or PyTorch. DreamerV3 is the reference design for learning in imagination, and its world model (an RSSM with discrete latents) is a direct ancestor of the one in the research capstone. Writing it yourself, rather than running the official code, is how its many small tricks become understood rather than copied.

**Scope.** MVP: two DeepMind Control Suite tasks on MuJoCo from proprioceptive state (cartpole swingup and walker walk), the world model (encoder, RSSM with 32×32 categorical latents, decoder, reward and continue heads), symlog predictions, two-hot critic, KL balancing with free bits, percentile return normalisation, an actor and critic trained on imagined trajectories, three seeds per task. Stretch: pixel observations with a CNN encoder; a third task; a comparison with the official implementation on wall-clock time.

**Architecture.** An environment loop collects experience with the current actor into a replay buffer. The world model trains on sequences from the buffer: it encodes observations, rolls the recurrent state forward, and learns to reconstruct observations, rewards and episode continuation. The actor and critic then train on trajectories imagined from replayed start states, never touching the environment. A visualiser decodes imagined rollouts and plays them next to what really happened.

```
env (MuJoCo) ─▶ replay buffer ─▶ world model (RSSM)
      ▲                                │ imagine 15 steps
      │                                ▼
    actor ◀── actor-critic on imagined trajectories
```

**Stack.** Python 3.12, JAX with Flax or PyTorch, MuJoCo with dm_control, NumPy, Weights & Biases, one GPU; the official DreamerV3 code is consulted for hyperparameters only.

**Milestones.** Environment wrapper, replay buffer and a random-policy baseline (4 h) · World model: encoder, RSSM with categorical latents, decoder, reward and continue heads (12 h) · Actor-critic in imagination with return normalisation and a two-hot critic (10 h) · Training runs on two tasks with three seeds each (8 h) · Imagined against real rollouts, and the write-up of what had to change (6 h). Total 40 h.

**Done when.** On cartpole swingup the agent reaches a return of at least 800 within 200,000 environment steps, and on walker walk it reaches at least 85 % of the published DreamerV3 score at 500,000 steps, both as the mean of three seeds, plotted against the paper's curve. Imagined rollouts of 15 steps decode to frames or states that track the real trajectory, shown side by side in the write-up. The write-up lists every change from the paper you needed, and why.

**Measure and report.** Episode return against environment steps with the seed spread, next to the published curve; world-model losses per head over training; the prediction error of imagined states against real ones as a function of horizon; environment steps and wall-clock hours per run; the effect of removing one trick (free bits or return normalisation) on one task.

**Pitfalls.** Applying symlog to the wrong quantities, or forgetting the inverse on predictions. KL balancing coefficients swapped between the posterior and the prior terms. Gradients from the actor leaking into the world model. A replay ratio far from the paper's, which changes sample efficiency entirely. Comparing your proprioceptive results against the paper's pixel curves.

**References.** dreamerv3, dreamerv2, dreamer, world-models, dreamerv3-code, mujoco-docs, berkeley-cs285, jax-docs.

**Write-up.** Learning curves against the published ones, a GIF of imagined and real rollouts side by side, the ablation table, and the list of changes from the paper with what each one fixed.
