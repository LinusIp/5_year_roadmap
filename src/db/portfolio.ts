/**
 * The portfolio's progress (ATLAS-PORTFOLIO): table `portfolio`, one row per project of data/portfolio/projects.json,
 * synced as portfolio/<id>.json and in backups. Milestone, done-when and ship-checklist ticks by the file's ids, the
 * status the user set, the repository and notes. Never shared with a plan or Internships project; never written back
 * into the file. The tech doc's milestone checkboxes and the page's are the same ticks, here.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';
import type { AtlasDB } from './db.ts';
import type { PortfolioState } from './types.ts';
import type { PortfolioStatus } from '../seed/portfolio.ts';

export function emptyPortfolioState(id: string): PortfolioState {
  return { id, milestones: [], doneWhen: [], ship: [] };
}

/** Every project's progress, live, by id. `undefined` only during the first read. */
export function usePortfolioStates(): Map<string, PortfolioState> | undefined {
  return useLiveQuery(async () => new Map((await db.portfolio.toArray()).map((s) => [s.id, s])), []);
}

export async function updatePortfolio(id: string, change: (s: PortfolioState) => PortfolioState, database: AtlasDB = db): Promise<PortfolioState> {
  return database.transaction('rw', database.portfolio, async () => {
    const before = (await database.portfolio.get(id)) ?? emptyPortfolioState(id);
    const next = change({ ...emptyPortfolioState(id), ...before });
    await database.portfolio.put(next);
    return next;
  });
}

type TickList = 'milestones' | 'doneWhen' | 'ship';

/** Ticks or unticks one item of a list; `done` omitted flips it. */
export async function setTick(id: string, list: TickList, itemId: string, done?: boolean, database: AtlasDB = db): Promise<void> {
  await updatePortfolio(
    id,
    (s) => {
      const has = s[list].includes(itemId);
      const want = done ?? !has;
      if (want === has) return s;
      return { ...s, [list]: want ? [...s[list], itemId] : s[list].filter((x) => x !== itemId) };
    },
    database,
  );
}

export async function setPortfolioStatus(id: string, status: PortfolioStatus, database: AtlasDB = db): Promise<void> {
  await updatePortfolio(id, (s) => ({ ...s, status }), database);
}

/** The repository URL (already checked as https://github.com/<owner>/<repo>) or null to clear it. */
export async function setPortfolioRepo(id: string, repo: string | null, database: AtlasDB = db): Promise<void> {
  await updatePortfolio(
    id,
    (s) => {
      const { repo: _old, ...rest } = s;
      return repo ? { ...rest, repo } : rest;
    },
    database,
  );
}

export async function setPortfolioNotes(id: string, notes: string, database: AtlasDB = db): Promise<void> {
  await updatePortfolio(
    id,
    (s) => {
      const { notes: _old, ...rest } = s;
      return notes.trim() ? { ...rest, notes } : rest;
    },
    database,
  );
}
