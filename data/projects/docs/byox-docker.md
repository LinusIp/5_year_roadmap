# Build your own Docker

**Goal.** A container runtime that pulls an image from a public registry, unpacks its layers onto an overlay filesystem, and runs it isolated by Linux namespaces, limited by cgroups, and connected to a bridge network with outbound NAT.

**Why.** Inference Engineering roadmap: `inference-engineering/containerization` and `inference-engineering/docker`; Software Architect roadmap: `software-architect/containers` and `software-architect/linux-unix`. Skills: the system calls behind every container you will ship later (clone, unshare, pivot_root, mount), the OCI image format, cgroups v2, and Linux networking with veth pairs and bridges.

**Scope.** MVP: `run IMAGE CMD` and `pull IMAGE` against Docker Hub (token auth, manifest list, platform manifest, gzip layers), overlayfs with whiteouts, PID, mount, UTS, IPC and network namespaces, cgroup limits on memory, CPU and pids, a bridge with per-container IPs and NAT. Stretch: user namespaces for rootless runs, port publishing, a layer cache shared between images, `exec` into a running container.

**Architecture.** The registry client resolves a reference to a manifest and downloads layers into a content-addressed store. The unpacker extracts each layer once, honouring whiteouts. The runtime mounts an overlay (lower layers, a fresh upper dir), clones a child into new namespaces, sets hostname, mounts /proc, pivots root and execs the command. The cgroup manager creates a group and writes limits before the child starts. The network manager creates a veth pair, moves one end into the container and attaches the other to the bridge.

```
registry ─▶ layers (sha256) ─▶ overlayfs ─┐
                                          ▼
CLI ─▶ runtime ─▶ clone(ns) ─▶ pivot_root ─▶ exec CMD
          ├─▶ cgroup v2 limits
          └─▶ veth ─▶ bridge ─▶ NAT ─▶ internet
```

**Stack.** Go or Rust on a Linux VM (root needed), cgroups v2, iproute2 and nftables for the bridge and NAT, curl and jq while exploring the registry API, the 100-line container from the weekly card as the starting point.

**Milestones.** Namespaces, chroot to pivot_root and /proc (5 h) · registry pull and layer unpacking with whiteouts (8 h) · overlayfs root and image config (env, entrypoint) (5 h) · cgroup v2 limits (4 h) · bridge networking and NAT (5 h) · tests, benchmark and write-up (3 h). Total 30 h.

**Done when.** `alpine:3.20` and `python:3.12-slim` pulled from Docker Hub run their default commands. Inside a container with a 64 MB memory limit, allocating 128 MB gets the process OOM-killed; with `cpu.max` at half a core, a busy loop measures under 55 % of one core; a fork bomb stops at the pids limit. Two containers ping each other over the bridge and both reach the internet. An integration test script checks all of this.

**Measure and report.** Cold pull time and bytes against `docker pull` for the same images; container start latency p50 and p95 over 20 runs against `docker run`; disk used with overlay against copying the rootfs; measured CPU share and memory peak under each limit.

**Pitfalls.** pivot_root failing because the root mount is shared (make it private first). Ignoring `.wh.` whiteout files, so files deleted in a later layer come back. The command running as PID 1, which ignores SIGTERM and never reaps zombies. Forgetting to mount a fresh /proc, so `ps` shows the host. Mixing cgroups v1 instructions from old tutorials with a v2 host.

**References.** w-sys-docker-from-scratch, docker-get-started, ostep, lfs101-intro-linux, build-your-own-x.

**Write-up.** A terminal recording of pull and run, a diagram of the namespaces and mounts, the limit-test results table, start-latency numbers against Docker, and what rootless containers would require.
