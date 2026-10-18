/**
 * The daily blog (DAILY-BLOG): which days the post was written (blogPosts, synced as blog/<date>.json) and this
 * device's blog settings (meta "blogSettings": the editor link, and the optional detection of a post in the blog's
 * repository). The post itself is written in the user's own blog, never here.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';
import type { AtlasDB } from './db.ts';
import type { BlogPost } from './types.ts';
import { DEFAULT_EDITOR_LINK } from '../lib/blog.ts';
import { detectPost } from '../lib/blog-detect.ts';
import type { DetectResult } from '../lib/blog-detect.ts';
import type { FetchLike } from '../lib/github.ts';

export interface BlogSettings {
  /** Where "Open my blog" goes: Pages CMS, or the user's own posts collection in it. */
  editorLink: string;
  /** "Detect my post automatically": off by default. */
  autoDetect: boolean;
  /** The blog's repository and its posts folder, read-only (from its Pages CMS config, .pages.yml). */
  repo: string;
  postsFolder: string;
  /** The last day the detection looked, so it looks once an evening. */
  checkedOn?: string;
}

export const BLOG_SETTINGS_KEY = 'blogSettings';
export const DEFAULT_BLOG_SETTINGS: BlogSettings = { editorLink: DEFAULT_EDITOR_LINK, autoDetect: false, repo: 'LinusIp/abdullohshavkatjonov', postsFolder: '_posts' };

export async function readBlogSettings(database: AtlasDB = db): Promise<BlogSettings> {
  const value = (await database.meta.get(BLOG_SETTINGS_KEY))?.value;
  return { ...DEFAULT_BLOG_SETTINGS, ...(value && typeof value === 'object' ? (value as Partial<BlogSettings>) : {}) };
}

export function useBlogSettings(): BlogSettings | undefined {
  return useLiveQuery(() => readBlogSettings(), []);
}

export async function saveBlogSettings(change: (s: BlogSettings) => BlogSettings, database: AtlasDB = db): Promise<BlogSettings> {
  return database.transaction('rw', database.meta, async () => {
    const next = change(await readBlogSettings(database));
    await database.meta.put({ key: BLOG_SETTINGS_KEY, value: next });
    return next;
  });
}

export function useBlogPosts(): BlogPost[] | undefined {
  return useLiveQuery(() => db.blogPosts.toArray(), []);
}

/** "I posted it" (posted: true) and its Undo (posted: false). The record stays, so an undo reaches other devices. */
export async function setBlogPosted(date: string, posted: boolean, extra: { editorLinkUsed?: boolean; auto?: boolean } = {}, database: AtlasDB = db): Promise<void> {
  const record: BlogPost = { date, posted, at: new Date().toISOString() };
  if (extra.editorLinkUsed) record.editorLinkUsed = true;
  if (extra.auto) record.auto = true;
  await database.blogPosts.put(record);
}

/**
 * The automatic detection, when it is on: looks once a day (or whenever `force` asks) for a post dated `date` in the
 * blog's repository, and marks the day posted when it finds one. Uses this device's GitHub token when there is one;
 * a public blog can be read without.
 */
export async function checkBlogPost(date: string, options: { force?: boolean; fetchImpl?: FetchLike } = {}, database: AtlasDB = db): Promise<DetectResult | null> {
  const settings = await readBlogSettings(database);
  if (!settings.autoDetect) return null;
  if ((await database.blogPosts.get(date))?.posted) return null;
  if (!options.force && settings.checkedOn === date) return null;
  const token = (await database.secrets.get('github'))?.token ?? '';
  const result = await detectPost(date, settings, token, options.fetchImpl);
  await saveBlogSettings((s) => ({ ...s, checkedOn: date }), database);
  if (result.kind === 'found') await setBlogPosted(date, true, { auto: true }, database);
  return result;
}
