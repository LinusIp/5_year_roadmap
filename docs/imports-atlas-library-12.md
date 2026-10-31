# The Atlas Library import, twelfth file (pull request #44)

`scratch/import-atlas.ts` upserted the 16,076-row `atlas-resources.jsonl` into `data/`. 15,958 of its rows found their
entry again (15,704 by id, 212 by URL, 38 by title on the same shelf, 4 by a checked pair), 3 were left out as before
(their ids are certifications the plan already tracks in `data/certs.yaml`), and 115 are new
(`data/resources/library-atlas-12.yaml`): build & ship. Building executables and installers (PyInstaller, Nuitka,
cx_Freeze, Briefcase, cibuildwheel, maturin, CMake, CPack, Ninja, vcpkg, Conan, MSBuild, ccache, Cargo profiles,
cross, cargo-dist, cargo-wix, Go's compile and install, GoReleaser, Tauri, Electron Forge and electron-builder, Qt's
Windows deployment, .NET publishing, WiX, MSIX, Inno Setup, NSIS, SignTool, winget, Apple's notarization, Homebrew
formulas, casks and taps, AppImage, Flatpak, Godot, Unity and Unreal builds) and advanced GitHub Actions (matrices,
caching, artifacts, reusable and composite actions, JavaScript and Docker actions, contexts and expressions, events,
manual runs, concurrency, environments, secrets, GITHUB_TOKEN, OIDC for AWS, GCP and Azure, hardening,
pull_request_target, script injections, self-hosted and larger runners, Actions Runner Controller, Docker images,
attestations, workflow commands, debug logging, the Security Lab's four articles, Pages, rulesets, protected branches,
Projects, the gh CLI, the release, Pages, build-push, cache, template, harden-runner and attestation actions). All 115
are free. No URL was changed by hand; the file's URLs were copied exactly. The file corrected none of the Library's own
rows this time.

| Shelf | Added | Before | After |
|---|---|---|---|
| Courses | 0 | 1,176 | 1,176 |
| Books | 1 | 843 | 844 |
| Papers | 0 | 4,925 | 4,925 |
| Articles (with docs and tutorials) | 102 | 5,278 | 5,380 |
| Blogs | 0 | 399 | 399 |
| Practice | 12 | 3,375 | 3,387 |

Resources: 15,945 to 16,060. By track: DevOps 604 to 682, languages 638 to 672, game dev 231 to 234; the other tracks
are unchanged. By type of the new rows: 77 docs, 21 tutorials, 12 practice (repositories of actions and tools), 4
articles, 1 book. Roadmaps of the new rows: 70 software-architect, 8 ai-engineer, 3 game-developer, 34 none; none
names a research area. Years: 46 in year 1, 67 in year 2, 2 in year 3; 43 beginner, 70 intermediate, 2 advanced. 98
rows got a soft prerequisite the Library resolves; 2 keep the text.

**Merged this round:** no new title or URL merges; the 38 title merges, 212 URL merges and 4 checked pairs of the
earlier files matched again (`scratch/atlas12-report.json` lists them). A merge fills only what the entry was missing;
nothing was missing this time.

**"Build & ship"**, the eleventh quick filter, a row of the Library's home (`src/lib/build-ship.ts`): 131 resources
named by the prompt's tools and formats and by its broad words in their shipping phrases, in the software tracks
(DevOps, languages, game dev, architecture, systems): the 115 new rows and 16 the Library already had (GitHub Actions'
documentation and workflow syntax, act, actionlint, zizmor, ClusterFuzzLite, the GitHub Skills course, the Python Packaging User Guide,
Flatpak's concepts, Ubuntu's packaging guide, Sigstore and cosign, vLLM's incremental build, the cpp-best-practices
CMake template, HPC Carpentry, code owners). Six areas as chips over the list, each a set of words of its own, a row
in as many as name it: Executables 46, Installers & signing 32, Desktop apps 15, Game builds 4, GitHub Actions 67,
Releases & deploys 46. Every row of the cluster is in at least one area.

**The quick filters**, now eleven rows, with their counts: Developer essentials 346, Compact power & energy
conversion 394, Security & defence 726, Agents & MCP 1,023, Certificates 49, Career & interviews 94, Research skills
145, Communication 258, Open source 47, Mandarin (the language) 24, Build & ship 131.

**Links.** The container cannot reach these sites (every request fails to resolve), so the pull request's CI ran
`npm run check:links -- --in data/resources/library-atlas-12.yaml` in a one-off `links-atlas-12` job (run 41197132463
on the first commit); the job was removed before the merge. 115 distinct URLs: 114 ok, 0 failed, 1 to check by hand:
the NSIS Users Manual (`docs-nsis`, nsis.sourceforge.io answers 403 to the checker), never counted as broken. Every
URL is the file's; none was changed.
