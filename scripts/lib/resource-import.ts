/**
 * Importing a list of resources into the Library (RESOURCES-ADD, MORE-RESOURCES, ATLAS-LIBRARY): the mapping from the
 * import file's fields to the resource schema, and the rules that find an entry the Library already has. Pure; the
 * one-off runners in scratch/ use it.
 */

/** One line of new-resources.jsonl. */
export interface ImportItem {
  id: string;
  title: string;
  short: string;
  type: 'video-course' | 'course' | 'book' | 'docs' | 'tutorial' | 'practice' | 'paper' | 'blog' | 'article';
  track: 'ai' | 'inference' | 'graphics' | 'gamedev' | 'systems' | 'languages' | 'architecture' | 'robotics' | 'devops' | 'simulation' | 'math' | 'engineering' | 'hardware' | 'quantum';
  level: 'beginner' | 'intermediate' | 'advanced';
  hours: number;
  provider: string;
  url: string;
  free: boolean;
  /** How it is free; `paid` (with `free: false`) on the books round's rows (ATLAS-LIBRARY, 15,364 rows). */
  note: '' | 'free audit' | 'free tier' | 'paid';
  why: string;
  after: string;
  year: 1 | 2 | 3;
  verified: string;
  /** ATLAS-LIBRARY's plan alignment: 1 inference and the AI feeding it, 2 architecture and systems, 3 graphics,
   * simulation, robotics and hardware, 4 game development, quantum computing and electrical and mechanical engineering. */
  priority?: 1 | 2 | 3 | 4;
  /** The quality pass (ATLAS-QUALITY-AUDIT): 5 canon, 4 strong, 3 useful but not essential, 1 and 2 kept for a topic asked for. */
  quality?: 1 | 2 | 3 | 4 | 5;
  /** The roadmap.sh roadmap it serves, or "". */
  roadmap?: '' | 'inference-engineering' | 'ai-engineer' | 'ai-agents' | 'software-architect' | 'game-developer';
  /** The year 3 research area, or "". */
  research?: '' | 'inference' | 'world-models' | 'diffusion' | 'genai';
}

/** What the Library already has, for the matching. */
export interface Existing {
  id: string;
  title: string;
  short?: string | undefined;
  url: string | null;
  /** Its shelf ("course", "paper", "blog"): titles are only compared within one. */
  shelf?: string | undefined;
}

/**
 * The resource types: a video course is a lecture series, docs and tutorials are read like articles; a blog is an
 * article marked `blog` (the Blogs shelf), a paper a paper (the Papers shelf).
 */
export const TYPE_OF = {
  'video-course': 'lectures',
  course: 'course',
  book: 'book',
  docs: 'article',
  tutorial: 'article',
  practice: 'practice',
  paper: 'paper',
  blog: 'article',
  article: 'article',
} as const;
/** The shelf an item lands on, as `shelfOf` in src/lib/library-home.ts files the resource it becomes. */
export const SHELF_OF = {
  'video-course': 'course',
  course: 'course',
  book: 'book',
  docs: 'article',
  tutorial: 'article',
  practice: 'practice',
  paper: 'paper',
  blog: 'blog',
  article: 'article',
} as const;
/** The Library's tracks: inference is AI with an `inference` tag; the others are tracks of their own. */
export const TRACK_OF = {
  ai: 'ai',
  inference: 'ai',
  graphics: 'graphics',
  gamedev: 'gamedev',
  systems: 'systems',
  languages: 'languages',
  architecture: 'architecture',
  robotics: 'robotics',
  devops: 'devops',
  simulation: 'simulation',
  math: 'math',
  engineering: 'engineering',
  hardware: 'hardware',
  quantum: 'quantum',
} as const;
export const LEVEL_OF = { beginner: 'intro', intermediate: 'intermediate', advanced: 'advanced' } as const;

/**
 * A URL as the matching compares it: lowercase, no scheme, no `www.`, no trailing slash, and an arXiv paper by its id
 * alone (its abstract, PDF and HTML pages, any version, are one paper).
 */
export function normaliseUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/^(?:export\.)?arxiv\.org\/(?:abs|pdf|html)\/([a-z-]+\/\d{7}|\d{4}\.\d{4,5})(?:v\d+)?(?:\.pdf)?\/?$/, 'arxiv.org/abs/$1')
    .replace(/\/+$/, '');
}

const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'for', 'with', 'to', 'in', 'on', 'from', 'your', 'you', 'how']);

/** A title's words, for the fuzzy match: lowercase, no brackets or punctuation, no small words. */
export function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^a-z0-9+#]+/g, ' ')
      .split(' ')
      .filter((w) => w && !STOP.has(w)),
  );
}

/**
 * How alike two titles are: the share of words they have in common (Jaccard), 0 to 1. Titles whose numbers differ
 * are different things whatever their words (GPU Gems 2 and GPU Gems 3).
 */
export function titleLikeness(a: string, b: string): number {
  const x = titleWords(a);
  const y = titleWords(b);
  if (x.size === 0 || y.size === 0) return 0;
  // Numbers and symbols name different things: GPU Gems 2 and 3, the Exercism C and C++ tracks.
  const marked = (words: Set<string>): string => [...words].filter((w) => /^\d+$/.test(w) || /[+#]/.test(w)).sort().join(' ');
  if (marked(x) !== marked(y)) return 0;
  // So do the numbers of two bracketed parts, which `titleWords` drops: "(SIGGRAPH 2015)" and "(SIGGRAPH 2023)" are
  // two years of one course, "(Spring 2014)" and "(Spring 2012)" two offerings. One side without brackets says nothing.
  // Roman numerals count as numbers there too: "(Part I)" and "(Part II)" are two papers (the PINNs pair).
  const bracketed = (title: string): string[] =>
    (title.match(/\(([^)]*)\)/g) ?? []).flatMap((part) => (part.match(/\d+|\b[ivx]+\b/gi) ?? []).map((n) => n.toLowerCase())).sort();
  const [p, q] = [bracketed(a), bracketed(b)];
  if (p.length > 0 && q.length > 0 && p.join(' ') !== q.join(' ')) return 0;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / (x.size + y.size - both);
}

/** Two titles this alike are the same resource. */
export const SAME_TITLE = 0.8;

/**
 * Pairs looked at by hand and found to be the same resource under another address (the import's id to the Library's):
 * NVIDIA renamed its CUDA guide, the raylib examples are a page of the raylib site, cs162.org is Berkeley's CS162.
 * From the second import: the Roofline technical report is the paper the queue has without a link, OpenAI's "world
 * simulators" page is the Sora report the queue has without a link, and iquilezles.org is the site of its articles.
 */
export const SAME_AS: Readonly<Record<string, string>> = {
  'cuda-programming-guide': 'cuda-guide',
  'raylib-examples': 'raylib',
  'berkeley-cs162': 'cs162',
  'paper-roofline': 'roofline',
  'article-openai-sora-world-simulators': 'sora-report',
  'blog-inigo-quilez': 'iq-articles',
};

/**
 * Pairs whose titles are alike but which were read by hand and are different things (the import's id to the
 * Library's): Microsoft's Orca (learning from GPT-4) is not the Orca serving paper, Dasgupta, Papadimitriou and
 * Vazirani's Algorithms is not Erickson's, LangChain's "Context Engineering" is not Anthropic's. From the 3,386-row file:
 * Google's "Agents" whitepaper is not Chip Huyen's "Agents", Karpathy's tokenizer video is not "Let's build GPT",
 * Lilian Weng's "Harness Engineering" is not OpenAI's, SGLang's structured outputs are neither Anthropic's nor OpenAI's.
 * From the 3,811-row file: Fitzpatrick's PHY 329 notes are not Newman's Computational Physics, and David Tong's notes
 * on topics in and on supersymmetric quantum mechanics are not his Quantum Mechanics. From the harness additions: Sakana's
 * MASS (recursive self-improvement) is not "Multi-Agent Design" (MASS too), Fowler's "Context Engineering for Coding
 * Agents" is not HumanLayer's "Advanced" one, and Weak-for-Strong (a meta-agent) is not Weak-to-Strong Generalization.
 * From the 10,436-row file, where a bracketed edition or form is dropped before titles are compared: Sanglard's Doom3
 * BFG review is not his Doom3 one; the FSDP2 tutorial is not FSDP's; MIT 6.851's Spring 2014 videos are not OCW's
 * 2012 lectures; two CRDT papers (Preguiça's overview, the approaches survey) are not Shapiro's; the Qwen2.5 Coder, VL
 * and 1M reports are not the Qwen2.5 report; the CP Handbook's LaTeX source is not the PDF; MIT 18.06's 2025 course
 * repo is not OCW's 2010 course; CMU 15-721's Spring 2024 lectures are not its course site. From the 11,389-row file:
 * Callen's plasma physics lectures are not EPFL's course, CRFM's HELM (the evaluation framework) is not Helm (the
 * Kubernetes package manager), NERSC's roofline page is not Berkeley Lab's.
 */
export const NOT_SAME: Readonly<Record<string, readonly string[]>> = {
  'paper-orca': ['orca'],
  'dpv-algorithms': ['erickson-algorithms'],
  'article-langchain-context-engineering': ['article-anthropic-context-engineering'],
  'whitepaper-google-agents': ['article-chip-huyen-agents'],
  'video-karpathy-gpt-tokenizer': ['video-karpathy-lets-build-gpt'],
  'article-weng-harness-engineering': ['article-openai-harness-engineering'],
  'docs-sglang-structured-outputs': ['docs-anthropic-structured-outputs', 'docs-openai-structured-outputs'],
  'fitzpatrick-computational-physics-329': ['newman-computational-physics-chapters'],
  'tong-topics-in-quantum-mechanics': ['tong-quantum-mechanics'],
  'tong-supersymmetric-qm': ['tong-quantum-mechanics'],
  'paper-sakana-mass': ['paper-mass-multi-agent-design'],
  'article-fowler-context-engineering-coding-agents': ['article-humanlayer-advanced-context-engineering'],
  'paper-weak-for-strong': ['paper-weak-to-strong-generalization'],
  'article-sanglard-doom3-bfg-review': ['article-sanglard-doom3-review'],
  'docs-pytorch-fsdp2-tutorial': ['tutorial-pytorch-fsdp'],
  'mit-6851-spring14': ['mit-6851-advanced-data-structures'],
  'paper-approaches-to-crdts': ['paper-crdts-shapiro'],
  'paper-crdt-overview-preguica': ['paper-crdts-shapiro'],
  'paper-qwen2-5-coder': ['paper-qwen2-5-report'],
  'paper-qwen2-5-vl': ['paper-qwen2-5-report'],
  'paper-qwen25-1m': ['paper-qwen2-5-report'],
  'repo-cphb-source': ['competitive-programmers-handbook'],
  'repo-mitmath-1806-2025': ['mit-18-06'],
  'video-cmu-15721-spring2024': ['cmu-15721-advanced-databases'],
  'video-callen-intro-plasma-physics': ['course-epfl-plasma-physics-intro'],
  'docs-crfm-helm': ['docs-helm'],
  'nersc-roofline-docs': ['docs-roofline-crd'],
};

/**
 * The entry the Library already has for an item: the same URL; the same id (the Library's own name for it); a pair
 * listed in SAME_AS; or a title (or short title) alike enough on the same shelf, so a paper and a post of one title
 * both stay.
 */
export function findExisting(item: Pick<ImportItem, 'id' | 'url' | 'title' | 'short'> & { type?: ImportItem['type'] }, existing: readonly Existing[]): { entry: Existing; by: 'url' | 'id' | 'checked' | 'title' } | null {
  const url = normaliseUrl(item.url);
  const byUrl = existing.find((e) => e.url !== null && normaliseUrl(e.url) === url);
  if (byUrl) return { entry: byUrl, by: 'url' };
  const byId = existing.find((e) => e.id === item.id);
  if (byId) return { entry: byId, by: 'id' };
  const checked = SAME_AS[item.id] ? existing.find((e) => e.id === SAME_AS[item.id]) : undefined;
  if (checked) return { entry: checked, by: 'checked' };
  let best: { entry: Existing; score: number } | null = null;
  const shelf = item.type ? SHELF_OF[item.type] : undefined;
  const itemShort = titleWords(item.short).size >= 2 ? item.short : null;
  for (const e of existing) {
    if (shelf && e.shelf && e.shelf !== shelf) continue;
    if (NOT_SAME[item.id]?.includes(e.id)) continue;
    // Full titles alike with three words in common (or the same two words, when neither title dropped a bracketed
    // part: "Crafting Interpreters"), or short titles alike when each has two words or more. "GEM" and "GEM",
    // "Structured outputs (Gemini API)" and SGLang's, "Prompt engineering (OpenAI API)" and Lilian Weng's are too
    // little to go on (the 10,436-row file), and a title is never read against a short title.
    const full = titleLikeness(item.title, e.title);
    const short = itemShort && e.short && titleWords(e.short).size >= 2 ? titleLikeness(itemShort, e.short) : 0;
    const score = Math.max(full >= SAME_TITLE && (wordsInCommon(item.title, e.title) >= 3 || (full === 1 && !hasBrackets(item.title) && !hasBrackets(e.title))) ? full : 0, short);
    if (score >= SAME_TITLE && (!best || score > best.score)) best = { entry: e, score };
  }
  return best ? { entry: best.entry, by: 'title' } : null;
}

/** Whether a title carries a bracketed part, which `titleWords` drops: an edition, a form, a provider. */
function hasBrackets(title: string): boolean {
  return /\([^)]*\)/.test(title);
}

/** How many words two titles share. */
function wordsInCommon(a: string, b: string): number {
  const x = titleWords(a);
  let n = 0;
  for (const w of titleWords(b)) if (x.has(w)) n++;
  return n;
}

/**
 * The id an item's `after` names, when it is a short title the Library has; otherwise null. The same case first
 * (ReST, the self-training paper, is not REST, the retrieval one), then any case.
 */
export function resolveAfter(after: string, known: readonly { id: string; short?: string | undefined }[]): string | null {
  if (!after) return null;
  const exact = after.trim();
  const want = exact.toLowerCase();
  return known.find((k) => (k.short ?? '').trim() === exact)?.id ?? known.find((k) => (k.short ?? '').trim().toLowerCase() === want)?.id ?? null;
}

/** The resource an item becomes. `afterId` is its soft prerequisite when `after` named one. */
export function toResource(item: ImportItem, afterId: string | null): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: item.id,
    title: item.title,
    short: item.short,
    provider: item.provider,
    type: TYPE_OF[item.type],
    url: item.url,
    urlVerified: true,
    lastVerified: item.verified,
    tracks: [TRACK_OF[item.track]],
    level: LEVEL_OF[item.level],
    cost: item.free === false ? 'paid' : item.note === 'free audit' ? 'audit-free' : 'free',
    estHours: item.hours,
    summary: item.why,
    fromYear: item.year,
  };
  if (item.priority) out.priority = item.priority;
  if (item.quality) out.quality = item.quality;
  if (item.roadmap) out.roadmap = item.roadmap;
  if (item.research) out.research = item.research;
  if (item.type === 'blog') out.blog = true;
  if (item.track === 'inference') out.tags = ['inference'];
  if (item.note === 'free tier') out.note = 'Free tier';
  // A paid row says so in its note, which validate:data requires of every paid row (the books round).
  if (item.free === false) out.note = 'Paid';
  if (afterId) out.after = [afterId];
  else if (item.after) out.doFirst = item.after;
  return out;
}

/** The fields a paper in the reading queue (papers.yaml) takes from a matching item, when it lacks them. */
export const PAPER_FILLS = ['short', 'summary', 'level', 'fromYear', 'priority', 'roadmap', 'research'] as const;

/** What a queue paper takes from a matching item: the fields it is missing, and the item's link when it has none. */
export function fillPaper(paper: Record<string, unknown>, item: ImportItem): Record<string, unknown> {
  const from = toResource(item, null);
  const add: Record<string, unknown> = {};
  for (const key of PAPER_FILLS) if (paper[key] === undefined && from[key] !== undefined) add[key] = from[key];
  if (paper.url === null) {
    add.url = item.url;
    add.urlVerified = true;
    add.lastVerified = item.verified;
  } else if (paper.lastVerified === undefined) add.lastVerified = item.verified;
  return add;
}

/**
 * The fields an entry the Library already has takes from a matching item: only the ones it is missing. An entry on the
 * plan keeps its name (no short title) and takes no year to fit from; one with prerequisites takes no "do first".
 */
export function fillMissing(entry: Record<string, unknown>, item: ImportItem, afterId: string | null, planned: boolean): Record<string, unknown> {
  const from = toResource(item, afterId);
  const add: Record<string, unknown> = {};
  const keys = ['short', 'summary', 'fromYear', 'tags', 'note', 'after', 'doFirst', 'priority', 'roadmap', 'research'] as const;
  for (const key of keys) {
    if (planned && (key === 'short' || key === 'fromYear')) continue;
    if ((key === 'after' || key === 'doFirst') && ((entry.prerequisites as unknown[] | undefined)?.length ?? 0) > 0) continue;
    // One way of saying what comes first: an entry with either keeps it.
    if ((key === 'after' || key === 'doFirst') && (entry.after !== undefined || entry.doFirst !== undefined)) continue;
    if (key === 'after' && from.after && (from.after as string[]).includes(String(entry.id))) continue;
    if (entry[key] === undefined && from[key] !== undefined) add[key] = from[key];
  }
  if (entry.lastVerified === undefined && entry.url !== null && normaliseUrl(String(entry.url)) === normaliseUrl(item.url)) add.lastVerified = item.verified;
  if (entry.url === null) {
    add.url = item.url;
    add.urlVerified = true;
    add.lastVerified = item.verified;
  }
  return add;
}
