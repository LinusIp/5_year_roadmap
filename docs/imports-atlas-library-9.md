# The Atlas Library import, ninth file (pull request #31)

`scratch/import-atlas.ts` upserted the 15,104-row `atlas-resources.jsonl` into `data/`. Its first 14,547 rows are the
file of pull request #30, unchanged: every one found its entry again and nothing was filled. All 557 rows it adds are
new (`data/resources/library-atlas-9.yaml`); none matched an entry the Library had, by id, URL, checked pair or
title. No URL was changed. Every row is dated 2026-10-21 and carries the tag `security`, which the runner adds: the
file is the cyber defence set, and the tag is what "Security & defence" reads.

| Shelf | Added | Before | After |
|---|---|---|---|
| Courses | 16 | 1,083 | 1,099 |
| Books | 22 | 615 | 637 |
| Papers | 98 | 4,758 | 4,856 |
| Articles (with docs and tutorials) | 306 | 4,628 | 4,934 |
| Blogs | 15 | 383 | 398 |
| Practice | 100 | 3,137 | 3,237 |

Resources: 14,553 to 15,110. By track: systems 1,739 to 1,915, DevOps 409 to 537, architecture 986 to 1,101, AI
4,582 to 4,681, hardware 376 to 396, languages 567 to 586. By type: 227 docs, 100 practice, 98 papers, 67 articles,
22 books, 15 blogs, 12 tutorials, 12 courses, 4 video courses. Priority: 438 rows at 2, 99 at 1, 20 at 3. Roadmaps:
250 serve software-architect, 67 ai-engineer, 33 ai-agents, 207 none; 31 name generative AI as their research
area. 319 rows got a soft prerequisite the Library resolves; 28 keep the text.

What they are: security foundations and frameworks (NIST, MITRE ATT&CK, OWASP, CIS, Ross Anderson), system
hardening (CIS Benchmarks, OpenSCAP, SELinux, TPM and attestation, secrets management), malware defence and analysis
for defenders (Mandiant FLARE, YARA, OpenSecurityTraining2), detection and incident response (Sysmon, Zeek,
Suricata, Snort, Velociraptor, Sigma, honeypots, blue-team labs), network and web defence (Cloudflare, OWASP, BCP 38),
secure development (CodeQL, Semgrep, fuzzing, SBOMs, secret scanning, advisories, memory safety, disclosure) and LLMs
and agents for defence plus securing LLM apps (prompt injection defences, MCP security, guardrails). All defensive.

## Where they show

"Security & defence" (`src/lib/security.ts`): a row on the Library's home and `#/library?pick=security`, 706
resources: the 557 tagged rows and 149 older rows the prompt's words find in the systems, DevOps, architecture, AI,
hardware and languages tracks (Meltdown and Spectre, Security Engineering, BeyondCorp, the prompt injection papers,
the Web Security Academy, MIT 6.858). Seven area chips over the list: Foundations 258, Secure development 225,
Network & web 187, Detection & response 179, Hardening 179, AI for defence 135, Malware 105; 21 rows name no area.

## Links

The new rows' links were checked by a one-off `links-atlas-9` job on the pull request; the report is in
DECISIONS.md ("The Atlas Library's ninth file"). No URL was changed; nothing is marked until someone has opened it.
