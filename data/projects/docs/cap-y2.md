# Year 2 capstone: a networked physics sandbox

**Goal.** Your 2D rigid-body engine, drawn by your OpenGL renderer, shared by two players over UDP netcode you wrote: an authoritative server, snapshot interpolation for remote bodies, and client-side prediction with reconciliation for the local player, holding together under 150 ms of latency and 5 % packet loss.

**Why.** Game Developer roadmap: `game-developer/dynamics`, `game-developer/collision-detection`, `game-developer/broad-phase`, `game-developer/sat` and `game-developer/opengl`; Software Architect roadmap: `software-architect/client-server` and `software-architect/distributed-systems`. Skills: C++ or Rust, UDP netcode, determinism and a fixed timestep, OpenGL, and systems measurement.

**Scope.** MVP: a dedicated server running the simulation at 60 Hz; two clients sending sequenced inputs; snapshots at 20 Hz with quantised, delta-compressed body states; a 100 ms interpolation buffer for remote bodies; prediction and replay-based reconciliation for each player's own avatar body; smoothing of corrections; a design document. Stretch: lag-compensated grabbing, client-authoritative ownership hand-off for held bodies, a spectator client, a browser client over WebRTC.

**Architecture.** The transport wraps UDP with connection ids, sequence numbers and acknowledgement bitfields, plus a reliable channel for events. The server applies inputs at their tick, steps the engine and sends snapshots. Each client keeps a ring of its unacknowledged inputs: it predicts its avatar immediately, and on each snapshot rewinds to the server state and replays pending inputs. Remote bodies are drawn between the two snapshots bracketing render time. A metrics layer logs bandwidth, RTT, loss and correction size.

```
client A ─ inputs ─▶            ◀─ inputs ─ client B
                     server (60 Hz engine)
client A ◀ snapshots ─          ─ snapshots ▶ client B
   predict + reconcile own avatar, interpolate the rest ─▶ OpenGL
```

**Stack.** C++20 or Rust, your 2D engine and OpenGL renderer, raw UDP sockets (or ENet as a comparison only), Linux tc netem or clumsy as the network conditioner, Dear ImGui for a debug overlay, Python for plotting the logs.

**Milestones.** Engine and renderer integration with a deterministic fixed step (20 h) · UDP transport with acks and a reliable channel (25 h) · authoritative server, snapshots and interpolation (25 h) · client prediction and reconciliation (25 h) · network-conditioner tests and bandwidth work (25 h) · design document, measurements and write-up (20 h). Total 140 h.

**Done when.** Two clients on different machines push the same stack of at least 20 bodies over a real network and see the same outcome. Under 150 ms added latency and 5 % loss, each player's avatar responds within one frame of input, and after the interpolation delay remote bodies differ from server state by less than 2 % of the arena width, with no correction snapping more than 0.1 m on screen after smoothing. Bandwidth stays under 64 kbit/s per client. A scripted soak test runs 10 minutes under those conditions without desync.

**Measure and report.** Bandwidth per client against body count; tick and snapshot rates; RTT and loss as measured by the protocol; correction magnitude distribution (p50, p99, max); server CPU time per tick; how these change at 0, 50, 150 and 250 ms.

**Pitfalls.** Predicting server-owned bodies the player touches and fighting the server every frame. Simulation that depends on frame rate or float order, so replays diverge. Interpolating angles the long way round. Sending full state every tick and saturating the link. Testing only on localhost, where latency and loss never happen.

**References.** gaffer-on-games, catto-box2d-publications, ericson-rtcd, learnopengl, m15, w-sim-fixed-timestep, kleppmann-distributed-systems.

**Write-up.** A side-by-side video of both clients under the conditioner, the bandwidth and correction tables, a timeline diagram of prediction and reconciliation, and what rollback or deterministic lockstep would change.
