import { describe, expect, it } from 'vitest';
import { fillMissing, findExisting, normaliseUrl, resolveAfter, toResource, type ImportItem } from '../../scripts/lib/resource-import.ts';
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
