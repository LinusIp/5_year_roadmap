/**
 * The Focus tab's pure parts (ATLAS-FOCUS-MUSIC): reading a pasted YouTube address, the oEmbed call that confirms
 * it, the session timer and "until the block ends", and each block's default mix. The player itself is
 * src/lib/focus-player.ts; the generated sounds src/lib/sounds.ts.
 */
import type { FocusCategory } from '../seed/focus.ts';

/* ------------------------------------------------------------------ addresses */

export interface YouTubeRef {
  kind: 'video' | 'playlist';
  id: string;
  /** The canonical address, the one oEmbed is asked about and the one stored. */
  url: string;
}

/**
 * A YouTube video or playlist from any of its addresses (watch, youtu.be, shorts, embed, live, playlist), or null
 * for anything else. The canonical address is rebuilt from the id: nothing a user pastes is stored as typed.
 */
export function parseYouTubeUrl(input: string): YouTubeRef | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.replace(/^www\.|^m\.|^music\./, '');
  const video = (id: string | null | undefined): YouTubeRef | null => (id && /^[\w-]{11}$/.test(id) ? { kind: 'video', id, url: 'https://www.youtube.com/watch?v=' + id } : null);
  const playlist = (id: string | null | undefined): YouTubeRef | null => (id && /^[\w-]{13,}$/.test(id) ? { kind: 'playlist', id, url: 'https://www.youtube.com/playlist?list=' + id } : null);
  if (host === 'youtu.be') return video(url.pathname.slice(1).split('/')[0]);
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null;
  if (url.pathname === '/playlist') return playlist(url.searchParams.get('list'));
  if (url.pathname === '/watch') return video(url.searchParams.get('v')) ?? playlist(url.searchParams.get('list'));
  const m = /^\/(?:embed|shorts|live|v)\/([\w-]{11})/.exec(url.pathname);
  return m ? video(m[1]) : null;
}

/** The oEmbed request for an address: title, channel and thumbnail come back, and a 401 means no embedding. */
export function oembedUrl(url: string): string {
  return 'https://www.youtube.com/oembed?url=' + encodeURIComponent(url) + '&format=json';
}

export interface OembedInfo {
  title: string;
  channel: string;
  thumbnail: string;
}

/**
 * What an oEmbed answer must carry to count as confirmed: an iframe to embed with. A video answers with its title,
 * channel and thumbnail too; a live stream answers with the iframe alone (YouTube leaves the rest out while it is
 * on air), so those come back empty and the caller names it.
 */
export function readOembed(body: unknown): OembedInfo | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.html !== 'string' || !/<iframe\b/i.test(o.html)) return null;
  return { title: typeof o.title === 'string' ? o.title : '', channel: typeof o.author_name === 'string' ? o.author_name : '', thumbnail: typeof o.thumbnail_url === 'string' ? o.thumbnail_url : '' };
}

/** The thumbnail YouTube keeps for every video, without any key. */
export function thumbnailFor(videoId: string): string {
  return 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg';
}

/* ------------------------------------------------------------------ the timer */

export const TIMER_OPTIONS = ['25', '50', '60', '90', 'block'] as const;
export type TimerOption = (typeof TIMER_OPTIONS)[number];

/** When a session timer started at `now` ends: the minutes, or the block's end (null when no block is running). */
export function timerEndsAt(option: TimerOption, now: number, blockEndsAt: number | null): number | null {
  if (option === 'block') return blockEndsAt !== null && blockEndsAt > now ? blockEndsAt : null;
  return now + Number(option) * 60_000;
}

/** "25 m", "Till 12:00". */
export function timerLabel(option: TimerOption, blockEndsAt: number | null, clock: (ms: number) => string): string {
  if (option !== 'block') return option + ' m';
  return blockEndsAt ? 'Till ' + clock(blockEndsAt) : 'Till the block ends';
}

/** The end of a block's window today, from its start minute of the day and its length. */
export function blockEndsAt(window: { start: number; minutes: number } | undefined, now: Date): number | null {
  if (!window) return null;
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, window.start + window.minutes);
  return end.getTime();
}

/** "1:05 left", "40 s left". */
export function timeLeft(endsAt: number, now: number): string {
  const seconds = Math.max(0, Math.round((endsAt - now) / 1000));
  if (seconds < 60) return seconds + ' s left';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return (h > 0 ? h + ':' + String(m).padStart(2, '0') : m + ' m') + ' left';
}

/* ------------------------------------------------------------------ preferences */

export interface UserSession {
  id: string;
  url: string;
  videoId: string;
  kind: 'video' | 'playlist';
  title: string;
  channel: string;
  thumbnail: string;
  addedAt: string;
}

export interface FocusPrefs {
  /** The user's own sessions, in their order. */
  sessions: UserSession[];
  /** A block's default mix: a category to offer when its timer starts. */
  mixes: Record<string, FocusCategory>;
  /** "Start with Lofi?" answered for a block: asked once, remembered. */
  offered: Record<string, boolean>;
  /** The video's volume and the Atlas sound layered under it, 0 to 100. */
  volume: number;
  layerVolume: number;
}

export const DEFAULT_FOCUS_PREFS: FocusPrefs = { sessions: [], mixes: {}, offered: {}, volume: 80, layerVolume: 40 };

/** The category a block starts with, if one is set. */
export function mixFor(prefs: Pick<FocusPrefs, 'mixes'> | undefined, block: string | undefined): FocusCategory | null {
  if (!prefs || !block) return null;
  return prefs.mixes[block] ?? null;
}

/** Whether to ask "Start with X?" when this block's timer starts: a mix is set and the question was never answered. */
export function shouldOffer(prefs: FocusPrefs | undefined, block: string | undefined): FocusCategory | null {
  const mix = mixFor(prefs, block);
  if (!mix || !block) return null;
  return prefs!.offered[block] === undefined ? mix : null;
}

/** Moves a session from one position to another in the user's list. */
export function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x!);
  return next;
}
