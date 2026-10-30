/**
 * A slot for an illustration (ATLAS-ART): a rounded card with the tile's radius and shadow that reserves its
 * aspect ratio, draws the slot's placeholder, and lays the manifest's image over it once it has loaded (lazily,
 * covering the card from its focal point). Text never sits on the art itself: `children` go on a fade to the
 * ground colour over the top or bottom third, where the tokens' contrast holds. In the dark theme an image made
 * for the light one is dimmed under the same fade. Nothing moves: there is no parallax to reduce.
 *
 * With Illustrations off in Settings the panel renders nothing at all, so a screen reads as it did before.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useArtManifest, useArtSettings, artUrl } from '../hooks/useArt.ts';
import { artFor } from '../lib/art.ts';
import type { ArtSlot } from '../seed/art.ts';
import { ArtPlaceholder } from './ArtPlaceholder.tsx';

export interface ArtPanelProps {
  slot: ArtSlot;
  /** Width over height, e.g. "3 / 1" for the Today header. The space is reserved before the image arrives. */
  aspect: string;
  /** Spoken for the image; the placeholder is decoration and says nothing. */
  alt?: string;
  /** Purely decorative art (the map's river): hidden from assistive tech whatever it shows. */
  decorative?: boolean;
  /** Text laid over the fade at the top. */
  top?: ReactNode;
  /** Text laid over the fade at the bottom. */
  bottom?: ReactNode;
  className?: string;
  /** Loaded at once rather than when scrolled near: the one panel above the fold. */
  eager?: boolean;
}

export function ArtPanel({ slot, aspect, alt = '', decorative = false, top, bottom, className = '', eager = false }: ArtPanelProps) {
  const { on } = useArtSettings();
  const manifest = useArtManifest();
  const theme = (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
  const [loaded, setLoaded] = useState<string | null>(null);
  if (!on) return null;
  const found = artFor(manifest, slot, theme);
  const image = found?.image ?? null;
  const shown = image !== null && loaded === image.id;
  return (
    <div
      className={'art-panel tile relative overflow-hidden !p-0 ' + className}
      style={{ aspectRatio: aspect }}
      data-art-slot={slot}
      data-art={image ? (shown ? 'image' : 'loading') : 'placeholder'}
      aria-hidden={decorative || undefined}
    >
      {/* The placeholder stays under the image: it is the low-quality picture while the file loads. */}
      <ArtPlaceholder slot={slot} className={'absolute inset-0 h-full w-full ' + (image && !shown ? 'blur-[6px]' : '')} />
      {image && (
        <picture>
          <source type="image/avif" srcSet={artUrl(image.file.avif)} />
          <img
            src={artUrl(image.file.webp)}
            alt={decorative ? '' : alt || image.alt}
            width={image.width}
            height={image.height}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setLoaded(image.id)}
            className={'absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ' + (shown ? 'opacity-100' : 'opacity-0') + (found?.dimmed ? ' brightness-[.7]' : '')}
            style={{ objectPosition: image.focal.x + '% ' + image.focal.y + '%' }}
          />
        </picture>
      )}
      {found?.dimmed && <div aria-hidden="true" className="art-fade-bottom absolute inset-x-0 bottom-0 h-[45%]" />}
      {top && <div className="art-fade-top absolute inset-x-0 top-0 px-[18px] pb-7 pt-2">{top}</div>}
      {bottom && <div className="art-fade-bottom absolute inset-x-0 bottom-0 px-[18px] pb-3 pt-7">{bottom}</div>}
    </div>
  );
}
