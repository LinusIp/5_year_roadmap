# Getting into NVIDIA: the 2027 intern roadmap

The goal is an NVIDIA internship in 2027. Three Shanghai postings are in view (each also lists one other location):

| Requisition | Role | Fit |
|---|---|---|
| **JR2026173** | AI Computing Software Development Intern, **LLM Inference** - 2027 (TensorRT LLM and TensorRT Edge LLM) | **Best fit. Apply.** |
| **JR2026164** | AI Computing Software Development Intern - 2027 (three tracks: TensorRT LLM, TensorRT Compiler, CuTe DSL and CUDA kernels) | **Apply.** Use the same preparation. |
| JR2026758 | Robotics Software Engineering Intern, Isaac Applications | Long shot for 2027. See §0.5. |

Written on 2026-10-22, about a month into the five-year plan (phase `y1-p0`).

This roadmap is a sprint that runs alongside the five-year plan. It moves the GPU and inference slice of year 2
(`y2`: CUDA, Triton, CS336, the inference work) to **November 2026 to March 2027**, so that you are ready to
interview in spring 2027. Everything it adds is already in the Atlas library. The ids in `code` below are Atlas
resource and paper ids.

---

## 0. Read this first: four facts that decide everything

### 0.1 The degree requirement is a hard filter

**All three postings** require a master's or Ph.D. in progress (*"Pursuing an M.S. or Ph.D."*, *"Pursuing Masters
or higher degree"*). Recruiters screen on it before anyone reads your projects. For NVIDIA internships, this
matters more than any other line on this page.

| Your situation on the start date | What to do |
|---|---|
| Enrolled in an M.S. or Ph.D. | Apply. Follow this roadmap. |
| Final-year undergraduate with an admitted M.S. place (for example 保研, or an offer letter) | Apply, and put the admitted programme and its start date on line 1 of the resume. |
| Undergraduate with no master's planned yet | These postings will probably screen you out. Your first step towards NVIDIA is getting into a master's programme. Its application deadlines (or China's postgraduate exam, 考研) come before most of this roadmap, so check them this week. Follow the roadmap anyway: the projects also make a strong graduate application. Apply to any NVIDIA intern postings that accept bachelor's students, and target the 2028 postings once you are enrolled. |
| Not a student | Interns must be students. You have two routes: a master's, then an internship, or new-graduate and experienced roles later. Either way, the projects in this roadmap are what get you hired. |

Also check two things with the recruiter or the posting before spending months on it: whether you are allowed
to work in China, and how long the internship lasts. NVIDIA China intern postings often ask for at least 6 months
at 4 or more days a week. Ask; don't assume.

### 0.2 Timing

- The postings are open now (October 2026). Postings like these are filled on a rolling basis and can close
  without warning.
- Chinese companies hire most interns in autumn (秋招, now) and spring (春招, March to May). This roadmap aims at
  the spring wave: **ready to interview by early March 2027.**
- Don't wait for March to apply. Turn on a job alert for "intern 2027" at NVIDIA China. Apply to JR2026173 and
  JR2026164 at **Gate 2 (end of January)**, or sooner if one looks like it is about to close. A referral from an NVIDIA
  engineer gets your resume read faster (see §6).

### 0.3 Honest gap analysis

| Skill the posting asks for | Where you are (Oct 2026) | Where you need to be (Mar 2027) |
|---|---|---|
| Python | 30 Days of Python, in progress | Fluent: classes, generators, typing, profiling, packaging |
| PyTorch | ML Zoomcamp level | Write a GPT from scratch, explain autograd, and profile it |
| LLM inference | HF LLM Course level | KV cache, prefill/decode, batching, quantisation, FlashAttention, PagedAttention, parallelism: explain them and measure them |
| C / C++ | None yet | Pointers, memory, RAII, move semantics, templates, STL; CMake, GoogleTest, gdb and sanitizers; read C++ in a real codebase. JR2026173 says "excellent C/C++", so this is the biggest gap. |
| CUDA | None yet | Write, profile and optimise kernels: tiling, coalescing, shared memory, occupancy, reductions, GEMM |
| Computer architecture | None yet | Caches, the memory hierarchy, SIMT, the roofline model |
| DSA | Starting | About 150 LeetCode problems (mostly medium), solved within 30 minutes and explained aloud |

Getting from the left column to the right in about 20 weeks is **aggressive**. Your 10-hour day is what makes it
possible. If university cuts that to about 4 hours a day, keep the same order and stretch every phase by about
2.5 times, which puts you on the 2028 cycle (§8).

### 0.4 One target: LLM inference with TensorRT LLM, in C++ and Python

JR2026173 and the TensorRT LLM track of JR2026164 are the same kind of work, on the same software, in the same
city. **One preparation covers both postings.** The difference is the language each one stresses:

| | JR2026164, TensorRT LLM track | JR2026173, LLM Inference |
|---|---|---|
| Main language | Python and PyTorch | **"Excellent C/C++"**, with debugging, performance analysis and test design |
| Also asks for | Inference and GPU acceleration | PyTorch, keeping up with LLM research, written and spoken English |
| Scope | Multi-GPU serving | TensorRT LLM and **TensorRT Edge LLM** (on-device inference, such as Jetson and DRIVE) |

So this roadmap trains **both languages**. Python and PyTorch are for the model side. C++ and CUDA are for the
engine side, and C++ runs through every phase (§3) rather than being a two-week detour.

The other tracks of JR2026164:

| Track | Fit for you | Verdict |
|---|---|---|
| **CuTe DSL and CUDA kernels** (CUDA C++, Python DSL) | CuTe DSL is the Python front end of CUTLASS 4, so you don't need to master CUTLASS's C++ templates first. It needs real CUDA performance knowledge, which this roadmap builds anyway. | **Your edge.** The kernel projects make you stand out for inference roles, and let you name this track as your second choice. |
| **TensorRT Compiler** (C++) | Needs strong C++ plus compiler experience (LLVM, MLIR, passes). You have neither yet, and both take years. | **Skip for 2027.** It fits year 2 or 3 of the plan. |

On both applications, say plainly that you want LLM inference, and back it with evidence (§5). Interviewers rate a
candidate who is sharp on one area above one who is vague on three.

### 0.5 JR2026758, Isaac robotics: not this cycle, unless you can get a robot

What blocks it is a hard requirement: *"practical experience in developing, deploying, or testing software on
physical robots."* Robotics comes in years 3 to 5 of your plan (`isaac-sim`, `mujoco-docs`, `ros2-tutorials`,
`modern-robotics`), and this sprint already fills your 10 hours a day. Apply to it only if one of these is true:

- You join a university robotics lab, or already have access to a real robot there.
- After Gate 3 (§3) you still have time and a small budget. In that case, build one project on a low-cost
  open-source arm (for example a LeRobot SO-101 kit): train a policy in simulation (Isaac Lab or MuJoCo), deploy
  it to the real arm, and write an agent that automates the steps from simulation to the real robot. That one
  project meets every line of the posting.

Otherwise, the robotics posting for 2028 or 2029 fits your plan far better. Apply then.

### 0.6 "I just want to get into NVIDIA"

Then optimise for **what every NVIDIA engineering posting checks**, not for one requisition:

1. **The right status:** a master's or Ph.D. in progress for an internship (§0.1), or a degree for new-graduate roles.
2. **C++ and Python at a professional level**, with tests, a debugger and a profiler.
3. **Measured GPU work:** kernels and inference benchmarks with numbers you can defend.
4. **Visible work in NVIDIA's own repositories:** pull requests to TensorRT-LLM or CUTLASS (§3, phase 3).
5. **Apply widely:** every 2027 NVIDIA China intern posting your work matches, with referrals (§6).

This roadmap delivers points 2 to 5. Only you can deliver point 1.

---

## 1. What the interviews test

NVIDIA China intern loops usually mean a resume screen, then 2 to 3 technical rounds (sometimes an online coding
test first), then a manager or HR round. Expect them to be in Chinese or English; ask the recruiter which. Each
technical round mixes the four parts below.

1. **Coding (30 to 40 percent).** LeetCode easy to medium, in Python or C++. Arrays, hashing, two pointers,
   binary search, linked lists, trees, heaps, BFS/DFS, simple DP. Sometimes a systems twist: write a CUDA
   reduction, a matrix transpose, or an LRU cache.
2. **Resume deep-dive (30 percent).** They pick one project and keep asking "why" until you hit the edge of what
   you know. *This is where interns win or lose.* Every number on your resume needs a "how did you measure that?"
   answer.
3. **Fundamentals (30 percent).** C++, CUDA and GPU architecture, LLM inference, and the basics of operating
   systems and architecture. The question bank is in §7.
4. **Motivation.** Why NVIDIA, why this track, and something you read recently (a FlashAttention version, a
   TensorRT-LLM release note, a GPU MODE lecture).

---

## 2. The sprint schedule: your five blocks, remapped

Your day keeps the same times and the same 10 hours. During the sprint, what each block works on changes:

| Time | Block | Works on during the sprint (Nov 2026 to Mar 2027) | Instead of |
|---|---|---|---|
| 06:00 to 08:00 | C | **PyTorch and LLM internals**: Karpathy, then nanoGPT, then CS336 assignment 1, then inference engines | ML Zoomcamp (finish it, or pause it after the midterm project) |
| 08:00 to 10:00 | A | **C, then C++, then CUDA** | GameDevHQ (paused; it resumes after the sprint) |
| 10:00 to 12:00 | H | **Inference engineering**: HF LLM Course (keep), then papers, then TensorRT-LLM and vLLM | Agents course (later) |
| 18:00 to 20:00 | B | **DSA**: 2 to 3 LeetCode problems a day in Python, switching to C++ from January | 30 Days of Python (finish it first, in 2 weeks) |
| 20:00 to 22:00 | E | **MIT 18.06 (keep), plus computer architecture** (CS:APP chapters 1, 2, 3, 5, 6) | Nothing dropped |

In Atlas: Settings › Schedule, or Calendar › a block › Apply to every day from 2026-10-26. Keep the Sunday
review and use it to check the gates below.

**Hardware.** You need an NVIDIA GPU you can profile on. Use one of these:

- A local RTX 30, 40 or 50 series card (Ampere or newer). This is the best option, because Nsight Compute needs
  full access to the hardware counters.
- Cloud by the hour: an L4 or A10 for everyday work, and a few hours on an H100 for Hopper features (TMA, wgmma,
  FP8) once you reach the CuTe DSL work. Budget roughly a few tens of US dollars over the sprint if you are
  careful to stop instances.
- Colab's free T4 is enough for phase 1 CUDA exercises only. It is Turing (sm_75), so current TensorRT-LLM and
  CuTe DSL won't run on it.

---

## 3. Phases, week by week

### Phase 0. Set-up and the fast Python finish (26 Oct to 8 Nov 2026, 2 weeks)

- [ ] Finish **30 Days of Python** in these two weeks: two days of the course per day, and skip the web-scraping
      and pandas-heavy days if you are short on time.
- [ ] Use Linux every day, as WSL2 or native. Learn the shell, `git`, `tmux` and `ssh`. Go through `missing-semester`
      lectures 1 to 6.
- [ ] Get access to a GPU (§2). Run `nvidia-smi`, install the CUDA toolkit, and compile and run one CUDA sample.
- [ ] Create a GitHub profile README and a repository called `gpu-journey` (a public learning log). Also start the
      resume in this layout, which you will fill in as you go: Education, Projects (2 flagship + 2 small), Skills,
      Open source.
- [ ] Start DSA: the arrays and hashing section of `neetcode-roadmap`.

**Done when:** 30 Days of Python is finished, a "hello world" CUDA kernel runs on your GPU, and 15 LeetCode
problems are solved.

### Phase 1. Foundations (9 Nov to 20 Dec 2026, 6 weeks)

**C (PyTorch and LLMs).** `karpathy-zero-to-hero` in order: micrograd, makemore 1 to 5, "Let's build GPT", "Let's
build the GPT tokenizer". Retype everything yourself; never copy and paste.

**A (C, C++ and CUDA).**
- Weeks 1 and 2: C with `beej-c` (or `kr-c` chapters 1 to 6): pointers, arrays, `malloc`, structs. Write a
  dynamic array and a hash map in C.
- Weeks 3 to 5: C++ with `learncpp`, the chapters on classes, references, RAII, `unique_ptr`/`shared_ptr`, move
  semantics, templates, `std::vector` and `std::unordered_map`. Port the hash map to C++ **with tests in
  GoogleTest, a CMake build, and a clean run under AddressSanitizer**. Step through one bug in `gdb`. JR2026173
  asks for exactly these skills: debugging and test design.
- Week 6: CUDA with `pmpp-book` chapters 1 to 5 (the programming model, threads and blocks, the memory hierarchy,
  a first look at performance). Write vector add, a naive matmul, and a matmul tiled in shared memory. Check each
  with `compute-sanitizer`. Finish this CUDA work in the first week of phase 2 if it runs over.

**H (inference engineering).** Finish the HF LLM Course. Read `transformer-math-101`. Read the papers
`flashattention` and `pagedattention`, writing a one-page summary of each in `gpu-journey`.

**B (DSA).** Arrays, hashing, two pointers, sliding window, stack, binary search. About 2 problems a day.

**E (math and architecture).** 18.06 as planned. Then `cmu-15-213` / CS:APP chapters 1 and 2 (data
representation), and chapter 6 (the memory hierarchy, which is the most important chapter for GPU work).

**Gate 1, 20 Dec 2026:**
- [ ] Your own nanoGPT trains on Tiny Shakespeare and produces samples, and you can explain every line.
- [ ] You can explain backprop through a matmul and softmax on a whiteboard.
- [ ] A tiled CUDA matmul is correct and faster than the naive one, and you can say why.
- [ ] 60 LeetCode problems solved.
- [ ] One-page summaries of FlashAttention and PagedAttention are written.

### Phase 2. GPU performance and how inference works (21 Dec 2026 to 31 Jan 2027, 6 weeks)

This is the core of the roadmap. Its two outputs become your first flagship project and your first interview
answers.

**A (CUDA performance).**
- `pmpp-book` chapters 6 (performance), 10 (reduction), 11 (scan) and the convolution chapter. Write a reduction
  kernel in 4 versions: naive, then shared memory, then warp shuffle, then multiple elements per thread.
- `siboehm-cuda-matmul`: reproduce the SGEMM worklog yourself, from the naive kernel through coalescing, shared
  memory tiling, 1D and 2D blocktiling, vectorised loads and warptiling. Plot GFLOP/s against cuBLAS at each step.
- `nsight-compute-docs`: profile every version. Learn to read memory throughput, achieved occupancy, warp stall
  reasons and bank conflicts, and place each kernel on a roofline.
- `gpu-mode-lectures`: lectures 1 to 8, alongside the above.
- `horace-he-brrr` ("Making Deep Learning Go Brrrr"): compute-bound, memory-bound and overhead-bound.

**C (PyTorch to inference).** Write a minimal GPT-2 inference engine in PyTorch: load the HF weights, then add a
KV cache, greedy and top-p sampling, and batched generation with padding. Measure TTFT, tokens per second and
memory with and without the KV cache. Then work through `stanford-cs336` assignment 1 (BPE tokenizer, transformer
LM, training loop).

**H (inference papers).** `flashattention-2`, `gptq`, `awq`, `smoothquant`, `speculative-decoding-leviathan`, and
the Megatron-LM paper on tensor parallelism. Write one page each.

**B (DSA).** Linked lists, trees, tries, heaps. Switch to C++ for half the problems.

**E.** CS:APP chapters 3 (machine code, read as needed) and 5 (optimising program performance).

**C++ thread (for JR2026173).** Start the C++ inference engine, which becomes flagship project 3 in phase 3: a GPT-2
forward pass in C++17 and CUDA that loads the same weights as your PyTorch version. Karpathy's `llm.c` on GitHub
shows that this is doable. Use your own SGEMM and a softmax kernel, add GoogleTest tests that compare every
layer's output with PyTorch within a tolerance, and use CMake for the build.

**Flagship project 1, the "SGEMM worklog".** A public repository with a CUDA SGEMM in 6 or more versions, each
with its Nsight Compute numbers, a roofline plot and a short explanation of what changed and why it helped. The
goal is **at least 60 percent of cuBLAS at 4096×4096 on your GPU**, and an honest account of where the rest goes.

**Gate 2, 31 Jan 2027: apply now.**
- [ ] Flagship 1 is public, with a README containing plots.
- [ ] GPT-2 with a KV cache runs, and you have measured the speed-up.
- [ ] You can answer every question in §7.2 and §7.3 out loud without notes.
- [ ] 110 LeetCode problems solved.
- [ ] The C++ GPT-2 forward pass runs and matches PyTorch on the first layers.
- [ ] The resume is final and someone has reviewed it. **Apply to JR2026173 and JR2026164**, and to any other
      2027 NVIDIA China intern posting that matches. Ask for referrals (§6).

### Phase 3. Specialise and contribute (1 Feb to 7 Mar 2027, 5 weeks)

**C and H (TensorRT-LLM, the main track).**
- Run TensorRT-LLM from NVIDIA's NGC container on an L4, A10 or bigger GPU. Serve a small model (about 0.5B to 3B
  parameters, for example a Qwen or Llama 3.2 variant) through the `LLM` API and through `trtllm-serve`.
- Read `tensorrt-llm-docs` end to end: the architecture overview, the PyTorch backend, in-flight batching, the
  paged KV cache, quantisation (FP8, INT4 AWQ) and speculative decoding.
- Read the code. Trace one request through the PyTorch backend: the scheduler, the KV cache manager, the model
  forward pass and sampling. Draw it as a diagram for your notes; interviewers love this.
- **Flagship project 2, the "three-engine benchmark".** Benchmark Hugging Face `generate`, `vllm-docs` (vLLM) and
  TensorRT-LLM on the same model and GPU. Measure TTFT, inter-token latency (p50 and p99), throughput against
  concurrency, and memory, for FP16, FP8 (if your GPU has it) and INT4 AWQ. Explain every gap with what you know
  about the engines. This is already planned as a year-2 project in Atlas; this roadmap moves it forward.

**A (CuTe DSL, the second track).**
- Install CUTLASS 4's Python DSL and work through its CuTe DSL examples and notebooks: layouts, tensors, tiled
  copies and MMA atoms.
- Rewrite your phase 2 GEMM in CuTe DSL and compare it with your hand-written CUDA version and with cuBLAS.
- If you have Hopper time, run one of the official Hopper or Blackwell GEMM examples, and profile it next to yours.
- Optional: `triton-tutorials` 01 to 06 (vector add, fused softmax, matmul, dropout, layer norm, fused attention),
  as a comparison point.

**Flagship project 3, the C++ GPT-2 engine (for JR2026173).** Finish the engine you started in phase 2:
greedy generation with a KV cache, all layer tests green, and its tokens per second compared with your PyTorch
version and llama.cpp. Add a short "Edge" section: run it, or llama.cpp, on the smallest NVIDIA device you can
reach (a Jetson if a lab has one, or else a small laptop GPU), and explain what the memory limit forces you to give
up. That shows the posting's interest in TensorRT Edge LLM.

**Open source (the strongest signal you can send).** Open at least **1 pull request** to `NVIDIA/TensorRT-LLM` or
`NVIDIA/cutlass`. Look for issues labelled "good first issue", a broken doc example, a missing test, or a bug you
hit during the benchmark. Even a merged documentation fix shows you can work in their codebase and through their
review process.

**B (DSA).** Graphs (BFS, DFS, topological sort), 1D and 2D DP, intervals. Do 2 timed mock interviews a week:
30 minutes, talking aloud the whole time (use Pramp, a friend, or record yourself).

**E.** Keep 18.06 going. `cmu-15-418` lectures on GPU architecture and parallel programming, as many as fit.

**Gate 3, 7 Mar 2027: ready to interview.**
- [ ] Flagship 2 is public, with tables, plots and an explanation of the results.
- [ ] Flagship 3 (the C++ engine) generates text, its tests pass in CI, and its README has the numbers.
- [ ] The CuTe DSL GEMM runs, with a comparison note. If the C++ engine ran late, this is the item to cut.
- [ ] At least 1 pull request is opened to an NVIDIA repository.
- [ ] 150 LeetCode problems solved, and you pass medium problems in 30 minutes in timed mocks.
- [ ] You can answer every question in §7 out loud. You have rehearsed a 2-minute pitch of each flagship project
      and 10 "why" follow-ups on each.

### Phase 4. Interview loop (8 Mar to the end of April 2027)

- Each day: 1 to 2 hours of DSA (review the problems you got wrong and redo them), 1 hour of §7 flashcards, 1 hour
  of project deep-dive rehearsal. Spend the rest on the 5-year plan, which resumes in full.
- After each interview, write down every question within an hour and add the ones you missed to §7.
- Apply to every relevant 2027 NVIDIA intern requisition in China, not just the two above.

---

## 4. The resources, one place (all already in Atlas)

| Area | Main | Supporting |
|---|---|---|
| PyTorch and LLMs | `karpathy-zero-to-hero` | `stanford-cs336`, `d2l` (selected chapters) |
| C and C++ | `beej-c`, `learncpp` | `kr-c`, `tour-of-cpp`, `effective-modern-cpp` (items 1 to 30), `cppcon-back-to-basics` |
| CUDA | `pmpp-book` | `cuda-guide`, `siboehm-cuda-matmul`, `gpu-mode-lectures`, `nsight-compute-docs`, `hazy-gpus-go-brrr` |
| Performance thinking | `horace-he-brrr` | `transformer-math-101`, `cmu-15-418` |
| Inference engines | `tensorrt-llm-docs` | `vllm-docs`, `sglang-docs`, `llama-cpp` |
| Kernel DSLs | CUTLASS 4 CuTe DSL examples (not in Atlas yet) | `triton-tutorials` |
| Papers | `flashattention`, `flashattention-2`, `pagedattention` | `flashattention-3`, `gptq`, `awq`, `smoothquant`, `speculative-decoding-leviathan`, `speculative-sampling-chen` |
| Architecture | `cmu-15-213` (CS:APP) | `csapp-labs` (the cache lab, if you have time) |
| DSA | `neetcode-roadmap` | the Daily and Weekly challenges in Atlas |
| Credential (optional) | `nvidia-dli-cuda` | Only if it is cheap or free for you. A strong repository counts for far more. |

---

## 5. The resume (one page, in English)

```
NAME · email · github.com/you · Shanghai (or "willing to relocate") · available <start>–<end>, 5 days/week

EDUCATION
M.S. <Programme>, <University>, <dates>        (or: admitted, starting <date>)
B.S. ...

PROJECTS
SGEMM from scratch in CUDA                                      github.com/you/sgemm
· 7 kernel versions from naive to warptiled; 68% of cuBLAS at 4096² on RTX 4070
· Profiled each with Nsight Compute; fixed uncoalesced loads and shared-memory bank conflicts
· Roofline analysis: moved from memory-bound (12% peak BW) to compute-bound

LLM inference benchmark: HF vs vLLM vs TensorRT-LLM            github.com/you/llm-bench
· TTFT, p50/p99 ITL and throughput vs concurrency for Qwen-1.5B at FP16 / FP8 / INT4-AWQ
· TensorRT-LLM FP8: 2.1× throughput over HF at 32 concurrent requests; explained via
  in-flight batching and paged KV cache
· GEMM rewritten in CuTe DSL: <x>% of cuBLAS

GPT-2 inference engine in C++17/CUDA                          github.com/you/gpt2-cpp
· Forward pass + KV cache from scratch, own GEMM/softmax kernels; 40 GoogleTest cases vs PyTorch
· Found and fixed an out-of-bounds write with compute-sanitizer; <n> tok/s vs llama.cpp <m> tok/s

GPT-2 inference in PyTorch (KV cache, batching, sampling)  · nanoGPT from scratch

OPEN SOURCE
NVIDIA/TensorRT-LLM: PR #____ "<title>" (merged / under review)

SKILLS
Python, PyTorch · C++17, CUDA, CuTe DSL, Triton · Nsight Compute/Systems · Linux, Git, Docker
```

The numbers above are examples of the form. Use your own measured numbers only. Each one will be questioned.

Rules: every project line starts with a verb and ends with a number or a concrete artifact. No course lists.
Don't claim skill percentages. Every link must work and lead to a README with plots.

---

## 6. Getting your resume read

- **Referrals.** Look at the contributors to `NVIDIA/TensorRT-LLM` and `NVIDIA/cutlass` (many of them work in
  Shanghai and Beijing), the speakers at NVIDIA GTC China talks, and people with "NVIDIA Shanghai" on LinkedIn or
  Maimai (脉脉). Send a short message with one link: "I built X, measured Y, and opened PR Z on your repository. I'm
  applying for JR2026173 (LLM Inference). Would you consider referring me?" Do this after Gate 2, once you
  have something to show.
- **Be visible.** Post each flagship project's write-up once on Zhihu (知乎) or a blog, and on X or LinkedIn. Join
  the GPU MODE Discord and ask good questions there.
- **Apply to more than one requisition.** Apply to every 2027 NVIDIA China intern opening whose track matches.

---

## 7. The question bank

Say each answer aloud in under 2 minutes. Write the ones you can't answer into the Atlas daily log as "Stuck on".

### 7.1 C++

1. What is the difference between a pointer and a reference? When can a reference dangle?
2. How do virtual functions work (vtable, vptr)? What does a virtual destructor fix?
3. Compare `unique_ptr`, `shared_ptr` and `weak_ptr`. What does `shared_ptr` cost?
4. What do move semantics do? What is the difference between `std::move` and `std::forward`? What are the rule of
   zero, three and five?
5. Explain RAII. How would you implement a scoped CUDA-stream or cudaMalloc wrapper?
6. Compare stack and heap allocation. When does `std::vector` reallocate, and what happens to its iterators?
7. Templates: what are function templates and class templates, and what does "instantiated at compile time" mean?
8. What does `const` mean in each position? What do `constexpr` and `inline` mean?
9. What is undefined behaviour? Give three examples.
10. What is a data race? Explain `std::mutex` and `std::atomic`, and what memory ordering means in one sentence.
11. How do you debug a segfault? Walk through `gdb`, a core dump, AddressSanitizer, and `compute-sanitizer` for
    CUDA code.
12. How would you test a CUDA kernel (reference implementation, tolerances, edge sizes, randomised inputs)? And a
    whole inference engine (golden outputs, a layer-by-layer comparison)?

### 7.2 GPU architecture and CUDA

1. How do grids, blocks, warps and threads map onto SMs?
2. What is a warp? What is warp divergence, and how do you avoid it?
3. Describe the memory hierarchy (registers, shared memory and L1, L2, global memory). Give latencies and
   bandwidths to the nearest order of magnitude.
4. What is memory coalescing? Show an access pattern that breaks it, and fix it.
5. What are shared memory bank conflicts? Why does padding a tile by +1 fix the matrix transpose?
6. What is occupancy? Which three resources limit it? Is higher occupancy always faster?
7. Walk through the optimisation of a parallel reduction, step by step.
8. Walk through tiled GEMM. How do you calculate its arithmetic intensity, and how does tiling raise it?
9. Explain the roofline model. Is a given kernel memory-bound or compute-bound? How do you tell in Nsight Compute?
10. What do `__syncthreads()`, warp shuffles and cooperative groups do?
11. What are streams, events and overlapping copies with compute? What is pinned memory?
12. What are tensor cores? What MMA shapes do they use, which data types (FP16, BF16, FP8, INT8), and what do
    Hopper's TMA and wgmma add, in one sentence each?
13. In CuTe, what is a layout (shape and stride)? Why does composing layouts make tiling easier to express?

### 7.3 LLM inference (the TensorRT-LLM track)

1. Walk through the prefill and decode phases. Which one is compute-bound, which is memory-bound, and why?
2. Calculate the KV cache size: `2 × layers × kv_heads × head_dim × bytes_per_value × tokens`. For example, a
   Llama-2-7B-like model (32 layers, 32 KV heads, head dim 128, FP16) needs 0.5 MB per token, so 4,096 tokens
   take 2 GB per sequence. How does GQA change this?
3. Compare MHA, MQA, GQA and MLA, and what each trade-off costs.
4. Why is FlashAttention faster even though it does the same number of FLOPs? (Tiling, online softmax, and no
   materialised N×N matrix in HBM.)
5. What problem does PagedAttention solve? How do block tables work?
6. Compare static batching, dynamic batching and continuous (in-flight) batching.
7. Quantisation: compare weight-only (GPTQ, AWQ) with weight-and-activation (SmoothQuant, FP8). Why are
   activation outliers hard? What do per-channel and per-group scales do?
8. How does speculative decoding work? Why is its output distribution exact? When does it help?
9. Compare tensor, pipeline and expert parallelism. Where do the all-reduces happen in a tensor-parallel MLP?
10. MoE: what are routing, load balancing and the expert-parallel all-to-all? Why is MoE decode memory-bound?
11. Define TTFT, ITL, TPS and goodput. Why report p99 and not just the mean?
12. What does TensorRT-LLM do that HF `generate` doesn't? (Fused kernels, in-flight batching, the paged KV cache,
    quantised kernels, CUDA graphs, speculative decoding.)
13. What is a CUDA graph, and why does it help decode?
14. What is kernel fusion? Give an example from a transformer block, and say why it saves memory bandwidth.

### 7.4 Operating systems and architecture (quick-fire)

1. What do virtual memory, page tables and the TLB do?
2. Explain cache lines, spatial and temporal locality, and false sharing.
3. What is the difference between a process and a thread? What does a context switch cost?
4. What is Amdahl's law? Apply it to a model where 10 percent of the time is not on the GPU.

---

## 8. If the timeline slips

| Situation | What changes |
|---|---|
| Gate 1 missed by 2 or more weeks | Drop phase 3's CuTe DSL work and keep the TensorRT-LLM track. Still apply at the end of February. |
| Gate 2 missed | Apply anyway with flagship 1 alone, as long as it is good. Every later gate moves back by one month. |
| University days (about 4 hours a day) | Keep the same order and stretch every phase by about 2.5 times. Gate 3 lands around September 2027, which matches year 2 of the five-year plan. Target the 2028 intern posting (expected around autumn 2027) and the 2027 autumn wave. |
| No offer in spring 2027 | Nothing is wasted: this is year 2's CUDA and inference lane, done early. Keep shipping (the Triton attention kernel, the inference server from scratch, more NVIDIA pull requests) and reapply in the next cycle with a much stronger profile. |
| Offer | Before the start date: do CS336 assignment 2, and read the TensorRT-LLM or CUTLASS code paths your team owns. |

---

## 9. How this fits the five-year plan

- **Paused for the sprint:** block A's GameDevHQ and the small game, block C's ML Zoomcamp after the midterm,
  LearnOpenGL. They resume in April 2027, about four months behind. Atlas's re-plan (push overflow into later
  phases) can move them.
- **Pulled forward from `y1-p1` and `y2`:** Karpathy Zero to Hero, C and C++, `pmpp-book`, `siboehm-cuda-matmul`,
  `gpu-mode-lectures`, `triton-tutorials`, `stanford-cs336` assignment 1, `tensorrt-llm-docs`, and the
  three-engine benchmark project.
- **Unchanged:** MIT 18.06 in block E, the daily blog, and the Sunday review.

Each Sunday, put the gate checklist from §3 next to the review. If two Sundays in a row show no progress on a
gate, use §8.
