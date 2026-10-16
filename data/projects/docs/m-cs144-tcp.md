# TCP implementation (CS144 labs)

**Goal.** Your own TCP stack from Stanford CS144, built checkpoint by checkpoint (byte stream, reassembler, TCP receiver and sender, network interface with ARP, IP router) until it fetches a real web page from a real server.

**Why.** TCP is the protocol every service on the roadmap stands on. This builds TCP, C++ and networking, and the nodes `software-architect/tcp-ip-model`, `software-architect/osi` and `software-architect/http-https`. Retransmission, flow control and the receive window stop being slides once you have debugged them.

**Scope.** MVP: every checkpoint of the offering you follow (webget and ByteStream, Reassembler, TCPReceiver, TCPSender with a retransmission timer and exponential backoff, NetworkInterface with ARP, Router with longest-prefix match); webget over your own TCP; a captured trace; a public write-up. Stretch: throughput against the Linux stack, Reno congestion control, interoperating with a classmate's stack.

**Architecture.** The application writes into an outbound ByteStream; the TCPSender cuts it into segments that fit the peer's window and keeps the outstanding ones for retransmission. Incoming segments go to the TCPReceiver, which feeds the Reassembler; it writes in-order bytes to the inbound ByteStream and reports the ackno and window back to the sender. Segments travel in IP datagrams through a TUN device; below that, the NetworkInterface resolves next hops with ARP and the Router forwards by longest-prefix match.

```
app ─▶ ByteStream ─▶ TCPSender ── segments ──▶ IP ─▶ TUN ─▶ internet
app ◀─ ByteStream ◀─ Reassembler ◀─ TCPReceiver ◀── IP ◀─ TUN
                         ackno, window ─▶ TCPSender
NetworkInterface (ARP) ─▶ Router (longest-prefix match)
```

**Stack.** C++20 as the course requires, CMake, the course VM or Ubuntu, Wireshark and tcpdump, gdb, sanitizers.

**Milestones.** Byte stream and webget (5 h) · Reassembler (7 h) · TCPReceiver (5 h) · TCPSender with retransmission and backoff (10 h) · network interface, ARP and router (8 h) · real-world fetch, Wireshark trace and write-up (5 h). Total 40 h.

**Done when.** Every checkpoint's test target passes, with sanitizers on. `webget` running over your TCP fetches a page from a real server, and its output matches `curl` for the same URL path. A capture of a transfer with 10 % induced loss shows your retransmissions, backoff and window updates, annotated in the write-up. The write-up is public; the lab code stays private if the course asks.

**Measure and report.** ByteStream and Reassembler throughput from the course's speed tests, in Gbit/s; retransmissions and the timeout doubling under 10 % loss; time to fetch the same page over your stack and over Linux's; the receive window over time for one transfer.

**Pitfalls.** Wrapping 32-bit sequence numbers into 64-bit absolute indexes wrongly near the wrap point. Forgetting that SYN and FIN each take one sequence number. A zero window that is never probed, stalling the connection. Restarting the retransmission timer on every send instead of only when new data is acknowledged. Reassembler memory growing past capacity with overlapping segments.

**References.** stanford-cs144, byox-network-stack, w-sys-tcp-echo, w-sys-dns-resolver.

**Write-up.** A diagram of the layers, the annotated Wireshark trace, a sequence diagram of one loss and its retransmission, the measurements table, and what congestion control would add.
