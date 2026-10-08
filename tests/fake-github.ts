/**
 * A stand-in for api.github.com, for the Sync tests: a small in-memory Git with the REST routes Atlas uses.
 * Blobs get real Git shas, so Atlas's "is this file unchanged?" check works as it does against GitHub; trees and
 * commits get made-up ones. The branch only moves by fast-forward, like the real API with `force: false`.
 *
 * Use `fake.fetch` as the `fetchImpl` of unit tests, or `fake.handle` behind Playwright's page.route.
 */
import { createHash } from 'node:crypto';

export interface FakeCommit {
  sha: string;
  tree: string;
  parents: string[];
  message: string;
  author: { name: string; email: string; date?: string };
}

export interface FakeResponse {
  status: number;
  json?: unknown;
  headers: Record<string, string>;
}

export interface FakeGithubOptions {
  owner?: string;
  repo?: string;
  token?: string;
  private?: boolean;
  login?: string;
  userId?: number;
  name?: string | null;
  /** The primary email /user/emails returns, or null when the token may not read it. */
  email?: string | null;
  /** Sent as the token-expiration header, like GitHub does for fine-grained tokens. */
  tokenExpiry?: string;
}

interface Failure {
  match: (method: string, path: string) => boolean;
  response: FakeResponse;
}

export class FakeGithub {
  readonly owner: string;
  readonly repo: string;
  token: string;
  readonly options: FakeGithubOptions;
  readonly blobs = new Map<string, string>();
  readonly trees = new Map<string, Map<string, string>>();
  readonly commits = new Map<string, FakeCommit>();
  /** Branch name to commit sha. */
  readonly refs = new Map<string, string>();
  readonly requests: string[] = [];
  /** Runs just before a branch update is applied: lets a test push as "another device" in between. */
  beforeRefUpdate: (() => void) | undefined;
  private failures: Failure[] = [];
  private counter = 0;

  constructor(options: FakeGithubOptions = {}) {
    this.options = options;
    this.owner = options.owner ?? 'octo-learner';
    this.repo = options.repo ?? 'atlas-data';
    this.token = options.token ?? 'github_pat_fake_0123456789';
  }

  static blobSha(content: string): string {
    const body = Buffer.from(content, 'utf8');
    return createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + body.length + '\0'), body])).digest('hex');
  }

  private id(prefix: string): string {
    this.counter++;
    return createHash('sha1').update(prefix + this.counter).digest('hex');
  }

  /** The head of `main`, the branch Atlas uses unless told otherwise. */
  get head(): string | null {
    return this.refs.get('main') ?? null;
  }

  set head(sha: string | null) {
    if (sha) this.refs.set('main', sha);
    else this.refs.delete('main');
  }

  private putBlob(content: string): string {
    const sha = FakeGithub.blobSha(content);
    this.blobs.set(sha, content);
    return sha;
  }

  /** The files at a branch's head, path to content. */
  files(branch = 'main'): Record<string, string> {
    const head = this.refs.get(branch);
    if (!head) return {};
    const tree = this.trees.get(this.commits.get(head)!.tree)!;
    return Object.fromEntries([...tree].map(([path, sha]) => [path, this.blobs.get(sha)!]));
  }

  /** A branch's commits from its head back, newest first. */
  log(branch = 'main'): FakeCommit[] {
    const out: FakeCommit[] = [];
    for (let sha = this.refs.get(branch) ?? null; sha; sha = this.commits.get(sha)!.parents[0] ?? null) out.push(this.commits.get(sha)!);
    return out;
  }

  /** Writes files in one commit, as another device would (null deletes). Returns the commit sha. */
  commitAsOtherDevice(files: Record<string, string | null>, message = 'another device'): string {
    const base = this.head ? new Map(this.trees.get(this.commits.get(this.head)!.tree)!) : new Map<string, string>();
    for (const [path, content] of Object.entries(files)) {
      if (content === null) base.delete(path);
      else base.set(path, this.putBlob(content));
    }
    const tree = this.id('tree');
    this.trees.set(tree, base);
    const sha = this.id('commit');
    this.commits.set(sha, { sha, tree, parents: this.head ? [this.head] : [], message, author: { name: 'Other', email: 'other@example.com' } });
    this.head = sha;
    return sha;
  }

  /** The next request matching `method path` (a regex on the path) gets this answer instead. */
  failNext(method: string, path: RegExp, response: Partial<FakeResponse> & { status: number }): void {
    this.failures.push({ match: (m, p) => m === method && path.test(p), response: { headers: {}, ...response } });
  }

  private ok(json: unknown, status = 200): FakeResponse {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.options.tokenExpiry) headers['github-authentication-token-expiration'] = this.options.tokenExpiry + ' 00:00:00 UTC';
    return { status, json, headers };
  }

  private error(status: number, message: string): FakeResponse {
    return { status, json: { message }, headers: { 'content-type': 'application/json' } };
  }

  async handle(method: string, url: string, body: unknown, headers: Record<string, string | undefined>): Promise<FakeResponse> {
    const { pathname, searchParams } = new URL(url);
    this.requests.push(method + ' ' + pathname + (searchParams.size ? '?' + searchParams.toString() : ''));
    if (method === 'OPTIONS') return { status: 204, headers: {} };

    const failure = this.failures.findIndex((f) => f.match(method, pathname));
    if (failure >= 0) return this.failures.splice(failure, 1)[0]!.response;

    const auth = headers['authorization'] ?? headers['Authorization'];
    if (auth !== 'Bearer ' + this.token) return this.error(401, 'Bad credentials');

    if (pathname === '/user' && method === 'GET') return this.ok({ login: this.options.login ?? this.owner, id: this.options.userId ?? 4242, name: this.options.name ?? null });
    if (pathname === '/user/emails' && method === 'GET') {
      const email = this.options.email === undefined ? null : this.options.email;
      return email ? this.ok([{ email, primary: true, verified: true }]) : this.error(404, 'Not Found');
    }

    const prefix = '/repos/' + this.owner + '/' + this.repo;
    if (!pathname.startsWith(prefix)) return this.error(404, 'Not Found');
    const rest = pathname.slice(prefix.length);
    const data = (body ?? {}) as Record<string, unknown>;

    if (rest === '' && method === 'GET') return this.ok({ private: this.options.private ?? true, default_branch: 'main', permissions: { push: true } });

    let m = /^\/git\/ref\/heads\/(.+)$/.exec(rest);
    if (m && method === 'GET') {
      const branch = decodeURIComponent(m[1]!);
      if (this.refs.size === 0) return this.error(409, 'Git Repository is empty.');
      const sha = this.refs.get(branch);
      return sha ? this.ok({ ref: 'refs/heads/' + branch, object: { sha, type: 'commit' } }) : this.error(404, 'Not Found');
    }
    if (rest === '/git/refs' && method === 'POST') {
      const ref = String(data.ref);
      if (!ref.startsWith('refs/heads/') || !this.commits.has(String(data.sha))) return this.error(422, 'Invalid request');
      const branch = ref.slice('refs/heads/'.length);
      if (this.refs.has(branch)) return this.error(422, 'Reference already exists');
      this.refs.set(branch, String(data.sha));
      return this.ok({ ref, object: { sha: data.sha } }, 201);
    }
    m = /^\/git\/refs\/heads\/(.+)$/.exec(rest);
    if (m && method === 'DELETE') {
      const branch = decodeURIComponent(m[1]!);
      if (!this.refs.delete(branch)) return this.error(422, 'Reference does not exist');
      return { status: 204, headers: {} };
    }
    m = /^\/git\/commits\/([0-9a-f]+)$/.exec(rest);
    if (m && method === 'GET') {
      const commit = this.commits.get(m[1]!);
      return commit ? this.ok({ sha: commit.sha, tree: { sha: commit.tree }, message: commit.message, author: commit.author, parents: commit.parents.map((sha) => ({ sha })) }) : this.error(404, 'Not Found');
    }
    m = /^\/git\/trees\/([0-9a-f]+)$/.exec(rest);
    if (m && method === 'GET') {
      const tree = this.trees.get(m[1]!);
      if (!tree) return this.error(404, 'Not Found');
      return this.ok({ sha: m[1], truncated: false, tree: [...tree].map(([path, sha]) => ({ path, sha, type: 'blob', mode: '100644' })) });
    }
    m = /^\/git\/blobs\/([0-9a-f]+)$/.exec(rest);
    if (m && method === 'GET') {
      const content = this.blobs.get(m[1]!);
      if (content === undefined) return this.error(404, 'Not Found');
      const base64 = Buffer.from(content, 'utf8').toString('base64').replace(/(.{60})/g, '$1\n');
      return this.ok({ sha: m[1], content: base64, encoding: 'base64' });
    }
    if (rest === '/git/blobs' && method === 'POST') {
      if (this.refs.size === 0) return this.error(409, 'Git Repository is empty.');
      return this.ok({ sha: this.putBlob(String(data.content)) }, 201);
    }
    if (rest === '/git/trees' && method === 'POST') {
      const base = typeof data.base_tree === 'string' ? new Map(this.trees.get(data.base_tree) ?? []) : new Map<string, string>();
      for (const entry of data.tree as { path: string; sha: string | null }[]) {
        if (entry.sha === null) base.delete(entry.path);
        else base.set(entry.path, entry.sha);
      }
      const sha = this.id('tree');
      this.trees.set(sha, base);
      return this.ok({ sha }, 201);
    }
    if (rest === '/git/commits' && method === 'POST') {
      const sha = this.id('commit');
      this.commits.set(sha, { sha, tree: String(data.tree), parents: data.parents as string[], message: String(data.message), author: data.author as FakeCommit['author'] });
      return this.ok({ sha }, 201);
    }
    m = /^\/git\/refs\/heads\/(.+)$/.exec(rest);
    if (m && method === 'PATCH') {
      const branch = decodeURIComponent(m[1]!);
      this.beforeRefUpdate?.();
      this.beforeRefUpdate = undefined;
      const commit = this.commits.get(String(data.sha));
      if (!commit) return this.error(422, 'Object does not exist');
      if (!this.refs.has(branch)) return this.error(422, 'Reference does not exist');
      if (data.force !== true && commit.parents[0] !== this.refs.get(branch)) return this.error(422, 'Update is not a fast forward');
      this.refs.set(branch, commit.sha);
      return this.ok({ ref: 'refs/heads/' + branch, object: { sha: commit.sha } });
    }
    m = /^\/contents\/(.+)$/.exec(rest);
    if (m && method === 'PUT') {
      const path = decodeURIComponent(m[1]!);
      if (this.head && this.files()[path] !== undefined && !data.sha) return this.error(422, '"sha" wasn\'t supplied.');
      const content = Buffer.from(String(data.content), 'base64').toString('utf8');
      const base = this.head ? new Map(this.trees.get(this.commits.get(this.head)!.tree)!) : new Map<string, string>();
      base.set(path, this.putBlob(content));
      const tree = this.id('tree');
      this.trees.set(tree, base);
      const sha = this.id('commit');
      this.commits.set(sha, { sha, tree, parents: this.head ? [this.head] : [], message: String(data.message), author: data.author as FakeCommit['author'] });
      this.head = sha;
      return this.ok({ commit: { sha } }, 201);
    }
    return this.error(404, 'Not Found: ' + method + ' ' + pathname);
  }

  /** A fetch that answers from this fake. */
  readonly fetch = async (input: string, init: RequestInit): Promise<Response> => {
    const headers = Object.fromEntries(Object.entries((init.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    const r = await this.handle(init.method ?? 'GET', input, body, headers);
    return new Response(r.status === 204 ? null : JSON.stringify(r.json ?? null), { status: r.status, headers: r.headers });
  };
}
