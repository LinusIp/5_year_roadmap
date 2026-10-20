# The Atlas Library import (pull request #20)

`scratch/import-atlas.ts` upserted `atlas-resources.jsonl` (2,408 rows) into `data/`. A row whose id the Library had is an
update; a row the Library had under another id is a merge. Either way the entry kept everything it had and took only
the fields it was missing; no URL was changed. The 1,682 rows the Library did not have are in
`data/resources/library-atlas.yaml`.

## Merges (167)

| Import id | Library entry | Kind | Matched by | Fields filled |
|---|---|---|---|---|
| `stanford-cs229-2018` | `stanford-cs229` | resource | title | priority, roadmap |
| `coursera-ml-specialization` | `ng-ml-spec` | resource | url | priority, roadmap |
| `mit-6s191` | `mit-6-s191` | resource | url | priority, roadmap |
| `fsdl-2022` | `fsdl` | resource | title | priority, roadmap |
| `berkeley-advanced-llm-agents-sp25` | `berkeley-llm-agents` | resource | url | priority, roadmap |
| `cmu-dlsys` | `cmu-10-414` | resource | url | priority, roadmap |
| `mit-65940-efficientml` | `mit-6-5940` | resource | title | priority, roadmap |
| `goodfellow-deep-learning` | `deep-learning-book` | resource | url | priority, roadmap |
| `understanding-deep-learning` | `udl-book` | resource | url | priority, roadmap |
| `ultrascale-playbook` | `ultra-scale-playbook` | resource | url | priority, roadmap |
| `cuda-programming-guide` | `cuda-guide` | resource | checked | priority, roadmap |
| `cem-yuksel-intro-graphics` | `utah-cs4600` | resource | url | priority, roadmap |
| `cem-yuksel-interactive-graphics` | `utah-cs6610` | resource | url | priority, roadmap |
| `pbrt-4ed` | `pbr-book` | resource | title | priority, roadmap |
| `baraff-witkin-pbm` | `witkin-baraff-pbm` | resource | url | priority, roadmap |
| `raylib-examples` | `raylib` | resource | checked | priority, roadmap |
| `mit-6004-computation-structures` | `mit-6-004` | resource | url | priority |
| `mit-6046-algorithms` | `mit-6-046j` | resource | url | priority, roadmap |
| `mit-6172-performance-engineering` | `mit-6-172` | resource | url | priority, roadmap |
| `berkeley-cs162` | `cs162` | resource | checked | priority |
| `cmu-15418-parallel` | `cmu-15-418` | resource | url | priority, roadmap |
| `lf-intro-to-linux` | `lfs101-intro-linux` | resource | url | priority |
| `course-hf-agents` | `hf-agents-course` | resource | url | priority, roadmap |
| `mit-6006-intro-algorithms-2020` | `mit-6-006` | resource | url | priority |
| `mit-6042j-math-for-cs-ocw` | `mit-6-042j` | resource | title | priority |
| `linear-algebra-done-right` | `axler-ladr` | resource | url | priority, roadmap |
| `mit-1806-linear-algebra` | `mit-18-06` | resource | url | priority, roadmap |
| `paper-lamport-time-clocks` | `paper-time-clocks` | queue paper | url | priority, roadmap |
| `paper-google-file-system` | `paper-gfs` | queue paper | url | priority, roadmap |
| `course-mit-6-5840-distributed-systems` | `mit-6-5840` | resource | url | priority, roadmap |
| `course-cmu-15-445-databases` | `cmu-15-445` | resource | url | priority, roadmap |
| `article-weng-what-are-diffusion-models` | `lilian-weng-diffusion` | resource | url | priority, roadmap, research |
| `article-yang-song-score-based` | `yang-song-score` | resource | url | priority, roadmap, research |
| `article-annotated-diffusion` | `annotated-diffusion` | resource | url | priority, roadmap |
| `blog-sander-dieleman` | `sander-dieleman-blog` | resource | url | priority, roadmap, research |
| `course-stanford-cs236-deep-generative-models` | `stanford-cs236` | resource | url | priority, roadmap |
| `course-hf-diffusion-models` | `hf-diffusion-course` | resource | title | priority, roadmap |
| `video-course-fastai-part2-stable-diffusion` | `fastai-part-2` | resource | url | priority, roadmap |
| `practice-lucidrains-denoising-diffusion-pytorch` | `denoising-diffusion-pytorch` | resource | url | priority, roadmap |
| `paper-ddpm` | `ddpm` | queue paper | url | priority, roadmap, research |
| `paper-improved-ddpm` | `improved-ddpm` | queue paper | url | priority, roadmap, research |
| `paper-ddim` | `ddim` | queue paper | url | priority, roadmap, research |
| `paper-score-sde` | `score-sde` | queue paper | url | priority, roadmap, research |
| `paper-classifier-free-guidance` | `classifier-free-guidance` | queue paper | url | priority, roadmap, research |
| `paper-latent-diffusion` | `latent-diffusion` | queue paper | url | priority, roadmap, research |
| `paper-dit` | `dit` | queue paper | url | priority, roadmap, research |
| `paper-flow-matching` | `flow-matching` | queue paper | url | priority, roadmap, research |
| `paper-rectified-flow` | `rectified-flow` | queue paper | url | priority, roadmap, research |
| `paper-consistency-models` | `consistency-models` | queue paper | url | priority, roadmap, research |
| `article-openai-sora-world-simulators` | `sora-report` | queue paper | url | priority, roadmap, research |
| `paper-movie-gen` | `movie-gen` | queue paper | url | priority, roadmap |
| `paper-3d-gaussian-splatting` | `paper-3dgs` | queue paper | title | priority, roadmap |
| `blog-inigo-quilez` | `iq-articles` | resource | checked | priority, roadmap |
| `practice-shadertoy` | `shadertoy` | resource | url | priority, roadmap |
| `blog-gaffer-on-games` | `gaffer-on-games` | resource | url | priority, roadmap |
| `docs-real-time-rendering-resources` | `rtr4` | resource | url | priority, roadmap |
| `tutorial-learnopengl` | `learnopengl` | resource | url | priority, roadmap |
| `book-ray-tracing-in-one-weekend` | `rtiow` | resource | url | priority, roadmap |
| `book-3d-math-primer` | `gamemath-3d-primer` | resource | url | priority, roadmap |
| `paper-flashattention-2` | `flashattention-2` | queue paper | url | priority, roadmap, research |
| `paper-flashattention-3` | `flashattention-3` | queue paper | url | priority, roadmap, research |
| `paper-pagedattention-vllm` | `pagedattention` | queue paper | url | priority, roadmap, research |
| `paper-orca-continuous-batching` | `orca` | queue paper | url | priority, roadmap, research |
| `paper-speculative-decoding-leviathan` | `speculative-decoding-leviathan` | queue paper | url | priority, roadmap, research |
| `paper-speculative-sampling-chen` | `speculative-sampling-chen` | queue paper | url | priority, roadmap, research |
| `paper-medusa` | `medusa` | queue paper | url | priority, roadmap, research |
| `paper-eagle` | `eagle` | queue paper | url | priority, roadmap, research |
| `paper-gptq` | `gptq` | queue paper | url | priority, roadmap, research |
| `paper-awq` | `awq` | queue paper | url | priority, roadmap, research |
| `paper-smoothquant` | `smoothquant` | queue paper | url | priority, roadmap, research |
| `paper-llm-int8` | `llm-int8` | queue paper | url | priority, roadmap, research |
| `paper-sglang-radixattention` | `sglang-radixattention` | queue paper | url | priority, roadmap, research |
| `paper-distserve` | `distserve` | queue paper | url | priority, roadmap, research |
| `paper-roofline` | `roofline` | queue paper | url | priority, roadmap, research |
| `article-horace-he-brrr` | `horace-he-brrr` | resource | url | priority, roadmap |
| `article-kipply-inference-arithmetic` | `kipply-inference-arithmetic` | resource | title | priority, roadmap |
| `article-lilian-weng-inference-optimization` | `lilian-weng-inference` | resource | url | priority, roadmap |
| `article-hazy-gpus-go-brrr` | `hazy-gpus-go-brrr` | resource | url | priority, roadmap |
| `course-stanford-cs149` | `cs149` | resource | title | priority, roadmap |
| `docs-sglang` | `sglang-docs` | resource | url | priority, roadmap |
| `docs-tensorrt-llm` | `tensorrt-llm-docs` | resource | url | priority, roadmap |
| `paper-attention-is-all-you-need` | `paper-attention` | queue paper | url | priority, roadmap, research |
| `paper-gpt3-few-shot` | `paper-gpt3` | queue paper | url | priority, roadmap, research |
| `paper-kaplan-scaling-laws` | `paper-scaling-laws` | queue paper | url | priority, roadmap, research |
| `blog-ahead-of-ai` | `raschka-ahead-of-ai` | resource | url | priority, roadmap |
| `course-hf-llm-course` | `hf-llm-course` | resource | url | priority, roadmap |
| `course-stanford-cs336` | `stanford-cs336` | resource | title | priority, roadmap |
| `course-karpathy-zero-to-hero` | `karpathy-zero-to-hero` | resource | url | priority, roadmap |
| `book-rust-embedded` | `embedded-rust-book` | resource | url | priority |
| `tutorial-learncpp` | `learncpp` | resource | url | priority |
| `book-beej-c` | `beej-c` | resource | url | priority |
| `book-rust-book` | `rust-book` | resource | url | priority |
| `practice-csapp-labs` | `csapp-labs` | resource | url | priority, roadmap |
| `paper-batch-norm` | `paper-batchnorm` | queue paper | url | priority, roadmap |
| `paper-muzero` | `muzero` | queue paper | url | priority, roadmap |
| `article-matrix-calculus-dl` | `matrix-calculus-dl` | resource | url | priority, roadmap |
| `course-spinning-up-deep-rl` | `spinning-up` | resource | url | priority, roadmap |
| `course-3b1b-essence-linear-algebra` | `3b1b-linear-algebra` | resource | title | (none) |
| `course-3b1b-essence-calculus` | `3b1b-calculus` | resource | title | priority, roadmap |
| `book-mml-deisenroth` | `mml-book` | resource | url | priority, roadmap |
| `book-bishop-prml` | `prml` | resource | title | priority, roadmap |
| `course-fastai-practical-dl` | `fastai-practical-dl` | resource | url | priority, roadmap |
| `course-hf-deep-rl` | `hf-deep-rl-course` | resource | url | priority, roadmap |
| `course-stanford-cs231n` | `stanford-cs231n` | resource | url | priority, roadmap |
| `course-berkeley-cs285` | `berkeley-cs285` | resource | url | priority, roadmap |
| `book-modern-robotics-lynch-park` | `modern-robotics` | resource | url | priority |
| `course-modern-robotics-coursera` | `modern-robotics` | resource | title | (none) |
| `course-brunton-control-bootcamp` | `brunton-control-bootcamp` | resource | url | priority |
| `docs-mujoco` | `mujoco-docs` | resource | url | priority |
| `repo-dit` | `facebookresearch-dit` | resource | url | short, fromYear, after, priority, roadmap, research |
| `repo-tinyrenderer` | `tinyrenderer` | resource | url | after, priority, roadmap |
| `repo-nvidia-warp` | `nvidia-warp` | resource | url | short, fromYear, after, priority, roadmap |
| `course-mlops-zoomcamp` | `mlops-zoomcamp` | resource | url | short, summary, fromYear, priority, roadmap |
| `course-data-engineering-zoomcamp` | `de-zoomcamp` | resource | url | short, fromYear, priority, roadmap |
| `course-llm-zoomcamp` | `llm-zoomcamp` | resource | url | short, summary, fromYear, priority, roadmap |
| `roadmap-devops` | `roadmap-sh-devops` | resource | url | short, summary, fromYear, priority, roadmap |
| `tutorial-kubernetes-the-hard-way` | `kubernetes-the-hard-way` | resource | url | summary, priority, roadmap |
| `docs-docker-get-started` | `docker-get-started` | resource | url | summary, priority, roadmap |
| `docs-github-actions` | `github-actions-docs` | resource | url | priority, roadmap |
| `docs-terraform-tutorials` | `terraform-tutorials` | resource | url | priority, roadmap |
| `docs-prometheus` | `prometheus-docs` | resource | url | priority, roadmap |
| `docs-opentelemetry` | `opentelemetry-docs` | resource | url | after, priority, roadmap |
| `course-mit-18-02sc-multivariable-calculus` | `mit-18-02` | resource | title | summary, priority, roadmap |
| `course-mit-18-03sc-differential-equations` | `mit-18-03` | resource | title | priority, roadmap |
| `course-mit-6-041sc-probability` | `mit-6-041` | resource | title | priority, roadmap |
| `course-harvard-stat-110` | `harvard-stat-110` | resource | title | after, priority, roadmap |
| `book-boyd-convex-optimization` | `cvxbook` | resource | url | short, fromYear, after, priority, roadmap |
| `book-feynman-lectures-on-physics` | `feynman-lectures` | resource | url | short, fromYear, after, priority, roadmap |
| `course-mit-8-03sc-vibrations-and-waves` | `mit-8-03` | resource | title | summary, priority, roadmap |
| `roadmap-system-design` | `roadmap-sh-system-design` | resource | url | short, summary, fromYear, priority, roadmap |
| `roadmap-backend` | `roadmap-sh-backend` | resource | url | short, summary, fromYear, priority, roadmap |
| `teach-yourself-cs` | `teachyourselfcs` | resource | url | short, fromYear, priority |
| `ros2-jazzy-tutorials` | `ros2-tutorials` | resource | url | after, priority |
| `feedback-systems-astrom-murray` | `feedback-systems` | resource | url | short, fromYear, priority |
| `paper-position-based-dynamics` | `paper-pbd` | queue paper | url | short, summary, level, fromYear, priority, roadmap |
| `paper-learning-to-simulate-gns` | `paper-learning-to-simulate` | queue paper | url | short, summary, level, fromYear, priority, roadmap |
| `paper-meshgraphnets` | `meshgraphnets` | queue paper | url | short, summary, level, fromYear, priority, roadmap |
| `paper-fourier-neural-operator` | `fourier-neural-operator` | queue paper | url | short, summary, level, fromYear, priority, roadmap |
| `paper-pinns-raissi` | `paper-pinn` | queue paper | url | short, summary, level, fromYear, priority, roadmap |
| `book-physics-based-deep-learning` | `pbdl-book` | resource | title | after, priority, roadmap |
| `course-mit-18085-cse` | `mit-18-085` | resource | url | priority, roadmap |
| `article-box2d-publications` | `catto-box2d-publications` | resource | url | after, priority, roadmap |
| `paper-world-models-ha` | `world-models` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `paper-planet` | `planet` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `paper-dreamer-v1` | `dreamer` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `paper-dreamer-v2` | `dreamerv2` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `paper-dreamer-v3` | `dreamerv3` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `paper-diamond` | `diamond` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `paper-genie` | `genie` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `paper-gaia-1` | `gaia-1` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `paper-unisim` | `unisim` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `paper-cosmos-wfm` | `cosmos` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `paper-i-jepa` | `i-jepa` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `paper-v-jepa` | `v-jepa` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `paper-lecun-path-ami` | `lecun-jepa` | queue paper | title | short, summary, level, fromYear, priority, roadmap, research, url, urlVerified, lastVerified |
| `paper-td-mpc2` | `td-mpc2` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `paper-keshav-how-to-read` | `keshav-how-to-read` | resource | url | short, fromYear, priority, roadmap |
| `article-hamming-you-and-your-research` | `hamming-you-and-your-research` | resource | url | short, fromYear, priority, roadmap |
| `article-karpathy-phd-survival` | `karpathy-phd-guide` | resource | url | short, fromYear, after, priority, roadmap |
| `article-schulman-opinionated-guide` | `schulman-research-guide` | resource | url | short, fromYear, after, priority, roadmap |
| `paper-stable-video-diffusion` | `stable-video-diffusion` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `course-mit-6s978` | `mit-6-s978` | resource | url | short, fromYear, doFirst, priority, roadmap, research |
| `paper-mooncake` | `mooncake` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `paper-splitwise` | `splitwise` | queue paper | url | short, summary, level, fromYear, priority, roadmap, research |
| `tutorial-hellointerview-in-a-hurry` | `hello-interview` | resource | url | fromYear, priority, roadmap |
| `repo-gpu-mode-lectures` | `gpu-mode-lectures` | resource | url | summary, tags, priority, roadmap |
| `docs-alphaxiv` | `alphaxiv` | resource | url | short, fromYear, after, priority, roadmap |

## Updates by id (559)

| Id | Kind | Fields filled |
|---|---|---|
| `coursera-deep-learning-specialization` | resource | priority, roadmap |
| `google-ml-crash-course` | resource | priority, roadmap |
| `nyu-deep-learning-2021` | resource | priority, roadmap |
| `stanford-cs224n` | resource | priority, roadmap |
| `stanford-cs25` | resource | priority, roadmap |
| `stanford-cs234` | resource | priority, roadmap |
| `david-silver-rl` | resource | priority, roadmap |
| `berkeley-llm-agents-f24` | resource | priority, roadmap |
| `d2l` | resource | priority, roadmap |
| `isl-python` | resource | priority, roadmap |
| `sutton-barto-rl` | resource | priority, roadmap |
| `pytorch-tutorials` | resource | priority, roadmap |
| `annotated-transformer` | resource | priority, roadmap |
| `anthropic-building-effective-agents` | resource | priority, roadmap |
| `lilianweng-llm-agents` | resource | priority, roadmap |
| `mcp-docs` | resource | priority, roadmap |
| `scaling-book` | resource | priority, roadmap |
| `llm-inference-handbook` | resource | priority, roadmap |
| `triton-tutorials` | resource | priority, roadmap |
| `siboehm-cuda-matmul` | resource | priority, roadmap |
| `vllm-docs` | resource | priority, roadmap |
| `visual-guide-quantization` | resource | priority, roadmap |
| `kaggle-learn` | resource | priority, roadmap |
| `numpy-100` | resource | priority, roadmap |
| `kaggle-titanic` | resource | priority, roadmap |
| `deep-ml` | resource | priority, roadmap |
| `tensor-puzzles` | resource | priority, roadmap |
| `minbpe` | resource | priority, roadmap |
| `llms-from-scratch` | resource | priority, roadmap |
| `minitorch` | resource | priority, roadmap |
| `arena` | resource | priority, roadmap |
| `nanochat` | resource | priority, roadmap |
| `mini-swe-agent` | resource | priority, roadmap |
| `gpu-puzzles` | resource | priority, roadmap |
| `triton-puzzles` | resource | priority, roadmap |
| `nano-vllm` | resource | priority, roadmap |
| `llama-cpp` | resource | priority, roadmap |
| `cmu-15462-computer-graphics` | resource | priority, roadmap |
| `tu-wien-rendering-course` | resource | priority, roadmap |
| `freya-math-for-game-devs` | resource | priority, roadmap |
| `cherno-opengl-series` | resource | priority, roadmap |
| `sebastian-lague-coding-adventures` | resource | priority, roadmap |
| `javidx9-3d-engine` | resource | priority, roadmap |
| `brackeys-unity-video-game` | resource | priority, roadmap |
| `ten-minute-physics` | resource | priority, roadmap |
| `gdc-vault-free` | resource | priority, roadmap |
| `coding-train-nature-of-code` | resource | priority, roadmap |
| `handmade-hero` | resource | priority, roadmap |
| `unity-essentials` | resource | priority, roadmap |
| `unity-junior-programmer` | resource | priority, roadmap |
| `unity-creative-core` | resource | priority, roadmap |
| `vulkan-tutorial` | resource | priority, roadmap |
| `vkguide` | resource | priority, roadmap |
| `learn-webgpu-cpp` | resource | priority, roadmap |
| `webgpu-fundamentals` | resource | priority, roadmap |
| `learn-wgpu` | resource | priority, roadmap |
| `book-of-shaders` | resource | priority, roadmap |
| `game-programming-patterns` | resource | priority, roadmap |
| `cg-from-scratch` | resource | priority, roadmap |
| `scratchapixel` | resource | priority, roadmap |
| `gpu-gems` | resource | priority, roadmap |
| `red-blob-games` | resource | priority, roadmap |
| `trip-through-graphics-pipeline` | resource | priority, roadmap |
| `catlike-coding-unity` | resource | priority, roadmap |
| `nature-of-code-book` | resource | priority, roadmap |
| `lettier-3d-game-shaders` | resource | priority, roadmap |
| `advances-real-time-rendering` | resource | priority, roadmap |
| `pbs-siggraph-2013` | resource | priority, roadmap |
| `bridson-fluid-notes` | resource | priority, roadmap |
| `scotty3d` | resource | priority, roadmap |
| `cs184-homework` | resource | priority, roadmap |
| `tinyraytracer` | resource | priority, roadmap |
| `tinykaboom` | resource | priority, roadmap |
| `tinyraycaster` | resource | priority, roadmap |
| `lode-raycasting` | resource | priority, roadmap |
| `20-games-challenge` | resource | priority, roadmap |
| `shader-school` | resource | priority, roadmap |
| `coding-train-challenges` | resource | priority, roadmap |
| `godot-first-2d-game` | resource | priority, roadmap |
| `box2d-lite` | resource | priority, roadmap |
| `stam-fluids-for-games` | resource | priority, roadmap |
| `sascha-willems-vulkan` | resource | priority, roadmap |
| `nvpro-vk-raytracing-tutorial` | resource | priority, roadmap |
| `build-your-own-x` | resource | priority, roadmap |
| `nand2tetris` | resource | priority |
| `stanford-cs110l` | resource | priority |
| `kleppmann-distributed-systems` | resource | priority, roadmap |
| `princeton-algorithms-part1` | resource | priority |
| `crust-of-rust` | resource | priority |
| `kurose-ross-lectures` | resource | priority |
| `fcc-data-structures-fiset` | resource | priority |
| `ben-eater-8bit-computer` | resource | priority |
| `cmu-15721-advanced-databases` | resource | priority, roadmap |
| `comprehensive-rust` | resource | priority |
| `ostep` | resource | priority |
| `rustonomicon` | resource | priority |
| `rust-atomics-and-locks` | resource | priority |
| `erickson-algorithms` | resource | priority |
| `beej-network-programming` | resource | priority |
| `crafting-interpreters` | resource | priority |
| `computer-networks-systems-approach` | resource | priority |
| `van-steen-distributed-systems` | resource | priority, roadmap |
| `the-linux-command-line` | resource | priority |
| `google-sre-book` | resource | priority, roadmap |
| `modern-c` | resource | priority |
| `competitive-programmers-handbook` | resource | priority |
| `perfbook` | resource | priority, roadmap |
| `linux-kernel-module-programming-guide` | resource | priority |
| `build-your-own-redis` | resource | priority |
| `rust-by-example` | resource | priority |
| `cpp-core-guidelines` | resource | priority |
| `rust-async-book` | resource | priority |
| `too-many-linked-lists` | resource | priority |
| `writing-an-os-in-rust` | resource | priority |
| `lets-build-a-simple-database` | resource | priority, roadmap |
| `system-design-primer` | resource | priority, roadmap |
| `rustlings` | resource | priority |
| `exercism-rust` | resource | priority |
| `exercism-c` | resource | priority |
| `exercism-cpp` | resource | priority |
| `neetcode-roadmap` | resource | priority |
| `protohackers` | resource | priority |
| `codecrafters` | resource | priority, roadmap |
| `gossip-glomers` | resource | priority, roadmap |
| `overthewire-bandit` | resource | priority |
| `cses-problem-set` | resource | priority |
| `pingcap-talent-plan` | resource | priority, roadmap |
| `sadservers` | resource | priority, roadmap |
| `linux-upskill-challenge` | resource | priority |
| `paper-react` | queue paper | priority, roadmap, research |
| `paper-toolformer` | queue paper | priority, roadmap, research |
| `paper-reflexion` | resource | priority, roadmap |
| `paper-voyager` | resource | priority, roadmap, research |
| `paper-generative-agents` | resource | priority, roadmap, research |
| `paper-swe-bench` | resource | priority, roadmap, research |
| `paper-swe-agent` | resource | priority, roadmap |
| `paper-openhands` | resource | priority, roadmap |
| `paper-tree-of-thoughts` | resource | priority, roadmap, research |
| `paper-self-consistency` | resource | priority, roadmap, research |
| `paper-memgpt` | resource | priority, roadmap, research |
| `paper-gorilla` | resource | priority, roadmap, research |
| `paper-webarena` | resource | priority, roadmap |
| `paper-osworld` | resource | priority, roadmap, research |
| `paper-tau-bench` | resource | priority, roadmap |
| `paper-codeact` | resource | priority, roadmap, research |
| `paper-lats` | resource | priority, roadmap, research |
| `paper-rag` | queue paper | priority, roadmap |
| `paper-lost-in-the-middle` | resource | priority, roadmap, research |
| `paper-metr-long-tasks` | resource | priority, roadmap |
| `article-swe-bench-verified` | resource | priority, roadmap |
| `article-anthropic-context-engineering` | resource | priority, roadmap |
| `article-anthropic-writing-tools` | resource | priority, roadmap |
| `article-anthropic-multi-agent-research` | resource | priority, roadmap |
| `article-anthropic-long-running-harness` | resource | priority, roadmap |
| `article-anthropic-agent-evals` | resource | priority, roadmap |
| `article-anthropic-swe-bench-sonnet` | resource | priority, roadmap |
| `docs-claude-code-best-practices` | resource | priority, roadmap |
| `article-openai-practical-guide-agents` | resource | priority, roadmap |
| `article-hamel-evals` | resource | priority, roadmap |
| `article-eugene-yan-llm-patterns` | resource | priority, roadmap |
| `article-chip-huyen-agents` | resource | priority, roadmap |
| `article-willison-lethal-trifecta` | resource | priority, roadmap |
| `article-weng-prompt-engineering` | resource | priority, roadmap |
| `article-12-factor-agents` | resource | priority, roadmap |
| `article-cognition-dont-build-multi-agents` | resource | priority, roadmap |
| `article-manus-context-engineering` | resource | priority, roadmap |
| `docs-claude-agent-sdk` | resource | priority, roadmap |
| `docs-openai-agents-sdk` | resource | priority, roadmap |
| `docs-langgraph` | resource | priority, roadmap |
| `docs-anthropic-prompt-engineering` | resource | priority, roadmap |
| `docs-dspy` | resource | priority, roadmap |
| `docs-inspect-ai` | resource | priority, roadmap |
| `practice-smolagents` | resource | priority, roadmap |
| `practice-openhands` | resource | priority, roadmap |
| `practice-swe-agent` | resource | priority, roadmap |
| `practice-aider` | resource | priority, roadmap |
| `practice-terminal-bench` | resource | priority, roadmap |
| `course-dlai-evaluating-agents` | resource | priority, roadmap |
| `book-mathematics-for-computer-science` | resource | priority |
| `book-open-data-structures` | resource | priority |
| `algs4-booksite` | resource | priority |
| `cp-algorithms` | resource | priority |
| `usaco-guide` | resource | priority |
| `codeforces-edu` | resource | priority |
| `atcoder` | resource | priority |
| `project-euler` | resource | priority |
| `leetcode` | resource | priority |
| `visualgo` | resource | priority |
| `algorithm-visualizer` | resource | priority |
| `kattis` | resource | priority |
| `advent-of-code` | resource | priority |
| `mit-6851-advanced-data-structures` | resource | priority |
| `mit-6854-advanced-algorithms` | resource | priority |
| `mit-18404j-theory-of-computation` | resource | priority |
| `stanford-cs166` | resource | priority |
| `stanford-cs103` | resource | priority |
| `book-analytic-combinatorics` | resource | priority |
| `book-of-proof` | resource | priority |
| `book-pythonds` | resource | priority |
| `immersive-linear-algebra` | resource | priority, roadmap |
| `khan-linear-algebra` | resource | priority, roadmap |
| `3b1b-linear-algebra` | resource | priority, roadmap |
| `paper-dijkstra-1959` | resource | priority |
| `paper-knuth-goto` | resource | priority |
| `paper-pugh-skip-lists` | resource | priority |
| `paper-consistent-hashing` | resource | priority, roadmap |
| `paper-hyperloglog` | resource | priority |
| `paper-count-min-sketch` | resource | priority |
| `paper-cuckoo-hashing` | resource | priority |
| `paper-bayer-mccreight-btree` | resource | priority, roadmap |
| `paper-comer-ubiquitous-btree` | resource | priority, roadmap |
| `article-abseil-swiss-tables` | resource | priority |
| `paper-okasaki-purely-functional-ds` | resource | priority |
| `paper-knuth-dancing-links` | resource | priority |
| `paper-sedgewick-llrb` | resource | priority |
| `paper-paxos-made-simple` | resource | priority, roadmap |
| `paper-raft` | queue paper | priority, roadmap |
| `paper-mapreduce` | queue paper | priority, roadmap |
| `paper-bigtable` | queue paper | priority, roadmap |
| `paper-spanner` | queue paper | priority, roadmap |
| `paper-dynamo` | queue paper | priority, roadmap |
| `paper-chubby` | resource | priority, roadmap |
| `paper-kafka` | queue paper | priority, roadmap |
| `paper-cap-twelve-years-later` | resource | priority |
| `paper-harvest-yield` | resource | priority, roadmap |
| `paper-end-to-end-arguments` | resource | priority, roadmap |
| `paper-parnas-modules` | resource | priority, roadmap |
| `paper-out-of-the-tar-pit` | resource | priority, roadmap |
| `paper-no-silver-bullet` | resource | priority, roadmap |
| `paper-architecture-of-a-database-system` | resource | priority, roadmap |
| `paper-critique-ansi-sql-isolation` | resource | priority |
| `paper-calvin` | resource | priority, roadmap |
| `paper-amazon-aurora` | resource | priority, roadmap |
| `paper-borg` | resource | priority |
| `paper-tail-at-scale` | resource | priority |
| `paper-crdts-shapiro` | resource | priority, roadmap |
| `paper-zanzibar` | resource | priority, roadmap, research |
| `paper-facebook-tao` | resource | priority, roadmap |
| `paper-scaling-memcache-facebook` | resource | priority, roadmap |
| `paper-dapper` | resource | priority, roadmap |
| `paper-helland-life-beyond-distributed-transactions` | resource | priority, roadmap |
| `paper-lampson-hints` | resource | priority, roadmap |
| `paper-flp-impossibility` | resource | priority, roadmap |
| `blog-martin-fowler-bliki` | resource | priority, roadmap |
| `article-fowler-microservices` | resource | priority, roadmap |
| `course-patterns-of-distributed-systems` | resource | priority, roadmap |
| `blog-aws-builders-library` | resource | priority, roadmap |
| `blog-high-scalability` | resource | priority, roadmap |
| `blog-the-morning-paper` | resource | priority, roadmap |
| `blog-murat-demirbas` | resource | priority, roadmap |
| `blog-jepsen-analyses` | resource | priority, roadmap |
| `blog-all-things-distributed` | resource | priority, roadmap |
| `article-vogels-eventually-consistent` | resource | priority, roadmap, research |
| `blog-marc-brooker` | resource | priority, roadmap |
| `blog-netflix-techblog` | resource | priority, roadmap |
| `blog-uber-engineering` | resource | priority, roadmap |
| `blog-cloudflare` | resource | priority, roadmap |
| `article-discord-trillions-messages` | resource | priority, roadmap |
| `article-stripe-idempotency` | resource | priority, roadmap |
| `article-notes-young-bloods` | resource | priority, roadmap |
| `article-latency-numbers` | resource | priority |
| `article-joel-test` | resource | priority, roadmap |
| `blog-hillel-wayne` | resource | priority, roadmap |
| `book-software-engineering-at-google` | resource | priority, roadmap |
| `article-design-docs-at-google` | resource | priority, roadmap |
| `tutorial-refactoring-guru-patterns` | resource | priority, roadmap |
| `docs-twelve-factor-app` | resource | priority, roadmap |
| `docs-azure-architecture-center` | resource | priority, roadmap |
| `book-sre-workbook` | resource | priority, roadmap |
| `docs-c4-model` | resource | priority, roadmap |
| `article-nygard-adr` | resource | priority, roadmap |
| `paper-luo-understanding-diffusion` | resource | priority, roadmap, research |
| `paper-chan-tutorial-diffusion-imaging` | resource | priority, roadmap, research |
| `article-dieleman-perspectives-on-diffusion` | resource | priority, roadmap, research |
| `article-dieleman-spectral-autoregression` | resource | priority, roadmap, research |
| `article-cambridge-intro-flow-matching` | resource | priority, roadmap, research |
| `blog-tomczak-deep-generative-modeling` | resource | priority, roadmap |
| `course-mit-6s184-flow-matching-diffusion` | resource | priority, roadmap |
| `docs-hf-diffusers` | resource | priority, roadmap |
| `practice-k-diffusion` | resource | priority, roadmap, research |
| `paper-sohl-dickstein-nonequilibrium-thermo` | resource | priority, roadmap, research |
| `paper-ncsn` | resource | priority, roadmap, research |
| `paper-diffusion-beats-gans` | resource | priority, roadmap, research |
| `paper-edm` | resource | priority, roadmap, research |
| `paper-flow-matching-guide-and-code` | resource | priority, roadmap, research |
| `paper-imagen` | resource | priority, roadmap, research |
| `paper-dalle2-unclip` | resource | priority, roadmap, research |
| `paper-sdxl` | resource | priority, roadmap, research |
| `paper-sd3-rectified-flow-transformers` | resource | priority, roadmap, research |
| `paper-controlnet` | resource | priority, roadmap, research |
| `paper-dreambooth` | resource | priority, roadmap, research |
| `paper-wan-video` | resource | priority, roadmap, research |
| `paper-diffwave` | resource | priority, roadmap, research |
| `paper-audioldm` | resource | priority, roadmap, research |
| `paper-clip` | resource | priority, roadmap, research |
| `paper-llava-visual-instruction-tuning` | resource | priority, roadmap, research |
| `paper-kajiya-rendering-equation` | resource | priority, roadmap |
| `paper-whitted-ray-tracing` | resource | priority, roadmap |
| `paper-veach-thesis` | resource | priority, roadmap |
| `paper-cook-torrance-reflectance` | resource | priority, roadmap |
| `paper-burley-disney-brdf` | resource | priority, roadmap |
| `paper-nerf` | queue paper | priority, roadmap |
| `paper-instant-ngp` | resource | priority, roadmap |
| `paper-restir` | resource | priority, roadmap |
| `paper-neural-radiance-caching` | resource | priority, roadmap |
| `paper-nanite-deep-dive` | resource | priority, roadmap |
| `paper-lumen-ue5` | resource | priority, roadmap |
| `paper-hart-sphere-tracing` | resource | priority, roadmap |
| `paper-marching-cubes` | resource | priority, roadmap |
| `paper-perlin-improving-noise` | resource | priority, roadmap |
| `paper-williams-shadow-mapping` | resource | priority, roadmap |
| `blog-graphics-programming-weekly` | resource | priority, roadmap |
| `blog-aras-p` | resource | priority, roadmap |
| `blog-bart-wronski` | resource | priority, roadmap |
| `blog-mjp-danger-zone` | resource | priority, roadmap |
| `blog-alex-tardif` | resource | priority, roadmap |
| `blog-jeremy-ong` | resource | priority, roadmap |
| `blog-fabien-sanglard` | resource | priority, roadmap |
| `blog-jorge-jimenez` | resource | priority, roadmap |
| `blog-our-machinery-archive` | resource | priority, roadmap |
| `article-aaltonen-no-graphics-api` | resource | priority, roadmap |
| `docs-physically-based-database` | resource | priority, roadmap |
| `docs-amd-gpuopen` | resource | priority, roadmap |
| `article-courreges-gta-v` | resource | priority, roadmap |
| `article-courreges-doom-2016` | resource | priority, roadmap |
| `book-game-engine-black-books` | resource | priority, roadmap |
| `article-sanglard-doom3-review` | resource | priority, roadmap |
| `article-gaffer-fix-your-timestep` | resource | priority, roadmap |
| `book-ray-tracing-gems` | resource | priority, roadmap |
| `book-ray-tracing-gems-ii` | resource | priority, roadmap, research |
| `book-gpu-gems-2` | resource | priority, roadmap |
| `book-gpu-gems-3` | resource | priority, roadmap |
| `book-data-oriented-design` | resource | priority, roadmap |
| `video-mike-acton-dod` | resource | priority, roadmap |
| `docs-godot-architecture` | resource | priority, roadmap |
| `docs-bevy-ecs-quickstart` | resource | priority, roadmap |
| `docs-ecs-faq` | resource | priority, roadmap |
| `docs-unreal-cpp-programming` | resource | priority, roadmap |
| `paper-flashattention` | queue paper | priority, roadmap, research |
| `paper-quip-sharp` | resource | priority, roadmap, research |
| `paper-megatron-lm` | resource | priority, roadmap, research |
| `paper-zero` | resource | priority, roadmap, research |
| `paper-gpipe` | resource | priority, roadmap, research |
| `paper-ring-attention` | resource | priority, roadmap, research |
| `paper-tvm` | resource | priority, roadmap, research |
| `paper-triton-mapl` | resource | priority, roadmap, research |
| `paper-thunderkittens` | resource | priority, roadmap, research |
| `paper-flexattention` | resource | priority, roadmap, research |
| `paper-multi-query-attention` | resource | priority, roadmap, research |
| `paper-gqa` | resource | priority, roadmap, research |
| `paper-deepseek-v2-mla` | resource | priority, roadmap, research |
| `article-tri-dao-flashattention-3` | resource | priority, roadmap |
| `article-colfax-cutlass-wgmma` | resource | priority, roadmap |
| `article-pytorch-gpt-fast` | resource | priority, roadmap |
| `docs-modal-gpu-glossary` | resource | priority, roadmap |
| `article-anyscale-continuous-batching` | resource | priority, roadmap |
| `article-gordic-eli5-flashattention` | resource | priority, roadmap |
| `article-gordic-inside-vllm` | resource | priority, roadmap |
| `book-stas-bekman-ml-engineering` | resource | priority, roadmap |
| `article-nvidia-even-easier-cuda` | resource | priority, roadmap |
| `blog-lei-mao` | resource | priority, roadmap |
| `article-outperforming-cublas-h100` | resource | priority, roadmap |
| `article-siboehm-data-parallel` | resource | priority, roadmap |
| `video-gpu-mode` | resource | priority, roadmap |
| `repo-gpu-mode-resource-stream` | resource | priority, roadmap |
| `video-umar-jamil-flashattention` | resource | priority, roadmap |
| `repo-gpt-fast` | resource | priority, roadmap |
| `practice-leetgpu` | resource | priority, roadmap |
| `practice-kernelbench` | resource | priority, roadmap |
| `docs-cutlass` | resource | priority, roadmap |
| `repo-llm-c` | resource | priority, roadmap |
| `paper-bert` | resource | priority, roadmap, research |
| `paper-gpt2` | queue paper | priority, roadmap, research |
| `paper-chinchilla` | queue paper | priority, roadmap, research |
| `paper-instructgpt` | queue paper | priority, roadmap, research |
| `paper-christiano-rlhf` | resource | priority, roadmap, research |
| `paper-constitutional-ai` | resource | priority, roadmap |
| `paper-dpo` | queue paper | priority, roadmap, research |
| `paper-lora` | queue paper | priority, roadmap, research |
| `paper-qlora` | resource | priority, roadmap, research |
| `paper-chain-of-thought` | queue paper | priority, roadmap, research |
| `paper-roformer-rope` | resource | priority, roadmap, research |
| `paper-llama-1` | resource | priority, roadmap, research |
| `paper-llama-2` | resource | priority, roadmap, research |
| `paper-llama-3-herd` | resource | priority, roadmap |
| `paper-mixtral` | queue paper | priority, roadmap |
| `paper-switch-transformer` | resource | priority, roadmap, research |
| `paper-deepseek-v3` | resource | priority, roadmap |
| `paper-deepseek-r1` | resource | priority, roadmap, research |
| `paper-tulu-3` | resource | priority, roadmap, research |
| `paper-olmo` | resource | priority, roadmap, research |
| `paper-mamba` | queue paper | priority, roadmap |
| `paper-scaling-monosemanticity` | resource | priority, roadmap |
| `paper-induction-heads` | resource | priority, roadmap, research |
| `paper-gpt4-technical-report` | resource | priority, roadmap, research |
| `paper-emergent-abilities` | resource | priority, roadmap, research |
| `paper-bpe-sennrich` | resource | priority, roadmap, research |
| `blog-karpathy` | resource | priority, roadmap |
| `blog-jay-alammar` | resource | priority, roadmap |
| `blog-chip-huyen` | resource | priority, roadmap |
| `blog-transformer-circuits` | resource | priority, roadmap |
| `blog-anthropic-research` | resource | priority, roadmap |
| `blog-colah` | resource | priority, roadmap |
| `blog-eugene-yan` | resource | priority, roadmap |
| `blog-simon-willison` | resource | priority, roadmap |
| `blog-interconnects` | resource | priority, roadmap |
| `blog-huggingface` | resource | priority, roadmap |
| `blog-eleutherai` | resource | priority, roadmap |
| `article-illustrated-transformer` | resource | priority, roadmap |
| `article-illustrated-gpt2` | resource | priority, roadmap |
| `article-karpathy-recipe` | resource | priority, roadmap |
| `article-karpathy-rnn-effectiveness` | resource | priority, roadmap |
| `article-lilianweng-attention` | resource | priority, roadmap |
| `article-lilianweng-reward-hacking` | resource | priority, roadmap |
| `article-raschka-llm-architecture-comparison` | resource | priority, roadmap |
| `article-hf-rlhf-illustrated` | resource | priority, roadmap |
| `video-karpathy-lets-build-gpt` | resource | priority, roadmap |
| `paper-drepper-memory` | resource | priority, roadmap |
| `paper-goldberg-floating-point` | resource | priority |
| `paper-unix-time-sharing-system` | resource | priority |
| `paper-reflections-on-trusting-trust` | resource | priority |
| `book-xv6-riscv` | resource | priority |
| `paper-linux-scheduler-wasted-cores` | resource | priority |
| `paper-sel4-verification` | resource | priority |
| `paper-ghuloum-incremental-compiler` | resource | priority |
| `paper-llvm-lattner` | resource | priority |
| `paper-mimalloc` | resource | priority |
| `paper-jemalloc` | resource | priority, roadmap |
| `paper-meltdown` | resource | priority |
| `paper-spectre` | resource | priority |
| `paper-mckenney-memory-barriers` | resource | priority, roadmap |
| `docs-linux-kernel` | resource | priority |
| `book-linux-insides` | resource | priority |
| `docs-osdev-wiki` | resource | priority |
| `docs-agner-fog-optimization` | resource | priority |
| `docs-intel-sdm` | resource | priority |
| `docs-rust-reference` | resource | priority |
| `book-rust-performance` | resource | priority |
| `tutorial-learn-rust-dangerous-way` | resource | priority |
| `docs-cppreference` | resource | priority |
| `tutorial-crenshaw-lets-build-a-compiler` | resource | priority |
| `practice-chibicc` | resource | priority |
| `blog-lwn` | resource | priority |
| `article-gregg-linux-performance` | resource | priority |
| `blog-brendan-gregg` | resource | priority |
| `blog-julia-evans` | resource | priority |
| `article-zine-strace` | resource | priority |
| `article-zine-perf` | resource | priority |
| `blog-dan-luu` | resource | priority, roadmap |
| `blog-old-new-thing` | resource | priority |
| `blog-ryg-fgiesen` | resource | priority |
| `blog-daniel-lemire` | resource | priority |
| `practice-compiler-explorer` | resource | priority |
| `article-advent-compiler-optimisations` | resource | priority |
| `blog-without-boats` | resource | priority |
| `blog-fasterthanlime` | resource | priority |
| `blog-jon-gjengset` | resource | priority |
| `blog-ralf-jung` | resource | priority |
| `blog-computer-enhance` | resource | priority |
| `blog-eli-bendersky` | resource | priority |
| `blog-phil-eaton` | resource | priority, roadmap |
| `blog-mitchell-hashimoto` | resource | priority |
| `practice-mit-6-1810-xv6-labs` | resource | priority |
| `practice-linux-from-scratch` | resource | priority |
| `practice-pwn-college` | resource | priority |
| `paper-alexnet` | queue paper | priority, roadmap |
| `paper-resnet` | queue paper | priority, roadmap |
| `paper-layer-norm` | resource | priority, roadmap, research |
| `paper-dropout` | queue paper | priority, roadmap |
| `paper-adam` | queue paper | priority, roadmap |
| `paper-adamw` | resource | priority, roadmap, research |
| `paper-xavier-init` | resource | priority, roadmap |
| `paper-kaiming-init` | resource | priority, roadmap |
| `paper-unet` | queue paper | priority, roadmap, research |
| `paper-vit` | resource | priority, roadmap, research |
| `paper-gan` | queue paper | priority, roadmap, research |
| `paper-vae` | queue paper | priority, roadmap, research |
| `paper-word2vec` | queue paper | priority, roadmap |
| `paper-seq2seq` | resource | priority, roadmap, research |
| `paper-bahdanau-attention` | resource | priority, roadmap, research |
| `paper-dqn-atari` | resource | priority, roadmap |
| `paper-alphazero` | resource | priority, roadmap |
| `paper-trpo` | resource | priority, roadmap |
| `paper-ppo` | resource | priority, roadmap, research |
| `paper-sac` | resource | priority, roadmap |
| `paper-deep-rl-that-matters` | resource | priority, roadmap |
| `paper-lottery-ticket` | resource | priority, roadmap |
| `paper-deep-double-descent` | resource | priority, roadmap |
| `paper-grokking` | resource | priority, roadmap |
| `paper-rethinking-generalization` | resource | priority, roadmap |
| `paper-ntk` | resource | priority, roadmap |
| `book-kidger-neural-odes` | resource | priority, roadmap |
| `article-distill-feature-visualization` | resource | priority, roadmap |
| `article-distill-building-blocks` | resource | priority, roadmap |
| `article-distill-momentum` | resource | priority, roadmap |
| `article-distill-gnn-intro` | resource | priority, roadmap |
| `article-distill-augmented-rnns` | resource | priority, roadmap |
| `article-colah-understanding-lstms` | resource | priority, roadmap |
| `article-karpathy-understand-backprop` | resource | priority, roadmap |
| `article-weng-policy-gradient` | resource | priority, roadmap |
| `article-nanda-mech-interp-glossary` | resource | priority, roadmap |
| `course-3b1b-neural-networks` | resource | priority, roadmap |
| `book-murphy-pml-intro` | resource | priority, roadmap |
| `notes-stanford-cs228` | resource | priority, roadmap |
| `course-mit-underactuated-robotics` | resource | priority |
| `course-mit-robotic-manipulation` | resource | priority |
| `book-lavalle-planning-algorithms` | resource | priority |
| `course-stanford-cs223a` | resource | priority |
| `course-cmu-16745-optimal-control` | resource | priority |
| `course-stachniss-robot-mapping` | resource | priority |
| `course-hf-robotics-course` | resource | priority |
| `practice-mujoco-playground` | resource | priority |
| `practice-mujoco-menagerie` | resource | priority |
| `docs-dm-control` | resource | priority |
| `docs-gymnasium` | resource | priority |
| `docs-isaac-lab` | resource | priority |
| `practice-legged-gym` | resource | priority |
| `practice-unitree-rl-gym` | resource | priority |
| `practice-unitree-mujoco` | resource | priority |
| `docs-drake` | resource | priority |
| `docs-pinocchio` | resource | priority |
| `practice-genesis` | resource | priority |
| `practice-lerobot` | resource | priority |
| `paper-learning-to-walk-in-minutes` | resource | priority |
| `paper-hwangbo-agile-legged` | resource | priority |
| `paper-rma-rapid-motor-adaptation` | resource | priority |
| `paper-quadruped-challenging-terrain` | resource | priority |
| `paper-tobin-domain-randomization` | resource | priority |
| `paper-openai-rubiks-cube` | resource | priority |
| `paper-deepmimic` | resource | priority |
| `paper-amp-adversarial-motion-priors` | resource | priority |
| `paper-humanoid-gym` | resource | priority |
| `paper-real-world-humanoid-locomotion` | resource | priority |
| `paper-humanplus` | resource | priority |
| `paper-omnih2o` | resource | priority |
| `paper-asap-humanoid` | resource | priority |
| `paper-diffusion-policy` | resource | priority, research |
| `paper-act-aloha` | resource | priority |
| `paper-mobile-aloha` | resource | priority |
| `paper-rt-1` | resource | priority |
| `paper-rt-2` | resource | priority |
| `paper-open-x-embodiment` | resource | priority |
| `paper-openvla` | resource | priority |
| `paper-pi0` | resource | priority |
| `paper-gr00t-n1` | resource | priority |
| `paper-cheetah3-convex-mpc` | resource | priority |
| `blog-eric-jang` | resource | priority |
| `blog-it-can-think` | resource | priority |
| `blog-physical-intelligence` | resource | priority |
| `roadmap-inference-engineering` | resource | short, fromYear, tags, priority, roadmap |
| `roadmap-ai-agents` | resource | priority, roadmap |
| `roadmap-ai-engineer` | resource | priority, roadmap |
| `roadmap-software-architect` | resource | priority, roadmap |
| `roadmap-game-developer` | resource | short, fromYear, priority, roadmap |
| `ossu-computer-science` | resource | short, fromYear, priority |
| `ml-zoomcamp` | resource | after, priority, roadmap |
| `30-days-of-python` | resource | priority |
| `paper-xpbd` | queue paper | short, summary, level, fromYear, priority, roadmap |
| `paper-stable-fluids` | queue paper | short, summary, level, fromYear, priority, roadmap |
