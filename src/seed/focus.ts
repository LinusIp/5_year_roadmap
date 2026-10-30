/**
 * The Focus tab's starter sessions (ATLAS-FOCUS-MUSIC): data/focus-sessions.json lists calm, long YouTube sessions
 * by category. validate:data checks the shape here; scripts/focus-verify.ts asks YouTube's oEmbed endpoint about
 * each one on CI (every pull request, and weekly), since a live stream's id changes and an upload can stop
 * allowing embeds. Nothing is ever downloaded: the app plays them through the official embed player alone.
 */
import { z } from 'zod';

export const FOCUS_CATEGORIES = [
  { key: 'mine', label: 'My sessions' },
  { key: 'lofi', label: 'Lofi' },
  { key: 'piano', label: 'Piano' },
  { key: 'classical', label: 'Classical' },
  { key: 'ambient', label: 'Ambient' },
  { key: 'rain', label: 'Rain & nature' },
  { key: 'jazz', label: 'Jazz' },
  { key: 'brown', label: 'Brown noise' },
] as const;
export type FocusCategory = (typeof FOCUS_CATEGORIES)[number]['key'];
export const FOCUS_CATEGORY_KEYS = FOCUS_CATEGORIES.map((c) => c.key) as [FocusCategory, ...FocusCategory[]];

export function categoryLabel(key: string): string {
  return FOCUS_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export const FocusSessionSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  /** A YouTube watch or playlist address, exactly as oEmbed confirmed it. */
  url: z.string().url().regex(/^https:\/\/(www\.)?youtube\.com\/(watch\?v=[\w-]{11}|playlist\?list=[\w-]+)$/, 'a youtube.com watch or playlist address'),
  title: z.string().min(1).max(200),
  channel: z.string().min(1).max(120),
  category: z.enum(FOCUS_CATEGORY_KEYS),
  /** "2 h", "LIVE", or empty when the length is not known (no Data API key). */
  durationLabel: z.string().max(20),
  kind: z.enum(['video', 'live', 'playlist']),
});
export type FocusSession = z.infer<typeof FocusSessionSchema>;
export const FocusSessionsSchema = z.array(FocusSessionSchema).min(1);

/** The manifest's problems, in words: a bad shape, two rows with one id or one address, a live row that is not a video. */
export function focusProblems(value: unknown): string[] {
  const parsed = FocusSessionsSchema.safeParse(value);
  if (!parsed.success) return parsed.error.issues.map((i) => 'focus-sessions.json: ' + i.path.join('.') + ': ' + i.message);
  const errors: string[] = [];
  const ids = new Set<string>();
  const urls = new Set<string>();
  for (const s of parsed.data) {
    if (ids.has(s.id)) errors.push('focus-sessions.json: two sessions with the id ' + s.id);
    if (urls.has(s.url)) errors.push('focus-sessions.json: two sessions at ' + s.url);
    ids.add(s.id);
    urls.add(s.url);
    if (s.kind === 'playlist' && !s.url.includes('playlist?list=')) errors.push('focus-sessions.json: ' + s.id + ' is a playlist without a playlist address');
    if (s.kind !== 'playlist' && !s.url.includes('watch?v=')) errors.push('focus-sessions.json: ' + s.id + ' is a video without a watch address');
    if (s.kind === 'live' && s.durationLabel !== 'LIVE') errors.push('focus-sessions.json: ' + s.id + ' is live but its duration label is not LIVE');
  }
  return errors;
}
