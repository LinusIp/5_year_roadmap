import { describe, expect, it } from 'vitest';
import { buildIndex, search, tokens } from '../../src/lib/search.ts';

const items = [
  { id: 'flash-attention', title: 'FlashAttention', body: 'Dao fast and memory-efficient exact attention paper ai inference' },
  { id: 'raft', title: 'In Search of an Understandable Consensus Algorithm', body: 'Ongaro Ousterhout Raft paper systems' },
  { id: 'ostep', title: 'Operating Systems: Three Easy Pieces', body: 'Arpaci-Dusseau book systems' },
  { id: 'cafe', title: 'Café Rendering', body: 'Résumé of light transport graphics' },
];
const index = buildIndex(items);
const ids = (query: string): string[] => search(index, query).map((i) => i.id);

describe('the Library search (ATLAS-LIBRARY, ten thousand items)', () => {
  it('matches a term as the prefix of a word, never inside one', () => {
    expect(ids('flash')).toEqual(['flash-attention']);
    expect(ids('attention')).toEqual(['flash-attention']);
    expect(ids('ttention')).toEqual([]);
    expect(ids('raf')).toEqual(['raft']);
  });

  it('needs every word of the query, title matches first', () => {
    expect(ids('systems')).toEqual(['ostep', 'raft']);
    expect(ids('systems book')).toEqual(['ostep']);
    expect(ids('systems paper attention')).toEqual([]);
  });

  it('folds case and accents, and an empty query lists everything in order', () => {
    expect(ids('CAFE')).toEqual(['cafe']);
    expect(ids('resume')).toEqual(['cafe']);
    expect(ids('')).toEqual(items.map((i) => i.id));
    expect(tokens('C++ and C#, 3.5!')).toEqual(['c++', 'and', 'c#', '3.5']);
  });
});
