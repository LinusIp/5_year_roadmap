# Build your own network stack

**Goal.** A user-space TCP/IP stack on a Linux TAP device that answers ARP and ping, and implements enough TCP (handshake, sliding window, retransmission, close) to fetch a web page from a real server over HTTP.

**Why.** Software Architect roadmap: `software-architect/tcp-ip-model`, `software-architect/osi` and `software-architect/http-https`. Skills: reading RFCs closely, binary header parsing in network byte order, checksums, protocol state machines and timers, and debugging with Wireshark against the kernel's own stack.

**Scope.** MVP: Ethernet frames, ARP request and reply with a cache, IPv4 with header checksum, ICMP echo, a TCP client with the full state machine, sequence and acknowledgement handling, a receive window, retransmission on timeout, FIN and RST handling, a tiny socket-like API. Stretch: a TCP server side, fast retransmit, Reno congestion control, IP fragment reassembly.

**Architecture.** A device layer reads and writes raw frames on a TAP interface. Ethernet dispatches by EtherType to ARP or IPv4. IPv4 validates headers and dispatches to ICMP or TCP. TCP keeps one control block per connection with send and receive buffers, sequence numbers and a retransmission queue driven by a timer wheel. The application calls connect, send and recv; the host routes and NATs the TAP subnet to the outside world.

```
app ─▶ socket API ─▶ TCP (TCB, timers) ─▶ IPv4 ─▶ Ethernet ─▶ TAP
                         ▲                  │
             ICMP ◀──────┼──────────────────┤
             ARP cache ◀─┴──────────────────┘   host NAT ─▶ internet
```

**Stack.** C or Rust on Linux, the TUN/TAP driver, iproute2 and iptables for routing and NAT, Wireshark or tcpdump, tc netem for injecting loss and delay, Python's http.server as a local target.

**Milestones.** TAP device, Ethernet and ARP (6 h) · IPv4 and ICMP echo (5 h) · TCP handshake and state machine (10 h) · data transfer, windows and retransmission (12 h) · HTTP fetch, loss testing, benchmark and write-up (7 h). Total 40 h.

**Done when.** `ping` from the host gets 100 of 100 replies. The stack completes a three-way handshake and an HTTP GET against a local server and against a real plain-HTTP site, and a 10 MB download matches its SHA-256. With 5 % loss injected by netem, the same download still completes correctly. Wireshark shows no malformed packets and no checksum errors in a captured session.

**Measure and report.** Ping round-trip time against the kernel stack; throughput for the 10 MB download at 0 %, 1 % and 5 % loss, against curl on the kernel stack; retransmissions and duplicate ACKs per run; connection setup time.

**Pitfalls.** Forgetting byte-order conversion on one field. Computing the TCP checksum without the pseudo-header. Comparing sequence numbers with plain less-than, which breaks at wrap-around. Opening the TAP device without IFF_NO_PI and parsing a 4-byte packet-info header as Ethernet. Retransmission timers that are never cancelled once data is acknowledged.

**References.** stanford-cs144, m-cs144-tcp, w-sys-tcp-echo, cmu-15-213, build-your-own-x.

**Write-up.** A Wireshark screenshot of your handshake and transfer, the throughput-against-loss chart beside the kernel's, the TCP state diagram you implemented, and what congestion control would change.
