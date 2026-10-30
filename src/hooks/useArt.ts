/**
 * The illustrations' manifest, fetched once from public/art/art.json (ATLAS-ART), and the two settings that
 * govern the art: whether it shows at all, and what the Today header follows. A manifest that fails to load or
 * to parse is treated as empty: every slot shows its drawn placeholder.
 */
import { useEffect, useState } from 'react';
import { useSettings } from '../db/settings.ts';
import { seed } from '../seed/index.ts';
import { ArtManifestSchema } from '../seed/art.ts';
import type { ArtManifest } from '../seed/art.ts';
import type { TodayArtBy } from '../lib/art.ts';

const EMPTY: ArtManifest = { version: 1, images: [] };
let cached: ArtManifest | null = null;
let loading: Promise<ArtManifest> | null = null;

export function artUrl(file: string): string {
  return import.meta.env.BASE_URL + 'art/' + file;
}

function load(): Promise<ArtManifest> {
  loading ??= fetch(artUrl('art.json'))
    .then((r) => (r.ok ? r.json() : EMPTY))
    .then((json) => {
      const parsed = ArtManifestSchema.safeParse(json);
      cached = parsed.success ? parsed.data : EMPTY;
      return cached;
    })
    .catch(() => {
      cached = EMPTY;
      return EMPTY;
    });
  return loading;
}

/** For tests and the dev screen: forget the fetched manifest. */
export function resetArtManifest(): void {
  cached = null;
  loading = null;
}

export function useArtManifest(): ArtManifest | null {
  const [manifest, setManifest] = useState<ArtManifest | null>(cached);
  useEffect(() => {
    if (cached) return;
    let live = true;
    void load().then((m) => {
      if (live) setManifest(m);
    });
    return () => {
      live = false;
    };
  }, []);
  return manifest;
}

export interface ArtSettings {
  /** The Illustrations switch in Settings › Layout, on by default. */
  on: boolean;
  /** What the Today header follows: the hour, the season or the current block's track. */
  todayBy: TodayArtBy;
}

export function useArtSettings(): ArtSettings {
  const settings = useSettings(seed.settings);
  return { on: settings?.layout.general.illustrations ?? true, todayBy: settings?.layout.today.art ?? 'time' };
}
