import { describe, expect, it } from 'vitest';
import { fillMissing, fillPaper, findExisting, normaliseUrl, resolveAfter, SHELF_OF, titleLikeness, toResource, type ImportItem } from '../../scripts/lib/resource-import.ts';
import { shelfOf } from '../../src/lib/library-home.ts';
import { loadSeedOrThrow, splitSeed } from '../../scripts/lib/load-seed.ts';
import { resolveSeed } from '../../src/lib/plan.ts';
import type { AppSeed } from '../../src/seed/schema.ts';
import { ResourceSchema } from '../../src/seed/schema.ts';

const item = (over: Partial<ImportItem> = {}): ImportItem => ({
  id: 'ostep',
  title: 'Operating Systems: Three Easy Pieces',
  short: 'OSTEP',
  type: 'book',
  track: 'systems',
  level: 'intermediate',
  hours: 60,
  provider: 'Arpaci-Dusseau',
  url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/',
  free: true,
  note: '',
  why: 'The free operating systems book.',
  after: '',
  year: 2,
  verified: '2026-10-18',
  ...over,
});

describe('the mapping', () => {
  it('turns an item into a valid resource, its link exactly as given', () => {
    const r = toResource(item(), null);
    expect(r).toMatchObject({ id: 'ostep', short: 'OSTEP', type: 'book', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/', urlVerified: true, lastVerified: '2026-10-18', tracks: ['systems'], level: 'intermediate', cost: 'free', fromYear: 2, summary: 'The free operating systems book.' });
    expect(ResourceSchema.safeParse({ ...r, prerequisites: [] }).success).toBe(true);
  });

  it('maps the types: video courses are lectures, docs and tutorials articles, practice its own', () => {
    expect(toResource(item({ type: 'video-course' }), null).type).toBe('lectures');
    expect(toResource(item({ type: 'course' }), null).type).toBe('course');
    expect(toResource(item({ type: 'docs' }), null).type).toBe('article');
    expect(toResource(item({ type: 'tutorial' }), null).type).toBe('article');
    expect(toResource(item({ type: 'practice' }), null).type).toBe('practice');
  });

  it('files inference under AI with a tag, game development under its own track, beginners as intro', () => {
    expect(toResource(item({ track: 'inference' }), null)).toMatchObject({ tracks: ['ai'], tags: ['inference'] });
    expect(toResource(item({ track: 'gamedev' }), null).tracks).toEqual(['gamedev']);
    expect(toResource(item({ track: 'ai' }), null).tags).toBeUndefined();
    expect(toResource(item({ level: 'beginner' }), null).level).toBe('intro');
  });

  it('makes a free audit "audit-free" and keeps a free tier as a note', () => {
    expect(toResource(item({ note: 'free audit' }), null)).toMatchObject({ cost: 'audit-free' });
    expect(toResource(item({ note: 'free tier' }), null)).toMatchObject({ cost: 'free', note: 'Free tier' });
  });

  it('links "after" as a soft prerequisite when it names a resource, and keeps it as words when not', () => {
    expect(toResource(item({ after: 'Rust Book' }), 'rust-book')).toMatchObject({ after: ['rust-book'] });
    const words = toResource(item({ after: 'Some course' }), null);
    expect(words.doFirst).toBe('Some course');
    expect(words.after).toBeUndefined();
  });
});

describe('the dedupe', () => {
  const existing = [
    { id: 'rust-book', title: 'The Rust Programming Language', short: 'Rust Book', url: 'https://doc.rust-lang.org/book/' },
    { id: 'cuda-guide', title: 'CUDA C++ Programming Guide', url: 'https://docs.nvidia.com/cuda/cuda-c-programming-guide/' },
    { id: 'vulkan-tutorial', title: 'Vulkan Tutorial', url: 'https://vulkan-tutorial.com/' },
    { id: 'beej-c', title: "Beej's Guide to C Programming", url: 'https://beej.us/guide/bgc/' },
    { id: 'no-link', title: 'Crafting Interpreters', url: null },
  ];

  it('normalises URLs: scheme, www, case and trailing slashes do not matter', () => {
    expect(normaliseUrl('HTTPS://www.Example.com/a/')).toBe(normaliseUrl('http://example.com/a'));
  });

  it('matches by URL first', () => {
    expect(findExisting(item({ id: 'rust', title: 'Rust', url: 'http://www.doc.rust-lang.org/book' }), existing)).toMatchObject({ entry: { id: 'rust-book' }, by: 'url' });
  });

  it('then by id, then by a pair checked by hand', () => {
    expect(findExisting(item({ id: 'vulkan-tutorial', title: 'Something else', url: 'https://x.test/' }), existing)).toMatchObject({ entry: { id: 'vulkan-tutorial' }, by: 'id' });
    expect(findExisting(item({ id: 'cuda-programming-guide', title: 'CUDA Guide', url: 'https://docs.nvidia.com/cuda/cuda-programming-guide/' }), existing)).toMatchObject({ entry: { id: 'cuda-guide' }, by: 'checked' });
  });

  it('then by a title alike enough, short titles too', () => {
    expect(findExisting(item({ id: 'ci', title: 'Crafting Interpreters', short: 'Crafting Interpreters', url: 'https://craftinginterpreters.com/' }), existing)).toMatchObject({ entry: { id: 'no-link' }, by: 'title' });
    expect(findExisting(item({ id: 'trpl', title: 'Rust Book', short: 'Rust Book', url: 'https://example.org/rust' }), existing)).toMatchObject({ entry: { id: 'rust-book' }, by: 'title' });
  });

  it('keeps near misses apart', () => {
    expect(findExisting(item({ id: 'vk-rt', title: 'Vulkan Ray Tracing Tutorial', short: 'Vulkan RT', url: 'https://nvpro-samples.github.io/vk_raytracing_tutorial_KHR/' }), existing)).toBeNull();
    expect(findExisting(item({ id: 'beej-net', title: "Beej's Guide to Network Programming", short: 'Beej Networking', url: 'https://beej.us/guide/bgnet/' }), existing)).toBeNull();
    expect(findExisting(item({ id: 'async-book', title: 'Asynchronous Programming in Rust', short: 'Async Rust', url: 'https://rust-lang.github.io/async-book/' }), existing)).toBeNull();
  });
});

describe('the prerequisite links', () => {
  const known = [{ id: 'rust-book', short: 'Rust Book' }, { id: 'ostep', short: 'OSTEP' }, { id: 'plain' }];

  it('resolve a short title exactly, in any case', () => {
    expect(resolveAfter('rust book', known)).toBe('rust-book');
    expect(resolveAfter(' OSTEP ', known)).toBe('ostep');
  });

  it('prefer the same case when short titles differ only in case: ReST is not REST', () => {
    const papers = [{ id: 'paper-rest-retrieval-spec', short: 'REST' }, { id: 'paper-rest-reinforced-self-training', short: 'ReST' }];
    expect(resolveAfter('ReST', papers)).toBe('paper-rest-reinforced-self-training');
    expect(resolveAfter('REST', papers)).toBe('paper-rest-retrieval-spec');
    expect(resolveAfter('rest', papers)).toBe('paper-rest-retrieval-spec');
  });

  it('resolve nothing for an empty or unknown name', () => {
    expect(resolveAfter('', known)).toBeNull();
    expect(resolveAfter('Rust', known)).toBeNull();
  });
});

describe('filling an entry the Library has', () => {
  it('takes only the fields it is missing, never its link', () => {
    const entry = { id: 'rust-book', url: 'https://doc.rust-lang.org/book/', summary: 'Mine.', prerequisites: [] };
    const add = fillMissing(entry, item({ url: 'https://doc.rust-lang.org/book', short: 'Rust Book' }), null, false);
    expect(add.summary).toBeUndefined();
    expect(add.url).toBeUndefined();
    expect(add).toMatchObject({ short: 'Rust Book', fromYear: 2, lastVerified: '2026-10-18' });
  });

  it('keeps a planned entry\'s name and year, and adds no "do first" to one with prerequisites', () => {
    const entry = { id: 'x', url: 'https://other.test/', prerequisites: ['y'] };
    const add = fillMissing(entry, item({ after: 'Rust Book' }), 'rust-book', true);
    expect(add.short).toBeUndefined();
    expect(add.fromYear).toBeUndefined();
    expect(add.after).toBeUndefined();
    expect(add.lastVerified).toBeUndefined();
  });

  it('gives an entry with no link the item\'s link, checked', () => {
    const add = fillMissing({ id: 'no-link', url: null, prerequisites: [] }, item(), null, false);
    expect(add).toMatchObject({ url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/', urlVerified: true, lastVerified: '2026-10-18' });
  });

  it('never makes an entry come after itself', () => {
    expect(fillMissing({ id: 'rust-book', url: null, prerequisites: [] }, item(), 'rust-book', false).after).toBeUndefined();
  });
});

describe('the second import (MORE-RESOURCES)', () => {
  it('maps papers, blogs and articles to their shelves, and architecture and robotics to their tracks', () => {
    const shelf = (type: ImportItem['type']) => shelfOf(toResource(item({ type }), null) as { type: string; blog?: boolean });
    expect(shelf('paper')).toBe('paper');
    expect(shelf('blog')).toBe('blog');
    expect(shelf('article')).toBe('article');
    expect(shelf('docs')).toBe('article');
    expect(shelf('video-course')).toBe('course');
    expect(shelf('practice')).toBe('practice');
    for (const type of Object.keys(SHELF_OF) as ImportItem['type'][]) expect(shelf(type)).toBe(SHELF_OF[type]);
    expect(toResource(item({ type: 'blog' }), null)).toMatchObject({ type: 'article', blog: true });
    expect(toResource(item({ track: 'architecture' }), null).tracks).toEqual(['architecture']);
    expect(toResource(item({ track: 'robotics' }), null).tracks).toEqual(['robotics']);
    expect(ResourceSchema.safeParse({ ...toResource(item({ type: 'paper', track: 'robotics' }), null), prerequisites: [] }).success).toBe(true);
  });

  it('compares titles only on the same shelf: a paper and a post of one title both stay', () => {
    const library = [{ id: 'yang-song-score', title: 'Generative Modeling by Estimating Gradients of the Data Distribution', url: 'https://yang-song.net/blog/2021/score/', shelf: 'article' }];
    const paper = item({ id: 'paper-ncsn', type: 'paper', title: 'Generative Modeling by Estimating Gradients of the Data Distribution', short: 'NCSN', url: 'https://arxiv.org/abs/1907.05600' });
    expect(findExisting(paper, library)).toBeNull();
    expect(findExisting({ ...paper, type: 'article' }, library)).toMatchObject({ entry: { id: 'yang-song-score' }, by: 'title' });
  });

  it('never merges numbered titles that differ', () => {
    expect(titleLikeness('GPU Gems 2', 'GPU Gems 3')).toBe(0);
    expect(titleLikeness('GPU Gems 3', 'GPU Gems 3')).toBe(1);
    const library = [{ id: 'gpu-gems-2', title: 'GPU Gems 2', url: 'https://developer.nvidia.com/gpugems/gpugems2', shelf: 'book' }];
    expect(findExisting(item({ id: 'gpu-gems-3', type: 'book', title: 'GPU Gems 3', short: 'GPU Gems 3', url: 'https://developer.nvidia.com/gpugems/gpugems3' }), library)).toBeNull();
  });

  it('still matches by URL across shelves, and by the pairs checked by hand', () => {
    const library = [
      { id: 'sora-report', title: 'Video generation models as world simulators (Sora technical report)', url: null, shelf: 'paper' },
      { id: 'iq-articles', title: 'Inigo Quilez: articles', url: 'https://iquilezles.org/articles/', shelf: 'blog' },
    ];
    expect(findExisting(item({ id: 'article-openai-sora-world-simulators', type: 'article', title: 'Video generation models as world simulators', url: 'https://openai.com/index/video-generation-models-as-world-simulators/' }), library)).toMatchObject({ entry: { id: 'sora-report' }, by: 'checked' });
    expect(findExisting(item({ id: 'blog-x', type: 'blog', title: 'Something', url: 'https://iquilezles.org/articles' }), library)).toMatchObject({ entry: { id: 'iq-articles' }, by: 'url' });
  });

  it('gives a queue paper only what it lacks, and a link only when it has none', () => {
    const queued = { id: 'roofline', url: null, urlVerified: false, searchHint: 'Roofline' };
    expect(fillPaper(queued, item({ type: 'paper', short: 'Roofline Model', url: 'https://example.org/roofline', year: 1, level: 'beginner' }))).toEqual({
      short: 'Roofline Model',
      summary: 'The free operating systems book.',
      level: 'intro',
      fromYear: 1,
      url: 'https://example.org/roofline',
      urlVerified: true,
      lastVerified: '2026-10-18',
    });
    const linked = { id: 'paper-attention', url: 'https://arxiv.org/abs/1706.03762', lastVerified: '2026-09-20', short: 'Attention' };
    const add = fillPaper(linked, item({ type: 'paper', url: 'https://arxiv.org/abs/1706.03762' }));
    expect(add.short).toBeUndefined();
    expect(add.url).toBeUndefined();
    expect(add.lastVerified).toBeUndefined();
    expect(add).toMatchObject({ level: 'intermediate', fromYear: 2 });
  });
});

describe('the whole library (ATLAS-LIBRARY)', () => {
  it('maps every type to its shelf and the new tracks to theirs, with the plan-alignment fields', () => {
    const shelf = (type: ImportItem['type']) => shelfOf(toResource(item({ type }), null) as { type: string; blog?: boolean });
    expect(['video-course', 'course'].map((t) => shelf(t as ImportItem['type']))).toEqual(['course', 'course']);
    expect(shelf('book')).toBe('book');
    expect(['docs', 'tutorial', 'article'].map((t) => shelf(t as ImportItem['type']))).toEqual(['article', 'article', 'article']);
    expect(shelf('practice')).toBe('practice');
    expect(shelf('paper')).toBe('paper');
    expect(shelf('blog')).toBe('blog');
    expect(toResource(item({ track: 'devops' }), null).tracks).toEqual(['devops']);
    expect(toResource(item({ track: 'simulation' }), null).tracks).toEqual(['simulation']);
    expect(toResource(item({ track: 'math' }), null).tracks).toEqual(['math']);
    expect(toResource(item({ track: 'engineering' }), null).tracks).toEqual(['engineering']);
    expect(toResource(item({ track: 'hardware' }), null).tracks).toEqual(['hardware']);
    expect(toResource(item({ track: 'quantum' }), null).tracks).toEqual(['quantum']);
    expect(toResource(item({ track: 'inference' }), null)).toMatchObject({ tracks: ['ai'], tags: ['inference'] });
    const aligned = toResource(item({ priority: 1, roadmap: 'inference-engineering', research: 'diffusion' }), null);
    expect(aligned).toMatchObject({ priority: 1, roadmap: 'inference-engineering', research: 'diffusion' });
    expect(ResourceSchema.safeParse({ ...aligned, prerequisites: [] }).success).toBe(true);
    // A link opened by hand is marked so; a mark needs a link.
    expect(ResourceSchema.safeParse({ ...aligned, prerequisites: [], linkCheck: 'manual-ok' }).success).toBe(true);
    expect(ResourceSchema.safeParse({ ...aligned, prerequisites: [], linkCheck: 'broken' }).success).toBe(false);
    expect(ResourceSchema.safeParse({ ...aligned, prerequisites: [], url: null, urlVerified: false, searchHint: 'x', linkCheck: 'manual-ok' }).success).toBe(false);
    // An empty roadmap or research area is no field at all.
    const plain = toResource(item({ priority: 2, roadmap: '', research: '' }), null);
    expect(plain.roadmap).toBeUndefined();
    expect(plain.research).toBeUndefined();
  });

  it('collapses arXiv abstract, PDF and HTML links, any version, to the paper', () => {
    const abs = normaliseUrl('https://arxiv.org/abs/1706.03762');
    for (const url of ['https://arxiv.org/pdf/1706.03762', 'https://arxiv.org/pdf/1706.03762v7', 'http://arxiv.org/pdf/1706.03762.pdf', 'https://arxiv.org/html/1706.03762v2', 'https://arxiv.org/abs/1706.03762v5/', 'https://export.arxiv.org/abs/1706.03762']) {
      expect(normaliseUrl(url), url).toBe(abs);
    }
    expect(normaliseUrl('https://arxiv.org/abs/cs/0112017v1')).toBe('arxiv.org/abs/cs/0112017');
    expect(normaliseUrl('https://arxiv.org/pdf/1706.03763')).not.toBe(abs);
    const library = [{ id: 'paper-attention', title: 'Attention Is All You Need', url: 'https://arxiv.org/abs/1706.03762', shelf: 'paper' }];
    expect(findExisting(item({ id: 'transformer', type: 'paper', title: 'The Transformer', url: 'https://arxiv.org/pdf/1706.03762v7' }), library)).toMatchObject({ entry: { id: 'paper-attention' }, by: 'url' });
  });

  it('never merges titles that differ only in symbols or numbers, nor pairs read by hand as different', () => {
    expect(titleLikeness('Exercism C Track', 'Exercism C++ Track')).toBe(0);
    expect(titleLikeness('Exercism C# Track', 'Exercism C++ Track')).toBe(0);
    const library = [
      { id: 'exercism-c', title: 'Exercism C Track', url: 'https://exercism.org/tracks/c', shelf: 'practice' },
      { id: 'orca', title: 'Orca: A Distributed Serving System for Transformer-Based Generative Models', url: 'https://www.usenix.org/conference/osdi22/presentation/yu', shelf: 'paper' },
    ];
    expect(findExisting(item({ id: 'exercism-cpp', type: 'practice', title: 'Exercism C++ Track', url: 'https://exercism.org/tracks/cpp' }), library)).toBeNull();
    expect(findExisting(item({ id: 'paper-orca', type: 'paper', title: 'Orca', short: 'Orca', url: 'https://arxiv.org/abs/2306.02707' }), [{ ...library[1]!, title: 'Orca', short: 'Orca' }])).toBeNull();
    // Two "Agents" by different authors stay two.
    expect(findExisting(item({ id: 'whitepaper-google-agents', type: 'article', title: 'Agents', short: 'Agents', url: 'https://www.kaggle.com/whitepaper-agents' }), [{ id: 'article-chip-huyen-agents', title: 'Agents', short: 'Agents', url: 'https://huyenchip.com/2025/01/07/agents.html', shelf: 'article' }])).toBeNull();
    // Two books called "Computational Physics" by different authors stay two.
    const newman = { id: 'newman-computational-physics-chapters', title: 'Computational Physics (free sample chapters)', url: 'https://websites.umich.edu/~mejn/cp/chapters.html', shelf: 'book' };
    expect(findExisting(item({ id: 'fitzpatrick-computational-physics-329', type: 'book', title: 'Computational Physics (PHY 329 lecture notes)', url: 'https://farside.ph.utexas.edu/teaching/329/329.html' }), [newman])).toBeNull();
    // A meta-agent paper whose short title, brackets dropped, reads like another's: "Weak-for-Strong (W4S)".
    const weakToStrong = { id: 'paper-weak-to-strong-generalization', title: 'Weak-to-Strong Generalization: Eliciting Strong Capabilities With Weak Supervision', short: 'Weak-to-Strong', url: 'https://arxiv.org/abs/2312.09390', shelf: 'paper' };
    expect(findExisting(item({ id: 'paper-weak-for-strong', type: 'paper', title: 'Weak-for-Strong: Training Weak Meta-Agent to Harness Strong Executors', short: 'Weak-for-Strong (W4S)', url: 'https://arxiv.org/abs/2504.04785' }), [weakToStrong])).toBeNull();
  });

  it('needs more than a word or two to call titles alike (the 10,436-row file)', () => {
    // One-word short titles name different papers: GEM the gym and GEM the continual-learning method.
    const gem = { id: 'paper-gem-gym-agentic-llms', title: 'GEM: A Gym for Agentic LLMs', short: 'GEM', url: 'https://arxiv.org/abs/2510.01051', shelf: 'paper' };
    expect(findExisting(item({ id: 'paper-gem', type: 'paper', title: 'Gradient Episodic Memory for Continual Learning', short: 'GEM', url: 'https://arxiv.org/abs/1706.08840' }), [gem])).toBeNull();
    // Two-word titles, their brackets dropped, are too generic: every API has structured outputs.
    const sglang = { id: 'docs-sglang-structured-outputs', title: 'Structured Outputs (SGLang)', short: 'SGLang Structured Out.', url: 'https://docs.sglang.ai/advanced_features/structured_outputs.html', shelf: 'article' };
    expect(findExisting(item({ id: 'docs-gemini-structured-output', type: 'docs', title: 'Structured outputs (Gemini API)', short: 'Gemini Structured Output', url: 'https://ai.google.dev/gemini-api/docs/generate-content/structured-output' }), [sglang])).toBeNull();
    // A title is never read against a short title: "Bevy ECS (crate README)" is not "Bevy ECS Quickstart"'s short name.
    const bevy = { id: 'docs-bevy-ecs-quickstart', title: 'Bevy ECS Quick Start', short: 'Bevy ECS', url: 'https://bevyengine.org/learn/quick-start/getting-started/ecs/', shelf: 'article' };
    expect(findExisting(item({ id: 'docs-bevy-ecs-readme', type: 'docs', title: 'Bevy ECS (crate README)', short: 'Bevy ECS README', url: 'https://github.com/bevyengine/bevy/tree/main/crates/bevy_ecs' }), [bevy])).toBeNull();
    // Two-word short titles alike still match: the Essence of Calculus is 3b1b's calculus.
    const calculus = { id: '3b1b-calculus', title: 'Essence of Calculus (3Blue1Brown)', short: 'Essence of Calculus', url: 'https://www.3blue1brown.com/topics/calculus', shelf: 'course' };
    expect(findExisting(item({ id: 'course-3b1b-essence-calculus', type: 'video-course', title: 'Essence of Calculus (3Blue1Brown playlist)', short: 'Essence of Calculus', url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr' }), [calculus])).not.toBeNull();
    // Full titles alike, three words in common: CS224W's course site is the Library's CS224W.
    const cs224w = { id: 'cs224w', title: 'Stanford CS224W Machine Learning with Graphs', short: 'Stanford CS224W', url: 'https://snap.stanford.edu/class/cs224w-2020/', shelf: 'course' };
    expect(findExisting(item({ id: 'course-stanford-cs224w-site', type: 'course', title: 'CS224W: Machine Learning with Graphs (course site)', short: 'CS224W course site', url: 'https://web.stanford.edu/class/cs224w/index.html' }), [cs224w])).toMatchObject({ entry: { id: 'cs224w' }, by: 'title' });
  });

  it('keeps an entry what it has, and the user what they did: an upsert only adds', () => {
    const entry = { id: 'rust-book', title: 'The Rust Programming Language', url: 'https://doc.rust-lang.org/book/', summary: 'Mine.', estHours: 40, prerequisites: [], doFirst: 'C' };
    const add = fillMissing(entry, item({ id: 'rust-book', title: 'Rust Book (2nd ed.)', url: 'https://example.org/other', hours: 99, after: 'OSTEP', priority: 2, roadmap: 'software-architect' }), 'ostep', false);
    // Only fields the entry lacks: never its title, link, hours, summary, or its "do first".
    expect(Object.keys(add).sort()).toEqual(['fromYear', 'priority', 'roadmap', 'short']);
    // The user's progress and edits are keyed by the entry's id, which never changes, so they still apply.
    const seed = splitSeed(loadSeedOrThrow()).app as AppSeed;
    const original = seed.resources.find((r) => r.id === 'rust-book')!;
    const upserted: AppSeed = { ...seed, resources: seed.resources.map((r) => (r.id === 'rust-book' ? { ...r, ...add } : r)) };
    const edit = { kind: 'resource' as const, id: 'rust-book', patch: { estHours: 7 }, updatedAt: '2026-10-01T00:00:00.000Z', deviceId: 'd' };
    const resolved = resolveSeed(upserted, [edit], []).resources.find((r) => r.id === 'rust-book')!;
    expect(resolved.estHours).toBe(7);
    expect(resolved.title).toBe(original.title);
    expect(resolved.url).toBe(original.url);
    const states = new Map([['rust-book', { refId: 'rust-book', status: 'active' as const, unitsDone: ['ch-1'] }]]);
    expect(states.get(resolved.id)?.unitsDone).toEqual(['ch-1']);
  });
});
