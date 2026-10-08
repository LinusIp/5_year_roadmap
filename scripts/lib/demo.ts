/**
 * Eight weeks of made-up history, as a backup file: what the screenshots show. Deterministic, so the same
 * pictures come out every run. Imported through Settings like any real backup.
 */
import { parseBackup, serialiseBackup } from '../../src/db/backup-file.ts';
import type { BackupFile, DayLog, DayLogEntry, UserItemState } from '../../src/db/types.ts';
import { addDays, daysBetween, weekday } from '../../src/lib/dates.ts';
import type { BlockId, TrackId } from '../../src/seed/schema.ts';
import { loadSeedOrThrow } from './load-seed.ts';

export const DEMO_START = '2026-09-21';
export const DEMO_NOW = '2026-11-18';
/** The clock the screenshots are taken at: mid-morning in the user's zone. */
export const DEMO_TIME = DEMO_NOW + 'T10:30:00+05:00';

const seed = loadSeedOrThrow();
const trackOf = (id: string): TrackId =>
  (seed.resources.find((r) => r.id === id)?.tracks[0] ?? seed.projects.find((p) => p.id === id)?.tracks[0] ?? 'swe') as TrackId;
const unitIds = (id: string): string[] => seed.resources.find((r) => r.id === id)?.units?.map((u) => u.id) ?? [];

/** A small deterministic generator, so the demo is the same every run. */
function random(seedValue: number): () => number {
  let state = seedValue;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function demoBackup(theme: 'light' | 'dark' = 'light'): BackupFile {
  const rand = random(21);
  const dayLogs: DayLog[] = [];
  const days = daysBetween(DEMO_START, DEMO_NOW);
  for (let i = 0; i <= days; i++) {
    const date = addDays(DEMO_START, i);
    // Two freeze days in October, as life happens.
    if (date === '2026-10-09' || date === '2026-10-24') {
      dayLogs.push({ date, entries: [], frozen: true, frozenAuto: true });
      continue;
    }
    const sunday = weekday(date) === 0;
    const effort = date === DEMO_NOW ? 0.3 : 0.55 + rand() * 0.5;
    const lane = (block: BlockId, refId: string, full: number): DayLogEntry | null => {
      const minutes = Math.round((full * Math.min(1, effort + (rand() - 0.5) * 0.3)) / 5) * 5;
      return minutes > 0 ? { block, track: trackOf(refId), refId, minutes } : null;
    };
    const entries = [
      lane('A', 'a-small-game-1', 120),
      lane('B', i < 30 ? '30-days-of-python' : 'automate-the-boring-stuff', 60),
      lane('C', 'ml-zoomcamp', 120),
      sunday ? lane('D', 'paper-attention', 120) : lane('D', 'm01', 120),
      lane('E', 'mit-18-06', 60),
    ].filter((entry): entry is DayLogEntry => entry !== null);
    const log: DayLog = { date, entries };
    if (sunday) {
      log.reflection = 'A steady week. Mornings for maths work best.';
      log.energy = 4;
    }
    dayLogs.push(log);
  }

  const itemStates: UserItemState[] = [
    { refId: '30-days-of-python', status: 'done', unitsDone: unitIds('30-days-of-python'), startedAt: DEMO_START, doneAt: '2026-10-20' },
    { refId: 'automate-the-boring-stuff', status: 'active', unitsDone: [], startedAt: '2026-10-21' },
    { refId: 'ml-zoomcamp', status: 'active', unitsDone: unitIds('ml-zoomcamp').slice(0, 6), startedAt: DEMO_START },
    { refId: 'mit-18-06', status: 'active', unitsDone: unitIds('mit-18-06').slice(0, 17), startedAt: DEMO_START },
    // In progress, not done: done needs a repository link, and the demo does not invent one.
    { refId: 'a-small-game-1', status: 'active', unitsDone: [], startedAt: DEMO_START },
    { refId: 'm01', status: 'active', unitsDone: [], startedAt: DEMO_START },
  ];

  const file: BackupFile = {
    app: 'atlas',
    formatVersion: 1,
    exportedAt: DEMO_NOW + 'T05:00:00.000Z',
    data: {
      dayLogs,
      itemStates,
      paperStates: [{ refId: 'paper-attention', status: 'reading', startedAt: '2026-11-15' }],
      certStates: [],
      milestoneStates: [],
      customEntities: [],
      overrides: [],
      reviews: [
        { id: 'week:2026-11-09', kind: 'week', periodStart: '2026-11-09', completedAt: '2026-11-15', worked: 'Linear algebra before breakfast.', didnt: 'Evenings for the project.', changes: 'Projects block right after lunch.' },
      ],
      weekPicks: [{ weekStart: '2026-11-16', projectId: 'w-c-ring-buffer', pickedAt: '2026-11-16' }],
      replans: [],
      settings: [{ id: 'app', core: seed.settings, theme, github: { username: '', showCalendar: false }, backup: { lastBackupAt: '2026-11-15' } }],
      meta: [],
    },
  };
  const check = parseBackup(serialiseBackup(file));
  if (!check.ok) throw new Error('The demo backup is not valid:\n' + check.errors.join('\n'));
  return file;
}

/** The demo backup as the text of a file. */
export function demoBackupText(theme: 'light' | 'dark' = 'light'): string {
  return serialiseBackup(demoBackup(theme));
}
