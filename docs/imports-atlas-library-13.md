# The Atlas Library import, thirteenth file (pull request #48)

`scratch/import-atlas.ts` upserted the 17,283-row `atlas-resources.jsonl` into `data/`. 16,083 of its rows found their
entry again (15,819 by id, 212 by URL, 48 by title on the same shelf, 4 by a checked pair), 3 were left out as before
(their ids are certifications the plan already tracks in `data/certs.yaml`), and 1,197 are new
(`data/resources/library-atlas-13.yaml`), two rounds in one file. The **cracked dev and world-class researcher**
round (800 rows): competitive programming and algorithms (cp-algorithms, the USACO Guide, AtCoder's library and
contests, Codeforces, ICPC, Library Checker, CP4, TAOCP, randomized algorithms, data-stream algorithms, computational
geometry), build-it-yourself (interpreters and compilers, 9cc, chibicc, an OS in Rust, xv6, Pintos, NandGame,
emulators, DNS and TCP in a weekend, text editors, allocators, databases, Git, Bitcoin, ray tracers and rasterizers,
autograd and JAX from scratch), low-level and performance (x86 and ARM assembly, the ABI and linkers, ELF,
microarchitecture, SIMD, perf, gdb, lldb, rr, the Linux kernel's own documentation and LWN, syscalls, RCU, locking,
the networking RFCs, TCP, QUIC, BGP, DNS), compilers and languages (CPython's internals, V8, Go's SSA backend, LLVM,
Cranelift, WebAssembly, Zig, Odin, OCaml, Haskell, ML, TAPL, register allocation, superoptimization, garbage
collection), rigorous mathematics (measure theory, probability, high-dimensional statistics, random matrices,
stochastic calculus, convex optimization, numerical linear algebra, functional analysis, topology, Lean), learning
theory (PAC, Rademacher, bandits, RL theory, kernel methods, saddle points, the information bottleneck, natural
gradient, diffusion theory, causality), physics (MIT 8.0xx to 8.8xx, Feynman, Dyson, Taylor and Wheeler, Crowell,
Kardar, Sethna, Georgi, Witten), how science works (the Stanford Encyclopedia of Philosophy, Popper, Kuhn, Feynman's
Cargo Cult Science, Platt, Chamberlin, Ioannidis, Gelman, p-values, preregistration, design of experiments, Pólya,
Medawar, Cajal, Hamming), the Nobel and Turing lectures, summer research programmes, and the craft essays (Dan Luu,
antirez, Carmack, Pike, Hickey, Bret Victor, testing and mutation testing). The **frontier engineer and scientist**
round (400 rows, 397 new): CUDA depth (the Programming Guide section by section, the runtime, driver and math APIs,
cuFFT, cuSPARSE, cuRAND, cuSOLVER, NVRTC, nvcc, CUDA-GDB, CUPTI, CCCL, MIG, GPUDirect, Nsight Compute, Colfax's
CUTLASS and CuTe tutorials, Lei Mao, HIP and ROCm, OpenCL), SDK and API design (the Azure SDK guidelines, Google's
AIPs, Go, Python, NumPy, Kubernetes and Rust compatibility and deprecation policies, Smithy, TypeSpec, protobuf,
JSON Schema, the Sunset and Deprecation headers, Stainless, the Anthropic and OpenAI SDKs, .NET, Swift, Kotlin and Qt
guidelines, the Itanium C++ ABI, libabigail, pybind11, nanobind, PyO3, cbindgen, the stable ABI, manylinux, the array
API and DLPack), frontier AI 2025 to 2026 (pretraining science, RL for reasoning, discrete diffusion, flow maps and
consistency, video diffusion, world models, evaluation), fusion energy conversion (direct energy conversion, breeding
blankets and tritium, DEMO's balance of plant, sCO2 cycles, HTS magnets, ITER, SPARC, plant costing), particle
accelerators (Wiedemann, S.Y. Lee, Wangler, Padamsee, JUAS and CAS chapters, FELs, SRF, colliders, ML for
accelerators, MAD-X, Xsuite, BDSIM) and aerospace (MIT 16.xx, NASA SP and NACA classics, turbopumps, astrodynamics,
convex guidance, DESCANSO, SPICE, JSBSim, OpenVSP, the Ariane 501 and Mars Climate Orbiter reports, Apollo's guidance
source). 78 of the new rows are paid books (a **Paid** badge, out of Up next until owned); the rest are free. No URL
was changed by hand; the file's URLs were copied exactly. The file corrected none of the Library's own rows.

| Shelf | Added | Before | After |
|---|---|---|---|
| Courses | 77 | 1,176 | 1,253 |
| Books | 178 | 844 | 1,022 |
| Papers | 226 | 4,925 | 5,151 |
| Articles (with docs and tutorials) | 622 | 5,380 | 6,002 |
| Blogs | 20 | 399 | 419 |
| Practice | 74 | 3,387 | 3,461 |

Resources: 16,060 to 17,257. By track: systems 1,968 to 2,286, AI 6,518 to 6,756, engineering 1,866 to 2,030, math
512 to 665, languages 672 to 822, architecture 1,278 to 1,384, DevOps 682 to 696, hardware 410 to 425, graphics 531
to 544, simulation 530 to 547, robotics 531 to 539, game dev 234 to 235; the other tracks are unchanged (the import's
own count by first track: systems 318, engineering 164, math 153, languages 150, AI 143, architecture 106, inference
95, simulation 17, hardware 15, DevOps 14, graphics 13, robotics 8, game dev 1). By type of the new rows: 311
articles, 245 docs, 226 papers, 178 books, 74 practice, 66 tutorials, 54 courses, 23 video courses, 20 blogs.
Roadmaps of the new rows: 151 software-architect, 140 ai-engineer, 95 inference-engineering, 31 game-developer, 3
ai-agents, 777 none; research areas: 27 diffusion, 22 genai, 15 world-models, 2 inference, 1,131 none. Years: 196 in
year 1, 514 in year 2, 487 in year 3; 174 beginner, 489 intermediate, 534 advanced. 598 rows got a soft prerequisite
the Library resolves; 319 keep the text.

**Merged this round:** 10 new title merges, each a row the Library already had under another id (the AtCoder
Library's Segtree page into its lazy-segtree entry, Coding Challenges, Millington's game physics book, K&R, implicit
regularization in matrix factorization, stochastic interpolants, Arovas's thermodynamics notes, CuTe Layout Algebra,
consistency trajectory models, the Azure REST API guidelines); two of them filled what the entry was missing (a
summary, note, prerequisite, priority and roadmap for the physics book; a note and priority for K&R). The 212 URL
merges and 4 checked pairs of the earlier files matched again (`scratch/atlas13-report.json` lists them).

**Seven quick filters**, rows of the Library's home (`src/lib/craft.ts`, the registry in `src/lib/quick-filters.ts`),
each the prompt's keywords read as the phrases that mean the thing and held to the tracks the cluster lives in; a
word that alone would name half the Library ("kernel" is every GPU kernel, "theory" every game theory, "inference" the
whole inference track, "implement" and "write a" every paper and proposal guide, "fusion" every kernel fusion,
"beam" every beam search) counts only in its phrases or on its track. Five carry areas as chips over the list, each a
set of words of its own, a row in as many as name it:

- **Build it yourself** 277: the from-scratch rows of the software tracks. Languages & compilers 79, OS & kernels 46,
  Networking 31, Databases & storage 15, Emulators & graphics 22, AI from scratch 35.
- **Low-level & performance** 789: assembly, the ISA and ABI, microarchitecture, debuggers and profilers, the Linux
  kernel and the networking RFCs, on the systems, languages, hardware, DevOps and inference tracks. Assembly & ISA
  268, Microarchitecture 169, Debugging & profiling 134, Linux kernel 232, Networking 221.
- **Research & science** 840: the mathematics and the physics of the math track (physics stays under Math, as the data
  has it), learning theory on the AI track, and the lectures, prizes and the craft of science on any track. Rigorous
  math 326, ML theory 280, Physics 280, How science works 210, Great lectures 154.
- **GPU & CUDA** 795: the kernel-level vocabulary (CUDA, PTX, SASS, CUTLASS, CuTe, tensor cores, warps, Nsight,
  NCCL, HIP, ROCm, Triton, cuBLAS, GEMM…) on the tracks that program the GPU; "kernel" alone only on the inference
  track. No areas.
- **SDK & API design** 230: SDKs, API guidelines, versioning and deprecation, the ABI, FFI and bindings, protobuf,
  OpenAPI and Smithy, on the software tracks. No areas.
- **Fusion & accelerators** 522: on the engineering, simulation, math and quantum tracks. Plasma 189, Energy
  conversion 131, Magnets 171, Accelerators 180.
- **Aerospace** 462: on the engineering, robotics, simulation and math tracks. Propulsion 172, Astrodynamics 131, GNC
  143, Aero & structures 74, Space systems 194.

Competitive programming and algorithms stay under Systems, as the data has them; the craft essays and the PL reference
rows are in no filter. The Library's area chips are now one mechanism: a quick filter may carry `areas` and `areasOf`
in the registry, and the screen renders one Area chip row for whichever filter is open (Security & defence, Agents &
MCP and Build & ship moved onto it unchanged). The Engineering path's own area chips learned the round's words
(accelerators, fusion plants, the aerospace programmes) so the new engineering rows show under a chip.

**The quick filters**, now eighteen rows, with their counts: Developer essentials 392, Compact power & energy
conversion 461, Security & defence 733, Agents & MCP 1,027, Certificates 49, Career & interviews 96, Research skills
158, Communication 268, Open source 48, Mandarin (the language) 24, Build & ship 134, Build it yourself 277,
Low-level & performance 789, Research & science 840, GPU & CUDA 795, SDK & API design 230, Fusion & accelerators 522,
Aerospace 462.

**Links.** The container cannot reach these sites (every request fails to resolve), so the pull request's CI ran
`npm run check:links -- --in data/resources/library-atlas-13.yaml` in a one-off `links-atlas-13` job; the job was
removed before the merge. 1,197 distinct URLs: 1,122 ok, 30 failed, 45 to check by hand (run 41266153813). The 45 are 403s and 429s from
hosts that turn scripts away (LWN's rate limit on seven articles, Cambridge, ACM, W3C, Intel, Khronos, USACO,
Codeforces, Cloudflare, the Feynman Lectures, MIT Press, Princeton, JHU, CORE, preprints.org, DOAB…), never counted
as broken. The 30 failures split in two: 17 answered an error from the runner (connection timeouts to UCL, Saarland,
DIKU, Miami, TU Delft twice, NTRS and the Nearing and Dexter Chua notes; certificate faults at moolenaar.net, PSU
STAT 503, Kirk McDonald's examples and NASA's orbital debris office; a refused connection at uscibooks.aip.org, a DNS
miss for Real World Haskell and for CERN's magnets workshop, a redirect loop at Wiley for Stacey's Fusion) and 13
answered 404, 400 or 500 (the RL theory book PDF, Wainwright and Jordan's monograph, Meta's Llama 4 post, protobuf's
API best practices, Kohavi's book at Cambridge, both AMD64 APM volumes, Langmead's teaching materials, hecto, Princeton
TR-498-95, Welch and Bishop's Kalman introduction, Uri Alon's materials, the Apollo descent guidance PDF, NATO's
turbomachinery notes). Open each in a browser before changing anything: nothing here edits the data, and the file's
URLs stand as given. Every URL is the file's; none was changed.
