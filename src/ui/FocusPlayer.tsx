/**
 * The YouTube embed (ATLAS-FOCUS-MUSIC), mounted once in the app shell. It is the official IFrame Player on
 * youtube-nocookie.com, created the first time a session is played (never on page load), and it stays on screen
 * while anything plays, as YouTube's policies ask: on the Focus tab it fills the Now playing tile (the tile marks
 * where with registerPlayerAnchor, and the embed sits over it); on every other screen it docks above the tab bar at
 * 200 × 200 px with the title and channel beside it. Nothing covers it, nothing hides it, no ad is blocked.
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from './Button.tsx';
import { Icon } from './Icon.tsx';
import { Link } from '../router/router.tsx';
import { embedReported, pause, registerEmbed, resume, setDocked, stop, useFocusPlayer } from '../lib/focus-player.ts';
import type { PlayerSession } from '../lib/focus-player.ts';

const API = 'https://www.youtube.com/iframe_api';
const HOST = 'https://www.youtube-nocookie.com';

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  loadVideoById(id: string): void;
  loadPlaylist(options: { listType: 'playlist'; list: string }): void;
  setVolume(volume: number): void;
  destroy(): void;
}
interface YTStatic {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}
declare global {
  interface Window {
    YT?: YTStatic;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoading: Promise<YTStatic> | null = null;

/** Loads the IFrame API once, on the first play. */
export function loadIframeApi(): Promise<YTStatic> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiLoading ??= new Promise<YTStatic>((resolve, reject) => {
    const before = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      before?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error('The YouTube player did not load'));
    };
    const script = document.createElement('script');
    script.src = API;
    script.async = true;
    script.onerror = () => {
      apiLoading = null;
      reject(new Error('The YouTube player did not load'));
    };
    document.head.append(script);
  });
  return apiLoading;
}

let anchorElement: HTMLElement | null = null;
const anchorListeners = new Set<() => void>();

/** The Focus screen's Now playing tile says where the embed goes while the screen is open. */
export function registerPlayerAnchor(element: HTMLElement | null): void {
  anchorElement = element;
  for (const l of anchorListeners) l();
}

type Box = { top: number; left: number; width: number; height: number } | null;

function measure(): Box {
  if (!anchorElement) return null;
  const r = anchorElement.getBoundingClientRect();
  return { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height };
}

export function FocusPlayer() {
  const player = useFocusPlayer();
  const holder = useRef<HTMLDivElement>(null);
  const yt = useRef<YTPlayer | null>(null);
  const [box, setBox] = useState<Box>(measure);
  const [failed, setFailed] = useState<string | null>(null);
  const active = player.session !== null;

  // Follow the Focus tile while it is on screen; dock otherwise.
  useEffect(() => {
    const update = (): void => setBox(measure());
    anchorListeners.add(update);
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    const watch = (): void => {
      observer?.disconnect();
      if (anchorElement && observer) observer.observe(anchorElement);
      update();
    };
    anchorListeners.add(watch);
    watch();
    return () => {
      anchorListeners.delete(update);
      anchorListeners.delete(watch);
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, []);
  useEffect(() => setDocked(box === null), [box]);

  // The player itself, created on the first session and kept while one is loaded; gone with the last.
  useEffect(() => {
    if (!active) {
      yt.current?.destroy();
      yt.current = null;
      registerEmbed(null);
      return undefined;
    }
    if (yt.current || !holder.current) return undefined;
    let live = true;
    const mount = document.createElement('div');
    holder.current.replaceChildren(mount);
    loadIframeApi()
      .then((YT) => {
        if (!live) return;
        let pending: PlayerSession | null = player.session;
        const instance = new YT.Player(mount, {
          host: HOST,
          width: '100%',
          height: '100%',
          playerVars: { autoplay: 0, rel: 0, playsinline: 1, modestbranding: 1, origin: window.location.origin },
          events: {
            onReady: () => {
              if (!live) return;
              yt.current = instance;
              const load = (session: PlayerSession): void => {
                if (session.kind === 'playlist') instance.loadPlaylist({ listType: 'playlist', list: session.videoId });
                else instance.loadVideoById(session.videoId);
              };
              registerEmbed({
                load,
                play: () => instance.playVideo(),
                pause: () => instance.pauseVideo(),
                stop: () => instance.stopVideo(),
                setVolume: (v) => instance.setVolume(v),
              });
              if (pending) {
                load(pending);
                pending = null;
              }
            },
            onStateChange: (e: { data: number }) => {
              if (e.data === YT.PlayerState.PLAYING) embedReported('playing');
              else if (e.data === YT.PlayerState.PAUSED) embedReported('paused');
              else if (e.data === YT.PlayerState.ENDED) embedReported('ended');
            },
            onError: () => setFailed('YouTube could not play this one. It may not allow embedding.'),
          },
        });
      })
      .catch((err: Error) => live && setFailed(err.message));
    return () => {
      live = false;
    };
    // The session that triggered creation is read once; later sessions go through registerEmbed's load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;
  const docked = box === null;
  const style = docked ? undefined : { top: box.top, left: box.left, width: box.width, height: box.height };
  return (
    <div
      className={docked ? 'fixed bottom-[calc(1.5rem+68px+12px+env(safe-area-inset-bottom))] right-5 z-20 flex w-[min(100vw-2.5rem,20rem)] flex-col gap-2 sm:right-6' : 'absolute z-10'}
      style={style}
      data-focus-player={docked ? 'docked' : 'tile'}
      aria-label={'Now playing: ' + player.session!.title + ' by ' + player.session!.channel}
      role="region"
    >
      <div className={docked ? 'tile flex gap-3 p-2' : 'h-full w-full'}>
        {/* 200 × 200 px when docked: the embedded player's smallest allowed size. */}
        <div ref={holder} className={docked ? 'size-[200px] shrink-0 overflow-hidden rounded-[18px] bg-[var(--lo)]' : 'h-full w-full overflow-hidden rounded-[18px] bg-[var(--lo)] [&_iframe]:h-full [&_iframe]:w-full'} data-focus-embed />
        {docked && (
          <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
            <div className="min-w-0">
              <Link to="/focus" className="line-clamp-3 text-meta font-medium leading-tight">
                {player.session!.title}
              </Link>
              <p className="line-clamp-2 text-small text-ink2">{player.session!.channel + ' · YouTube'}</p>
              {failed && <p className="text-small text-ink2">{failed}</p>}
            </div>
            <div className="-ml-2 flex">
              <Button variant="icon" icon={player.status === 'playing' ? 'pause' : 'play'} className="!size-11" label={player.status === 'playing' ? 'Pause' : 'Play'} onClick={() => (player.status === 'playing' ? pause() : resume())} />
              <Button variant="icon" icon="stop" className="!size-11" label="Stop the music" onClick={stop} />
            </div>
          </div>
        )}
      </div>
      {!docked && failed && (
        <p className="scene-chip absolute inset-x-3 bottom-3 flex items-center gap-2 px-3 py-2 text-small text-ink2">
          <Icon name="hint" size={14} />
          {failed}
        </p>
      )}
    </div>
  );
}
