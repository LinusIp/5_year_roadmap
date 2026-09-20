/**
 * The curriculum, validated at build time by scripts/lib/vite-plugin-seed.ts.
 *
 * Unit checklists are not part of this module: they are two fifths of the payload and are only needed
 * once an item is opened, so they live in a separate chunk behind `loadUnits`. Every resource carries
 * `unitCount`, which is all a progress bar needs.
 */
import seed from 'virtual:atlas-seed';
import type { Resource, Seed, Unit } from './schema.ts';

export type AppResource = Omit<Resource, 'units'> & { unitCount: number };
export type AppSeed = Omit<Seed, 'resources'> & { resources: AppResource[] };

export { seed };
export type * from './schema.ts';

let cache: Record<string, Unit[]> | null = null;

/** The unit checklist of one resource, loading the checklist chunk on first use. */
export async function loadUnits(resourceId: string): Promise<Unit[]> {
  cache ??= (await import('virtual:atlas-units')).default;
  return cache[resourceId] ?? [];
}

/** The checklists already in memory, or null before the first `loadUnits`. Lets a render avoid a flash. */
export function peekUnits(resourceId: string): Unit[] | null {
  return cache ? (cache[resourceId] ?? []) : null;
}
