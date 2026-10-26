/**
 * "Agents & MCP" (ATLAS-LIBRARY, 15,364 rows): the quick filter for the agents, MCP and harnesses cluster (Rust and C++
 * agent and MCP building blocks, llama.cpp tool calling, sandboxing, evals, the agent-engineering books), which the file
 * spreads across the AI, inference, systems, DevOps, architecture, languages and hardware tracks. The prompt's words,
 * matched on an item's title and summary (the file's `why`) in those tracks, name the cluster; six areas, chips over
 * the list, each a set of words of its own, and Books the shelf.
 */
export const AGENT_WORDS: readonly string[] = ['agent', 'agentic', 'MCP', 'Model Context Protocol', 'harness', 'tool calling', 'function calling', 'sandbox', 'SWE-bench', 'coding agent'];

/** The tracks the cluster lives in: the software ones. An RL agent in robotics or an agent-based model in simulation is not it. */
export const AGENT_TRACKS: ReadonlySet<string> = new Set(['ai', 'inference', 'systems', 'swe', 'devops', 'architecture', 'languages', 'hardware', 'embedded']);

function pattern(word: string): RegExp {
  // An acronym (MCP, SWE-bench's SWE) is a whole word in its own case; the other words match at their start in any case
  // ("agent" finds agents and agentic, "sandbox" finds sandboxing).
  if (word === word.toUpperCase() || word === 'SWE-bench') return new RegExp('(^|[^A-Za-z])' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z])');
  return new RegExp('(^|[^a-z])' + word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

const PATTERNS = AGENT_WORDS.map((word) => pattern(word));

/** Whether an item belongs to the cluster: in its tracks and named by the words. */
export function isAgents(title: string, summary = '', track = ''): boolean {
  if (!AGENT_TRACKS.has(track)) return false;
  const text = title + ' ' + summary;
  return PATTERNS.some((re) => re.test(text));
}

export interface AgentArea {
  key: string;
  label: string;
  /** Words of its own, matched like the cluster's; `shelf` instead names a shelf (Books). */
  words?: readonly string[];
  shelf?: 'book';
}

/** The six areas of the prompt, as chips over the list. An item can be in several. */
export const AGENT_AREAS: readonly AgentArea[] = [
  { key: 'mcp', label: 'MCP', words: ['MCP', 'Model Context Protocol', 'rmcp'] },
  { key: 'harness', label: 'Harness & loop', words: ['harness', 'agent loop', 'coding agent', 'Codex', 'Claude Code', 'goose', 'context engineering', 'compaction', 'prompt cach', 'subagent', 'sub-agent', 'multi-agent', 'long-running'] },
  { key: 'tools', label: 'Tools & sandbox', words: ['tool calling', 'function calling', 'tool use', 'tool-use', 'sandbox', 'seccomp', 'Firecracker', 'Hyperlight', 'bubblewrap', 'Landlock', 'gVisor', 'JSON-RPC', 'PTY', 'grammar', 'JSON Schema', 'permission'] },
  { key: 'evals', label: 'Evals', words: ['eval', 'benchmark', 'SWE-bench', 'Terminal-Bench', 'BFCL', 'trajector', 'OpenTelemetry', 'observab', 'tracing', 'pass@'] },
  { key: 'frameworks', label: 'Frameworks', words: ['framework', 'Rig', 'Swiftide', 'LangGraph', 'LangChain', 'smolagents', 'Agents SDK', 'AutoGen', 'CrewAI', 'Pydantic AI', 'DSPy', 'mistral.rs', 'llama.cpp', 'rmcp', 'SDK'] },
  { key: 'books', label: 'Books', shelf: 'book' },
];

const AREA_PATTERNS = AGENT_AREAS.map((area) => ({ key: area.key, shelf: area.shelf, res: (area.words ?? []).map((w) => (w === w.toUpperCase() || /^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(w) || w === 'SWE-bench' || w === 'Terminal-Bench' ? new RegExp('(^|[^A-Za-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z])') : pattern(w))) }));

/** The areas an item of the cluster is in, by its title and summary, and its shelf for Books. */
export function agentAreasOf(title: string, summary = '', shelf = ''): string[] {
  const text = title + ' ' + summary;
  return AREA_PATTERNS.filter((a) => (a.shelf ? shelf === a.shelf : a.res.some((re) => re.test(text)))).map((a) => a.key);
}
