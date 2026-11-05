# forge: an agent harness in Rust

**Goal.** A coding-agent harness in Rust that works with any model (OpenAI-compatible and Anthropic APIs, hosted models and nanoserve), runs every tool call in a real sandbox, manages its context window, speaks MCP on both sides, and publishes reproducible SWE-bench Verified and Terminal-Bench scores with their cost and traces.

**Why.** Agent roles in 2027 want engineers who treat the harness as a system: safe execution, context budgets, retries, observability and measured success rates. Few portfolios show a sandboxed harness with a SWE-bench number. It is one of the three projects for the 2027 applications and the core of localSpace's harness layer.

**Scope.** MVP: a streaming model client; typed tool calls validated against JSON Schema; read, edit, run-shell and search tools; a sandbox built from Landlock, seccomp and bubblewrap with the network off unless granted; compaction when the window fills, a persistent task plan, and token and cost accounting; an MCP client and server; JSONL traces with replay; the evals. Stretch: parallel sub-agents with a shared plan, OpenTelemetry traces, and grammar-constrained tool calls for local models via llguidance.

**Architecture.** The agent loop sends the conversation to the model client and gets back tool calls. The tool registry validates each call's arguments and permissions and runs it inside the sandbox, where only the task workspace is writable. The context manager keeps the conversation inside the token budget, MCP servers add more tools, and every step is written to a trace that the eval runner scores and replays.

**Stack.** Rust with tokio, reqwest, serde and jsonschema, the landlock crate, seccompiler, bubblewrap, Firecracker for untrusted eval tasks, rmcp, the tracing and OpenTelemetry crates, and the SWE-bench and Terminal-Bench harnesses.

**Milestones.** Core loop (48 h) · Sandbox (64 h) · Context engineering (48 h) · MCP (40 h) · Evals (88 h) · Stretch (48 h) · Total 336 h.

**Done when.** A SWE-bench Verified subset score is published with the exact model, prompt and cost. A sandbox test suite shows that writes outside the workspace and network calls are blocked. One external MCP server and forge's own server both work end to end.

**Measure and report.** Pass rate, cost and tokens per solved task on a fixed 50-task SWE-bench Verified subset, run at least three times, next to mini-swe-agent with the same model; the Terminal-Bench score; the failure categories found in the traces; harness overhead as a share of wall time.

**Pitfalls.** Landlock's network rules need ABI 4 (Linux 6.7 or later), so check at startup. A hand-written seccomp denylist misses system calls; record an allowlist in log-only mode, then enforce it. Leaving the network on during SWE-bench lets the agent look up the upstream fix. Reporting the best run instead of the mean and spread. Dropping old messages instead of compacting them, which loses task details.

**References.** paper-swe-bench, paper-swe-agent, mini-swe-agent, docs-claude-agent-sdk-agent-loop, mcp-docs, docs-kernel-landlock, repo-bubblewrap, practice-terminal-bench, docs-inspect-ai, repo-mcp-rust-sdk.

**Write-up.** The score table with model, prompt and cost first, then the sandbox design and its escape tests, how compaction works, the failure categories and what one fix moved, and the MCP integration.
