# Build your own BitTorrent client

**Goal.** A command-line client that reads a .torrent file, asks the tracker for peers, speaks the peer wire protocol to many peers at once, and downloads a legal file (a Linux distribution image) with every piece hash verified.

**Why.** Software Architect roadmap: `software-architect/tcp-ip-model`, `software-architect/distributed-systems` and `software-architect/hashing-algorithms`. Skills: binary protocol parsing, concurrency over many sockets, timeouts and failure handling against strangers' machines, and content addressing with SHA-1.

**Scope.** MVP: bencode decoder and encoder, info-hash, HTTP tracker with compact peer lists, handshake, bitfield, interested and unchoke, pipelined 16 KiB block requests, piece verification, rarest-first selection, resume from a partly downloaded file. Stretch: UDP trackers, endgame mode, seeding back, magnet links via DHT.

**Architecture.** The metainfo parser yields piece hashes and file layout. The tracker client announces and returns peers. A peer manager keeps up to 30 connections, each a state machine (handshake, bitfield, choked or unchoked, requesting). A piece picker chooses the rarest missing piece a peer has and hands out blocks. Completed pieces are hashed, then written by the storage layer at their offset; failed ones are re-queued.

```
.torrent ─▶ tracker ─▶ peers ─▶ peer conns (×30) ─▶ blocks
                                   ▲                  │
                     piece picker ─┘   verify SHA-1 ◀─┘ ─▶ disk
```

**Stack.** Go (goroutines per peer) or Rust with tokio; the standard library's SHA-1 and HTTP client; Wireshark for watching the wire; a Debian or Ubuntu ISO torrent as the test case.

**Milestones.** Bencode, metainfo and info-hash (5 h) · tracker announce and peer handshake (6 h) · single-peer download with piece verification (8 h) · parallel peers with rarest-first and pipelining (10 h) · resume, robustness, benchmark and write-up (6 h). Total 35 h.

**Done when.** A full Debian netinst ISO downloads and its SHA-256 matches the published checksum; every piece passes its SHA-1 check, with failed pieces re-fetched. At least 5 peers serve blocks concurrently. Killing the client halfway and restarting resumes without re-downloading verified pieces. Disconnecting peers mid-transfer never stalls the download for more than 30 s.

**Measure and report.** Download throughput over time and its mean; number of active peers over time; piece-completion time distribution; bytes wasted on hash failures and duplicate blocks; a comparison against Transmission downloading the same torrent on the same connection.

**Pitfalls.** Computing the info-hash over a re-encoded dictionary instead of the exact original bytes. The last piece and last block are shorter than the rest. Sending one request at a time, which caps throughput at one block per round trip. Waiting forever on a peer that chokes you or goes silent. Treating a peer's bitfield as final and ignoring later have messages.

**References.** stanford-cs144, w-sys-tcp-echo, tour-of-go, ddia, build-your-own-x.

**Write-up.** A terminal recording of a download with a live peer and progress view, the throughput-over-time chart next to Transmission's, a table of protocol messages implemented, and what endgame mode or DHT would change.
