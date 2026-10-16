# Year 1 capstone: an arcade game in C with an opponent you trained

**Goal.** A finished, downloadable arcade game in C with raylib (menu, game loop, win and lose states, sound) whose computer opponent is a small neural network you trained in Python and run inside the game with inference code you wrote in C, at several difficulty levels that really play differently.

**Why.** Game Developer roadmap: `game-developer/c-cpp`, `game-developer/state-machine`, `game-developer/artificial-neural-network` and `game-developer/reinforcement-learning`; AI Agents roadmap: `ai-agents/npc-game-ai`; Inference Engineering roadmap: `inference-engineering/neural-networks`. Skills: C, raylib, game loop and state machines, training a small network, and inference from scratch, the year's three threads in one shipped thing.

**Scope.** MVP: a two-player arena game (air hockey, a tank duel or a Pong variant with power-ups), a fixed-timestep simulation that can also run headless, a scripted bot, logged games, an MLP policy trained by behaviour cloning on your play and the bot's, exported weights, a C forward pass, three difficulty levels, builds for Linux and Windows. Stretch: reinforcement-learning fine-tuning (PPO against the scripted bot through a Python binding to the headless build), a WebAssembly build for itch.io.

**Architecture.** The game is a state machine (menu, play, paused, win, lose) over a fixed-timestep simulation. Each tick the opponent builds a feature vector (positions, velocities, distances), runs the C forward pass, and turns the logits into an action. The same simulation compiled headless logs (state, action) pairs and plays thousands of games fast. The Python trainer reads logs, trains the MLP, evaluates it against the scripted bot, and writes a flat binary weight file the game loads.

```
headless sim ─▶ logs ─▶ PyTorch trainer ─▶ weights.bin
                                              │
player ─▶ game loop (fixed dt) ◀─ action ◀─ C MLP forward ◀─ features
              └─▶ raylib render + audio
```

**Stack.** C17, raylib, CMake, Python 3.12 with PyTorch or NumPy for training, ctypes or a small C API for the headless binding, GitHub Actions to build release binaries, OBS for the gameplay video.

**Milestones.** Core game, simulation and state machine (25 h) · polish: menu, sound, juice and release builds (15 h) · headless mode, scripted bot and game logging (10 h) · network training and evaluation in Python (20 h) · C inference, weight export and parity tests (12 h) · difficulty levels, evaluation, video and write-up (18 h). Total 100 h.

**Done when.** A stranger can download a release for Linux or Windows, run it, and play from menu to win or lose screen with sound. The C forward pass matches PyTorch's logits within 1e-5 on 1,000 recorded states, and costs under 0.1 ms per tick. Over 200 headless games against the scripted bot, the three difficulty levels win roughly 20 %, 50 % and 80 %, at least 25 points apart, and differ visibly in behaviour, not just reaction delay. The game holds 60 FPS on integrated graphics. The repository has a README, a gameplay video and the write-up.

**Measure and report.** Win rate of each difficulty against the scripted bot and against you over 20 games; training and validation loss and action accuracy; network size and per-tick inference time; frame time p50 and p99; download size.

**Pitfalls.** Features computed differently in Python and in C, so the trained policy plays nonsense in the game. A network that copies the bot's habits including its bugs. Difficulty done only with random noise, which looks broken rather than easier. Variable-timestep physics that makes logged games unreproducible. Polishing the game last and running out of time.

**References.** raylib, beej-c, karpathy-zero-to-hero, hf-deep-rl-course, spinning-up, gaffer-on-games, m05, m06.

**Write-up.** A gameplay GIF or video, the difficulty win-rate table, a plot of what the network attends to (saliency or action maps over positions), the parity-test result, and what self-play would change.
