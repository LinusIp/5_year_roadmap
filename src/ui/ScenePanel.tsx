/**
 * A slot for the day's scene image (ATLAS-DAILY-SCENES): a tile-radius card that reserves its aspect ratio,
 * shows the 300 px thumbnail at once (blurred, as the low-quality picture) and lays the large image over it when
 * it has loaded. Text never sits on the image: `top` and `bottom` go on a fade to the ground, `children` are laid
 * over the picture by the caller on a paper-coloured chip (.scene-chip). Each slot names its focal point; a scene's
 * own `focal` in scenes.json wins.
 *
 * With the daily scene off (or no scene shipped) the panel renders `fallback`, or nothing.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { sceneSources, useCurrentScene } from '../hooks/useScenes.ts';
import type { Scene } from '../seed/scenes.ts';

export interface ScenePanelProps {
  /** Which slot this is, for the tests and the eye. */
  slot: string;
  /** A scene other than the day's: Today's preview, the Daily scenes page's pick. */
  scene?: Scene | null;
  /** Width over height, e.g. "3 / 2". */
  aspect?: string;
  /** The slot's crop, as CSS object-position ("50% 45%"). */
  focal?: string;
  alt?: string;
  decorative?: boolean;
  top?: ReactNode;
  bottom?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Loaded at once rather than when scrolled near: the one panel above the fold. */
  eager?: boolean;
  /** Only the thumbnail (a grid cell). */
  thumb?: boolean;
  /** No tile chrome: the map's full-bleed background. */
  bare?: boolean;
  /** What to draw with the daily scene off. */
  fallback?: ReactNode;
  /** The image's share of the viewport width, for the browser's choice of file ("100vw", "25vw"). */
  sizes?: string;
}

export function ScenePanel({ slot, scene: given, aspect, focal = '50% 50%', alt = '', decorative = false, top, bottom, children, className = '', eager = false, thumb = false, bare = false, fallback = null, sizes = '100vw' }: ScenePanelProps) {
  const current = useCurrentScene();
  const [loaded, setLoaded] = useState<string | null>(null);
  const scene = given === undefined ? current.scene : given;
  if (!scene) return <>{fallback}</>;
  const src = sceneSources(scene);
  const position = scene.focal ? scene.focal.x + '% ' + scene.focal.y + '%' : focal;
  const shown = loaded === scene.id;
  const label = decorative ? '' : alt || scene.name;
  return (
    <div
      className={(bare ? 'overflow-hidden ' : 'tile overflow-hidden !p-0 ') + (/\babsolute\b/.test(className) ? '' : 'relative ') + className}
      style={aspect ? { aspectRatio: aspect } : undefined}
      data-scene-panel={slot}
      data-scene={scene.id}
      data-scene-image={thumb || shown ? 'shown' : 'loading'}
    >
      {/* The thumbnail is the picture until the large file lands, and the whole picture in a grid cell. */}
      <picture aria-hidden={decorative || undefined}>
        <source type="image/avif" srcSet={src.thumbAvif} />
        <img
          src={src.thumbWebp}
          alt={thumb ? label : ''}
          width={300}
          height={Math.round((300 * scene.height) / scene.width)}
          loading={eager || thumb ? 'eager' : 'lazy'}
          decoding="async"
          className={'absolute inset-0 h-full w-full object-cover ' + (thumb || shown ? '' : 'scale-105 blur-[6px]')}
          style={{ objectPosition: position }}
        />
      </picture>
      {!thumb && (
        <picture aria-hidden={decorative || undefined}>
          <source type="image/avif" srcSet={src.avif} sizes={sizes} />
          <img
            src={src.webp}
            alt={label}
            width={scene.width}
            height={scene.height}
            sizes={sizes}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setLoaded(scene.id)}
            className={'absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ' + (shown ? 'opacity-100' : 'opacity-0')}
            style={{ objectPosition: position }}
          />
        </picture>
      )}
      {top && <div className="art-fade-top absolute inset-x-0 top-0 px-[18px] pb-7 pt-2">{top}</div>}
      {bottom && <div className="art-fade-bottom absolute inset-x-0 bottom-0 px-[18px] pb-3 pt-9">{bottom}</div>}
      {children}
    </div>
  );
}

/** The five lane swatches of a scene, decoration beside its name. */
export function SceneSwatches({ scene, size = 14 }: { scene: Scene; size?: number }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 gap-1">
      {scene.lanes.map((lane, i) => (
        <i key={i} className="block rounded-pill" style={{ width: size, height: size, background: lane }} />
      ))}
    </span>
  );
}
