# The Atlas Library's harness additions (pull request #23)

`scratch/import-atlas.ts` upserted the 226-row `atlas-additions-harness-2026-10-21.jsonl` into `data/`: agent
harnesses, agent evaluation and benchmarks, and self-improving agents. No row's id was in the Library, and none matched
an entry by URL or title, so all 226 are new (`data/resources/library-harness.yaml`). No URL was changed.

## Kept apart

Three rows first matched an entry by their short titles; read by hand, each is a different work (`NOT_SAME`):

| Import id | Library entry | Why |
|---|---|---|
| `paper-sakana-mass` | `paper-mass-multi-agent-design` | Sakana's "Recursive Self-Improvement through Multi-Agent Self-Supervision" (MASS), not "Multi-Agent Design" (also MASS) |
| `article-fowler-context-engineering-coding-agents` | `article-humanlayer-advanced-context-engineering` | Birgitta Böckeler's article on martinfowler.com, not HumanLayer's guide |
| `paper-weak-for-strong` | `paper-weak-to-strong-generalization` | a weak meta-agent driving strong executors (W4S), not OpenAI's weak-to-strong generalization |

Near misses below the threshold are different works too: codebases beside their papers (Agent Workflow Memory, Eureka,
OPRO), Live-SWE-agent beside SWE-agent, and Addy Osmani's "Agent Harness Engineering" beside Latent Space's "Agent
Engineering".
