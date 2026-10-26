import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { AtlasDB, REMOVED_RESOURCE_IDS } from '../../src/db/db.ts';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';

/** The Library's quality audit (ATLAS-LIBRARY, 15,364 rows): the twelve rows are gone, and version 8 drops their progress. */
describe('the rows the audit removed', () => {
  it('are no longer in the data', () => {
    const seed = loadSeedOrThrow();
    const ids = new Set(seed.resources.map((r) => r.id));
    expect(REMOVED_RESOURCE_IDS).toHaveLength(12);
    for (const id of REMOVED_RESOURCE_IDS) expect(ids.has(id), id).toBe(false);
    expect(ids.has('article-transformer-family-v2')).toBe(true);
    // Nothing comes after a removed row any more.
    for (const r of seed.resources) for (const after of r.after ?? []) expect(REMOVED_RESOURCE_IDS.includes(after), r.id + ' after ' + after).toBe(false);
  });

  it('lose their item states and overrides on the upgrade to version 8, and nothing else does', async () => {
    const name = 'removed-rows-' + Date.now();
    const old = new Dexie(name);
    old.version(7).stores({
      dayLogs: 'date', itemStates: 'refId, status', paperStates: 'refId, status', certStates: 'refId', milestoneStates: 'refId', customEntities: '[kind+id], kind', overrides: '[kind+id], kind',
      reviews: 'id, kind, periodStart', weekPicks: 'weekStart', replans: 'id', settings: 'id', meta: 'key', secrets: 'id', outbox: 'path', sync: 'id', planPatches: 'id, at, group',
      practice: 'id, date, questionId, topic', challenges: 'id, date, challengeId', blogPosts: 'date', sleep: 'date',
    });
    await old.open();
    await old.table('itemStates').bulkPut([
      { refId: 'blog-azom', status: 'active', unitsDone: [] },
      { refId: 'paper-pfnn', status: 'done', unitsDone: [], doneAt: '2026-10-01' },
      { refId: 'ostep', status: 'active', unitsDone: ['ch-1'] },
    ]);
    await old.table('overrides').bulkPut([
      { kind: 'resource', id: 'docs-nvidia-cuda-training', patch: { estHours: 5 } },
      { kind: 'resource', id: 'ostep', patch: { estHours: 50 } },
    ]);
    old.close();

    const db = new AtlasDB(name);
    await db.open();
    expect(db.verno).toBe(8);
    expect((await db.itemStates.toArray()).map((s) => s.refId)).toEqual(['ostep']);
    expect((await db.overrides.toArray()).map((o) => o.id)).toEqual(['ostep']);
    db.close();
  });
});
