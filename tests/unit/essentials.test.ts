import { describe, expect, it } from 'vitest';
import { isEssential } from '../../src/lib/essentials.ts';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';

describe('Developer essentials', () => {
  it('matches a title that names one of the everyday tools, as a whole word', () => {
    expect(isEssential('Pro Git')).toBe(true);
    expect(isEssential('PostgreSQL Documentation: Chapter 11. Indexes')).toBe(true);
    expect(isEssential('HTTP/2 in Action')).toBe(true);
    expect(isEssential('The Linux Command Line')).toBe(true);
    expect(isEssential('Learn CSS Grid')).toBe(true);
    expect(isEssential('React Docs: Thinking in React')).toBe(true);
    expect(isEssential('Bash Guide (Wooledge)')).toBe(true);
  });

  it('never matches a word that only contains one', () => {
    expect(isEssential('Digital Design and Computer Architecture')).toBe(false);
    expect(isEssential('GitHub Actions in depth')).toBe(false);
    expect(isEssential('Reactive Streams')).toBe(false);
    expect(isEssential('ReAct: Synergizing Reasoning and Acting in Language Models')).toBe(false);
    expect(isEssential('Shellfish farming')).toBe(false);
    expect(isEssential('Attention Is All You Need')).toBe(false);
  });

  it('reads the tags too', () => {
    expect(isEssential('Version control for scientists', ['git'])).toBe(true);
    expect(isEssential('Version control for scientists', ['versioning'])).toBe(false);
  });

  it('finds a few hundred of the Library, mostly systems, DevOps, architecture and languages', () => {
    const seed = loadSeedOrThrow();
    const hits = seed.resources.filter((r) => isEssential(r.title, r.tags));
    expect(hits.length).toBeGreaterThan(300);
    expect(hits.length).toBeLessThan(1000);
    const tracks = new Set<string>(hits.flatMap((r) => r.tracks));
    for (const t of ['systems', 'devops', 'architecture', 'languages']) expect(tracks.has(t)).toBe(true);
  });
});
