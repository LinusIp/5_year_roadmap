/**
 * The project catalogue, loaded lazily: the small index (Today, the Deck, lists) or every field (a challenge's
 * screen, a build's or case's sheet). Both are null until their chunk has loaded.
 */
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.ts';
import type { ChallengeEvent } from '../db/types.ts';
import type { CatalogueEntry, CatalogueItem } from '../seed/catalogue.ts';
import { loadCatalogue, loadCatalogueIndex, peekCatalogueIndex } from '../seed/index.ts';

export function useCatalogueIndex(): CatalogueEntry[] | null {
  const [entries, setEntries] = useState<CatalogueEntry[] | null>(peekCatalogueIndex);
  useEffect(() => {
    if (entries) return;
    let live = true;
    void loadCatalogueIndex().then((e) => live && setEntries(e));
    return () => {
      live = false;
    };
  }, [entries]);
  return entries;
}

export function useCatalogue(): CatalogueItem[] | null {
  const [items, setItems] = useState<CatalogueItem[] | null>(null);
  useEffect(() => {
    let live = true;
    void loadCatalogue().then((i) => live && setItems(i));
    return () => {
      live = false;
    };
  }, []);
  return items;
}

/** Every challenge event, live. Undefined while the first read is in flight. */
export function useChallengeEvents(): ChallengeEvent[] | undefined {
  return useLiveQuery(() => db.challenges.toArray(), []);
}
