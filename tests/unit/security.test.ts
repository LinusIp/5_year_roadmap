import { describe, expect, it } from 'vitest';
import { isSecurity, SECURITY_AREAS, SECURITY_WORDS, securityAreasOf } from '../../src/lib/security.ts';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';

describe('Security & defence', () => {
  it('uses the words of the prompt and offers its seven areas', () => {
    expect(SECURITY_WORDS).toEqual(['security', 'secure', 'hardening', 'malware', 'ransomware', 'phishing', 'detection', 'incident', 'SIEM', 'forensic', 'threat', 'vulnerability', 'fuzz', 'CVE', 'zero trust', 'firewall', 'DDoS', 'WAF', 'prompt injection', 'red team', 'ATT&CK', 'YARA', 'Sigma']);
    expect(SECURITY_AREAS.map((a) => a.label)).toEqual(['Foundations', 'Hardening', 'Malware', 'Detection & response', 'Network & web', 'Secure development', 'AI for defence']);
  });

  it('takes a row tagged security whatever its words or track', () => {
    expect(isSecurity('Syft: SBOM generator', 'Generates SBOMs', 'devops', ['security'])).toBe(true);
    expect(isSecurity('Syft: SBOM generator', 'Generates SBOMs', 'devops')).toBe(false);
  });

  it('matches a word at its start in the title or summary, in the cluster tracks', () => {
    expect(isSecurity('Security Engineering (3rd edition)', '', 'architecture')).toBe(true);
    expect(isSecurity('Secure coding in C', '', 'languages')).toBe(true);
    expect(isSecurity('UFW Essentials: Common Firewall Rules', '', 'devops')).toBe(true);
    expect(isSecurity('Design Patterns for Securing LLM Agents against Prompt Injections', '', 'ai')).toBe(true);
    expect(isSecurity('The Fuzzing Book', '', 'architecture')).toBe(true);
    expect(isSecurity('A YARA primer', '', 'systems')).toBe(true);
  });

  it('reads an acronym as a whole word in its own case, and leaves the other tracks out', () => {
    expect(isSecurity('Writing Sigma rules', '', 'devops')).toBe(true);
    expect(isSecurity('Six Sigma for engineers', '', 'engineering')).toBe(false);
    expect(isSecurity('The sigma of a Gaussian', '', 'systems')).toBe(false);
    expect(isSecurity('Black hole firewalls', '', 'math')).toBe(false);
    expect(isSecurity('A waffle recipe', '', 'systems')).toBe(false);
  });

  it('needs more than detection or incident alone', () => {
    expect(isSecurity('YOLO: object detection', '', 'ai')).toBe(false);
    expect(isSecurity('Postmortem Culture: Learning from Failure', 'incident reviews', 'architecture')).toBe(false);
    expect(isSecurity('Threat detection with Sysmon', '', 'devops')).toBe(true);
    expect(isSecurity('Incident response and forensic triage', '', 'devops')).toBe(true);
  });

  it('reads an area from the title and summary', () => {
    expect(securityAreasOf('Suricata User Guide', 'the IDS/IPS')).toContain('detection');
    expect(securityAreasOf('CodeQL Docs: Writing CodeQL queries')).toContain('development');
    expect(securityAreasOf('CIS Benchmarks', 'configuration baselines')).toEqual(expect.arrayContaining(['foundations', 'hardening']));
    expect(securityAreasOf('Prompt Guard tutorial', 'for LLM apps')).toContain('ai');
    expect(securityAreasOf('RFC 2827 (BCP 38): Network Ingress Filtering')).toContain('network');
    expect(securityAreasOf('Mandiant FLARE: malware analysis')).toContain('malware');
  });

  it('finds the cluster in the data: the ninth file and the older rows, each area with dozens', () => {
    const seed = loadSeedOrThrow();
    const hits = seed.resources.filter((r) => isSecurity(r.title, r.summary, r.tracks[0], r.tags));
    const tagged = hits.filter((r) => r.tags?.includes('security'));
    // 557 in the ninth file; the quality audit of the tenth (ATLAS-LIBRARY, 15,364 rows) removed the NSA WPA3 report, and
    // the quality pass (ATLAS-QUALITY-AUDIT, 16,448 rows) dropped 74 more it graded 1 or 2.
    expect(tagged.length).toBe(482);
    expect(hits.length).toBeGreaterThan(600);
    const tracks = new Set<string>(hits.map((r) => r.tracks[0]!));
    for (const t of ['systems', 'devops', 'architecture', 'ai']) expect(tracks.has(t)).toBe(true);
    expect(tracks.has('math')).toBe(false);
    const counts = new Map<string, number>();
    let none = 0;
    for (const r of hits) {
      const areas = securityAreasOf(r.title, r.summary);
      if (areas.length === 0) none += 1;
      for (const a of areas) counts.set(a, (counts.get(a) ?? 0) + 1);
    }
    for (const a of SECURITY_AREAS) expect(counts.get(a.key) ?? 0, a.label).toBeGreaterThan(60);
    expect(none / hits.length).toBeLessThan(0.08);
  });
});
