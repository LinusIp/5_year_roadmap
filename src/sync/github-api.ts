/**
 * The GitHub REST calls GitHub Sync makes, straight from the browser (api.github.com allows CORS), with the
 * user's fine-grained token. Nothing else in the app talks to GitHub's REST API.
 *
 * Every request skips the HTTP cache: a poll must never see a branch head older than the one this device just
 * pushed. Failures become a `GithubError` with a kind the engine can act on.
 */
import type { FetchLike } from '../lib/github.ts';

export const GITHUB_API = 'https://api.github.com';

export type GithubErrorKind = 'unauthorized' | 'forbidden' | 'not-found' | 'conflict' | 'empty' | 'rate-limited' | 'network' | 'unexpected';

export class GithubError extends Error {
  readonly kind: GithubErrorKind;
  readonly status: number | undefined;
  /** For a rate limit: when to try again, epoch milliseconds. */
  readonly retryAt: number | undefined;
  constructor(kind: GithubErrorKind, message: string, status?: number, retryAt?: number) {
    super(message);
    this.name = 'GithubError';
    this.kind = kind;
    this.status = status;
    this.retryAt = retryAt;
  }
}

export interface RepoInfo {
  private: boolean;
  defaultBranch: string;
  canPush: boolean;
}

export interface TreeEntry {
  path: string;
  sha: string;
  type: 'blob' | 'tree' | 'commit';
}

export interface Author {
  name: string;
  email: string;
}

const defaultFetch: FetchLike = (input, init) => fetch(input, init);

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

/** Base64 (as GitHub sends blobs, with line breaks) to UTF-8 text. */
export function decodeBase64(text: string): string {
  const binary = atob(text.replace(/\s+/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** UTF-8 text to base64, for the contents API. */
export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export class GithubClient {
  /** From the token-expiration header, when GitHub exposes it: "2026-12-31". */
  tokenExpiresAt: string | undefined;
  /** Requests made, for the tests and the rate-limit budget. */
  requests = 0;

  private readonly token: string;
  private readonly owner: string;
  private readonly repo: string;
  private readonly fetchImpl: FetchLike;
  private readonly now: () => number;

  constructor(token: string, owner: string, repo: string, options: { fetchImpl?: FetchLike; now?: () => number } = {}) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.fetchImpl = options.fetchImpl ?? defaultFetch;
    this.now = options.now ?? Date.now;
  }

  private repoPath(rest: string): string {
    return '/repos/' + encodeURIComponent(this.owner) + '/' + encodeURIComponent(this.repo) + rest;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    this.requests++;
    let response: Response;
    try {
      response = await this.fetchImpl(GITHUB_API + path, {
        method,
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer ' + this.token,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new GithubError('network', 'Could not reach GitHub.');
    }

    const expiry = response.headers.get('github-authentication-token-expiration');
    if (expiry) this.tokenExpiresAt = expiry.slice(0, 10);

    if (response.ok) {
      if (response.status === 204) return undefined as T;
      try {
        return (await response.json()) as T;
      } catch {
        throw new GithubError('unexpected', "GitHub's answer was not JSON.", response.status);
      }
    }

    let message = 'GitHub answered with HTTP ' + response.status + '.';
    try {
      const json = (await response.json()) as { message?: unknown };
      if (typeof json.message === 'string') message = json.message;
    } catch {
      /* no body */
    }
    const remaining = response.headers.get('x-ratelimit-remaining');
    const retryAfter = response.headers.get('retry-after');
    if (response.status === 429 || (response.status === 403 && (remaining === '0' || retryAfter))) {
      const reset = response.headers.get('x-ratelimit-reset');
      const retryAt = retryAfter ? this.now() + Number(retryAfter) * 1000 : reset ? Number(reset) * 1000 : this.now() + 60_000;
      throw new GithubError('rate-limited', "GitHub's rate limit was reached.", response.status, retryAt);
    }
    if (response.status === 401) throw new GithubError('unauthorized', 'GitHub did not accept the token. It may have expired or been revoked.', 401);
    if (response.status === 403) throw new GithubError('forbidden', message, 403);
    if (response.status === 404) throw new GithubError('not-found', message, 404);
    if (response.status === 409) throw new GithubError(/empty/i.test(message) ? 'empty' : 'conflict', message, 409);
    if (response.status === 422) throw new GithubError('conflict', message, 422);
    throw new GithubError('unexpected', message, response.status);
  }

  async getRepo(): Promise<RepoInfo> {
    const json = await this.request<{ private: boolean; default_branch: string; permissions?: { push?: boolean } }>('GET', this.repoPath(''));
    return { private: json.private, defaultBranch: json.default_branch || 'main', canPush: json.permissions?.push ?? true };
  }

  async getUser(): Promise<{ login: string; id: number; name: string | null }> {
    return this.request('GET', '/user');
  }

  /** The user's primary verified email, when the token may read it. */
  async getPrimaryEmail(): Promise<string | null> {
    try {
      const emails = await this.request<{ email: string; primary: boolean; verified: boolean }[]>('GET', '/user/emails');
      return emails.find((e) => e.primary && e.verified)?.email ?? null;
    } catch (err) {
      if (err instanceof GithubError && (err.kind === 'forbidden' || err.kind === 'not-found')) return null;
      throw err;
    }
  }

  /** The branch's head commit, or null for an empty repository. */
  async getHead(branch: string): Promise<string | null> {
    try {
      const json = await this.request<{ object: { sha: string } }>('GET', this.repoPath('/git/ref/heads/' + encodePath(branch)));
      return json.object.sha;
    } catch (err) {
      if (err instanceof GithubError && (err.kind === 'empty' || err.kind === 'not-found' || err.kind === 'conflict')) return null;
      throw err;
    }
  }

  async getCommitTree(sha: string): Promise<string> {
    const json = await this.request<{ tree: { sha: string } }>('GET', this.repoPath('/git/commits/' + sha));
    return json.tree.sha;
  }

  async getTree(sha: string): Promise<TreeEntry[]> {
    const json = await this.request<{ tree: TreeEntry[]; truncated?: boolean }>('GET', this.repoPath('/git/trees/' + sha + '?recursive=1'));
    if (json.truncated) throw new GithubError('unexpected', 'The data repository has too many files for one listing.');
    return json.tree.filter((e) => e.type === 'blob');
  }

  async getBlob(sha: string): Promise<string> {
    const json = await this.request<{ content: string; encoding: string }>('GET', this.repoPath('/git/blobs/' + sha));
    return json.encoding === 'base64' ? decodeBase64(json.content) : json.content;
  }

  async createBlob(content: string): Promise<string> {
    const json = await this.request<{ sha: string }>('POST', this.repoPath('/git/blobs'), { content, encoding: 'utf-8' });
    return json.sha;
  }

  async createTree(baseTree: string | undefined, entries: { path: string; sha: string | null }[]): Promise<string> {
    const tree = entries.map((e) => ({ path: e.path, mode: '100644', type: 'blob', sha: e.sha }));
    const json = await this.request<{ sha: string }>('POST', this.repoPath('/git/trees'), baseTree ? { base_tree: baseTree, tree } : { tree });
    return json.sha;
  }

  async createCommit(message: string, tree: string, parents: string[], author: Author, date: string): Promise<string> {
    const person = { name: author.name, email: author.email, date };
    const json = await this.request<{ sha: string }>('POST', this.repoPath('/git/commits'), { message, tree, parents, author: person, committer: person });
    return json.sha;
  }

  /** Moves the branch to `sha`, only as a fast-forward: another device's push in between is a conflict. */
  async updateRef(branch: string, sha: string): Promise<void> {
    await this.request('PATCH', this.repoPath('/git/refs/heads/' + encodePath(branch)), { sha, force: false });
  }

  /** Creates a branch at `sha`. Used by `npm run test:sync` for its throwaway branch. */
  async createRef(branch: string, sha: string): Promise<void> {
    await this.request('POST', this.repoPath('/git/refs'), { ref: 'refs/heads/' + branch, sha });
  }

  /** Deletes a branch. */
  async deleteRef(branch: string): Promise<void> {
    await this.request('DELETE', this.repoPath('/git/refs/heads/' + encodePath(branch)));
  }

  /** The first commit of an empty repository: the Git Data API cannot write to one. Returns the commit sha. */
  async createFirstFile(path: string, content: string, message: string, author: Author, branch: string): Promise<string> {
    const json = await this.request<{ commit: { sha: string } }>('PUT', this.repoPath('/contents/' + encodePath(path)), {
      message,
      content: encodeBase64(content),
      branch,
      author: { name: author.name, email: author.email },
      committer: { name: author.name, email: author.email },
    });
    return json.commit.sha;
  }
}

/** The sha Git gives a file's content, so unchanged files are never sent: sha1("blob <bytes>\0<content>"). */
export async function gitBlobSha(content: string): Promise<string> {
  const body = new TextEncoder().encode(content);
  const header = new TextEncoder().encode('blob ' + body.length + '\0');
  const all = new Uint8Array(header.length + body.length);
  all.set(header);
  all.set(body, header.length);
  const digest = await globalThis.crypto.subtle.digest('SHA-1', all);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
