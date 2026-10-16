# Build your own blockchain

**Goal.** A toy cryptocurrency: signed transactions, a mempool, proof-of-work blocks with a Merkle root, and three nodes that gossip over a network and converge on the chain with the most work after a partition heals.

**Why.** Software Architect roadmap: `software-architect/hashing-algorithms`, `software-architect/pki`, `software-architect/distributed-systems` and `software-architect/acid-cap-theorem`. Skills: content-addressed data structures, digital signatures, fork choice, and eventual consistency under partitions you cause on purpose.

**Scope.** MVP: Ed25519 key pairs and addresses, account balances or UTXOs, transaction validation, mempool, block template, proof of work at a fixed difficulty, longest-work fork choice with reorganisation, peer gossip of transactions and blocks, a CLI wallet. Stretch: difficulty adjustment, a block explorer page, light-client Merkle proofs.

**Architecture.** Each node runs a validator (signatures, balances, no double spends), a mempool, a miner that builds blocks from the mempool and searches nonces, a chain store that keeps every block and the tip of the heaviest branch, and a network layer that gossips new transactions and blocks and requests missing ancestors. A reorg rewinds state to the fork point, applies the new branch and returns orphaned transactions to the mempool.

```
wallet ─▶ tx ─▶ mempool ─▶ miner ─▶ block ─▶ chain store
                   ▲                    │          │
            gossip ◀──── network ◀──────┘   reorg ◀┘
```

**Stack.** Python 3.12 with asyncio and the cryptography package, or Go; SQLite or plain files per node; Docker Compose or three terminals for the network; iptables or a proxy toggle to cut links.

**Milestones.** Blocks, hashing, Merkle root and proof of work (5 h) · keys, signed transactions and validation (6 h) · mempool, mining and the chain store (6 h) · networking, gossip and fork choice with reorgs (9 h) · partition test, tamper test and write-up (4 h). Total 30 h.

**Done when.** Three nodes split two against one, both sides mine for 60 s, the link is restored, and all three agree on the same tip within 10 s, with transactions from the losing branch back in the mempool. Changing one byte of any past transaction is rejected on validation at that block. A double spend submitted to two nodes at once ends with exactly one spend confirmed. An automated test script runs all three scenarios.

**Measure and report.** Convergence time after partition (over 10 runs); reorg depth; blocks per minute against difficulty; orphan rate; validation time per block; message count per block propagated across the three nodes.

**Pitfalls.** Choosing the chain with more blocks instead of more cumulative work. Hashing a serialisation that is not canonical, so two nodes disagree about the same block. Forgetting to return transactions from orphaned blocks to the mempool. Accepting a transaction that conflicts with one already in the mempool. Gossip loops that re-broadcast the same block forever.

**References.** kleppmann-distributed-systems, ddia, paper-time-clocks, mit-6-5840, build-your-own-x.

**Write-up.** A diagram of the partition experiment with the tip of each node over time, the convergence table, the tamper-detection output, and a paragraph on what proof of stake or a BFT protocol would change.
