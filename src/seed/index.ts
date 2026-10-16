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

let docsCache: Record<string, string> | null = null;

/** A project's tech doc (Markdown), loading the docs chunk on first use. Undefined when it has none. */
export async function loadDoc(projectId: string): Promise<string | undefined> {
  docsCache ??= (await import('virtual:atlas-docs')).default;
  return docsCache[projectId];
}

const designCache = new Map<number, Record<string, import('./design.ts').Design>>();

/** A design already in memory: null when its chunk has not loaded yet, undefined when it has and holds none. */
export function peekDesign(id: string, bucket: number): import('./design.ts').Design | null | undefined {
  const designs = designCache.get(bucket);
  return designs ? designs[id] : null;
}

/** A project's design (data/projects/design/), loading its bucket's chunk on first use. Undefined when it has none. */
export async function loadDesign(id: string): Promise<import('./design.ts').Design | undefined> {
  const { designBucket } = await import('./design-text.ts');
  const bucket = designBucket(id);
  if (!designCache.has(bucket)) {
    const loaders = (await import('virtual:atlas-designs')).default;
    designCache.set(bucket, (await loaders[bucket]!()).default);
  }
  return designCache.get(bucket)![id];
}

let catalogueCache: import('./catalogue.ts').CatalogueItem[] | null = null;
let catalogueIndexCache: import('./catalogue.ts').CatalogueEntry[] | null = null;

/** Every catalogue item with all its fields, loading the catalogue chunk on first use. */
export async function loadCatalogue(): Promise<import('./catalogue.ts').CatalogueItem[]> {
  catalogueCache ??= (await import('virtual:atlas-catalogue')).default;
  return catalogueCache;
}

/** The catalogue's small index, loading its chunk on first use. */
export async function loadCatalogueIndex(): Promise<import('./catalogue.ts').CatalogueEntry[]> {
  catalogueIndexCache ??= (await import('virtual:atlas-catalogue-index')).default;
  return catalogueIndexCache;
}

/** The index if it is already in memory, so a render can skip the loading state. */
export function peekCatalogueIndex(): import('./catalogue.ts').CatalogueEntry[] | null {
  return catalogueIndexCache;
}
