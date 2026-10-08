import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';
import { resetAll } from '../../src/db/backup.ts';
import { AtlasDB } from '../../src/db/db.ts';
import { updateSettings } from '../../src/db/settings.ts';
import { setItemStatus, toggleUnit } from '../../src/db/state.ts';
import type { DayLog, SyncCache } from '../../src/db/types.ts';
import { addEntry, editLog, removeEntry, toggleBlockDone } from '../../src/lib/logs.ts';
import type { AppSeed } from '../../src/seed/schema.ts';
import { commitFiles, commitMessage } from '../../src/sync/commit.ts';
import { adoptDeviceId } from '../../src/sync/device.ts';
import { SyncEngine, onSyncNotice, startSync, syncEngine } from '../../src/sync/engine.ts';
import { GithubClient, gitBlobSha } from '../../src/sync/github-api.ts';
import { mergeDay, mergeItems } from '../../src/sync/merge.ts';
import { queuedWrites, setSyncVocabulary } from '../../src/sync/middleware.ts';
import { logPath } from '../../src/sync/paths.ts';
import { statusText } from '../../src/sync/status.ts';
import type { SyncView } from '../../src/sync/status.ts';
import { FakeGithub } from '../fake-github.ts';

const seed = splitSeed(loadSeedOrThrow()).app as AppSeed;
const DAY = '2026-10-07';
let clock = Date.parse('2026-10-07T08:00:00Z');

/** Moves the fake clock on, so every write has its own time. */
function tick(ms = 1000): void {
  clock += ms;
  vi.setSystemTime(clock);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  clock = Date.parse('2026-10-07T08:00:00Z');
  vi.setSystemTime(clock);
});

const databases: AtlasDB[] = [];
const engines: SyncEngine[] = [];
afterEach(async () => {
  vi.useRealTimers();
  for (const engine of engines.splice(0)) engine.dispose();
  for (const database of databases.splice(0)) {
    database.close();
    await database.delete();
  }
});

interface Device {
  name: string;
  db: AtlasDB;
  engine: SyncEngine;
  online: boolean;
  /** Runs `fn` as this device: its writes carry this device's id. */
  as<T>(fn: () => Promise<T>): Promise<T>;
}

function device(name: string, fake: FakeGithub): Device {
  const db = new AtlasDB('sync-' + name + '-' + Math.random().toString(36).slice(2));
  databases.push(db);
  const d: Device = {
    name,
    db,
    online: true,
    engine: undefined as unknown as SyncEngine,
    async as(fn) {
      adoptDeviceId(name);
      const result = await fn();
      await queuedWrites();
      return result;
    },
  };
  d.engine = new SyncEngine({ database: db, seed, fetchImpl: fake.fetch, online: () => d.online, appUrl: 'https://example.com/atlas/' });
  engines.push(d.engine);
  return d;
}

async function connect(d: Device, fake: FakeGithub): Promise<void> {
  const result = await d.as(() => d.engine.connect({ repo: fake.owner + '/' + fake.repo, token: fake.token }));
  expect(result.ok, JSON.stringify(result)).toBe(true);
}

async function sync(d: Device): Promise<void> {
  await d.as(() => d.engine.syncNow());
}

const entry = (minutes: number, block: 'A' | 'B' | 'E' = 'A') => ({ block, track: block === 'E' ? ('math' as const) : ('gamedev' as const), refId: block === 'E' ? 'mit-18-06' : 'a-small-game-1', minutes });

/* ------------------------------------------------------------------ merge rules */

describe('merge rules', () => {
  const at = (s: number): string => new Date(Date.parse('2026-10-07T08:00:00Z') + s * 1000).toISOString();

  it('keeps both devices\' entries for one day, and each day field from whichever side changed it later', () => {
    const phone: DayLog = {
      date: DAY,
      entries: [{ id: 'p1', block: 'A', track: 'gamedev', minutes: 30, updatedAt: at(1), deviceId: 'phone' }],
      reflection: 'Written on the phone',
      fieldsAt: { reflection: at(5) },
      updatedAt: at(5),
      deviceId: 'phone',
    };
    const laptop: DayLog = {
      date: DAY,
      entries: [{ id: 'l1', block: 'E', track: 'math', minutes: 60, updatedAt: at(9), deviceId: 'laptop' }],
      energy: 4,
      fieldsAt: { energy: at(9) },
      updatedAt: at(9),
      deviceId: 'laptop',
    };
    for (const merged of [mergeDay(phone, laptop), mergeDay(laptop, phone)]) {
      expect(merged.entries.map((e) => e.id).sort()).toEqual(['l1', 'p1']);
      // The laptop's day is newer, but it never touched the reflection: the phone's stays.
      expect(merged.reflection).toBe('Written on the phone');
      expect(merged.energy).toBe(4);
    }
  });

  it('a removal beats an earlier edit of the same entry, and loses to a later one', () => {
    const removedAt5: DayLog = { date: DAY, entries: [], removed: [{ id: 'e1', at: at(5), deviceId: 'phone' }] };
    const editedAt3: DayLog = { date: DAY, entries: [{ id: 'e1', block: 'A', track: 'gamedev', minutes: 90, updatedAt: at(3), deviceId: 'laptop' }] };
    const editedAt7: DayLog = { date: DAY, entries: [{ id: 'e1', block: 'A', track: 'gamedev', minutes: 90, updatedAt: at(7), deviceId: 'laptop' }] };

    expect(mergeDay(removedAt5, editedAt3).entries).toEqual([]);
    expect(mergeDay(editedAt3, removedAt5).entries).toEqual([]);
    expect(mergeDay(editedAt3, removedAt5).removed).toEqual([{ id: 'e1', at: at(5), deviceId: 'phone' }]);

    const kept = mergeDay(removedAt5, editedAt7);
    expect(kept.entries.map((e) => e.minutes)).toEqual([90]);
    expect(kept.removed).toBeUndefined();
  });

  it('a skewed clock never loses an entry, and both devices pick the same winner', () => {
    // The laptop's clock runs an hour behind: its edit of e1 looks older though it came later.
    const phone: DayLog = { date: DAY, entries: [{ id: 'e1', block: 'A', track: 'gamedev', minutes: 30, updatedAt: at(3600), deviceId: 'phone' }, { id: 'p2', block: 'B', track: 'languages', minutes: 20, updatedAt: at(3600), deviceId: 'phone' }] };
    const laptop: DayLog = { date: DAY, entries: [{ id: 'e1', block: 'A', track: 'gamedev', minutes: 45, updatedAt: at(60), deviceId: 'laptop' }, { id: 'l2', block: 'E', track: 'math', minutes: 50, updatedAt: at(60), deviceId: 'laptop' }] };
    const a = mergeDay(phone, laptop);
    const b = mergeDay(laptop, phone);
    expect(a.entries.map((e) => e.id).sort()).toEqual(['e1', 'l2', 'p2']);
    expect(a.entries.find((e) => e.id === 'e1')!.minutes).toBe(30);
    expect(b.entries.find((e) => e.id === 'e1')!.minutes).toBe(30);

    // The same millisecond: the larger device id wins, on both sides.
    const tieA: DayLog = { date: DAY, entries: [{ id: 'e1', block: 'A', track: 'gamedev', minutes: 1, updatedAt: at(1), deviceId: 'aaa' }] };
    const tieB: DayLog = { date: DAY, entries: [{ id: 'e1', block: 'A', track: 'gamedev', minutes: 2, updatedAt: at(1), deviceId: 'bbb' }] };
    expect(mergeDay(tieA, tieB).entries[0]!.minutes).toBe(2);
    expect(mergeDay(tieB, tieA).entries[0]!.minutes).toBe(2);
  });

  it('merges item states record by record, the later write of each winning', () => {
    const local = { itemStates: [{ refId: 'mit-18-06', status: 'active' as const, unitsDone: ['lecture-1'], updatedAt: at(5) }, { refId: 'cs50x', status: 'done' as const, unitsDone: [], updatedAt: at(1) }], paperStates: [], certStates: [], milestoneStates: [] };
    const remote = { itemStates: [{ refId: 'mit-18-06', status: 'active' as const, unitsDone: [], updatedAt: at(2) }, { refId: 'cs50x', status: 'active' as const, unitsDone: [], updatedAt: at(9) }, { refId: 'rtiow', status: 'todo' as const, unitsDone: [], updatedAt: at(3) }], paperStates: [], certStates: [], milestoneStates: [] };
    const merged = mergeItems(local, remote).itemStates;
    expect(merged.map((s) => [s.refId, s.status, s.unitsDone.length])).toEqual([
      ['mit-18-06', 'active', 1],
      ['cs50x', 'active', 0],
      ['rtiow', 'todo', 0],
    ]);
  });
});

/* ------------------------------------------------------------------ the outbox */

describe('the outbox', () => {
  it('stamps every write and queues the files it touches, with a summary for the commit message', async () => {
    const fake = new FakeGithub();
    const d = device('device-a', fake);
    setSyncVocabulary({ isProject: (id) => id === 'm01', nameOf: (id) => (id === 'mit-18-06' ? '18.06' : id), unitTitle: (_id, unit) => (unit === 'lecture-9' ? 'Lecture 9: Elimination' : undefined) });
    await d.as(() => toggleUnit('mit-18-06', 'lecture-9', d.db));
    await d.as(() => editLog(DAY, (log) => addEntry(log, entry(60)), d.db));
    await d.as(() => setItemStatus('m01', 'active', d.db));

    const state = await d.db.itemStates.get('mit-18-06');
    expect(state).toMatchObject({ updatedAt: new Date(clock).toISOString(), deviceId: 'device-a' });
    const day = await d.db.dayLogs.get(DAY);
    expect(day!.entries[0]).toMatchObject({ id: expect.any(String), deviceId: 'device-a' });

    const outbox = await d.db.outbox.toArray();
    expect(outbox.map((e) => e.path).sort()).toEqual([logPath(DAY), 'projects/m01.md', 'state/items.json']);
    expect(outbox.find((e) => e.path === 'projects/m01.md')!.summary).toBe('start m01');
    setSyncVocabulary({ isProject: () => false, nameOf: (id) => id, unitTitle: () => undefined });
    expect((await d.db.outbox.get('state/items.json'))!.seq).toBe(2);
  });

  it('keeps changes while offline and sends them in one commit once back online', async () => {
    const fake = new FakeGithub();
    const d = device('device-a', fake);
    await connect(d, fake);
    const commits = fake.log().length;

    d.online = false;
    await d.as(() => editLog(DAY, (log) => addEntry(log, entry(50)), d.db));
    tick();
    await d.as(() => editLog(DAY, (log) => toggleBlockDone(log, 'A'), d.db));
    await sync(d);
    expect((await d.engine.status()).phase).toBe('offline');
    expect(await d.db.outbox.count()).toBeGreaterThan(0);
    expect(fake.log().length).toBe(commits);

    d.online = true;
    await sync(d);
    expect(fake.log().length).toBe(commits + 1);
    expect(fake.log()[0]!.message).toBe('log: 2026-10-07 · 50 m · 1/5 blocks');
    expect(JSON.parse(fake.files()[logPath(DAY)]!).entries[0].minutes).toBe(50);
    expect(fake.files()['log/2026/10/2026-10-07.md']).toContain('50m of study');
    expect(await d.db.outbox.count()).toBe(0);
  });

  it('never runs two flushes at once', async () => {
    const fake = new FakeGithub();
    const d = device('device-a', fake);
    await connect(d, fake);
    await d.as(() => editLog(DAY, (log) => addEntry(log, entry(25)), d.db));
    const commits = fake.log().length;
    await Promise.all([d.as(() => d.engine.syncNow()), d.as(() => d.engine.syncNow()), d.as(() => d.engine.syncNow())]);
    expect(fake.log().length).toBe(commits + 1);
  });

  it('a change made while a flush runs stays queued for the next one', async () => {
    const fake = new FakeGithub();
    const d = device('device-a', fake);
    await connect(d, fake);
    await d.as(() => editLog(DAY, (log) => addEntry(log, entry(25)), d.db));
    fake.beforeRefUpdate = () => {
      adoptDeviceId('device-a');
      void editLog(DAY, (log) => addEntry(log, entry(15, 'E')), d.db);
    };
    await sync(d);
    await queuedWrites();
    expect((await d.db.outbox.toArray()).map((e) => e.path)).toContain(logPath(DAY));
    await sync(d);
    expect(JSON.parse(fake.files()[logPath(DAY)]!).entries).toHaveLength(2);
    expect(await d.db.outbox.count()).toBe(0);
  });
});

/* ------------------------------------------------------------------ the commit builder */

describe('the commit builder', () => {
  it('makes one commit on top of the branch, changing the tree only where asked, authored as the user', async () => {
    const fake = new FakeGithub();
    const parent = fake.commitAsOtherDevice({ 'keep.txt': 'kept\n', 'a.txt': 'one\n', 'gone.txt': 'bye\n' });
    const client = new GithubClient(fake.token, fake.owner, fake.repo, { fetchImpl: fake.fetch });
    const result = await commitFiles(client, {
      branch: 'main',
      parentSha: parent,
      baseTreeSha: fake.commits.get(parent)!.tree,
      changes: [
        { path: 'a.txt', content: 'two\n' },
        { path: 'log/2026/10/2026-10-07.json', content: '{}\n' },
        { path: 'gone.txt', content: null },
      ],
      message: 'log: 2026-10-07 · 8 h 10 m · 5/5 blocks',
      author: { name: 'Ada', email: '4242+ada@users.noreply.github.com' },
      date: '2026-10-07T20:00:00.000Z',
    });
    expect(fake.log()).toHaveLength(2);
    expect(fake.head).toBe(result.commitSha);
    expect(fake.files()).toEqual({ 'keep.txt': 'kept\n', 'a.txt': 'two\n', 'log/2026/10/2026-10-07.json': '{}\n' });
    expect(fake.log()[0]).toMatchObject({ parents: [parent], message: 'log: 2026-10-07 · 8 h 10 m · 5/5 blocks', author: { name: 'Ada', email: '4242+ada@users.noreply.github.com', date: '2026-10-07T20:00:00.000Z' } });
    expect(result.shas['a.txt']).toBe(await gitBlobSha('two\n'));
    expect(result.shas['gone.txt']).toBeNull();
  });

  it('writes the brief\'s commit messages', () => {
    const core = seed.settings;
    const day: DayLog = { date: DAY, entries: [{ block: 'A', track: 'gamedev', minutes: 490 }], doneBlocks: ['A', 'B', 'C', 'D', 'E'] };
    expect(commitMessage([day], [], core)).toBe('log: 2026-10-07 · 8 h 10 m · 5/5 blocks');
    expect(commitMessage([], ['start cs50x', 'mark 18.06 lecture 9 done'], core)).toBe('state: mark 18.06 lecture 9 done\n\n- start cs50x\n');
  });
});

/* ------------------------------------------------------------------ two devices, one repository */

describe('two devices and one repository', () => {
  it('a first sync to an empty repository writes the README and the whole layout, as the user', async () => {
    const fake = new FakeGithub({ userId: 4242, login: 'octo-learner', name: 'Octo Learner' });
    const d = device('device-a', fake);
    await d.as(() => editLog('2026-10-06', (log) => addEntry(log, entry(120)), d.db));
    await d.as(() => editLog(DAY, (log) => addEntry(log, entry(60)), d.db));
    await connect(d, fake);

    const files = Object.keys(fake.files()).sort();
    expect(files).toEqual(['README.md', 'log/2026/10/2026-10-06.json', 'log/2026/10/2026-10-06.md', 'log/2026/10/2026-10-07.json', 'log/2026/10/2026-10-07.md', 'state/items.json', 'state/plan.json', 'state/settings.json']);
    expect(fake.files()['state/settings.json']).not.toContain(fake.token);
    const [layout, readme] = fake.log();
    expect(readme!.message).toBe('Atlas: set up the data repository');
    expect(layout!.message).toBe('state: first sync from Atlas, 2 days of log');
    expect(layout!.author).toMatchObject({ name: 'Octo Learner', email: '4242+octo-learner@users.noreply.github.com' });
    expect(statusText(await viewOf(d))).toBe('Synced just now');
  });

  it('edits to one day on two devices end up merged on both', async () => {
    const fake = new FakeGithub();
    const laptop = device('device-laptop', fake);
    const phone = device('device-phone', fake);
    await laptop.as(() => editLog(DAY, (log) => addEntry(log, entry(60)), laptop.db));
    await connect(laptop, fake);
    await connect(phone, fake);
    expect((await phone.db.dayLogs.get(DAY))!.entries.map((e) => e.minutes)).toEqual([60]);

    // Both offline, both edit the same day.
    laptop.online = false;
    phone.online = false;
    tick();
    await laptop.as(() => editLog(DAY, (log) => addEntry(log, entry(30, 'B')), laptop.db));
    tick();
    await phone.as(() => editLog(DAY, (log) => ({ ...addEntry(log, entry(45, 'E')), reflection: 'Strang clicked' }), phone.db));

    laptop.online = true;
    phone.online = true;
    await sync(laptop);
    await sync(phone);
    await sync(laptop);

    for (const d of [laptop, phone]) {
      const day = (await d.db.dayLogs.get(DAY))!;
      expect(day.entries.map((e) => e.minutes).sort((a, b) => a - b), d.name).toEqual([30, 45, 60]);
      expect(day.reflection).toBe('Strang clicked');
      expect(await d.db.outbox.count()).toBe(0);
    }
    const remote = JSON.parse(fake.files()[logPath(DAY)]!) as DayLog;
    expect(remote.entries).toHaveLength(3);
  });

  it('removing an entry on one device removes it on the other', async () => {
    const fake = new FakeGithub();
    const laptop = device('device-laptop', fake);
    const phone = device('device-phone', fake);
    await laptop.as(() => editLog(DAY, (log) => addEntry(addEntry(log, entry(60)), entry(20, 'E')), laptop.db));
    await connect(laptop, fake);
    await connect(phone, fake);
    tick();
    await phone.as(() => editLog(DAY, (log) => removeEntry(log, 0), phone.db));
    await sync(phone);
    await sync(laptop);
    expect((await laptop.db.dayLogs.get(DAY))!.entries.map((e) => e.minutes)).toEqual([20]);
  });

  it('settings changed on both devices keep the newer version and say so', async () => {
    const fake = new FakeGithub();
    const laptop = device('device-laptop', fake);
    const phone = device('device-phone', fake);
    await connect(laptop, fake);
    await connect(phone, fake);
    const notices: string[] = [];
    const stop = onSyncNotice((text) => notices.push(text));

    phone.online = false;
    tick();
    await phone.as(() => updateSettings(seed.settings, (s) => ({ ...s, theme: 'dark' }), phone.db));
    tick();
    await laptop.as(() => updateSettings(seed.settings, (s) => ({ ...s, theme: 'light', core: { ...s.core, weekStartsOn: 0 } }), laptop.db));
    await sync(laptop);
    phone.online = true;
    await sync(phone);
    stop();

    expect(notices).toEqual(['Settings were changed on another device — kept the newer version.']);
    expect((await phone.db.settings.get('app'))!.core.weekStartsOn).toBe(0);
    expect(JSON.parse(fake.files()['state/settings.json']!).core.weekStartsOn).toBe(0);
  });

  it('a new device takes the repository\'s settings instead of pushing its defaults', async () => {
    const fake = new FakeGithub();
    const laptop = device('device-laptop', fake);
    await laptop.as(() => updateSettings(seed.settings, (s) => ({ ...s, core: { ...s.core, weekStartsOn: 0 } }), laptop.db));
    await connect(laptop, fake);
    const phone = device('device-phone', fake);
    tick();
    await connect(phone, fake);
    expect((await phone.db.settings.get('app'))!.core.weekStartsOn).toBe(0);
    expect(JSON.parse(fake.files()['state/settings.json']!).core.weekStartsOn).toBe(0);
  });

  it('a reset device gets everything back from GitHub, without pushing anything', async () => {
    const fake = new FakeGithub();
    const d = device('device-a', fake);
    await d.as(() => editLog(DAY, (log) => addEntry(log, entry(75)), d.db));
    await d.as(() => setItemStatus('mit-18-06', 'active', d.db));
    await connect(d, fake);
    const commits = fake.log().length;

    await resetAll(d.db);
    expect(await d.db.dayLogs.count()).toBe(0);
    expect((await d.db.sync.get('cache')) as SyncCache | undefined).toBeUndefined();
    await sync(d);
    expect((await d.db.dayLogs.get(DAY))!.entries[0]!.minutes).toBe(75);
    expect((await d.db.itemStates.get('mit-18-06'))!.status).toBe('active');
    expect(fake.log().length).toBe(commits);
  });

  it('a rate limit pauses sync until it lifts, and a refused token says to reconnect', async () => {
    const fake = new FakeGithub();
    const d = device('device-a', fake);
    await connect(d, fake);
    await d.as(() => editLog(DAY, (log) => addEntry(log, entry(10)), d.db));

    const reset = Math.floor(clock / 1000) + 600;
    fake.failNext('GET', /\/git\/ref\/heads\/main$/, { status: 403, json: { message: 'API rate limit exceeded' }, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(reset) } });
    await sync(d);
    expect(await d.engine.status()).toMatchObject({ phase: 'rate-limited', retryAt: reset * 1000 });
    const before = fake.requests.length;
    await sync(d);
    expect(fake.requests.length).toBe(before);
    expect(statusText(await viewOf(d))).toBe("Waiting for GitHub's rate limit, 1 change waiting");

    tick(601_000);
    fake.token = 'github_pat_rotated';
    await sync(d);
    expect((await d.engine.status()).phase).toBe('unauthorized');
    expect(statusText(await viewOf(d))).toBe('Token invalid — reconnect');
    expect(await d.db.outbox.count()).toBe(1);
  });

  it('reports a file it cannot read instead of stopping', async () => {
    const fake = new FakeGithub();
    const d = device('device-a', fake);
    await connect(d, fake);
    fake.commitAsOtherDevice({ [logPath('2026-10-01')]: '{ not json' });
    await sync(d);
    const status = await d.engine.status();
    expect(status.phase).toBe('idle');
    expect(status.problems).toEqual({ [logPath('2026-10-01')]: logPath('2026-10-01') + ' is not valid JSON' });
  });
});

async function viewOf(d: Device): Promise<SyncView> {
  const [config, status, outbox, secret] = await Promise.all([d.db.sync.get('config'), d.db.sync.get('status'), d.db.outbox.toArray(), d.db.secrets.get('github')]);
  return {
    connected: Boolean(config && secret),
    config: config as SyncView['config'],
    status: (status as SyncView['status']) ?? { id: 'status', phase: 'idle' },
    waiting: outbox.length,
    oldestWaiting: outbox.length ? Math.min(...outbox.map((e) => e.queuedAt)) : undefined,
    calendarOnly: false,
  };
}

describe('when a flush happens', () => {
  it('3 s after a block is marked done, and 60 s after any other change', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(clock);
    const fake = new FakeGithub();
    const d = device('device-a', fake);
    await connect(d, fake);
    const stop = await startSync({ database: d.db, seed, fetchImpl: fake.fetch, online: () => true });
    const engine = syncEngine()!;
    engines.push(engine);
    const commits = fake.log().length;

    // An ordinary change waits for a minute of quiet.
    await d.as(() => editLog(DAY, (log) => addEntry(log, entry(20)), d.db));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fake.log().length).toBe(commits);
    await vi.advanceTimersByTimeAsync(31_000);
    await engine.syncNow();
    expect(fake.log().length).toBe(commits + 1);

    // A block marked done goes out at once.
    await d.as(() => editLog(DAY, (log) => toggleBlockDone(log, 'A'), d.db));
    await vi.advanceTimersByTimeAsync(3_100);
    await engine.syncNow();
    expect(fake.log().length).toBe(commits + 2);
    expect(fake.log()[0]!.message).toBe('log: 2026-10-07 · 20 m · 1/5 blocks');
    stop();
  });
});
