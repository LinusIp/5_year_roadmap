# raftkv: a replicated key-value store

**Goal.** A linearizable key-value store in Rust: Raft for replication across three or five nodes, its own write-ahead log and LSM storage engine, a custom binary network protocol, and a deterministic simulator that replays any failure from one seed.

**Why.** Correctness under failure is the hardest systems skill to fake. Deterministic simulation, the FoundationDB and TigerBeetle approach, impresses senior engineers far more than another CRUD service, and the bugs it finds make the best write-up.

**Scope.** MVP: Gossip Glomers in Maelstrom as a warm-up; Raft leader election, log replication, snapshots and single-server membership changes as a sans-I/O state machine; put, get, delete and compare-and-swap with ReadIndex reads; a WAL on io_uring with batched fsync; a memtable, SSTables and compaction; a simulator with fake time, network and disk, and a linearizability check on every run. Stretch: Jepsen-style tests against the real binary, read leases and a benchmark against etcd.

**Architecture.** A client's write reaches the leader's Raft core, which appends it to its own write-ahead log and sends it to the followers. Once a majority has the entry on disk it is committed: the leader applies it to the LSM state machine and answers. The core never does I/O itself. It takes inputs (ticks, messages, proposals, finished fsyncs) and returns outputs (sends, persists, applies, replies), so the same code runs on tokio in production and inside the simulator in tests.

**Stack.** Rust, tokio, the io-uring crate, a length-prefixed binary wire format, a Porcupine-style linearizability checker, Maelstrom, and tc netem and iptables for faults on a real cluster.

**Milestones.** Gossip Glomers warm-up (24 h) · Raft (64 h) · Storage (48 h) · Simulation testing (64 h) · Stretch (24 h) · Total 224 h.

**Done when.** 100,000 simulated runs with crashes, partitions, reordering and disk faults pass the linearizability checker. At least three real bugs found by the simulator are written up with their seeds. Throughput and p99 latency are reported against etcd on the same three machines.

**Measure and report.** Simulated runs per minute and seeds tried; each bug's seed, cause and fix; failover time on three real nodes with election timeouts between 150 and 300 ms; writes per second and p99 latency with fsync on, against etcd; no acknowledged write lost after kill -9 of any node.

**Pitfalls.** Hidden non-determinism, such as HashMap iteration order, real clocks or thread scheduling, breaks replay; ban std::time in the core and run every seed twice. With single-server membership changes, a new leader must commit an entry from its own term before it starts a change. Acknowledging a write before fsync returns. Letting LSM compaction eat weeks before the simulator passes: start with an in-memory map and snapshots.

**References.** paper-raft, students-guide-to-raft, repo-etcd-raft, gossip-glomers, repo-maelstrom, foundationdb-sigmod21, docs-tigerbeetle-vopr, blog-jepsen-analyses, tutorial-lord-of-the-io-uring, paper-linearizability, repo-mini-lsm.

**Write-up.** The three bugs the simulator found, each told from its seed, then the sans-I/O design, how the simulator injects faults, the linearizability results and the etcd comparison.
