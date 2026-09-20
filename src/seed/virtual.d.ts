declare module 'virtual:atlas-seed' {
  import type { AppSeed } from './index.ts';
  const seed: AppSeed;
  export default seed;
}

declare module 'virtual:atlas-units' {
  import type { Unit } from './schema.ts';
  /** Unit checklists by resource id. Resources with no checklist are absent. */
  const units: Record<string, Unit[]>;
  export default units;
}
