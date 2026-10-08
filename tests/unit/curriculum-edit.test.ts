import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBackup, serialiseBackup } from '../../src/db/backup.ts';
import { AtlasDB } from '../../src/db/db.ts';
import { setItemStatus, toggleUnit } from '../../src/db/state.ts';
import { addEntry, editLog } from '../../src/lib/logs.ts';
import { itemProgress } from '../../src/lib/progress.ts';
import { DATA_DIR, loadSeed, loadSeedOrThrow, splitSeed } from '../../scripts/lib/load-seed.ts';

/**
 * The brief: "Editing a YAML file and rebuilding keeps all user logs and statuses." True by construction, since
 * the curriculum is never written to IndexedDB and state refers to it by id. This shows it on real edits.
 */
let database: AtlasDB;
let dir: string;
let counter = 0;

beforeEach(() => {
  database = new AtlasDB('atlas-curriculum-test-' + counter++);
  dir = mkdtempSync(join(tmpdir(), 'atlas-data-'));
  cpSync(DATA_DIR, dir, { recursive: true });
});

afterEach(async () => {
  database.close();
  await database.delete();
  rmSync(dir, { recursive: true, force: true });
});

function edit(file: string, from: string, to: string): void {
  const path = join(dir, file);
  const text = readFileSync(path, 'utf8');
  if (!text.includes(from)) throw new Error(file + ' does not contain ' + JSON.stringify(from));
  writeFileSync(path, text.replace(from, to));
}

describe('editing the curriculum', () => {
  it('keeps every log and status through an edit and a rebuild', async () => {
    // Someone has been using the app.
    await editLog('2026-09-21', (log) => addEntry(log, { block: 'E', track: 'math', refId: 'mit-18-06', minutes: 90 }), database);
    await toggleUnit('mit-18-06', 'lecture-1', database);
    await toggleUnit('mit-18-06', 'lecture-2', database);
    await setItemStatus('30-days-of-python', 'active', database);
    const before = serialiseBackup(await createBackup(new Date(0), database));
    const originalUnits = loadSeedOrThrow().resources.find((r) => r.id === 'mit-18-06')!.units!.length;

    // The YAML changes: a new title and estimate, a lecture renamed, a lecture added, and the lane reordered.
    edit('resources/math.yaml', 'title: "MIT 18.06 Linear Algebra (Gilbert Strang, Spring 2010)"', 'title: "Linear Algebra (MIT 18.06)"');
    edit('resources/math.yaml', 'estHours: 120', 'estHours: 140');
    edit('units/mit-18-06.yaml', '"Lecture 1: The geometry of linear equations"', '"Lecture 1: Geometry of linear equations"');
    writeFileSync(join(dir, 'units/mit-18-06.yaml'), readFileSync(join(dir, 'units/mit-18-06.yaml'), 'utf8') + '- { id: bonus-review, title: "Review session" }\n');
    edit(
      'plan.yaml',
      '      - { resource: mit-18-06 }\n      - { resource: current-dsa-course, note: "Finish the course already in progress" }',
      '      - { resource: current-dsa-course, note: "Finish the course already in progress" }\n      - { resource: mit-18-06 }',
    );

    // Rebuilt the way the Vite plugin builds it.
    const rebuilt = loadSeed(dir);
    expect(rebuilt.errors).toEqual([]);
    const app = splitSeed(rebuilt.seed!).app;

    // Nothing the user owns changed...
    expect(serialiseBackup(await createBackup(new Date(0), database))).toBe(before);

    // ...and all of it still means the same thing against the new curriculum.
    const course = app.resources.find((r) => r.id === 'mit-18-06')!;
    expect(course.title).toBe('Linear Algebra (MIT 18.06)');
    const progress = itemProgress({ refId: course.id, estHours: course.estHours, unitCount: course.unitCount, state: await database.itemStates.get('mit-18-06') });
    expect(progress).toMatchObject({ status: 'active', unitsDone: 2, unitCount: originalUnits + 1, estHours: 140 });
    expect(rebuilt.seed!.resources.find((r) => r.id === 'mit-18-06')!.units!.find((u) => u.id === 'lecture-1')!.title).toBe('Lecture 1: Geometry of linear equations');
    expect((await database.dayLogs.get('2026-09-21'))!.entries).toEqual([{ block: 'E', track: 'math', refId: 'mit-18-06', minutes: 90 }]);
    expect((await database.itemStates.get('30-days-of-python'))!.status).toBe('active');
    // The lane took the new order, and the plan item kept its id, so edits made to it in the app still apply.
    const lane = app.plan.filter((p) => p.phaseId === 'y1-p0' && p.block === 'E').sort((a, b) => a.order - b.order);
    expect(lane.map((p) => p.resourceId)).toEqual(['current-dsa-course', 'mit-18-06', '3b1b-linear-algebra', '3b1b-calculus']);
    expect(lane[1]!.id).toBe('plan.mit-18-06');
  });
});
