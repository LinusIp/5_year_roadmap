/**
 * "Security & defence" (ATLAS-LIBRARY, 15,104 rows): the quick filter for the cyber defence cluster, which the file
 * spreads across the systems, DevOps, architecture, AI, hardware and languages tracks rather than giving it a track
 * of its own. The ninth file's rows carry the tag `security`, which is the sure anchor; the prompt's words, matched on
 * an item's title and summary (the file's `why`) in those tracks, bring in the older rows on the same subjects. The
 * filter has seven areas, chips over the list, each a set of words of its own.
 */
export const SECURITY_WORDS: readonly string[] = ['security', 'secure', 'hardening', 'malware', 'ransomware', 'phishing', 'detection', 'incident', 'SIEM', 'forensic', 'threat', 'vulnerability', 'fuzz', 'CVE', 'zero trust', 'firewall', 'DDoS', 'WAF', 'prompt injection', 'red team', 'ATT&CK', 'YARA', 'Sigma'];

/** The tracks the cluster lives in (the file's six, and the ones the Library gathers with them). */
export const SECURITY_TRACKS: ReadonlySet<string> = new Set(['systems', 'swe', 'devops', 'architecture', 'ai', 'inference', 'hardware', 'embedded', 'languages']);

/**
 * Words that name security only beside another of the list: "detection" alone is object or failure detection and
 * "incident" alone an SRE postmortem.
 */
const ONLY_WITH_ANOTHER: ReadonlySet<string> = new Set(['detection', 'incident']);

function pattern(word: string): RegExp {
  // An acronym (SIEM, CVE, DDoS, WAF, YARA) and Sigma are whole words in their own case, so "sigma" the letter and
  // "waf" inside a word stay out; the other words match at their start in any case ("secure" finds securing).
  if (word === word.toUpperCase() || word === 'Sigma' || word === 'DDoS') return new RegExp('(^|[^A-Za-z])' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z])');
  return new RegExp('(^|[^a-z])' + word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

const PATTERNS = SECURITY_WORDS.map((word) => ({ word, re: pattern(word) }));

/** Whether an item belongs to the cluster: tagged `security`, or in the cluster's tracks and named by the words. */
export function isSecurity(title: string, summary = '', track = '', tags: readonly string[] = []): boolean {
  if (tags.includes('security')) return true;
  if (!SECURITY_TRACKS.has(track)) return false;
  const text = title + ' ' + summary;
  const hits = PATTERNS.filter((p) => p.re.test(text)).map((p) => p.word);
  if (hits.length === 0) return false;
  return hits.some((w) => !ONLY_WITH_ANOTHER.has(w)) || hits.length > 1;
}

export interface SecurityArea {
  key: string;
  label: string;
  /** Lower-case word starts; an entry with a space matches the phrase, an upper-case entry is a whole acronym. */
  words: readonly string[];
}

/** The prompt's seven sub-chips. An item can belong to several; one that names none shows under no chip. */
export const SECURITY_AREAS: readonly SecurityArea[] = [
  { key: 'foundations', label: 'Foundations', words: ['security engineering', 'cybersecurity', 'cyber security', 'framework', 'NIST', 'CIS', 'ISO 27001', 'risk', 'threat model', 'cryptograph', 'crypto', 'authenticat', 'authoriz', 'access control', 'identity', 'IAM', 'fundamental', 'principle', 'policy', 'policies', 'compliance', 'privacy', 'ross anderson', 'security basics', 'introduction to security', 'what is', 'glossary', 'standard', 'governance', 'passkey', 'password', 'mfa', 'oauth', 'openid', 'pki', 'certificate', 'tls', 'encryption', 'signing', 'key management', 'cvss', 'scoring', 'ctf', 'picoctf', 'tryhackme', 'hacker101', 'academy', 'learning path', 'course', 'textbook', 'lecture', 'blog', 'newsletter', 'weekly', 'news', 'essays', 'reporting', 'careers', 'row-level security', 'computer security', 'systems security'] },
  { key: 'hardening', label: 'Hardening', words: ['hardening', 'harden', 'selinux', 'apparmor', 'seccomp', 'sandbox', 'benchmark', 'baseline', 'least privilege', 'patch', 'sysctl', 'lockdown', 'secure boot', 'measured boot', 'tpm', 'attestation', 'container security', 'kubernetes security', 'pod security', 'stig', 'scap', 'openscap', 'kube-bench', 'kubescape', 'trivy', 'gatekeeper', 'kyverno', 'prowler', 'scoutsuite', 'posture', 'misconfiguration', 'secrets management', 'vault', 'sops', 'sealed secrets', 'rbac', 'capabilit', 'namespaces', 'cgroups', 'landlock', 'ebpf security', 'firmware', 'uefi', 'keylime', 'integrity', 'immutable', 'ssh hardening', 'server setup', 'configuration', 'kernel', 'rowhammer', 'dram', 'post-install', 'administration', 'administrator', 'ubuntu server', 'debian', 'archwiki', 'defence map', 'defense map', 'self protection', 'mitigation', 'exploit mitigation', 'control-flow', 'cfi'] },
  { key: 'malware', label: 'Malware', words: ['malware', 'ransomware', 'phishing', 'reverse engineering', 'reverse-engineering', 'ghidra', 'yara', 'flare', 'unpack', 'binary analysis', 'disassembl', 'decompil', 'rootkit', 'botnet', 'trojan', 'sample', 'analysis lab', 'remnux', 'cuckoo', 'capa', 'pe file', 'packer', 'obfuscat', 'implant', 'c2', 'command and control', 'ioc', 'indicator', 'virustotal', 'sandbox analysis', 'triage', 'antivirus', 'anti-virus', 'av engine', 'defender', 'worm', 'notpetya', 'wannacry', 'stuxnet', 'assembly', 'gdb', 'debugger', 'x86', 'arm', 'radare', 'ida', 'pe format', 'elf', 'lateral movement', 'credential theft', 'software s0'] },
  { key: 'detection', label: 'Detection & response', words: ['detection', 'incident', 'siem', 'forensic', 'sigma', 'att&ck', 'hunting', 'hunt', 'edr', 'logging', 'log management', 'audit log', 'response', 'sysmon', 'osquery', 'wazuh', 'velociraptor', 'zeek', 'suricata', 'snort', 'ids', 'ips', 'intrusion', 'playbook', 'soc', 'blue team', 'dfir', 'timeline', 'artifact', 'kape', 'event forwarding', 'honeypot', 'canary', 'alert', 'graylog', 'splunk', 'elastic security', 'arkime', 'packet capture', 'pcap', 'telemetry', 'auditd', 'falco', 'tetragon', 'threat intel', 'mitre', 'd3fend', 'atomic red team', 'purple team', 'tabletop', 'post-incident', 'postmortem', 'threat-intel', 'threat intelligence', 'cti', 'stix', 'misp', 'opencti', 'taxii', 'analysis of', 'the morris worm'] },
  { key: 'network', label: 'Network & web', words: ['network security', 'web security', 'firewall', 'ddos', 'waf', 'tls', 'https', 'dns', 'vpn', 'wireguard', 'zero trust', 'bgp', 'owasp', 'xss', 'csrf', 'injection', 'cors', 'csp', 'content security policy', 'cookie', 'session', 'oauth', 'api security', 'cloudflare', 'nginx', 'proxy', 'rate limit', 'bot', 'captcha', 'certificate', 'let\'s encrypt', 'ssh', 'port', 'segmentation', 'nftables', 'iptables', 'ufw', 'pf', 'wireshark', 'tcpdump', 'http security', 'headers', 'same-origin', 'browser security', 'web application', 'juice shop', 'webgoat', 'nodegoat', 'burp', 'zap', 'dast', 'top 10', 'ingress filtering', 'spoof', 'routing security', 'rpki', 'aspa', 'bcp 38', 'forms', 'validation', 'ebpf', 'cilium', 'service mesh', 'mtls', 'network policy', 'isovalent'] },
  { key: 'development', label: 'Secure development', words: ['secure coding', 'secure development', 'secure by design', 'sast', 'dast', 'static analysis', 'fuzz', 'codeql', 'semgrep', 'sbom', 'supply chain', 'dependenc', 'disclosure', 'cve', 'advisory', 'memory safety', 'memory-safe', 'unsafe', 'sanitizer', 'asan', 'ubsan', 'cert c', 'clippy', 'lint', 'code review', 'secret scanning', 'secrets', 'gitleaks', 'trufflehog', 'signing', 'sigstore', 'cosign', 'slsa', 'provenance', 'reproducible', 'openssf', 'scorecard', 'best practices badge', 'audit', 'cargo', 'govulncheck', 'pip-audit', 'dependabot', 'renovate', 'osv', 'cyclonedx', 'spdx', 'syft', 'grype', 'threat modeling', 'stride', 'proactive controls', 'bug bounty', 'exploit mitigation', 'cfi', 'aslr', 'stack protector', 'rust', 'bounds', 'integer overflow', 'buffer overflow', 'use-after-free', 'checkov', 'iac', 'infrastructure as code', 'github actions', 'ci security', 'zizmor', 'testing', 'sdl', 'development lifecycle', 'private reporting', 'report', 'vulnerability', 'patch management', 'soundness', 'proof system', 'formal verification', 'verified'] },
  { key: 'ai', label: 'AI for defence', words: ['llm', 'large language model', 'language model', 'ai agent', 'agent', 'prompt injection', 'jailbreak', 'red team', 'guardrail', 'ai security', 'machine learning', 'ml ', 'adversarial', 'mcp', 'model context protocol', 'poisoning', 'alignment', 'claude', 'gpt', 'copilot', 'ai-assisted', 'ai assisted', 'ai for', 'with ai', 'neural', 'deep learning', 'transformer', 'rag', 'tool use', 'autonomous', 'ai model', 'model security', 'ai safety', 'cyberseceval', 'benchmark for llm', 'llm app', 'owasp top 10 for llm', 'garak', 'promptfoo', 'nemo guardrails', 'rebuff', 'lakera', 'content safety', 'moderation', 'classifier', 'shield', 'agi safety', 'misuse', 'a2a', 'curator', 'evaluation', 'resilient prompts', 'spotlighting', 'dual llm'] },
];

function normalise(text: string): string {
  return ' ' + text.toLowerCase().replace(/[^a-z0-9&+'-]+/g, ' ') + ' ';
}

/** The areas an item belongs to, from its title and summary. */
export function securityAreasOf(title: string, summary = ''): string[] {
  const text = normalise(title + ' ' + summary);
  const raw = title + ' ' + summary;
  return SECURITY_AREAS.filter((a) =>
    a.words.some((w) => (w === w.toUpperCase() && /^[A-Z0-9 ]+$/.test(w) ? new RegExp('(^|[^A-Za-z])' + w + '(?![A-Za-z])').test(raw) : text.includes(' ' + w))),
  ).map((a) => a.key);
}
