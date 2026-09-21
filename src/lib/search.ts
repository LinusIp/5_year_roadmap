/**
 * Full-text search over the library, the reading queue and the certifications.
 *
 * Deliberately simple: fold case and accents, split into words, and require every word of the query to
 * appear somewhere in the item (as a prefix of one of its words). Ranking puts title matches first. For a
 * few hundred items this is instant, and it behaves the way people expect a search box to behave.
 */

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.+#]+/g, ' ')
    .trim();
}

export function tokens(text: string): string[] {
  return normalise(text).split(' ').filter(Boolean);
}

export interface Searchable {
  id: string;
  title: string;
  /** Everything else worth matching: provider, summary, tracks, notes. */
  body: string;
}

export interface SearchIndexEntry<T> {
  item: T;
  titleWords: string[];
  bodyWords: string[];
}

export function buildIndex<T extends Searchable>(items: T[]): SearchIndexEntry<T>[] {
  return items.map((item) => ({ item, titleWords: tokens(item.title + ' ' + item.id), bodyWords: tokens(item.body) }));
}

function matches(words: string[], term: string): boolean {
  return words.some((word) => word.startsWith(term));
}

/** Items matching every word of the query, title matches first, then in their original order. */
export function search<T extends Searchable>(index: SearchIndexEntry<T>[], query: string): T[] {
  const terms = tokens(query);
  if (terms.length === 0) return index.map((entry) => entry.item);

  const scored: { item: T; score: number; order: number }[] = [];
  index.forEach((entry, order) => {
    let score = 0;
    for (const term of terms) {
      if (matches(entry.titleWords, term)) score += 3;
      else if (matches(entry.bodyWords, term)) score += 1;
      else return; // every term must match somewhere
    }
    scored.push({ item: entry.item, score, order });
  });
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((s) => s.item);
}
