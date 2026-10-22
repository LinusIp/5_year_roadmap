/**
 * "Developer essentials" (ATLAS-LIBRARY, 12,744 rows): the quick filter for the everyday tools that have no track of
 * their own. There is no web track: JavaScript and TypeScript sit under languages, web app engineering under
 * architecture, terminal, Git and Linux under DevOps, so the filter goes by what a title or tag names.
 */

/** The words the prompt lists, with the forms they take in titles: PostgreSQL and HTTPS, and Bash for the shell. */
export const ESSENTIAL_WORDS: ReadonlySet<string> = new Set([
  'shell',
  'bash',
  'terminal',
  'git',
  'linux',
  'ubuntu',
  'sql',
  'postgres',
  'postgresql',
  'html',
  'css',
  'javascript',
  'typescript',
  'react',
  'http',
  'https',
]);

/** Whole words only: "Git" is one, "digital" and "GitHub" are not; "shell" is, "shellfish" is not. */
function words(text: string): string[] {
  return text.match(/[A-Za-z0-9]+/g) ?? [];
}

/** A word that names an essential. "ReAct", the agents paper, is a name of its own, not the library. */
function names(word: string): boolean {
  const lower = word.toLowerCase();
  if (lower === 'react') return word === 'React' || word === 'react' || word === 'REACT';
  return ESSENTIAL_WORDS.has(lower);
}

/** Whether a resource's title or tags name one of the essentials. */
export function isEssential(title: string, tags: readonly string[] = []): boolean {
  if (words(title).some(names)) return true;
  return tags.some((tag) => words(tag).some(names));
}
