# The Atlas Library import, seventeenth file: the category refill and the upgrade pass (pull request #53)

The 7,679-row `atlas-resources.jsonl` is the 7,640-row "four stars and up" file after two more passes of the audit
(`ATLAS-LIBRARY-PROMPT.md`, November 2026). The **category refill** (7,640 to 7,910) restored 229 three-star rows from
the requested categories the four-star pass had left nearly empty (Rust and agents, agent books, image, video and 3D
generation, the inference stack) at priority 3 or lower, and added 41 new 4–5★ rows for the thin spots: five expert
blogs each for DevOps, game dev, hardware, simulation, robotics and quantum, defensive malware analysis, shipping games
(Steamworks, itch.io's butler, Unreal's cooking) and agent books. The **upgrade pass** (7,910 to 7,679) then revisited
every row rated 3 or lower in those categories: 269 superseded rows went (each points to a 4–5★ row on the same
topic), 38 new verified 4–5★ rows came in, and 100 kept rows were raised to 4. 7,421 of the 7,679 rows (96.6%) are rated
4 or 5.

`scratch/import-atlas.ts` upserted it into `data/` as before: 7,486 rows found their entry again (7,253 by id, 193 by URL,
37 by title on the same shelf, 3 by a checked pair), 2 were left out as before (the Unity certifications the plan already
tracks), and 191 are new to the Library (`data/resources/library-atlas-17.yaml`): 130 restored under the ids they had
before the four-star pass, so a device's kept progress on one reattaches, and 61 new.

| Shelf | Before | After |
|---|---|---|
| Courses | 803 | 800 |
| Books | 745 | 760 |
| Papers | 2,308 | 2,320 |
| Articles (with docs and tutorials) | 2,498 | 2,444 |
| Blogs | 168 | 194 |
| Tools | 40 | 40 |
| Practice | 1,180 | 1,225 |

Resources: 7,650 to 7,691 (and the 92 papers of the reading queue). By track: AI (with inference) 2,611 to 2,677, systems
1,021 to 1,033, engineering 889 to 890, architecture 633 to 576, languages 509 to 498, math 388 to 389, graphics 282 to 291,
simulation 272 to 277, DevOps 253 to 245, robotics 245 to 250, hardware 197 to 203, game dev 131 to 138, quantum 116 to
121; the small curated tracks (career, chemistry, controls, electrical, embedded, mechanical, physics, software
engineering) are unchanged. By roadmap: ai-engineer 1,756 to 1,782, software-architect 1,146 to 1,082,
inference-engineering 673 to 709, game-developer 687 to 708, ai-agents 219 to 222, none 3,169 to 3,188. Paid rows: 285 to
300.

**Removed.** 150 rows the Library held that the new file no longer has left `data/` (102 from `library-atlas-11.yaml`, 25
from `library-atlas-12.yaml`, 10 each from `library-harness.yaml` and `library-atlas-10.yaml`, 2 from `library-atlas-4.yaml`,
1 from `library-atlas-5.yaml`); the file's 151st absent row, AWS Cloud Practitioner, was never a Library row (it is a
certification of the plan). None was on the plan or named elsewhere in the data, so none stays. A device keeps its
progress on a removed row, as in the last two passes. The rows, by the file's track:

- **architecture** (60): `article-dartmouth-star-method`, `article-eugeneyan-writing-online`, `article-haseeb-dont-bomb-negotiation`, `article-interviewingio-sd-guide`, `article-jvns-blog-struggled`, `article-jvns-blogging-myths`, `article-jvns-blogging-principles`, `article-jvns-good-examples`, `article-jvns-measuring-blog-success`, `article-jvns-tactics-writing-public`, `article-karlsson-blog-search-query`, `article-kawasaki-10-20-30`, `article-orosz-prep-sd-coding`, `article-pg-best-essay`, `article-pg-convince-investors`, `article-pg-fundraising-survival`, `article-pg-how-to-write-usefully`, `article-pg-investor-herd`, `article-pg-persuade-xor-discover`, `article-pg-present-to-investors`, `article-pg-putting-ideas-into-words`, `article-pg-write-simply`, `article-pg-writes-and-write-nots`, `article-pg-writing-and-speaking`, `article-pg-writing-briefly`, `article-speaking-io-nervousness`, `article-speaking-io-questions`, `article-tao-talks-not-papers`, `article-toastmasters-fear`, `article-toastmasters-write-deliver-speech`, `article-willison-what-to-blog-about`, `article-wtd-beginners-guide`, `article-yc-essential-startup-advice`, `article-yc-seed-pitch-deck`, `bbg-scale-zero-to-millions`, `blog-duarte`, `blog-presentation-zen`, `book-a-mind-for-numbers`, `book-clean-architecture`, `book-making-of-a-manager`, `book-strunk-elements-of-style`, `book-the-phoenix-project`, `book-think-faster-talk-smarter`, `docs-write-the-docs-guide`, `hi-design-bitly`, `hi-design-rate-limiter`, `hi-design-ticketmaster`, `hi-numbers-to-know`, `hi-pattern-contention`, `podcast-think-fast-talk-smart`, `tih-behavioral-questions`, `tih-mock-interviews`, `tih-negotiation-rules`, `tih-system-design-guide`, `tih-understanding-compensation`, `tutorial-garr-reynolds-tips`, `video-ted-anderson-public-speaking`, `video-ted-duarte-structure`, `video-yc-hale-how-to-pitch`, `video-yc-how-to-talk-to-users`
- **devops** (29): `cert-lf-kcna`, `docs-docker-gha-cache`, `docs-electron-forge-code-signing`, `docs-electron-forge-makers`, `docs-gh-cli-release`, `docs-gh-cli-run`, `docs-gh-cli-workflow`, `docs-gha-concurrency`, `docs-gha-debug-logging`, `docs-gha-larger-runners`, `docs-gha-manual-run`, `docs-gha-matrix`, `docs-gha-oidc-aws`, `docs-gha-oidc-azure`, `docs-gha-oidc-gcp`, `docs-gha-store-share-data`, `docs-github-contributing-to-open-source`, `docs-github-fork-a-repo`, `docs-github-pr-from-fork`, `docs-github-pull-request-reviews`, `docs-github-syncing-a-fork`, `docs-goreleaser-actions`, `docs-goreleaser-quick-start`, `docs-opensource-guide-code-of-conduct`, `docs-pytorch-wiki-code-review-values`, `docs-pytorch-wiki-contribution-process`, `docs-pytorch-wiki-pr-review-etiquette`, `docs-sglang-dev-docker`, `practice-up-for-grabs`
- **ai** (22): `article-fowler-are-harnesses-worth-the-cost`, `article-meta-cicero`, `article-osmani-agent-harness-engineering`, `book-generative-deep-learning-2e`, `book-llm-engineers-handbook`, `book-ml-system-design-interview`, `book-prompt-engineering-for-llms`, `cert-aws-ai-practitioner`, `docs-rig-agents`, `docs-swebench-harness`, `hi-ml-system-design-intro`, `hi-ml-video-recommendations`, `paper-grow-the-harness`, `paper-harbor-harness-optimization`, `paper-harness-learning`, `paper-harnessmdp`, `paper-harnessopt-bench`, `paper-memoharness`, `paper-sia-harness-weight-updates`, `repo-bigcode-evaluation-harness`, `repo-hal-harness`, `repo-ml-system-design-case-studies`
- **languages** (22): `article-hacking-chinese-beginner-listening`, `article-hacking-chinese-pinyin-traps`, `article-hacking-chinese-pronunciation-beginner`, `article-hacking-chinese-tone-pairs`, `article-hacking-chinese-tones-not-optional`, `article-harvard-clp-vocabulary-study`, `article-josuttis-b2b-templates`, `book-rust-in-action`, `course-mit-ocw-21g101-chinese-i`, `course-mit-ocw-21g102-chinese-ii`, `cppref-virtual`, `docs-allset-a1-grammar-points`, `docs-cargo-profiles`, `docs-cpack`, `docs-go-compile-install`, `docs-isocpp-faq-cpp11-language`, `docs-nuitka-common-issues`, `docs-pyinstaller-operating-mode`, `docs-pyinstaller-spec-files`, `docs-pyinstaller-usage`, `practice-duolingo-chinese`, `tutorial-yoyo-pinyin-chart`
- **systems** (10): `article-bctci-nine-free-chapters`, `article-yegge-get-that-job-at-google`, `book-operating-system-concepts-10e`, `cppref-condition-variable`, `repo-interactive-coding-challenges`, `tih-algorithms-cheatsheets`, `tih-coding-interview-cheatsheet`, `tih-coding-study-plan`, `tih-coding-techniques`, `tih-grind-75`
- **inference** (5): `blog-leimao-coalesced-access`, `blog-leimao-occupancy-calculation`, `blog-nvidia-device-properties-errors`, `blog-nvidia-occupancy-api`, `blog-nvidia-perf-metrics`
- **engineering** (1): `cert-solidworks-cswa`
- **gamedev** (1): `docs-unreal-packaging-cooking`

**Added.** 191 rows. Restored (130), among them the Rust agent building blocks (Swiftide, mistral.rs, async-openai,
Kalosm, llama-cpp-rs, ort), Codex's protocol, sandbox, exec policy and network proxy docs, Tabby, and the image, video and
3D generation and inference-stack rows the refill brought back. New (61): blogs for the thin tracks (Fly.io, Kubernetes,
Last Week in AWS, Box2D, Bitsquid, Wicked Engine, The Next Platform, Real World Tech, Semiconductor Engineering, SIGARCH's
Computer Architecture Today, Stuffed Cow, Stochastic Lifestyle, SciML News, Lorena Barba, SIAM News, Stéphane Caron,
Boston Dynamics, IEEE Spectrum robotics, BAIR, IBM Quantum, PennyLane, the Quantum Pontiff, Quanta on quantum computing);
Practical Malware Analysis, Malware Unicorn's RE101, the Ghidra class and YARA; Steamworks and SteamPipe, itch.io's butler
and Unreal's build operations; AIMA 4th edition and Designing Multi-Agent Systems; Continuous Delivery, the OWASP CI/CD
top ten, reproducible builds, the Cargo book, the PyInstaller manual, GoReleaser, Electron's code signing and Electron
Forge, `go` command docs and the AWS, Azure and Google Cloud OIDC login actions; C++ Templates 2nd edition, the TED Talks
guide, Integrated Chinese 4th edition, Pleco, Learning How to Learn; the CICERO Science paper, FID (TTUR), HAL, NeuS, a
speculative decoding survey, llguidance and Landlock; the AWS Solutions Architect and Generative AI Developer professional
certificates and SOLIDWORKS CSWP; and Pro Git's chapter on contributing on GitHub. 28 are paid.

**Merged.** As in the last file, plus four the new rows brought: Gaffer On Games' blog row into the Library's
`gaffer-on-games` (the same URL), Hello Interview's "System Design in a Hurry" into `hello-interview` (the same page), the
Stable Video Diffusion paper into the reading queue's `stable-video-diffusion` (the same arXiv id). The matcher also read
Electron's own code-signing tutorial as Electron Forge's code-signing guide (alike titles on the same shelf), and the
Forge guide is one of the rows this file removed, so the new row would have left with it: the pair is now listed as
distinct (`NOT_SAME` in `scripts/lib/resource-import.ts`), and the importer refuses a merge into a row it removes.

**Grades.** Priority and quality from the file on every row it matches: 93 entries took a new grade, 76 a new priority.
The file grades 1,292 rows 5, 6,129 rows 4, 185 rows 3, 71 rows 2 and 2 rows 1.

**Prerequisites.** A new row that comes after a row this file removed keeps its "do first" as text: SOLIDWORKS CSWP
names CSWA, which left. Rows already in the Library only gained the fields they lacked.

**Build & ship** also reads the game shipping rows: Steamworks, SteamPipe, steamcmd, butler and BuildCookRun name the
cluster on their own (in the game dev and software tracks, as before), so the four new rows reach "Game builds" (4 to 8).
The itch.io game jam calendar is not one of them.

**The windowed list.** A long shelf scrolled deep (36,000 pixels, after the AI path's optional list) re-rendered without
end: the list measured its row height from the rows in view, rows differ a little in height (a two-line meta, the stars
under a tile), and the new height moved the window onto rows of the other height. React never found a quiet moment for
the deferred search, so a search typed or opened then did not narrow the list. The row height now only grows, to the
tallest average seen, and settles at once; an end-to-end test scrolls a shelf deep and checks it is quiet and searchable.

## Every quick filter, area chip and track filter, with its count

Counted over the Library's resources and the reading queue, before and after the import. No filter, chip or track
shows 0. The thinnest: Game builds 8, Simulation, DevOps, Quantum and Hardware blogs 6–7, Books under Agents & MCP 7.

| Filter | Chip | Before | After |
|---|---|---|---|
| **Developer essentials** | | 148 | 152 |
| **Compact power & energy conversion** | | 196 | 197 |
| **Security & defence** | | 178 | 186 |
| | Foundations | 70 | 73 |
| | Hardening | 53 | 56 |
| | Malware | 21 | 24 |
| | Detection & response | 17 | 20 |
| | Network & web | 42 | 44 |
| | Secure development | 70 | 72 |
| | AI for defence | 28 | 30 |
| **Agents & MCP** | | 244 | 272 |
| | MCP | 18 | 26 |
| | Harness & loop | 94 | 101 |
| | Tools & sandbox | 43 | 58 |
| | Evals | 71 | 72 |
| | Frameworks | 25 | 31 |
| | Books | 4 | 7 |
| **Certificates** | | 49 | 50 |
| **Career & interviews** | | 64 | 41 |
| **Research skills** | | 84 | 83 |
| **Communication** | | 156 | 129 |
| **Open source** | | 34 | 28 |
| **Mandarin (the language)** | | 24 | 16 |
| **Build & ship** | | 122 | 112 |
| | Executables | 44 | 38 |
| | Installers & signing | 31 | 32 |
| | Desktop apps | 16 | 16 |
| | Game builds | 4 | 8 |
| | GitHub Actions | 62 | 54 |
| | Releases & deploys | 46 | 41 |
| **Build it yourself** | | 166 | 171 |
| | Languages & compilers | 50 | 50 |
| | OS & kernels | 34 | 34 |
| | Networking | 18 | 19 |
| | Databases & storage | 12 | 12 |
| | Emulators & graphics | 14 | 14 |
| | AI from scratch | 26 | 26 |
| **Low-level & performance** | | 420 | 427 |
| | Assembly & ISA | 143 | 145 |
| | Microarchitecture | 119 | 121 |
| | Debugging & profiling | 65 | 67 |
| | Linux kernel | 117 | 119 |
| | Networking | 109 | 110 |
| **Research & science** | | 532 | 534 |
| | Rigorous math | 226 | 226 |
| | ML theory | 181 | 181 |
| | Physics | 168 | 169 |
| | How science works | 111 | 112 |
| | Research writing | 24 | 24 |
| | Great lectures | 104 | 104 |
| **GPU & CUDA** | | 395 | 404 |
| **SDK & API design** | | 88 | 93 |
| **Fusion & accelerators** | | 267 | 268 |
| | Plasma | 88 | 88 |
| | Energy conversion | 46 | 46 |
| | Magnets | 91 | 92 |
| | Accelerators | 110 | 111 |
| **Aerospace** | | 231 | 231 |
| | Propulsion | 76 | 76 |
| | Astrodynamics | 74 | 74 |
| | GNC | 89 | 89 |
| | Aero & structures | 43 | 43 |
| | Space systems | 98 | 98 |
| **Electronics & EM** | | 210 | 212 |
| **Mechanics & materials** | | 452 | 454 |
| | Fluids | 139 | 141 |
| | Solids | 113 | 114 |
| | Materials | 117 | 117 |
| | Nuclear | 138 | 138 |
| **Scientific computing** | | 209 | 213 |
| **Formal methods** | | 98 | 98 |
| | Mechanics | 139 | 138 |
| | Materials | 95 | 95 |
| | Thermo-fluids | 91 | 91 |
| | Design & CAD | 104 | 104 |
| | Manufacturing | 42 | 42 |
| | Electronics & PCB | 260 | 261 |
| | Power & energy | 191 | 192 |
| | Control | 99 | 99 |
| | Aerospace | 156 | 156 |
| | Chemical & nuclear | 208 | 209 |
| | Practice | 217 | 216 |

**The Engineering path's topic chips:** Mechanics 139 → 138, Materials 95 → 95, Thermo-fluids 91 → 91, Design & CAD 104 → 104, Manufacturing 42 → 42, Electronics & PCB 260 → 261, Power & energy 191 → 192, Control 99 → 99, Aerospace 156 → 156, Chemical & nuclear 208 → 209, Practice 217 → 216.

**The Blogs shelf, by track:** AI engineering 45 → 45, Inference engineering 12 → 12, Languages 14 → 14, Graphics 10 → 14, Simulation 2 → 7, Math and physics 14 → 14, Systems 32 → 32, Software architecture 21 → 18, DevOps 2 → 7, Electrical, mechanical & aerospace 22 → 22, Robotics 3 → 8, Hardware and chip design 1 → 6, Quantum computing 2 → 7.

**Each path's optional list:** AI engineering 1,967 → 1,996, Inference engineering 664 → 700, Languages 488 → 477, Graphics 671 → 692, Simulation 264 → 269, Math and physics 385 → 386, Systems 1,021 → 1,033, Software architecture 1,135 → 1,071, DevOps 253 → 245, Electrical, mechanical & aerospace 915 → 916, Robotics 239 → 244, Hardware and chip design 197 → 203, Quantum computing 116 → 121.

## Links

`npm run check:links -- --in data/resources/library-atlas-17.yaml` ran on the pull request's runner in a one-off
`links-atlas-17` job (run 42109729220), since the container cannot resolve the hosts; the job is removed before the merge.
191 distinct URLs of the new and restored rows: 185 ok, 2 failed, 4 to check by hand.

- **Failed, both timeouts** (no answer, not a 404): Nilsson's *The Quest for Artificial Intelligence* PDF on
  ai.stanford.edu (connect timeout) and SOLIDWORKS's CSWP page (the plan's own CSWP certification has the same URL).
  Open each in a browser before changing anything; nothing here edits the data.
- **Check by hand** (403, the site turned the checker away): Princeton University Press (*AI Snake Oil*), Macmillan
  (Mitchell's *Artificial Intelligence: A Guide for Thinking Humans*), SIAM News and the "It Can Think" Substack.

Every URL is the file's; none was changed.

**A certificate the plan tracks.** The new SOLIDWORKS CSWP row has the URL of the plan's own CSWP certification
(`data/certs.yaml`, Plan › Credentials), as eight certificate rows of the plan gap fill already do (AWS Solutions
Architect and ML Engineer Associate, LFCS, CKA, CKAD, Terraform Associate, Google's Professional ML Engineer, MITx
Statistics and Data Science). The importer leaves out only a row with a certification's id; such a row stays, as those
eight did, and shows under Certificates with its own Earned toggle.
