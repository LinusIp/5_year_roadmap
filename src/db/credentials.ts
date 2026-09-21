import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';
import type { AtlasDB } from './db.ts';
import type { CertState, CertStatus, MilestoneState, MilestoneStatus } from './types.ts';
import { today } from '../lib/dates.ts';

export function useCertStates(): Map<string, CertState> | undefined {
  return useLiveQuery(async () => new Map((await db.certStates.toArray()).map((s) => [s.refId, s])), []);
}

export function useMilestoneStates(): Map<string, MilestoneState> | undefined {
  return useLiveQuery(async () => new Map((await db.milestoneStates.toArray()).map((s) => [s.refId, s])), []);
}

export async function editCertState(refId: string, change: (s: CertState) => CertState, database: AtlasDB = db): Promise<void> {
  await database.transaction('rw', database.certStates, async () => {
    const current: CertState = (await database.certStates.get(refId)) ?? { refId, status: 'planned' };
    await database.certStates.put(change(current));
  });
}

export async function setCertStatus(refId: string, status: CertStatus, database: AtlasDB = db): Promise<void> {
  await editCertState(
    refId,
    (s) => {
      const next: CertState = { ...s, status };
      if (status === 'earned') next.earnedAt ??= today();
      else delete next.earnedAt;
      return next;
    },
    database,
  );
}

export async function editMilestoneState(refId: string, change: (s: MilestoneState) => MilestoneState, database: AtlasDB = db): Promise<void> {
  await database.transaction('rw', database.milestoneStates, async () => {
    const current: MilestoneState = (await database.milestoneStates.get(refId)) ?? { refId, status: 'todo' };
    await database.milestoneStates.put(change(current));
  });
}

export async function setMilestoneStatus(refId: string, status: MilestoneStatus, database: AtlasDB = db): Promise<void> {
  await editMilestoneState(refId, (s) => ({ ...s, status }), database);
}
