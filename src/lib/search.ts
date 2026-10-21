/**
 * Full-text search over the library, the reading queue and the certifications.
 *
 * Deliberately simple: fold case and accents, split into words, and require every word of the query to
 * appear somewhere in the item (as a prefix of one of its words). Ranking puts title matches first. The index
 * keeps each item's words as one space-led string, so a term is a prefix of a word exactly when " term" occurs in
 * it: one native scan per item and term, which keeps a keystroke quick over the Library's ten thousand items.
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
  /** The title's words (and the id), each led by a space. */
  titleText: string;
  /** The body's words, each led by a space. */
  bodyText: string;
}

/** The words of a text, each led by a space, so that " term" occurs in it exactly when a word starts with term. */
function wordText(text: string): string {
  const words = tokens(text);
  return words.length === 0 ? '' : ' ' + words.join(' ');
}

export function buildIndex<T extends Searchable>(items: T[]): SearchIndexEntry<T>[] {
  return items.map((item) => ({ item, titleText: wordText(item.title + ' ' + item.id), bodyText: wordText(item.body) }));
}

/** Items matching every word of the query, title matches first, then in their original order. */
export function search<T extends Searchable>(index: SearchIndexEntry<T>[], query: string): T[] {
  const terms = tokens(query).map((term) => ' ' + term);
  if (terms.length === 0) return index.map((entry) => entry.item);

  const scored: { item: T; score: number; order: number }[] = [];
  for (let order = 0; order < index.length; order++) {
    const entry = index[order]!;
    let score = 0;
    let every = true;
    for (const term of terms) {
      if (entry.titleText.includes(term)) score += 3;
      else if (entry.bodyText.includes(term)) score += 1;
      else {
        every = false; // every term must match somewhere
        break;
      }
    }
    if (every) scored.push({ item: entry.item, score, order });
  }
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((s) => s.item);
}
