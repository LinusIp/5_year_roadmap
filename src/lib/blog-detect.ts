/**
 * "Detect my post automatically" (DAILY-BLOG), off by default: whether the blog's repository holds a post dated on a
 * day. Read-only: it lists the posts folder (Pages CMS's `posts` collection, `_posts` in .pages.yml, Jekyll's
 * YYYY-MM-DD-title.md names) and never writes anything to the blog.
 */
import { GithubClient, GithubError } from '../sync/github-api.ts';
import type { FetchLike } from './github.ts';

export type DetectResult = { kind: 'found'; file: string } | { kind: 'none' } | { kind: 'no-access'; message: string } | { kind: 'error'; message: string };

/** What to do when the token cannot read the blog: give it read access to that one repository. */
export function readAccessHelp(repo: string): string {
  return (
    'Atlas cannot read ' + repo + ' with the token it has. On GitHub, open Settings › Developer settings › Personal access tokens › ' +
    'Fine-grained tokens, edit the token Atlas uses, add ' + repo + ' under Repository access, and give it Contents: Read-only. ' +
    'Atlas only reads the posts folder; it never writes to your blog.'
  );
}

/** Looks for a post file dated `date` ("2026-10-18-…") in the posts folder. */
export async function detectPost(date: string, blog: { repo: string; postsFolder: string }, token: string, fetchImpl?: FetchLike): Promise<DetectResult> {
  const [owner, name] = blog.repo.split('/');
  if (!owner || !name) return { kind: 'error', message: 'The blog repository should read owner/name.' };
  const client = new GithubClient(token, owner, name, fetchImpl ? { fetchImpl } : {});
  try {
    const files = await client.listDirectory(blog.postsFolder);
    const post = files.find((f) => f.type === 'file' && f.name.startsWith(date + '-') && /\.(md|markdown|html)$/i.test(f.name));
    return post ? { kind: 'found', file: post.path } : { kind: 'none' };
  } catch (err) {
    if (err instanceof GithubError && (err.kind === 'not-found' || err.kind === 'forbidden' || err.kind === 'unauthorized')) return { kind: 'no-access', message: readAccessHelp(blog.repo) };
    return { kind: 'error', message: err instanceof Error ? err.message : 'Could not reach GitHub.' };
  }
}
