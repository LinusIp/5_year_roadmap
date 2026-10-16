/**
 * The curriculum, validated at build time by scripts/lib/vite-plugin-seed.ts.
 *
 * Unit checklists are not part of this module: they are two fifths of the payload and are only needed
 * once an item is opened, so they live in a separate chunk behind `loadUnits`. Every resource carries
 * `unitCount`, which is all a progress bar needs.
 */
import seed from 'virtual:atlas-seed';
import type { Unit } from './schema.ts';

export { seed };
export type * from './schema.ts';

let cache: Record<string, Unit[]> | null = null;

/** Every checklist, loading the chunk on first use. */
export async function loadAllUnits(): Promise<Record<string, Unit[]>> {
  cache ??= (await import('virtual:atlas-units')).default;
  return cache;
}

/** The unit checklist of one resource, loading the checklist chunk on first use. */
export async function loadUnits(resourceId: string): Promise<Unit[]> {
  return (await loadAllUnits())[resourceId] ?? [];
}

/** The checklists already in memory, or null before the first `loadUnits`. Lets a render avoid a flash. */
export function peekUnits(resourceId: string): Unit[] | null {
  return cache ? (cache[resourceId] ?? []) : null;
}

let bankCache: import('./questions.ts').QuestionBank | null = null;

/** The practice bank, loading its chunk on first use. */
export async function loadQuestionBank(): Promise<import('./questions.ts').QuestionBank> {
  bankCache ??= (await import('virtual:atlas-questions')).default;
  return bankCache;
}

let docsCache: Record<string, string> | null = null;

/** A project's tech doc (Markdown), loading the docs chunk on first use. Undefined when it has none. */
export async function loadDoc(projectId: string): Promise<string | undefined> {
  docsCache ??= (await import('virtual:atlas-docs')).default;
  return docsCache[projectId];
}
