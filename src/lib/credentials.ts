/**
 * The credential map's arithmetic: which subjects have what, and how far along each is.
 */
import type { CertState, CertStatus, MilestoneState, MilestoneStatus, UserItemState } from '../db/types.ts';
import type { AppSeed, Cert, Subject } from '../seed/schema.ts';
import { addDays, daysBetween } from './dates.ts';

export interface MilestoneView {
  id: string;
  title: string;
  status: MilestoneStatus;
  /** Derived from the linked projects when the user has not set a status: done when all of them are. */
  derived: boolean;
  url?: string;
  projects: { id: string; title: string; done: boolean }[];
}

export interface SubjectRow {
  subject: Subject;
  certs: (Cert & { state: CertState | undefined; status: CertStatus })[];
  milestones: MilestoneView[];
  /** Planned items on the roadmap that count towards this subject. */
  plannedItems: number;
}

export function defaultCertStatus(cert: Cert): CertStatus {
  return cert.mode === 'investigate' ? 'investigating' : 'planned';
}

export function milestoneView(
  milestone: Subject['milestones'][number],
  state: MilestoneState | undefined,
  seed: AppSeed,
  itemStates: Map<string, UserItemState>,
): MilestoneView {
  const projects = milestone.projects.map((id) => ({
    id,
    title: seed.projects.find((p) => p.id === id)?.title ?? id,
    done: itemStates.get(id)?.status === 'done',
  }));
  let status: MilestoneStatus = state?.status ?? 'todo';
  let derived = false;
  if (!state && projects.length > 0) {
    derived = true;
    status = projects.every((p) => p.done) ? 'done' : projects.some((p) => p.done || itemStates.get(p.id)?.status === 'active') ? 'active' : 'todo';
  }
  const view: MilestoneView = { id: milestone.id, title: milestone.title, status, derived, projects };
  if (state?.url) view.url = state.url;
  return view;
}

export function credentialRows(
  seed: AppSeed,
  certStates: Map<string, CertState>,
  milestoneStates: Map<string, MilestoneState>,
  itemStates: Map<string, UserItemState>,
): SubjectRow[] {
  return seed.subjects.map((subject) => {
    const certs = subject.certs
      .map((id) => seed.certs.find((c) => c.id === id))
      .filter((c): c is Cert => Boolean(c))
      .map((cert) => {
        const state = certStates.get(cert.id);
        return { ...cert, state, status: state?.status ?? defaultCertStatus(cert) };
      });
    const milestones = subject.milestones.map((m) => milestoneView(m, milestoneStates.get(m.id), seed, itemStates));
    const plannedItems = seed.plan.filter((item) => {
      const ref = item.resourceId ? seed.resources.find((r) => r.id === item.resourceId) : seed.projects.find((p) => p.id === item.projectId);
      return ref?.subject === subject.id;
    }).length;
    return { subject, certs, milestones, plannedItems };
  });
}

/** A credential that expires within `withinDays` of `asOf`, or has already expired. */
export interface ExpiryWarning {
  certId: string;
  title: string;
  expiresAt: string;
  daysLeft: number;
}

export function expiryWarnings(certs: Cert[], states: Map<string, CertState>, asOf: string, withinDays = 90): ExpiryWarning[] {
  const out: ExpiryWarning[] = [];
  for (const cert of certs) {
    const state = states.get(cert.id);
    if (state?.status !== 'earned') continue;
    let expiresAt = state.expiresAt;
    if (!expiresAt && state.earnedAt && cert.validityYears) expiresAt = addDays(state.earnedAt, Math.round(cert.validityYears * 365.25));
    if (!expiresAt) continue;
    const daysLeft = daysBetween(asOf, expiresAt);
    if (daysLeft <= withinDays) out.push({ certId: cert.id, title: cert.title, expiresAt, daysLeft });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

/** "2027-Q3" to a human "Jul to Sep 2027". */
export function describeQuarter(quarter: string): string {
  const m = /^(\d{4})-Q([1-4])$/.exec(quarter);
  if (!m) return quarter;
  const months = ['Jan to Mar', 'Apr to Jun', 'Jul to Sep', 'Oct to Dec'][Number(m[2]) - 1];
  return months + ' ' + m[1];
}
