/**
 * npm run test:sync -- --repo owner/name
 *
 * GitHub Sync against the real GitHub, run by hand, never in CI: connect → write → flush → a second device pulls
 * → both edit the same day → merge. Two in-memory "devices" (IndexedDB in memory) talk to a throwaway
 * repository you name, on a throwaway branch the script creates from the default branch and deletes when it is
 * done, pass or fail. Nothing else in the repository is touched.
 *
 * The token comes from the environment, ATLAS_SYNC_TOKEN (or GITHUB_TOKEN): a fine-grained token with
 * Contents: read and write on that one repository. It is never printed and never written anywhere.
 *
 *   ATLAS_SYNC_TOKEN=github_pat_... npm run test:sync -- --repo you/atlas-sync-test
 *   npm run test:sync -- --fake        the same cycle against the in-memory GitHub of the tests
 *   --keep                             leave the branch, to look at its commits on GitHub
 */
import 'fake-indexeddb/auto';
import { parseArgs } from 'node:util';
import { AtlasDB } from '../src/db/db.ts';
import { setItemStatus } from '../src/db/state.ts';
import type { DayLog } from '../src/db/types.ts';
import { addEntry, editLog } from '../src/lib/logs.ts';
import type { FetchLike } from '../src/lib/github.ts';
import type { AppSeed } from '../src/seed/schema.ts';
import { adoptDeviceId } from '../src/sync/device.ts';
import { SyncEngine } from '../src/sync/engine.ts';
import { GithubClient, GithubError } from '../src/sync/github-api.ts';
import { queuedWrites } from '../src/sync/middleware.ts';
import { logPath } from '../src/sync/paths.ts';
import { FakeGithub } from '../tests/fake-github.ts';
import { loadSeedOrThrow } from './lib/load-seed.ts';
import { splitSeed } from './lib/vite-plugin-seed.ts';

const DAY = '2026-10-07';
const USAGE = 'Usage: ATLAS_SYNC_TOKEN=<fine-grained token> npm run test:sync -- --repo owner/name [--keep]\n       npm run test:sync -- --fake';

interface Device {
  id: string;
  db: AtlasDB;
  engine: SyncEngine;
}

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (!ok && detail ? '\n      ' + detail : ''));
  if (!ok) failures++;
}

/** Runs `fn` as a device: its writes carry that device's id, and the outbox has them when it returns. */
async function as<T>(device: Device, fn: () => Promise<T>): Promise<T> {
  adoptDeviceId(device.id);
  const result = await fn();
  await queuedWrites();
  return result;
}

async function remoteDay(client: GithubClient, branch: string): Promise<DayLog | null> {
  const head = await client.getHead(branch);
  if (!head) return null;
  const entry = (await client.getTree(await client.getCommitTree(head))).find((e) => e.path === logPath(DAY));
  return entry ? (JSON.parse(await client.getBlob(entry.sha)) as DayLog) : null;
}

/** The branch's commits made after `base`, newest first. */
async function commitsSince(fetchImpl: FetchLike | undefined, token: string, owner: string, repo: string, branch: string, base: string): Promise<{ message: string; email: string }[]> {
  const fetcher = fetchImpl ?? ((input: string, init: RequestInit) => fetch(input, init));
  const out: { message: string; email: string }[] = [];
  let sha = (await new GithubClient(token, owner, repo, { fetchImpl }).getHead(branch)) ?? base;
  while (sha !== base && out.length < 20) {
    const response = await fetcher('https://api.github.com/repos/' + owner + '/' + repo + '/git/commits/' + sha, {
      headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token, 'X-GitHub-Api-Version': '2022-11-28' },
      cache: 'no-store',
    });
    const commit = (await response.json()) as { message: string; author: { email: string }; parents: { sha: string }[] };
    out.push({ message: commit.message.split('\n')[0]!, email: commit.author.email });
    sha = commit.parents[0]?.sha ?? base;
  }
  return out;
}

async function main(): Promise<number> {
  if (process.env.CI) {
    console.error('test:sync talks to the real GitHub with your token, so it never runs in CI.');
    return 2;
  }
  const { values } = parseArgs({ options: { repo: { type: 'string' }, fake: { type: 'boolean' }, keep: { type: 'boolean' } } });

  let fetchImpl: FetchLike | undefined;
  let token: string;
  let full: string;
  if (values.fake) {
    const fake = new FakeGithub({ owner: 'atlas-test', repo: 'sync-throwaway', userId: 1, name: 'Atlas Test' });
    fake.commitAsOtherDevice({ 'README.md': '# A throwaway repository\n' }, 'Initial commit');
    fetchImpl = fake.fetch;
    token = fake.token;
    full = fake.owner + '/' + fake.repo;
  } else {
    const fromEnv = process.env.ATLAS_SYNC_TOKEN ?? process.env.GITHUB_TOKEN;
    if (!values.repo || !/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(values.repo) || !fromEnv) {
      console.error(USAGE);
      return 2;
    }
    token = fromEnv;
    full = values.repo;
  }
  const [owner, repo] = full.split('/') as [string, string];
  const client = new GithubClient(token, owner, repo, { fetchImpl });

  console.log('GitHub Sync against ' + (values.fake ? 'the in-memory GitHub' : 'github.com/' + full));
  let info;
  try {
    info = await client.getRepo();
  } catch (err) {
    console.error('Could not open ' + full + ': ' + (err instanceof Error ? err.message : String(err)));
    return 2;
  }
  const base = await client.getHead(info.defaultBranch);
  if (!base) {
    console.error(full + ' is empty. Give it one commit (create it with a README) so the test can branch from it.');
    return 2;
  }
  const branch = 'atlas-sync-test-' + Date.now().toString(36);
  await client.createRef(branch, base);
  console.log('Working on the throwaway branch ' + branch + (values.keep ? ' (kept afterwards)' : ' (deleted afterwards)') + '\n');

  const seed = splitSeed(loadSeedOrThrow()).app as AppSeed;
  const devices: Device[] = [];
  const device = (name: string): Device => {
    const db = new AtlasDB('atlas-test-sync-' + name + '-' + Date.now());
    const d: Device = { id: 'test-sync-' + name, db, engine: new SyncEngine({ database: db, seed, fetchImpl }) };
    devices.push(d);
    return d;
  };

  try {
    const laptop = device('laptop');
    const phone = device('phone');
    const entry = (block: 'A' | 'B' | 'E', minutes: number) =>
      ({ block, track: block === 'E' ? 'math' : block === 'B' ? 'languages' : 'gamedev', refId: block === 'E' ? 'mit-18-06' : block === 'B' ? '30-days-of-python' : 'a-small-game-1', minutes }) as const;

    // 1. Connect, write, flush.
    await as(laptop, () => editLog(DAY, (log) => addEntry(log, entry('A', 60)), laptop.db));
    await as(laptop, () => setItemStatus('mit-18-06', 'active', laptop.db));
    const first = await as(laptop, () => laptop.engine.connect({ repo: full, token, branch }));
    check('connect: the token opens the repository', first.ok, first.ok ? undefined : first.message);
    const afterFirst = await laptop.engine.status();
    check('write → flush: the first sync finished', afterFirst.phase === 'idle', afterFirst.message);
    const day1 = await remoteDay(client, branch);
    check('write → flush: the day is in the repository', day1?.entries.map((e) => e.minutes).join() === '60', JSON.stringify(day1?.entries));
    check('write → flush: nothing is left waiting', (await laptop.db.outbox.count()) === 0);

    // 2. A second device connects and pulls.
    const second = await as(phone, () => phone.engine.connect({ repo: full, token, branch }));
    check('second device: connects', second.ok, second.ok ? undefined : second.message);
    check('second device: pulled the day', (await phone.db.dayLogs.get(DAY))?.entries.map((e) => e.minutes).join() === '60');
    check('second device: pulled the course state', (await phone.db.itemStates.get('mit-18-06'))?.status === 'active');

    // 3. Both edit the same day before syncing; the second push meets the first and merges.
    await as(laptop, () => editLog(DAY, (log) => addEntry(log, entry('B', 30)), laptop.db));
    await as(phone, () => editLog(DAY, (log) => ({ ...addEntry(log, entry('E', 45)), reflection: 'Strang clicked' }), phone.db));
    await as(laptop, () => laptop.engine.syncNow());
    await as(phone, () => phone.engine.syncNow());
    await as(laptop, () => laptop.engine.syncNow());
    for (const d of [laptop, phone]) {
      const day = await d.db.dayLogs.get(DAY);
      const minutes = (day?.entries.map((e) => e.minutes) ?? []).sort((a, b) => a - b).join();
      check('merge: ' + d.id.replace('test-sync-', '') + ' has all three entries and the reflection', minutes === '30,45,60' && day?.reflection === 'Strang clicked', minutes + ' / ' + day?.reflection);
    }
    const merged = await remoteDay(client, branch);
    check('merge: the repository has the merged day', (merged?.entries.map((e) => e.minutes) ?? []).sort((a, b) => a - b).join() === '30,45,60');

    const commits = await commitsSince(fetchImpl, token, owner, repo, branch, base);
    console.log('\nCommits on ' + branch + ':\n' + commits.map((c) => '  ' + c.message + '  <' + c.email + '>').join('\n') + '\n');
    check('one commit per flush: the first sync, the laptop\'s push and the merged push', commits.length === 3, commits.length + ' commits');
    const email = (await laptop.engine.config())?.authorEmail;
    check('every commit is authored as the token\'s owner', commits.every((c) => c.email === email), email);
  } catch (err) {
    check('the cycle ran to the end', false, err instanceof GithubError ? err.kind + ': ' + err.message : String(err));
  } finally {
    for (const d of devices) {
      d.engine.dispose();
      d.db.close();
      await d.db.delete();
    }
    if (!values.keep) {
      try {
        await client.deleteRef(branch);
        check('clean-up: the throwaway branch is deleted', (await client.getHead(branch)) === null);
      } catch (err) {
        check('clean-up: the throwaway branch is deleted', false, (err instanceof Error ? err.message : String(err)) + '. Delete ' + branch + ' by hand.');
      }
    }
  }
  console.log(failures === 0 ? '\nGitHub Sync works against ' + full + '.' : '\n' + failures + ' check(s) failed.');
  return failures === 0 ? 0 : 1;
}

process.exitCode = await main();
