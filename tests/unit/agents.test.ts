import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { AGENT_AREAS, AGENT_WORDS, agentAreasOf, isAgents } from '../../src/lib/agents.ts';
import { shelfOf } from '../../src/lib/library-home.ts';

/** Agents & MCP (ATLAS-LIBRARY, 15,364 rows): the quick filter for the agents, MCP and harnesses cluster. */
describe('Agents & MCP', () => {
  it('uses the words of the prompt and offers its six areas', () => {
    expect(AGENT_WORDS).toEqual(['agent', 'agentic', 'MCP', 'Model Context Protocol', 'harness', 'tool calling', 'function calling', 'sandbox', 'SWE-bench', 'coding agent']);
    expect(AGENT_AREAS.map((a) => a.label)).toEqual(['MCP', 'Harness & loop', 'Tools & sandbox', 'Evals', 'Frameworks', 'Books']);
  });

  it('matches a word at its start in the title or summary, in the software tracks', () => {
    expect(isAgents('Rig: build LLM agents in Rust', '', 'languages')).toBe(true);
    expect(isAgents('llama.cpp server', 'Grammar-constrained tool calling for any model.', 'ai')).toBe(true);
    expect(isAgents('Firecracker', 'A sandboxing microVM for untrusted code.', 'systems')).toBe(true);
    expect(isAgents('ChatEDA', 'An autonomous agent for EDA flows.', 'hardware')).toBe(true);
    expect(isAgents('Operating Systems: Three Easy Pieces', 'Virtualization, concurrency, persistence.', 'systems')).toBe(false);
  });

  it('reads an acronym as a whole word, and leaves the other tracks out', () => {
    expect(isAgents('The Model Context Protocol specification', '', 'ai')).toBe(true);
    expect(isAgents('A Rust MCP SDK', '', 'languages')).toBe(true);
    expect(isAgents('The MCPTox benchmark', 'Tool poisoning in real servers.', 'ai')).toBe(false);
    expect(isAgents('A reagent for every bench', '', 'ai')).toBe(false);
    // An RL agent in robotics, an agent-based model in simulation, a free agent in game AI: not the cluster.
    expect(isAgents('Training with an RL agent', '', 'robotics')).toBe(false);
    expect(isAgents('Agent-based models of traffic', '', 'simulation')).toBe(false);
    expect(isAgents('Fractals, noise and agents', '', 'gamedev')).toBe(false);
  });

  it('reads an area from the title and summary, and Books from the shelf', () => {
    expect(agentAreasOf('rmcp: the Rust MCP SDK', 'Streamable HTTP and stdio transports.')).toEqual(['mcp', 'frameworks']);
    expect(agentAreasOf('How to build an agent', 'A coding agent loop in 400 lines; errors come back as tool results.')).toEqual(['harness']);
    expect(agentAreasOf('bubblewrap', 'Unprivileged sandboxing with namespaces and seccomp.')).toEqual(['tools']);
    expect(agentAreasOf('SWE-bench Verified', 'Pass@k on real GitHub issues.')).toEqual(['evals']);
    expect(agentAreasOf('LangGraph', 'A framework for stateful agents.')).toEqual(['frameworks']);
    expect(agentAreasOf('AI Engineering', 'Building applications with foundation models.', 'book')).toEqual(['books']);
    expect(agentAreasOf('A rig for the bench', 'No framework here.')).toEqual(['frameworks']);
    expect(agentAreasOf('The rig', '')).toEqual([]);
  });

  it('finds the cluster in the data, each area with dozens', () => {
    const seed = loadSeedOrThrow();
    const rows = seed.resources.filter((r) => isAgents(r.title, r.summary, r.tracks[0]));
    expect(rows.length).toBeGreaterThan(800);
    expect(rows.some((r) => r.id === 'repo-mcp-rust-sdk')).toBe(true);
    for (const area of AGENT_AREAS) {
      const count = rows.filter((r) => agentAreasOf(r.title, r.summary, shelfOf(r)).includes(area.key)).length;
      expect(count, area.label).toBeGreaterThan(10);
    }
    expect(rows.filter((r) => r.cost === 'paid').length).toBeGreaterThan(10);
  });
});
