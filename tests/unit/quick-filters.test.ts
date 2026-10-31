import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { shelfOf } from '../../src/lib/library-home.ts';
import { isCertificate, QUICK_FILTER_KEYS, QUICK_FILTERS, quickFilterOf, quickPicks } from '../../src/lib/quick-filters.ts';

/** The quick filters (ATLAS-LIBRARY): the registry, the six the plan gap fill (15,961 rows) added, and Build & ship (16,076 rows). */
const item = (title: string, summary = '', track = 'ai', id = 'x', shelf = 'article') => ({ id, title, summary, track, shelf });

describe('the registry', () => {
  it('lists the eleven filters in the order of the rows, each with a label, an icon and a search name', () => {
    expect(QUICK_FILTER_KEYS).toEqual(['essentials', 'energy', 'security', 'agents', 'certificates', 'career', 'research', 'communication', 'opensource', 'mandarin', 'buildship']);
    for (const f of QUICK_FILTERS) {
      expect(f.label.length).toBeGreaterThan(3);
      expect(f.search.startsWith('Search ')).toBe(true);
      expect(f.sub.length).toBeGreaterThan(10);
    }
    expect(quickFilterOf('mandarin')?.label).toBe('Mandarin (the language)');
    expect(quickFilterOf('no-such')).toBeUndefined();
    expect(quickFilterOf(null)).toBeUndefined();
  });

  it('keeps the four older filters as they were', () => {
    expect(quickPicks(item('Pro Git', 'Branches, merges, rebases.', 'devops', 'pro-git'))).toContain('essentials');
    expect(quickPicks(item('Compact fusion reactors', 'Aneutronic fuel cycles.', 'engineering'))).toContain('energy');
    expect(quickPicks(item('YARA rules', 'Malware detection with YARA.', 'systems'))).toContain('security');
    expect(quickPicks(item('rmcp', 'The Rust MCP SDK.', 'languages'))).toContain('agents');
  });

  it('adds Build & ship (the twelfth file) by its module', () => {
    expect(quickPicks(item('GoReleaser Quick Start', 'Cross-compiled builds and GitHub releases.', 'devops'))).toContain('buildship');
    expect(quickPicks(item('Using PyInstaller', 'A one-file executable.', 'languages'))).toContain('buildship');
    expect(quickPicks(item('CleanRL', 'Single-file implementations of PPO.', 'ai'))).not.toContain('buildship');
    expect(quickFilterOf('buildship')?.search).toBe('Search build and ship');
  });
});

describe('the six new filters', () => {
  it('reads a certificate from its id alone', () => {
    expect(isCertificate('cert-nvidia-nca-genl')).toBe(true);
    expect(isCertificate('certs-and-keys')).toBe(false);
    expect(quickPicks(item('An exam', '', 'devops', 'cert-aws-ai-practitioner', 'course'))).toContain('certificates');
    expect(quickPicks(item('Certified Kubernetes', 'A cert.', 'devops', 'docs-cka'))).not.toContain('certificates');
  });

  it('finds Career & interviews by the prompt\'s words on any track, STAR as a whole word', () => {
    expect(quickPicks(item('Tech Interview Handbook', '', 'systems'))).toContain('career');
    expect(quickPicks(item('Negotiation rules', 'Compensation and offers.', 'architecture'))).toContain('career');
    expect(quickPicks(item('Behavioral questions with STAR', '', 'engineering'))).toContain('career');
    expect(quickPicks(item('Starlink', 'A constellation.', 'engineering'))).not.toContain('career');
  });

  it('finds Research skills by how research is done, not by the word paper alone', () => {
    expect(quickPicks(item('How to Find Research Problems', '', 'ai'))).toContain('research');
    expect(quickPicks(item('Ten simple rules for structuring papers', '', 'ai'))).toContain('research');
    expect(quickPicks(item('How Many Random Seeds?', 'Statistical power in deep RL.', 'ai'))).toContain('research');
    expect(quickPicks(item("Jake's Resume (LaTeX template)", '', 'architecture'))).toContain('research');
    expect(quickPicks(item('Attention Is All You Need', 'The transformer paper.', 'ai'))).not.toContain('research');
    expect(quickPicks(item('the morning paper', 'A paper a day.', 'systems'))).not.toContain('research');
  });

  it('finds Communication in its phrases, not in every documentation row or blog', () => {
    expect(quickPicks(item('Technical Writing One', '', 'architecture'))).toContain('communication');
    expect(quickPicks(item('How to Pitch Your Startup', '', 'architecture'))).toContain('communication');
    expect(quickPicks(item('The SAFE: the open standard for startup fundraising', '', 'architecture'))).toContain('communication');
    expect(quickPicks(item('TED\'s secret to great public speaking', '', 'architecture'))).toContain('communication');
    expect(quickPicks(item('vLLM Documentation', 'The docs.', 'inference'))).not.toContain('communication');
    expect(quickPicks(item("Brendan Gregg's Blog", 'Performance.', 'systems', 'b', 'blog'))).not.toContain('communication');
    expect(quickPicks(item('Writing an OS in Rust', '', 'systems'))).not.toContain('communication');
  });

  it('finds Open source as the act of contributing, in the software tracks, and not a code fork', () => {
    expect(quickPicks(item('Contributing to open source (GitHub Docs)', '', 'devops'))).toContain('opensource');
    expect(quickPicks(item('Fork a repository (GitHub Docs)', '', 'devops'))).toContain('opensource');
    expect(quickPicks(item('Google Summer of Code', '', 'devops'))).toContain('opensource');
    expect(quickPicks(item('llama.cpp CONTRIBUTING.md', '', 'devops'))).toContain('opensource');
    expect(quickPicks(item("fbtriton (Meta's Triton fork with TLX)", '', 'inference'))).not.toContain('opensource');
    expect(quickPicks(item('DiffRL (AHAC fork)', '', 'robotics'))).not.toContain('opensource');
  });

  it('finds Mandarin on the languages track only', () => {
    expect(quickPicks(item('A1 grammar points (Chinese Grammar Wiki)', '', 'languages'))).toContain('mandarin');
    expect(quickPicks(item('HSK 1 vocabulary', 'Pinyin and tones.', 'languages'))).toContain('mandarin');
    expect(quickPicks(item('CRUD-RAG: A Comprehensive Chinese Benchmark', '', 'ai'))).not.toContain('mandarin');
    expect(quickPicks(item('Deep Speech 2: English and Mandarin', '', 'ai'))).not.toContain('mandarin');
  });

  it('finds each cluster in the data, with dozens of rows', () => {
    const seed = loadSeedOrThrow();
    const counts = new Map<string, number>(QUICK_FILTER_KEYS.map((k) => [k, 0]));
    for (const r of seed.resources) for (const key of quickPicks({ id: r.id, title: r.title, summary: r.summary, track: r.tracks[0], tags: r.tags, shelf: shelfOf(r) })) counts.set(key, counts.get(key)! + 1);
    // 53 rows in the file: three are certifications the plan already tracks, one merged into the Library's HF MCP course.
    expect(counts.get('certificates')).toBe(49);
    expect(counts.get('career')).toBeGreaterThan(60);
    expect(counts.get('research')).toBeGreaterThan(100);
    expect(counts.get('research')).toBeLessThan(400);
    expect(counts.get('communication')).toBeGreaterThan(80);
    expect(counts.get('communication')).toBeLessThan(400);
    expect(counts.get('opensource')).toBeGreaterThan(25);
    expect(counts.get('mandarin')).toBeGreaterThan(15);
    expect(counts.get('mandarin')).toBeLessThan(40);
    expect(counts.get('essentials')).toBeGreaterThan(300);
    expect(counts.get('security')).toBeGreaterThan(600);
    expect(counts.get('agents')).toBeGreaterThan(800);
    expect(counts.get('buildship')).toBeGreaterThan(120);
    expect(counts.get('buildship')).toBeLessThan(200);
  });
});
