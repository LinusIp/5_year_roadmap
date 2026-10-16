/**
 * Data safety for the update of 2026-10-16, against a fixture the live build made itself
 * (tests/fixtures/live-2026-10-08/, written by main's own code: see its README):
 *
 *   - an existing IndexedDB (Dexie version 2) opens on this build and upgrades, losing nothing;
 *   - a backup file of the live format restores and upgrades;
 *   - an existing atlas-data repository (settings without a version, plan.json version 1) syncs into a new device
 *     and is written back in the new formats;
 *   - a device still on the live build, which cannot read the new files, cannot wipe them: when it writes its older
 *     copies, this build merges, writes the newer files back and says a device needs updating.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';
import { importBackup } from '../../src/db/backup.ts';
import { AtlasDB } from '../../src/db/db.ts';
import { addPlanEdit } from '../../src/db/edits.ts';
import { readSettings, updateSettings } from '../../src/db/settings.ts';
import type { DayLog, Review } from '../../src/db/types.ts';
import { addEntry, editLog } from '../../src/lib/logs.ts';
import { resolveSeed } from '../../src/lib/plan.ts';
import type { AppSeed } from '../../src/seed/schema.ts';
import { adoptDeviceId } from '../../src/sync/device.ts';
import { NOTICE_OLD_DEVICE } from '../../src/sync/downgrade.ts';
import { SyncEngine, onSyncNotice } from '../../src/sync/engine.ts';
import { queuedWrites } from '../../src/sync/middleware.ts';
import { FakeGithub } from '../fake-github.ts';

const FIXTURE = join(import.meta.dirname, '..', 'fixtures', 'live-2026-10-08');
const raw = loadSeedOrThrow();
const seed = splitSeed(raw).app as AppSeed;
const read = (rel: string): string => readFileSync(join(FIXTURE, rel), 'utf8');
const json = <T>(rel: string): T => JSON.parse(read(rel)) as T;

/** Every file of the live atlas-data repository, path to content. */
function liveRepo(): Record<string, string> {
  const root = join(FIXTURE, 'atlas-data');
  const out: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else out[relative(root, abs)] = readFileSync(abs, 'utf8');
    }
  };
  walk(root);
  return out;
}

const databases: AtlasDB[] = [];
const engines: SyncEngine[] = [];
let clock = Date.parse('2026-10-16T08:00:00Z');
const tick = (): void => {
  clock += 1000;
  vi.setSystemTime(clock);
};
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(clock);
});
afterEach(async () => {
  vi.useRealTimers();
  for (const e of engines.splice(0)) e.dispose();
  for (const d of databases.splice(0)) {
    d.close();
    await d.delete();
  }
});

interface IdbSnapshot {
  version: number;
  stores: Record<string, { keyPath: string | string[] | null; autoIncrement: boolean; indexes: { name: string; keyPath: string | string[]; unique: boolean; multiEntry: boolean }[]; rows: unknown[] }>;
}

/** Recreates the live IndexedDB exactly: its version, stores, indexes and rows. */
async function restoreSnapshot(name: string, snapshot: IdbSnapshot): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(name, snapshot.version);
    req.onupgradeneeded = () => {
      for (const [store, def] of Object.entries(snapshot.stores)) {
        const os = req.result.createObjectStore(store, { keyPath: def.keyPath ?? undefined, autoIncrement: def.autoIncrement });
        for (const i of def.indexes) os.createIndex(i.name, i.keyPath, { unique: i.unique, multiEntry: i.multiEntry });
      }
    };
    req.onsuccess = () => {
      const database = req.result;
      const tx = database.transaction(Object.keys(snapshot.stores), 'readwrite');
      for (const [store, def] of Object.entries(snapshot.stores)) for (const row of def.rows) tx.objectStore(store).put(row);
      tx.oncomplete = () => {
        database.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}

describe('the live IndexedDB (Dexie version 2) on this build', () => {
  it('upgrades to version 5 and keeps every record', async () => {
    const snapshot = json<IdbSnapshot>('indexeddb.json');
    expect(snapshot.version).toBe(20);
    await restoreSnapshot('live-upgrade', snapshot);
    const db = new AtlasDB('live-upgrade');
    databases.push(db);
    await db.open();
    expect(db.verno).toBe(5);

    // Logs, with the removed entry's tombstone; item states; the paper; the review; the week's pick; the outbox.
    const logs = await db.dayLogs.toArray();
    expect(logs.map((l) => l.date).sort()).toEqual(['2026-09-21', '2026-09-22', '2026-09-23']);
    expect(logs.find((l) => l.date === '2026-09-23')!.removed).toHaveLength(1);
    expect((await db.itemStates.get('mit-18-06'))!.unitsDone).toEqual(['lecture-1', 'lecture-2']);
    expect((await db.itemStates.get('w-c-ring-buffer'))!).toMatchObject({ status: 'done', repoUrl: 'https://github.com/octo-learner/ring-buffer' });
    expect(await db.paperStates.count()).toBe(1);
    expect((await db.reviews.get('week:2026-09-21'))!.worked).toBe('Mornings on graphics.');
    expect(await db.weekPicks.count()).toBe(1);
    expect(await db.outbox.count()).toBe(snapshot.stores.outbox!.rows.length);
    expect(await db.practice.count()).toBe(0);
    expect(await db.challenges.count()).toBe(0);

    // Version 3: the plan-item overrides became patches, and the plan reads the same.
    const patches = await db.planPatches.toArray();
    expect(patches.map((p) => p.op).sort()).toEqual(['drop', 'move']);
    const lane = raw.plan.filter((p) => p.phaseId === 'y1-p0' && p.block === 'B').sort((a, b) => a.order - b.order);
    const resolved = resolveSeed(seed, await db.overrides.toArray(), await db.customEntities.toArray(), patches);
    expect(resolved.plan.find((p) => p.id === lane[0]!.id)!.order).toBe(99);
    expect(resolved.plan.some((p) => p.id === lane[1]!.id)).toBe(false);
    expect(resolved.dropped?.some((p) => p.id === lane[1]!.id)).toBe(true);
    expect(resolved.resources.some((r) => r.id === 'my-probability-notes')).toBe(true);

    // Settings: version 2 on read, the user's own values kept, the new parts from data/settings.yaml.
    const settings = await readSettings(raw.settings, db);
    expect(settings.version).toBe(2);
    expect(settings.theme).toBe('dark');
    expect(settings.github.username).toBe('octo-learner');
    expect(settings.core.blocks.find((b) => b.id === 'C')!.minutes).toBe(90);
    expect(settings.core.streak.minMinutes).toBe(45);
    expect(settings.core.templates.length).toBeGreaterThan(0);
    expect(settings.core.blocks.some((b) => b.role === 'practice')).toBe(true);
    expect(settings.core.catalogue).toEqual(raw.settings.catalogue);
  });

  it('a live backup file restores and upgrades the same way', async () => {
    const db = new AtlasDB('live-backup');
    databases.push(db);
    const result = await importBackup(read('backup.json'), db);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(await db.dayLogs.count()).toBe(3);
    expect((await db.planPatches.toArray()).map((p) => p.op).sort()).toEqual(['drop', 'move']);
    expect((await readSettings(raw.settings, db)).core.blocks.find((b) => b.id === 'C')!.minutes).toBe(90);
  });
});

/* ------------------------------------------------------------------ atlas-data */

interface Device {
  db: AtlasDB;
  engine: SyncEngine;
  as<T>(fn: () => Promise<T>): Promise<T>;
}

function device(name: string, fake: FakeGithub): Device {
  const db = new AtlasDB('live-' + name + '-' + Math.random().toString(36).slice(2));
  databases.push(db);
  const engine = new SyncEngine({ database: db, seed, fetchImpl: fake.fetch, online: () => true, appUrl: 'https://example.com/atlas/' });
  engines.push(engine);
  return {
    db,
    engine,
    async as(fn) {
      adoptDeviceId(name);
      const out = await fn();
      await queuedWrites();
      return out;
    },
  };
}

async function connect(d: Device, fake: FakeGithub): Promise<void> {
  const result = await d.as(() => d.engine.connect({ repo: fake.owner + '/' + fake.repo, token: fake.token }));
  expect(result.ok, JSON.stringify(result)).toBe(true);
}

const sync = (d: Device): Promise<void> => d.as(() => d.engine.syncNow());

function liveFake(): FakeGithub {
  const fake = new FakeGithub({ owner: 'octo-learner', repo: 'atlas-data', token: 'github_pat_live', userId: 4242, name: 'Octo Learner' });
  fake.commitAsOtherDevice(liveRepo(), 'state: first sync from Atlas');
  return fake;
}

describe('the live atlas-data repository on this build', () => {
  it('syncs into a new device, and is written back in the new formats', async () => {
    const fake = liveFake();
    const laptop = device('laptop', fake);
    await connect(laptop, fake);
    expect(await laptop.db.dayLogs.count()).toBe(3);
    expect((await laptop.db.planPatches.toArray()).map((p) => p.op).sort()).toEqual(['drop', 'move']);
    expect((await readSettings(raw.settings, laptop.db)).core.blocks.find((b) => b.id === 'C')!.minutes).toBe(90);

    tick();
    await laptop.as(() => updateSettings(raw.settings, (s) => ({ ...s, core: { ...s.core, heatmapMode: 'absolute' } }), laptop.db));
    await laptop.as(() => addPlanEdit([{ op: 'goal', goal: { id: 'g1', title: 'Ship the ray tracer', date: '2027-01-31', refIds: [] } } as never], 'Goal', laptop.db));
    await sync(laptop);
    const files = fake.files();
    expect(JSON.parse(files['state/settings.json']!).version).toBe(2);
    const plan = JSON.parse(files['state/plan.json']!);
    expect(plan.version).toBe(2);
    expect(plan.patches.map((p: { op: string }) => p.op).sort()).toEqual(['drop', 'goal', 'move']);
  });
});

describe('a device still on the live build', () => {
  /** What the older build writes when it changes something: its own copies, in the live format. */
  const oldCopies = (): Record<string, string> => {
    const repo = liveRepo();
    return {
      'state/plan.json': repo['state/plan.json']!,
      'state/settings.json': repo['state/settings.json']!,
      'log/2026/09/2026-09-21.json': repo['log/2026/09/2026-09-21.json']!,
      'reviews/2026-W39.md': repo['reviews/2026-W39.md']!,
    };
  };

  it('cannot wipe the newer plan, settings, practice minutes or review numbers', async () => {
    const fake = liveFake();
    const laptop = device('laptop', fake);
    await connect(laptop, fake);

    // On this build: a goal (a patch), a schedule change (settings v2), Practice minutes on a day the old device also
    // logged, and the week's review with its numbers per block, P included.
    tick();
    await laptop.as(() => addPlanEdit([{ op: 'goal', goal: { id: 'g1', title: 'Ship the ray tracer', date: '2027-01-31', refIds: [] } } as never], 'Goal', laptop.db));
    await laptop.as(() => updateSettings(raw.settings, (s) => ({ ...s, core: { ...s.core, pattern: s.core.pattern.map((t, d) => (d === 0 ? 'rest' : t)) } }), laptop.db));
    await laptop.as(() => editLog('2026-09-21', (l) => addEntry(l, { block: 'P', track: 'math', refId: 'practice:calculus', minutes: 20 }), laptop.db));
    await laptop.as(async () => {
      const review = (await laptop.db.reviews.get('week:2026-09-21'))!;
      await laptop.db.reviews.put({ ...review, snapshot: { ...review.snapshot!, minutesByBlock: { ...review.snapshot!.minutesByBlock, P: 20 } }, updatedAt: new Date().toISOString() });
    });
    await sync(laptop);
    expect(JSON.parse(fake.files()['state/plan.json']!).version).toBe(2);

    // The old device, which could read none of those, writes its own copies over them.
    tick();
    fake.commitAsOtherDevice(oldCopies(), 'Atlas: an older device');
    expect(JSON.parse(fake.files()['state/plan.json']!).version).toBe(1);

    const notices: string[] = [];
    const stop = onSyncNotice((t) => notices.push(t));
    tick();
    await sync(laptop);
    stop();

    // This device kept everything, and put the newer files back.
    expect((await laptop.db.planPatches.toArray()).some((p) => p.op === 'goal')).toBe(true);
    expect((await readSettings(raw.settings, laptop.db)).core.pattern[0]).toBe('rest');
    const day = (await laptop.db.dayLogs.get('2026-09-21')) as DayLog;
    expect(day.entries.map((e) => e.block).sort()).toEqual(['A', 'B', 'P']);
    expect(((await laptop.db.reviews.get('week:2026-09-21')) as Review).snapshot!.minutesByBlock.P).toBe(20);

    const files = fake.files();
    const plan = JSON.parse(files['state/plan.json']!);
    expect(plan.version).toBe(2);
    expect(plan.patches.some((p: { op: string }) => p.op === 'goal')).toBe(true);
    const settings = JSON.parse(files['state/settings.json']!);
    expect(settings.version).toBe(2);
    expect(settings.core.pattern[0]).toBe('rest');
    expect(JSON.parse(files['log/2026/09/2026-09-21.json']!).entries.map((e: { block: string }) => e.block).sort()).toEqual(['A', 'B', 'P']);
    expect(JSON.parse(files['reviews/2026-W39.md']!.split('\n')[1]!).snapshot.minutesByBlock).toMatchObject({ A: 120, P: 20 });
    expect(notices).toContain(NOTICE_OLD_DEVICE);
  });

  it('still lets an ordinary change from another device through', async () => {
    const fake = liveFake();
    const laptop = device('laptop', fake);
    await connect(laptop, fake);
    await laptop.as(() => editLog('2026-09-22', (l) => addEntry(l, { block: 'P', track: 'math', refId: 'practice:calculus', minutes: 15 }), laptop.db));
    await sync(laptop);

    // Another device on this build removes the P entry (leaving a tombstone): that is a real change, not an old copy.
    const phone = device('phone', fake);
    await connect(phone, fake);
    tick();
    await phone.as(() => editLog('2026-09-22', (l) => ({ ...l, entries: l.entries.filter((e) => e.block !== 'P'), removed: [...(l.removed ?? []), ...l.entries.filter((e) => e.block === 'P').map((e) => ({ id: e.id!, at: new Date().toISOString(), deviceId: 'phone' }))] }), phone.db));
    await sync(phone);
    tick();
    await sync(laptop);
    expect(((await laptop.db.dayLogs.get('2026-09-22')) as DayLog).entries.some((e) => e.block === 'P')).toBe(false);
  });
});
