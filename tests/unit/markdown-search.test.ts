import { describe, expect, it } from 'vitest';
import { parseBlocks, parseInline } from '../../src/lib/markdown.tsx';
import { buildIndex, normalise, search, tokens } from '../../src/lib/search.ts';

describe('markdown for notes', () => {
  it('parses the inline marks a note uses', () => {
    expect(parseInline('plain')).toEqual([{ kind: 'text', text: 'plain' }]);
    expect(parseInline('a **bold** word')).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'strong', children: [{ kind: 'text', text: 'bold' }] },
      { kind: 'text', text: ' word' },
    ]);
    expect(parseInline('use `git bisect`')[1]).toEqual({ kind: 'code', text: 'git bisect' });
    expect(parseInline('*lean*')[0]).toEqual({ kind: 'em', children: [{ kind: 'text', text: 'lean' }] });
  });

  it('keeps underscores inside words as text, so snake_case survives', () => {
    expect(parseInline('call my_function_name here')).toEqual([{ kind: 'text', text: 'call my_function_name here' }]);
  });

  it('links only to http(s) and mailto, and drops anything else to plain text', () => {
    expect(parseInline('[OCW](https://ocw.mit.edu/)')[0]).toMatchObject({ kind: 'link', href: 'https://ocw.mit.edu/' });
    expect(parseInline('[mail](mailto:me@example.org)')[0]).toMatchObject({ kind: 'link' });
    // The classic injection: a javascript: link must never become one.
    expect(parseInline('[click](javascript:alert(1))')).toEqual([{ kind: 'text', text: 'click' }, { kind: 'text', text: ')' }]);
    expect(parseInline('[x](data:text/html,<script>)')[0]).toEqual({ kind: 'text', text: 'x' });
  });

  it('never turns markup into markup: angle brackets stay text', () => {
    const nodes = parseInline('<img src=x onerror=alert(1)>');
    expect(nodes).toEqual([{ kind: 'text', text: '<img src=x onerror=alert(1)>' }]);
  });

  it('links a bare URL', () => {
    expect(parseInline('see https://pdos.csail.mit.edu/6.824/ for labs')[1]).toMatchObject({ kind: 'link', href: 'https://pdos.csail.mit.edu/6.824/' });
  });

  it('parses blocks: headings, lists, quotes, code and paragraphs', () => {
    const blocks = parseBlocks('# Title\n\nFirst line\nsame paragraph\n\n- one\n- two\n\n1. a\n2. b\n\n> quoted\n\n```\ncode here\n```');
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'paragraph', 'list', 'list', 'quote', 'code']);
    expect(blocks[1]).toEqual({ kind: 'paragraph', text: 'First line same paragraph' });
    expect(blocks[2]).toEqual({ kind: 'list', ordered: false, items: ['one', 'two'] });
    expect(blocks[3]).toMatchObject({ ordered: true });
    expect(blocks[5]).toEqual({ kind: 'code', text: 'code here' });
  });

  it('survives an unclosed code fence', () => {
    expect(parseBlocks('```\nnever closed').at(-1)).toEqual({ kind: 'code', text: 'never closed' });
  });
});

describe('search', () => {
  const items = [
    { id: 'mit-18-06', title: 'MIT 18.06 Linear Algebra', body: 'MIT OCW math Strang' },
    { id: 'mit-6-5840', title: 'MIT 6.5840 Distributed Systems', body: 'Raft labs Go systems' },
    { id: 'rust-book', title: 'The Rust Programming Language', body: 'languages ownership borrow checker' },
    { id: 'ddia', title: 'Designing Data-Intensive Applications', body: 'Kleppmann systems databases' },
  ];
  const index = buildIndex(items);

  it('folds case and accents', () => {
    expect(normalise('Schrödinger')).toBe('schrodinger');
    expect(tokens('C++ and C#')).toEqual(['c++', 'and', 'c#']);
  });

  it('matches every word, as a prefix, anywhere in the item', () => {
    expect(search(index, 'linear').map((i) => i.id)).toEqual(['mit-18-06']);
    expect(search(index, 'raft').map((i) => i.id)).toEqual(['mit-6-5840']);
    expect(search(index, 'dist sys').map((i) => i.id)).toEqual(['mit-6-5840']);
    expect(search(index, 'rust borrow').map((i) => i.id)).toEqual(['rust-book']);
    expect(search(index, 'linear raft')).toEqual([]);
  });

  it('ranks title matches above body matches', () => {
    // "systems" is in the title of 6.5840 but only in the body of DDIA.
    expect(search(index, 'systems').map((i) => i.id)).toEqual(['mit-6-5840', 'ddia']);
  });

  it('finds by course number and id', () => {
    expect(search(index, '18.06').map((i) => i.id)).toEqual(['mit-18-06']);
    expect(search(index, 'ddia').map((i) => i.id)).toEqual(['ddia']);
  });

  it('returns everything for an empty query', () => {
    expect(search(index, '   ')).toHaveLength(4);
  });
});
