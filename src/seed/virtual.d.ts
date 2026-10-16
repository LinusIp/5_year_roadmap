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

declare module 'virtual:atlas-docs' {
  /** Each project's tech doc, as Markdown, by project id. Loaded with a project's sheet. */
  const docs: Record<string, string>;
  export default docs;
}

declare module 'virtual:atlas-catalogue' {
  /** The three-tier project catalogue, normalised. Loaded with a catalogue item's screen or sheet. */
  const items: import('./catalogue.ts').CatalogueItem[];
  export default items;
}

declare module 'virtual:atlas-catalogue-index' {
  /** One small entry per catalogue item: Today's daily challenge, the Deck, Library and Activity lists. */
  const entries: import('./catalogue.ts').CatalogueEntry[];
  export default entries;
}
