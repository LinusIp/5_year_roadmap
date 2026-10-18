import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow, splitSeed } from '../../scripts/lib/load-seed.ts';
import { seedChecklistProgress, SEED_STAMP } from '../../src/db/checklist.ts';
import { AtlasDB } from '../../src/db/db.ts';
import { checklistCounts, checklistMeta, currentModule, currentUnit, moduleWindow, unitHours } from '../../src/lib/checklist.ts';
import { itemProgress } from '../../src/lib/progress.ts';
import { readChecklist } from '../../src/seed/validate.ts';

/** The ML Zoomcamp lesson checklist (ZOOMCAMP-CHECKLIST, data/units/ml-zoomcamp.json) and the generic checklist logic. */
const FILE = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'data', 'units', 'ml-zoomcamp.json'), 'utf8'));
const { app, units: allUnits } = splitSeed(loadSeedOrThrow());
const units = allUnits['ml-zoomcamp']!;
const resource = app.resources.find((r) => r.id === 'ml-zoomcamp')!;
const seedDone = resource.checklist!.seedDone;

describe('the checklist file', () => {
  it('validates: unique ids, links, every video inside the course playlist', () => {
    const read = readChecklist(FILE, 'ml-zoomcamp');
    expect(read.errors).toEqual([]);
    expect(read.units).toHaveLength(124);
    expect(new Set(read.units!.map((u) => u.id)).size).toBe(124);
    expect(read.meta!.playlist).toBe('https://www.youtube.com/playlist?list=PL3MmuxUbc_hIhxl5Ji8t4O6lPAOpHaCLR');
  });

  it('refuses a video outside the playlist, a video without its link, and the wrong resource', () => {
    const bad = structuredClone(FILE);
    bad.modules[0].items[0].video = 'https://www.youtube.com/watch?v=Crm_5n4mvmg&list=PLsomethingelse';
    delete bad.modules[0].items[1].video;
    const read = readChecklist(bad, 'ml-zoomcamp-2');
    expect(read.errors).toEqual([
      ': "resource" is "ml-zoomcamp", the file name says "ml-zoomcamp-2"',
      ' (1.1): the video is not in the course playlist (list=PL3MmuxUbc_hIhxl5Ji8t4O6lPAOpHaCLR)',
      ' (1.2): a video needs its video link',
    ]);
    expect(readChecklist({ ...FILE, modules: [] }, 'ml-zoomcamp').units).toBeUndefined();
  });
});

describe('the counts and where you are', () => {
  it('counts 97 videos that are not optional or outdated, and starts from the file: 1.1 to 1.6 done, 1.7 now', () => {
    expect(units.filter((u) => u.kind === 'video')).toHaveLength(101);
    expect(checklistCounts(units, []).videos).toBe(97);
    expect(seedDone).toEqual(['1.1', '1.2', '1.3', '1.4', '1.5', '1.6']);
    expect(currentUnit(units, seedDone)!.id).toBe('1.7');
    expect(checklistMeta(units, seedDone)).toBe('Module 1 · 6 of 97 videos done');
    expect(checklistMeta(units, seedDone, true)).toBe('Module 1 · 6 of 97');
    // The Now card's window: the two done before 1.7, then the rest of module 1 with its homework.
    expect(moduleWindow(units, seedDone).map((u) => u.id)).toEqual(['1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.hw']);
  });

  it('moves Now to the next unit that counts, past optional ones', () => {
    expect(currentUnit(units, [...seedDone, '1.7'])!.id).toBe('1.8');
    expect(checklistMeta(units, [...seedDone, '1.7'])).toBe('Module 1 · 7 of 97 videos done');
    // In module 2, "Explore more" (2.17) is optional: after 2.16 comes the homework.
    const upTo216 = units.filter((u) => u.group === '1' || (u.group === '2' && u.id !== '2.17' && u.id !== '2.hw')).map((u) => u.id);
    expect(currentUnit(units, upTo216)!.id).toBe('2.hw');
  });

  it('rolls over to the next module once the last unit of one is ticked', () => {
    const module1 = ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10'];
    expect(currentModule(units, module1)!.group).toBe('1');
    expect(currentUnit(units, module1)!.id).toBe('1.hw');
    const withHomework = [...module1, '1.hw'];
    expect(currentUnit(units, withHomework)!.id).toBe('2.1');
    expect(currentModule(units, withHomework)!.group).toBe('2');
    expect(checklistMeta(units, withHomework, true)).toBe('Module 2 · 10 of 97');
  });

  it('gives the pace its hours: 15 minutes a video, 2 h a homework, 20 h a project', () => {
    expect(unitHours({ kind: 'video' })).toBe(0.25);
    expect(unitHours({ kind: 'homework' })).toBe(2);
    expect(unitHours({ kind: 'project' })).toBe(20);
    expect(unitHours({ kind: 'project', hours: 30 })).toBe(30);
    const total = resource.checklist!.counted.reduce((s, u) => s + u.hours, 0);
    expect(resource.estHours).toBe(Math.round(total));
    const p = itemProgress({ refId: 'ml-zoomcamp', estHours: resource.estHours, unitCount: resource.unitCount, state: { refId: 'ml-zoomcamp', status: 'active', unitsDone: seedDone }, checklist: resource.checklist!.counted });
    expect(p.unitsDone).toBe(6);
    expect(p.fraction).toBeCloseTo(1.5 / total, 5);
    expect(p.remainingHours).toBeCloseTo(resource.estHours * (1 - 1.5 / total), 5);
  });
});

describe('seeding the progress', () => {
  it('ticks 1.1 to 1.6 once on a new device, dated older than any real edit, and never over a tick', async () => {
    const database = new AtlasDB('checklist-seed-test');
    await database.open();
    expect(await seedChecklistProgress(app, database)).toEqual(['ml-zoomcamp']);
    const seeded = await database.itemStates.get('ml-zoomcamp');
    expect(seeded).toMatchObject({ status: 'active', startedAt: '2026-10-18', unitsDone: seedDone, updatedAt: SEED_STAMP });
    // Unticked by hand afterwards: a second run leaves it as it is.
    await database.itemStates.put({ ...seeded!, unitsDone: [] });
    expect(await seedChecklistProgress(app, database)).toEqual([]);
    expect((await database.itemStates.get('ml-zoomcamp'))!.unitsDone).toEqual([]);
    database.close();
    await database.delete();
  });

  it('adds the ticks to an item started before the checklist came, as an edit that syncs', async () => {
    const database = new AtlasDB('checklist-seed-started');
    await database.open();
    await database.itemStates.put({ refId: 'ml-zoomcamp', status: 'active', startedAt: '2026-09-21', unitsDone: ['old-1'], updatedAt: '2026-10-01T00:00:00.000Z' });
    expect(await seedChecklistProgress(app, database)).toEqual(['ml-zoomcamp']);
    const state = (await database.itemStates.get('ml-zoomcamp'))!;
    expect(state).toMatchObject({ status: 'active', startedAt: '2026-09-21', unitsDone: ['old-1', ...seedDone] });
    expect(state.updatedAt! > '2026-10-01T00:00:00.000Z').toBe(true);
    database.close();
    await database.delete();
  });

  it('leaves alone an item state that already has a tick of the checklist', async () => {
    const database = new AtlasDB('checklist-seed-ticked');
    await database.open();
    await database.itemStates.put({ refId: 'ml-zoomcamp', status: 'active', unitsDone: ['1.1', '2.3'] });
    expect(await seedChecklistProgress(app, database)).toEqual([]);
    expect((await database.itemStates.get('ml-zoomcamp'))!.unitsDone).toEqual(['1.1', '2.3']);
    database.close();
    await database.delete();
  });
});
