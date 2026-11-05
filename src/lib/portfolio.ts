/**
 * The portfolio's rules (ATLAS-PORTFOLIO): a project's status (the user's, or one derived from its schedule), its
 * progress by checked milestone hours, the overrun hint, its window, the timeline strip's months and bars, the
 * countdown to the application date, the Plan row's line and the search group. Pure: the screens and tests share it.
 */
import type { DayLog, PortfolioState } from '../db/types.ts';
import type { PortfolioFile, PortfolioProject, PortfolioStatus } from '../seed/portfolio.ts';
import { PORTFOLIO_STATUSES } from '../seed/portfolio.ts';
import type { TrackId } from '../seed/schema.ts';
import { addDays, daysBetween, endOfMonth, monthName } from './dates.ts';

/** A day-log entry's refId for time logged to a portfolio project. Lanes never count these (see pace and forecast). */
export const PORTFOLIO_REF = 'portfolio:';

export function portfolioRef(id: string): string {
  return PORTFOLIO_REF + id;
}

export function isPortfolioRef(refId: string | undefined): boolean {
  return refId !== undefined && refId.startsWith(PORTFOLIO_REF);
}

/** "Portfolio · nanoserve": the day log's and Stats' name for the time. */
export function portfolioLabel(code: string): string {
  return 'Portfolio · ' + code;
}

/** The track the time is logged on: the file's `inference` is the Library's AI track with the inference tag. */
export function portfolioTrack(track: PortfolioProject['track']): TrackId {
  return (track === 'inference' ? 'ai' : track) as TrackId;
}

/** The first day of a YYYY-MM month. */
export function monthStart(month: string): string {
  return month + '-01';
}

/** The last day of a YYYY-MM month. */
export function monthEnd(month: string): string {
  return endOfMonth(monthStart(month));
}

/** "Nov 2026". */
export function monthLabel(month: string): string {
  return monthName(Number(month.slice(5, 7)) - 1, true) + ' ' + month.slice(0, 4);
}

/** The project's whole window, first window's start to last window's end: "Nov 2026 – Jun 2027". */
export function windowOf(project: Pick<PortfolioProject, 'schedule'>): { from: string; to: string } {
  const from = project.schedule.reduce((m, w) => (w.from < m ? w.from : m), project.schedule[0]!.from);
  const to = project.schedule.reduce((m, w) => (w.to > m ? w.to : m), project.schedule[0]!.to);
  return { from, to };
}

export function windowLabel(project: Pick<PortfolioProject, 'schedule'>): string {
  const { from, to } = windowOf(project);
  return from === to ? monthLabel(from) : monthLabel(from) + ' – ' + monthLabel(to);
}

/**
 * The status before the user sets one: `next` once the first schedule window has started or starts within 30 days,
 * `later` before that.
 */
export function defaultStatus(project: Pick<PortfolioProject, 'schedule'>, today: string): PortfolioStatus {
  const start = monthStart(project.schedule[0]!.from);
  return start <= addDays(today, 30) ? 'next' : 'later';
}

export function statusOf(project: Pick<PortfolioProject, 'schedule'>, state: PortfolioState | undefined, today: string): PortfolioStatus {
  return state?.status ?? defaultStatus(project, today);
}

/** later → next → building → done → later: a tap moves it on. */
export function cycleStatus(status: PortfolioStatus): PortfolioStatus {
  return PORTFOLIO_STATUSES[(PORTFOLIO_STATUSES.indexOf(status) + 1) % PORTFOLIO_STATUSES.length]!;
}

export function statusLabel(status: PortfolioStatus): string {
  return status === 'later' ? 'Later' : status === 'next' ? 'Next' : status === 'building' ? 'Building' : 'Done';
}

/** The milestones ticked, of the project's own (a tick for a milestone the file no longer has counts for nothing). */
export function tickedMilestones(project: Pick<PortfolioProject, 'milestones'>, state: PortfolioState | undefined): PortfolioProject['milestones'] {
  const ticked = new Set(state?.milestones ?? []);
  return project.milestones.filter((m) => ticked.has(m.id));
}

/** Checked milestone hours over `estHours`, 0 to 1. */
export function progressOf(project: Pick<PortfolioProject, 'milestones' | 'estHours'>, state: PortfolioState | undefined): number {
  const hours = tickedMilestones(project, state).reduce((s, m) => s + m.hours, 0);
  return project.estHours > 0 ? Math.min(1, hours / project.estHours) : 0;
}

export function hoursDone(project: Pick<PortfolioProject, 'milestones'>, state: PortfolioState | undefined): number {
  return tickedMilestones(project, state).reduce((s, m) => s + m.hours, 0);
}

/**
 * The overrun hint (`overrun_rule`): the project is not done, and today is past the end of its last window by more
 * than half that window's length.
 */
export function isOverrun(project: Pick<PortfolioProject, 'schedule'>, status: PortfolioStatus, today: string): boolean {
  if (status === 'done') return false;
  const last = project.schedule.reduce((a, w) => (w.to > a.to || (w.to === a.to && w.from > a.from) ? w : a), project.schedule[0]!);
  const start = monthStart(last.from);
  const end = monthEnd(last.to);
  const length = daysBetween(start, end) + 1;
  return daysBetween(end, today) > length / 2;
}

/** Every done-when item of the project ticked: the page offers to mark it done (never silently). */
export function allDoneWhen(project: Pick<PortfolioProject, 'done_when'>, state: PortfolioState | undefined): boolean {
  const ticked = new Set(state?.doneWhen ?? []);
  return project.done_when.length > 0 && project.done_when.every((d) => ticked.has(d.id));
}

export function shipCount(rules: PortfolioFile['rules'], state: PortfolioState | undefined): number {
  const ticked = new Set(state?.ship ?? []);
  return rules.filter((r) => ticked.has(r.id)).length;
}

/** "9 of 47 milestones · 2 building". */
export function progressLine(projects: readonly PortfolioProject[], states: ReadonlyMap<string, PortfolioState>, today: string): string {
  const total = projects.reduce((n, p) => n + p.milestones.length, 0);
  const done = projects.reduce((n, p) => n + tickedMilestones(p, states.get(p.id)).length, 0);
  const building = projects.filter((p) => statusOf(p, states.get(p.id), today) === 'building').length;
  return done + ' of ' + total + ' milestones · ' + building + ' building';
}

/** The project Plan's row names: the first one building, else the next one, else the first not done. */
export function currentProject(projects: readonly PortfolioProject[], states: ReadonlyMap<string, PortfolioState>, today: string): PortfolioProject | undefined {
  const ordered = [...projects].sort((a, b) => a.number - b.number);
  const status = (p: PortfolioProject): PortfolioStatus => statusOf(p, states.get(p.id), today);
  return ordered.find((p) => status(p) === 'building') ?? ordered.find((p) => status(p) === 'next') ?? ordered.find((p) => status(p) !== 'done');
}

/** "Portfolio · 9 projects · building nanoserve" (or "next: kernel-lab"). */
export function planRowMeta(projects: readonly PortfolioProject[], states: ReadonlyMap<string, PortfolioState>, today: string): string {
  const current = currentProject(projects, states, today);
  const count = projects.length + (projects.length === 1 ? ' project' : ' projects');
  if (!current) return count + ' · all done';
  return count + ' · ' + (statusOf(current, states.get(current.id), today) === 'building' ? 'building ' : 'next: ') + current.code;
}

/** Days from today to the first day of the event's month; negative once it has passed. */
export function daysToEvent(event: PortfolioFile['events'][number], today: string): number {
  return daysBetween(today, monthStart(event.date));
}

export interface TimelineModel {
  /** Every month the schedules cover, in order: "2026-11" … "2028-09". */
  months: string[];
  rows: { project: PortfolioProject; bars: { from: number; to: number; what: string; label: string }[] }[];
  /** Today's position in months from the strip's start (fractional), or null outside it. */
  today: number | null;
  /** The events' months, as indexes. */
  events: { index: number; title: string; date: string }[];
}

/** Every date comes from the data: the strip covers the earliest window's start to the latest window's end. */
export function timelineOf(file: Pick<PortfolioFile, 'projects' | 'events'>, today: string): TimelineModel {
  const all = file.projects.flatMap((p) => p.schedule);
  const first = all.reduce((m, w) => (w.from < m ? w.from : m), all[0]!.from);
  const last = all.reduce((m, w) => (w.to > m ? w.to : m), all[0]!.to);
  const months: string[] = [];
  for (let y = Number(first.slice(0, 4)), m = Number(first.slice(5, 7)); y * 12 + m <= Number(last.slice(0, 4)) * 12 + Number(last.slice(5, 7)); m === 12 ? ((m = 1), (y += 1)) : (m += 1)) {
    months.push(y + '-' + String(m).padStart(2, '0'));
  }
  const index = (month: string): number => months.indexOf(month);
  const rows = [...file.projects]
    .sort((a, b) => a.number - b.number)
    .map((project) => ({
      project,
      bars: project.schedule.map((w) => ({ from: index(w.from), to: index(w.to), what: w.what, label: w.from === w.to ? monthLabel(w.from) : monthLabel(w.from) + ' – ' + monthLabel(w.to) })),
    }));
  const t = today.slice(0, 7);
  const ti = index(t);
  const day = Number(today.slice(8, 10));
  const daysInMonth = Number(monthEnd(t).slice(8, 10));
  return {
    months,
    rows,
    today: ti >= 0 ? ti + (day - 1) / daysInMonth : null,
    events: file.events.map((e) => ({ index: index(e.date), title: e.title, date: e.date })).filter((e) => e.index >= 0),
  };
}

/** A portfolio project matches a search when every word is in its code, title, summary, proves or stack. */
export function matchesSearch(project: PortfolioProject, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const text = [project.code, project.title, project.summary, project.proves, project.stack.join(' '), project.areas.join(' ')].join(' ').toLowerCase();
  return words.every((w) => text.includes(w));
}

/** A repository field's value is https://github.com/<owner>/<repo>. */
export function isRepoUrl(url: string): boolean {
  return /^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(url);
}

/** "owner/repo" of a repository URL. */
export function repoName(url: string): string {
  return url.replace(/^https:\/\/github\.com\//, '');
}

/** Every portfolio project's logged minutes, by its name in the log ("Portfolio · nanoserve"), most first: Stats' list. */
export function portfolioTime(logs: readonly DayLog[]): { label: string; minutes: number }[] {
  const byRef = new Map<string, { label: string; minutes: number }>();
  for (const log of logs) {
    for (const e of log.entries) {
      if (!isPortfolioRef(e.refId) || e.minutes <= 0) continue;
      const row = byRef.get(e.refId!) ?? { label: e.note ?? portfolioLabel(e.refId!.slice(PORTFOLIO_REF.length)), minutes: 0 };
      row.minutes += e.minutes;
      byRef.set(e.refId!, row);
    }
  }
  return [...byRef.values()].sort((a, b) => b.minutes - a.minutes || a.label.localeCompare(b.label));
}
