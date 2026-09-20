/**
 * The two modules scripts/lib/vite-plugin-seed.ts generates at build time.
 * Inline import() types are used because a top-level import would turn this file into a module and the
 * ambient declarations would stop applying.
 */
declare module 'virtual:atlas-seed' {
  const seed: import('./schema.ts').AppSeed;
  export default seed;
}

declare module 'virtual:atlas-units' {
  /** Unit checklists by resource id. Resources with no checklist are absent. */
  const units: Record<string, import('./schema.ts').Unit[]>;
  export default units;
}
