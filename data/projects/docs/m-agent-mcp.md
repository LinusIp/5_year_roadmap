# Multi-tool agent with an MCP server, evals and tracing

**Goal.** A hand-written agent loop that does one real task for you (research a topic, triage your notes or plan a study week) with at least three tools, one served by your own MCP server, scored on 25 or more eval tasks, traced end to end and guarded against prompt injection.

**Why.** It turns agent ideas into a system you can measure: `ai-agents/agent-loop`, `ai-agents/implementing-the-agent-loop`, `ai-agents/tool-definition`, `ai-agents/mcp-servers`, `ai-agents/creating-mcp-servers`, `ai-agents/mcp-client`, `ai-agents/ragas`, `ai-agents/deepeval`, `ai-agents/langfuse`, `ai-agents/structured-logging-and-tracing`, `ai-agents/metrics-to-track`, `ai-agents/prompt-injection-jailbreaks` and `ai-agents/tool-sandboxing-permissioning`.

**Scope.** MVP: one task domain; a loop over a model's native tool-calling API with step and token budgets; three tools (for example web search, a notes search and a file or calendar writer), the notes tool behind your MCP server; per-tool permissions (read-only by default, writes need confirmation); 25 eval tasks scored with Ragas or DeepEval; LangFuse or OpenLLMetry traces. Stretch: a remote MCP server over streamable HTTP, a second model on the same evals, memory across sessions, evals in CI on every pull request.

**Architecture.** The agent holds the conversation, sends it with the tool schemas to the model, and dispatches each tool call: local tools directly, MCP tools through a client session to your server. A policy layer checks every call against the tool's permission and wraps retrieved text as data, never instructions. Every model and tool call is a span with tokens, latency and cost. The eval runner replays the task set and logs scores per commit.

```
user ─▶ agent loop ─▶ LLM (tool schemas)
           │ tool call
           ▼
        policy ─▶ local tools | MCP client ─▶ your MCP server ─▶ notes
           │
        spans ─▶ LangFuse        evals ─▶ Ragas / DeepEval ─▶ scores.csv
```

**Stack.** Python 3.12, the Anthropic or OpenAI SDK (or a local model with tool calling), the official MCP Python SDK, LangFuse or OpenLLMetry, Ragas or DeepEval, pytest.

**Milestones.** Hand-written loop with two local tools (6 h) · MCP server and client for the third tool (6 h) · tracing with tokens, latency and cost (4 h) · 25-task eval set and scoring (8 h) · permissions, injection guard and their tests (6 h) · tuning and write-up (5 h). Total 35 h.

**Done when.** The loop uses no agent framework. The MCP server works in the MCP Inspector and the agent calls it over stdio. At least 25 eval tasks are scored, the agent passes at least 70 % of them, and the scores are in the README. Every run appears as a trace showing each tool call, its latency and its cost. One test shows a write tool refused without permission; another plants an instruction in a retrieved note and shows the agent does not follow it.

**Measure and report.** Task pass rate and the Ragas or DeepEval metrics (faithfulness, answer relevancy, tool-call correctness); median and p95 steps, latency and cost per task; the guardrail test results; how the scores moved across three iterations.

**Pitfalls.** Eval tasks too easy to separate one version from the next. Tool descriptions so vague the model picks the wrong tool. Unbounded loops when a tool keeps returning errors. Treating retrieved text as instructions. Sending secrets or private notes to a hosted tracing service.

**References.** hf-mcp-course, hf-agents-course, paper-react, berkeley-llm-agents, roadmap-ai-agents, opentelemetry-docs.

**Write-up.** A trace screenshot of one task, the eval table across iterations, the MCP tool's schema, the two guardrail tests, and the failure mode you would fix next.
