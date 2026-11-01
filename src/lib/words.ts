/**
 * Word lists as one expression (ATLAS-LIBRARY): the Library reads every quick filter and every area of its sixteen
 * thousand rows when it opens, so a list of words costs two tests on a row rather than one per word. An acronym or a
 * proper name (an upper-case word, or capitalised words) is a whole word in its own case; a plain word or phrase
 * matches at its start in any case ("agent" finds agents and agentic, "sandbox" finds sandboxing).
 */
export interface Matcher {
  proper: RegExp | null;
  plain: RegExp | null;
}

export function escape(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isProper(word: string): boolean {
  return word === word.toUpperCase() || /^[A-Z][A-Za-z]*(\s[A-Z][a-z]+)*$/.test(word);
}

export function compile(words: readonly string[]): Matcher {
  const proper = words.filter(isProper).map(escape);
  const plain = words.filter((w) => !isProper(w)).map(escape);
  return {
    proper: proper.length ? new RegExp('(^|[^A-Za-z])(' + proper.join('|') + ')(?![A-Za-z])') : null,
    plain: plain.length ? new RegExp('(^|[^a-z])(' + plain.join('|') + ')', 'i') : null,
  };
}

/** Phrases matched at their start in any case, whatever their capitals. */
export function compilePhrases(phrases: readonly string[]): Matcher {
  return { proper: null, plain: phrases.length ? new RegExp('(^|[^a-z])(' + phrases.map(escape).join('|') + ')', 'i') : null };
}

export function hits(m: Matcher, text: string): boolean {
  return (m.proper !== null && m.proper.test(text)) || (m.plain !== null && m.plain.test(text));
}

/** The word of a list that names a text, or null: for an import's own checks, one word at a time. */
export function reason(words: readonly string[], text: string): string | null {
  return words.find((w) => hits(compile([w]), text)) ?? null;
}
