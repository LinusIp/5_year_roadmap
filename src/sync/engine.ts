/**
 * GitHub Sync (brief 4.10): a private repository is the source of truth, IndexedDB the offline cache and the
 * write queue. This is the part that talks to GitHub.
 *
 * One sync, never two at once:
 *   1. read the branch head; if it moved since this device last looked, list the tree and pull every file
 *      whose sha changed. A file this device has not touched since is replaced by GitHub's version; one it has
 *      touched is merged (merge.ts) and pushed back merged.
 *   2. render every queued file; whatever differs from GitHub goes into one commit (blobs, tree, commit, then
 *      a fast-forward of the branch). If another device moved the branch in between, start again from 1.
 *
 * Triggers: a block or item done, a timer stopped, a review saved (3 s later, so the paired writes land);
 * 60 s after any other change; leaving the page; coming back online; every 5 minutes while visible.
 */
import type { AtlasDB } from '../db/db.ts';
import { updateSettings } from '../db/settings.ts';
import type { SyncCache, SyncConfig, SyncStatus } from '../db/types.ts';
import { emptyLog } from '../lib/logs.ts';
import type { FetchLike } from '../lib/github.ts';
import type { AppSeed } from '../seed/schema.ts';
import { commitFiles, commitMessage } from './commit.ts';
import type { FileChange } from './commit.ts';
import { adoptDeviceId, deviceId } from './device.ts';
import { parseDay, parseItems, parsePlan, parseReview, parseSettings, planUpdatedAt, renderReadme } from './files.ts';
import { GithubClient, GithubError, gitBlobSha } from './github-api.ts';
import type { Author } from './github-api.ts';
import { allPaths, itemsOf, planOf, readLocal, renderPath, withCompanions, writeDay, writeItems, writePlan, writeReview, writeSettings } from './local.ts';
import { lastWriter, mergeDay, mergeItems } from './merge.ts';
import { enqueue, onSyncChange, queuedWrites, setSyncVocabulary } from './middleware.ts';
import { ITEMS_PATH, PLAN_PATH, README_PATH, SETTINGS_PATH, dateOfLogPath, isPulledPath } from './paths.ts';

export const URGENT_DELAY_MS = 3_000;
export const IDLE_DELAY_MS = 60_000;
export const POLL_MS = 5 * 60_000;

export const DEFAULT_APP_URL = 'https://linusip.github.io/5_year_roadmap/';

export interface SyncDeps {
  database: AtlasDB;
  seed: AppSeed;
  fetchImpl?: FetchLike;
  now?: () => number;
  online?: () => boolean;
  appUrl?: string;
  /** A unit's title, for commit messages, when its checklist is loaded. */
  unitTitle?: (resourceId: string, unitId: string) => string | undefined;
}

export type ConnectResult = { ok: true; login: string; warning?: string } | { ok: false; message: string };

type NoticeListener = (text: string) => void;
const noticeListeners = new Set<NoticeListener>();

/** The quiet notices Sync raises, such as "Settings were changed on another device". The app shows them as a toast. */
export function onSyncNotice(listener: NoticeListener): () => void {
  noticeListeners.add(listener);
  return () => noticeListeners.delete(listener);
}

const NOTICE_SETTINGS = 'Settings were changed on another device — kept the newer version.';
const NOTICE_PLAN = 'The plan was changed on another device — kept the newer version.';

export class SyncEngine {
  private readonly deps: SyncDeps;
  private running: Promise<void> | null = null;
  private again = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private dueAt = 0;
  private urgentPending = false;

  constructor(deps: SyncDeps) {
    this.deps = deps;
  }

  private get db(): AtlasDB {
    return this.deps.database;
  }

  private now(): number {
    return (this.deps.now ?? Date.now)();
  }

  private online(): boolean {
    return this.deps.online ? this.deps.online() : typeof navigator === 'undefined' || navigator.onLine !== false;
  }

  private notice(text: string): void {
    for (const listener of noticeListeners) listener(text);
  }

  /* ---------------------------------------------------------------- state */

  async config(): Promise<SyncConfig | undefined> {
    return (await this.db.sync.get('config')) as SyncConfig | undefined;
  }

  async status(): Promise<SyncStatus> {
    return ((await this.db.sync.get('status')) as SyncStatus | undefined) ?? { id: 'status', phase: 'idle' };
  }

  private async setStatus(change: Partial<Omit<SyncStatus, 'id'>>, replace = false): Promise<void> {
    const current = await this.status();
    const next: SyncStatus = replace ? { id: 'status', phase: 'idle', ...(current.lastSyncAt ? { lastSyncAt: current.lastSyncAt } : {}), ...change } : { ...current, ...change };
    for (const key of Object.keys(next) as (keyof SyncStatus)[]) if (next[key] === undefined) delete next[key];
    await this.db.sync.put(next);
  }

  /** Every file the device's records make, queued: a first sync, or after an import. */
  async queueEverything(): Promise<void> {
    const local = await readLocal(this.db);
    await enqueue(this.db, allPaths(local, this.deps.seed).map((path) => ({ path })), this.now());
  }

  /* ---------------------------------------------------------------- connect */

  async connect(input: { repo: string; token: string }): Promise<ConnectResult> {
    const m = /^\s*([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)\s*$/.exec(input.repo);
    if (!m) return { ok: false, message: 'Write the repository as owner/name, for example octocat/atlas-data.' };
    const token = input.token.trim();
    if (!token || /\s/.test(token)) return { ok: false, message: 'Paste the whole token: one piece of text, no spaces.' };
    const [, owner, repo] = m as unknown as [string, string, string];
    const client = new GithubClient(token, owner, repo, { fetchImpl: this.deps.fetchImpl, now: this.deps.now });
    let login: string;
    let warning: string | undefined;
    try {
      const info = await client.getRepo();
      const user = await client.getUser();
      login = user.login;
      const email = (await client.getPrimaryEmail()) ?? user.id + '+' + user.login + '@users.noreply.github.com';
      const existing = await this.db.secrets.get('github');
      await this.db.secrets.put(existing?.token === token ? existing : { id: 'github', token });
      const config: SyncConfig = { id: 'config', owner, repo, branch: info.defaultBranch, authorName: user.name || user.login, authorEmail: email, private: info.private };
      if (client.tokenExpiresAt) config.tokenExpiresAt = client.tokenExpiresAt;
      await this.db.sync.put(config);
      await this.db.sync.delete('cache');
      await this.setStatus({}, true);
      if (!info.private) warning = 'This repository is public: anyone can read your log. Make it private on GitHub (Settings > General > Danger zone).';
    } catch (err) {
      return { ok: false, message: connectMessage(err, owner + '/' + repo) };
    }
    await updateSettings(this.deps.seed.settings, (s) => ({ ...s, github: { ...s.github, username: login } }), this.db);
    await this.queueEverything();
    await this.syncNow({ force: true });
    const status = await this.status();
    if (status.phase === 'unauthorized' || status.phase === 'error') return { ok: true, login, warning: status.message ?? warning };
    return warning ? { ok: true, login, warning } : { ok: true, login };
  }

  /** Forgets the token and the repository. Everything on the device stays, and so does the repository. */
  async disconnect(): Promise<void> {
    clearTimeout(this.timer);
    this.timer = undefined;
    await this.db.secrets.delete('github');
    await this.db.sync.bulkDelete(['config', 'cache', 'status']);
    await this.db.outbox.clear();
    await updateSettings(this.deps.seed.settings, (s) => ({ ...s, github: { username: '', showCalendar: false } }), this.db);
  }

  async setAuthorEmail(email: string): Promise<void> {
    const config = await this.config();
    if (config) await this.db.sync.put({ ...config, authorEmail: email.trim() });
  }

  async setTokenExpiry(date: string | undefined): Promise<void> {
    const config = await this.config();
    if (!config) return;
    const next: SyncConfig = { ...config };
    if (date) next.tokenExpiresAt = date;
    else delete next.tokenExpiresAt;
    await this.db.sync.put(next);
  }

  /** Stops the timers. The app's engine lives as long as the page; tests stop theirs. */
  dispose(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  /* ---------------------------------------------------------------- scheduling */

  /** A change was queued: flush soon if it is one the brief flushes at once, otherwise 60 s after the last one. */
  changed(urgent: boolean): void {
    const now = this.now();
    if (urgent) {
      const due = now + URGENT_DELAY_MS;
      if (!this.timer || due < this.dueAt) this.arm(due, true);
    } else if (!this.urgentPending) {
      this.arm(now + IDLE_DELAY_MS, false);
    }
  }

  private arm(dueAt: number, urgent: boolean): void {
    clearTimeout(this.timer);
    this.dueAt = dueAt;
    this.urgentPending = urgent;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.urgentPending = false;
      void this.syncNow();
    }, Math.max(0, dueAt - this.now()));
  }

  /** Runs a sync now. A call while one is running waits for it and runs once more after it. */
  syncNow(options: { force?: boolean } = {}): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.sync(options.force ?? false);
        } while (this.again);
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  /* ---------------------------------------------------------------- the sync */

  private async sync(force: boolean): Promise<void> {
    const config = await this.config();
    const secret = await this.db.secrets.get('github');
    if (!config || !secret) return;
    const status = await this.status();
    if (!force && status.phase === 'unauthorized') return;
    if (!force && status.phase === 'rate-limited' && status.retryAt && this.now() < status.retryAt) return;
    if (!this.online()) {
      await this.setStatus({ phase: 'offline' });
      return;
    }
    await this.setStatus({ phase: 'syncing' });
    const client = new GithubClient(secret.token, config.owner, config.repo, { fetchImpl: this.deps.fetchImpl, now: this.deps.now });
    try {
      const problems: Record<string, string> = {};
      let finished = false;
      for (let attempt = 0; attempt < 3 && !finished; attempt++) finished = await this.syncOnce(client, config, problems);
      if (!finished) throw new GithubError('conflict', 'Another device kept writing at the same time. Atlas will try again.');
      if (client.tokenExpiresAt && client.tokenExpiresAt !== config.tokenExpiresAt) await this.setTokenExpiry(client.tokenExpiresAt);
      await this.setStatus({ phase: 'idle', lastSyncAt: this.now(), ...(Object.keys(problems).length ? { problems } : {}) }, true);
    } catch (err) {
      await this.failed(err);
    }
  }

  private async failed(err: unknown): Promise<void> {
    if (!(err instanceof GithubError)) {
      await this.setStatus({ phase: 'error', message: 'Sync stopped: ' + (err instanceof Error ? err.message : String(err)) }, true);
      return;
    }
    if (err.kind === 'unauthorized') await this.setStatus({ phase: 'unauthorized', message: err.message }, true);
    else if (err.kind === 'rate-limited') {
      await this.setStatus({ phase: 'rate-limited', ...(err.retryAt ? { retryAt: err.retryAt } : {}) }, true);
      if (err.retryAt) this.arm(err.retryAt + 1000, true);
    } else if (err.kind === 'network') await this.setStatus({ phase: 'offline' }, true);
    else if (err.kind === 'forbidden') await this.setStatus({ phase: 'error', message: 'GitHub refused the change: ' + err.message + '. The token needs Contents: read and write on this repository.' }, true);
    else if (err.kind === 'not-found') await this.setStatus({ phase: 'error', message: 'GitHub cannot find the repository any more. It may have been renamed or deleted; reconnect in Settings.' }, true);
    else await this.setStatus({ phase: 'error', message: err.message }, true);
  }

  private author(config: SyncConfig): Author {
    return { name: config.authorName, email: config.authorEmail };
  }

  /** One pass: pull what changed, push what is queued. False when the branch moved under the push. */
  private async syncOnce(client: GithubClient, config: SyncConfig, problems: Record<string, string>): Promise<boolean> {
    const db = this.db;
    const seed = this.deps.seed;
    let cache: SyncCache = ((await db.sync.get('cache')) as SyncCache | undefined) ?? { id: 'cache', files: {} };
    const firstSync = !cache.headSha;

    let head = await client.getHead(config.branch);
    if (head === null) {
      // An empty repository: the Git Data API cannot write to one, so the README goes first, alone.
      head = await client.createFirstFile(README_PATH, renderReadme(this.deps.appUrl ?? DEFAULT_APP_URL), 'Atlas: set up the data repository', this.author(config), config.branch);
      cache = { id: 'cache', files: {} };
      await this.queueEverything();
    }

    let treeSha: string;
    let remote: Record<string, string>;
    if (head === cache.headSha && cache.treeSha) {
      treeSha = cache.treeSha;
      remote = { ...cache.files };
    } else {
      treeSha = await client.getCommitTree(head);
      remote = Object.fromEntries((await client.getTree(treeSha)).map((e) => [e.path, e.sha]));
      await this.pullChanged(client, remote, cache, problems, firstSync);
    }

    await queuedWrites();
    const outbox = await db.outbox.toArray();
    const seen = new Map(outbox.map((e) => [e.path, e.seq]));
    const local = await readLocal(db);
    const changes: FileChange[] = [];
    for (const path of withCompanions(outbox.map((e) => e.path))) {
      const content = renderPath(path, local, seed);
      const remoteSha = remote[path];
      if (content === null) {
        if (remoteSha) changes.push({ path, content: null });
      } else if ((await gitBlobSha(content)) !== remoteSha) {
        changes.push({ path, content });
      }
    }
    if (firstSync && !remote[README_PATH]) changes.push({ path: README_PATH, content: renderReadme(this.deps.appUrl ?? DEFAULT_APP_URL) });

    if (changes.length > 0) {
      const days = changes
        .map((c) => dateOfLogPath(c.path))
        .filter((d): d is string => d !== null)
        .map((d) => local.dayLogs.find((l) => l.date === d))
        .filter((l) => l !== undefined);
      const summaries = [...outbox].sort((a, b) => a.queuedAt - b.queuedAt).flatMap((e) => (e.summary ? [e.summary] : []));
      const core = local.settings[0]?.core ?? seed.settings;
      const message = firstSync && days.length > 1 ? 'state: first sync from Atlas, ' + days.length + ' days of log' : commitMessage(days, summaries, core);
      try {
        const result = await commitFiles(client, {
          branch: config.branch,
          parentSha: head,
          baseTreeSha: treeSha,
          changes,
          message,
          author: this.author(config),
          date: new Date(this.now()).toISOString(),
        });
        for (const [path, sha] of Object.entries(result.shas)) {
          if (sha === null) delete remote[path];
          else remote[path] = sha;
        }
        head = result.commitSha;
        treeSha = result.treeSha;
      } catch (err) {
        if (err instanceof GithubError && err.kind === 'conflict') return false;
        throw err;
      }
    }

    await db.sync.put({ id: 'cache', headSha: head, treeSha, files: remote });
    await db.transaction('rw', db.outbox, async () => {
      for (const [path, seq] of seen) {
        const entry = await db.outbox.get(path);
        if (entry && entry.seq === seq) await db.outbox.delete(path);
      }
    });
    return true;
  }

  /** Pulls every file GitHub has a different version of, applying or merging it. */
  private async pullChanged(client: GithubClient, remote: Record<string, string>, cache: SyncCache, problems: Record<string, string>, firstSync: boolean): Promise<void> {
    await queuedWrites();
    const dirty = new Set((await this.db.outbox.toArray()).map((e) => e.path));
    for (const [path, sha] of Object.entries(remote)) {
      if (!isPulledPath(path) || cache.files[path] === sha) continue;
      const text = await client.getBlob(sha);
      const problem = await this.applyFile(path, text, dirty.has(path), firstSync);
      if (problem) problems[path] = problem;
    }
    // A day file deleted on GitHub (by hand, or by another device) goes from this device too, unless edited here.
    for (const path of Object.keys(cache.files)) {
      const date = dateOfLogPath(path);
      if (date && !(path in remote) && !dirty.has(path)) await writeDay(this.db, null, date);
    }
  }

  /** Applies one pulled file. Returns why it could not be read, if it could not. */
  private async applyFile(path: string, text: string, dirty: boolean, firstSync: boolean): Promise<string | undefined> {
    const db = this.db;
    if (path === ITEMS_PATH) {
      const parsed = parseItems(text);
      if (!parsed.ok) return parsed.error;
      await writeItems(db, dirty ? mergeItems(itemsOf(await readLocal(db)), parsed.value) : parsed.value);
      return;
    }
    if (path === PLAN_PATH) {
      const parsed = parsePlan(text);
      if (!parsed.ok) return parsed.error;
      if (!dirty) {
        await writePlan(db, parsed.value);
        return;
      }
      // On a device's first sync the repository is the source of truth: a new device must not push its defaults.
      const local = planOf(await readLocal(db));
      if (firstSync || lastWriter({ updatedAt: planUpdatedAt(local) }, { updatedAt: planUpdatedAt(parsed.value) }) === 'remote') await writePlan(db, parsed.value);
      if (!firstSync) this.notice(NOTICE_PLAN);
      return;
    }
    if (path === SETTINGS_PATH) {
      const parsed = parseSettings(text);
      if (!parsed.ok) return parsed.error;
      if (!dirty) {
        await writeSettings(db, parsed.value);
        return;
      }
      const local = (await readLocal(db)).settings[0];
      if (firstSync || !local || lastWriter(local, parsed.value) === 'remote') await writeSettings(db, parsed.value);
      if (!firstSync && local) this.notice(NOTICE_SETTINGS);
      return;
    }
    const date = dateOfLogPath(path);
    if (date) {
      const parsed = parseDay(text, path);
      if (!parsed.ok) return parsed.error;
      if (parsed.value.date !== date) return path + ' holds the day ' + parsed.value.date;
      if (!dirty) {
        await writeDay(db, parsed.value, date);
        return;
      }
      const local = (await db.dayLogs.get(date)) ?? emptyLog(date);
      await writeDay(db, mergeDay(local, parsed.value), date);
      return;
    }
    if (path.startsWith('reviews/')) {
      const parsed = parseReview(text, path);
      if (!parsed.ok) return parsed.error;
      const local = await db.reviews.get(parsed.value.id);
      if (!dirty || !local || lastWriter(local, parsed.value) === 'remote') await writeReview(db, parsed.value);
      return;
    }
    return undefined;
  }
}

function connectMessage(err: unknown, full: string): string {
  if (!(err instanceof GithubError)) return 'Could not connect: ' + (err instanceof Error ? err.message : String(err));
  switch (err.kind) {
    case 'unauthorized':
      return 'GitHub did not accept the token. It may have expired or been revoked.';
    case 'not-found':
      return 'GitHub found no repository ' + full + ' that this token can see. Check the name, and that the token was given access to it.';
    case 'forbidden':
      return 'GitHub refused: ' + err.message;
    case 'rate-limited':
      return "GitHub's rate limit was reached. Try again in a few minutes.";
    case 'network':
      return 'Could not reach GitHub. Check the connection and try again.';
    default:
      return err.message;
  }
}

/* ------------------------------------------------------------------ the app's one engine */

let engine: SyncEngine | null = null;

export function syncEngine(): SyncEngine | null {
  return engine;
}

/**
 * Starts Sync for the app: adopts this device's id, wires the triggers, and syncs once if connected. Returns
 * a function that stops it.
 */
export async function startSync(deps: SyncDeps): Promise<() => void> {
  const { database, seed } = deps;
  const projects = new Set(seed.projects.map((p) => p.id));
  const names = new Map<string, string>();
  for (const r of seed.resources) names.set(r.id, r.short ?? r.title);
  for (const p of seed.projects) names.set(p.id, p.title);
  for (const p of seed.papers) names.set(p.id, p.title);
  setSyncVocabulary({
    isProject: (id) => projects.has(id),
    nameOf: (id) => names.get(id) ?? id,
    unitTitle: deps.unitTitle ?? (() => undefined),
  });

  const stored = (await database.sync.get('device')) as { id: 'device'; deviceId: string } | undefined;
  if (stored) adoptDeviceId(stored.deviceId);
  else await database.sync.put({ id: 'device', deviceId: deviceId() });

  const current = new SyncEngine(deps);
  engine = current;
  const stops: (() => void)[] = [onSyncChange(({ urgent }) => current.changed(urgent))];

  if (typeof window !== 'undefined') {
    const flush = (): void => void current.syncNow();
    const visibility = async (): Promise<void> => {
      if (document.visibilityState === 'hidden') return flush();
      const status = await current.status();
      if (!status.lastSyncAt || (deps.now ?? Date.now)() - status.lastSyncAt > POLL_MS) flush();
    };
    const onVisibility = (): void => void visibility();
    window.addEventListener('online', flush);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') flush();
    }, POLL_MS);
    stops.push(() => {
      window.removeEventListener('online', flush);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(poll);
    });
  }

  if (await current.config()) void current.syncNow();
  return () => {
    for (const stop of stops) stop();
    if (engine === current) engine = null;
  };
}
