/** The starter sessions as the player takes them (ATLAS-FOCUS-MUSIC), shared by the Focus screen and Today. */
import starter from '../../data/focus-sessions.json';
import { FocusSessionsSchema } from '../seed/focus.ts';
import type { FocusCategory, FocusSession } from '../seed/focus.ts';
import { parseYouTubeUrl, thumbnailFor } from './focus.ts';
import type { FocusPrefs, UserSession } from './focus.ts';
import type { PlayerSession } from './focus-player.ts';

/** The starter list, bundled; data/focus-sessions.json is checked by validate:data and, through oEmbed, by CI. */
export const STARTER: FocusSession[] = FocusSessionsSchema.parse(starter);

export function videoIdOf(url: string): string {
  return parseYouTubeUrl(url)?.id ?? '';
}

export function asPlayable(s: FocusSession): PlayerSession {
  const id = videoIdOf(s.url);
  return { id: s.id, videoId: id, kind: s.kind, title: s.title, channel: s.channel, thumbnail: s.kind === 'playlist' ? '' : thumbnailFor(id), category: s.category };
}

export function userAsPlayable(s: UserSession): PlayerSession {
  return { id: 'mine:' + s.id, videoId: s.videoId, kind: s.kind, title: s.title, channel: s.channel, thumbnail: s.thumbnail, category: 'mine' };
}

/** The first session of a category (the user's own first), for "Start with Lofi?" on Today. Brown noise is an Atlas sound. */
export function firstOf(category: FocusCategory, prefs: FocusPrefs | undefined): PlayerSession | null {
  if (category === 'mine') {
    const mine = prefs?.sessions[0];
    if (mine) return userAsPlayable(mine);
  }
  const s = STARTER.find((x) => x.category === category);
  return s ? asPlayable(s) : null;
}
