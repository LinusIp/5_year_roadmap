/**
 * Lesson checklists (ZOOMCAMP-CHECKLIST): a resource's units with a kind (video, reading, homework, project), grouped
 * in modules. Generic: any resource whose units file is a checklist gets the same counts, "current" item and pace.
 * Pure: the screens pass the units and the ticks in.
 */
import type { Unit } from '../seed/schema.ts';

/** Hours a unit stands for in the pace: its own, else 15 minutes a video, 30 a reading, 2 h a homework, 20 h a project. */
export function unitHours(unit: Pick<Unit, 'kind' | 'hours'>): number {
  if (unit.hours) return unit.hours;
  switch (unit.kind) {
    case 'video':
      return 0.25;
    case 'homework':
      return 2;
    case 'project':
      return 20;
    default:
      return 0.5;
  }
}

/** Whether the unit counts: optional and outdated units neither count toward progress nor become current. */
export const counts = (unit: Unit): boolean => !unit.optional && !unit.outdated;

export function isChecklist(units: readonly Unit[] | undefined): boolean {
  return Boolean(units?.some((u) => u.kind));
}

/** The next unit to do: the first that counts and is not ticked. Null when every counted unit is done. */
export function currentUnit(units: readonly Unit[], done: readonly string[]): Unit | null {
  const ticked = new Set(done);
  return units.find((u) => counts(u) && !ticked.has(u.id)) ?? null;
}

export interface ChecklistModule {
  group: string;
  title: string;
  units: Unit[];
}

/** The units by module, in order. */
export function checklistModules(units: readonly Unit[]): ChecklistModule[] {
  const out: ChecklistModule[] = [];
  for (const u of units) {
    const group = u.group ?? u.section ?? '';
    const last = out.at(-1);
    if (last && last.group === group) last.units.push(u);
    else out.push({ group, title: u.section ?? group, units: [u] });
  }
  return out;
}

/** "Module 1" for a numbered module of lessons; a module of projects alone goes by its title ("Midterm project"). */
export function moduleLabel(module: ChecklistModule): string {
  return /^\d+$/.test(module.group) && module.units.some((u) => u.kind !== 'project') ? 'Module ' + module.group : module.title;
}

/** The module of the current unit, or the last one when everything is done. */
export function currentModule(units: readonly Unit[], done: readonly string[]): ChecklistModule | null {
  const modules = checklistModules(units);
  const current = currentUnit(units, done);
  if (!current) return modules.at(-1) ?? null;
  return modules.find((m) => m.units.includes(current)) ?? null;
}

export interface ChecklistCounts {
  videosDone: number;
  videos: number;
  done: number;
  total: number;
  /** Hours of the counted units ticked, and of all of them: the course's progress. */
  hoursDone: number;
  hours: number;
}

/** What counts and how much of it is done: "6 of 97 videos". */
export function checklistCounts(units: readonly Unit[], done: readonly string[]): ChecklistCounts {
  const ticked = new Set(done);
  const counted = units.filter(counts);
  const videos = counted.filter((u) => u.kind === 'video');
  return {
    videosDone: videos.filter((u) => ticked.has(u.id)).length,
    videos: videos.length,
    done: counted.filter((u) => ticked.has(u.id)).length,
    total: counted.length,
    hoursDone: counted.filter((u) => ticked.has(u.id)).reduce((s, u) => s + unitHours(u), 0),
    hours: counted.reduce((s, u) => s + unitHours(u), 0),
  };
}

/**
 * The Now card's window on the checklist: the current module's units from the two done just before the current one,
 * then the rest of the module (its homework too). Optional units stay out of it; the full list has them.
 */
export function moduleWindow(units: readonly Unit[], done: readonly string[]): Unit[] {
  const module = currentModule(units, done);
  if (!module) return [];
  const list = module.units.filter(counts);
  const current = currentUnit(units, done);
  const at = current ? list.indexOf(current) : list.length;
  return list.slice(Math.max(0, at - 2));
}

/** "Module 1 · 6 of 97 videos done" (the Now card), or "Module 1 · 6 of 97" (the Library card). */
export function checklistMeta(units: readonly Unit[], done: readonly string[], short = false): string {
  const module = currentModule(units, done);
  const c = checklistCounts(units, done);
  const head = module ? moduleLabel(module) : null;
  const count = c.videos > 0 ? c.videosDone + ' of ' + c.videos + (short ? '' : ' videos done') : c.done + ' of ' + c.total + (short ? '' : ' done');
  return [head, count].filter(Boolean).join(' · ');
}
