/**
 * Tests against the real curriculum in /data, not a fixture. They guard the promises the brief makes
 * about the content itself, which the schema alone cannot express.
 */
import { describe, expect, it } from 'vitest';
import { loadSeed } from '../../scripts/lib/load-seed.ts';
import { MIN_WEEKLY_PROJECTS, MIN_WEEKLY_STAGE2 } from '../../src/seed/validate.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';

const { seed, errors } = loadSeed();

describe('the real curriculum in /data', () => {
  it('is valid', () => {
    expect(errors).toEqual([]);
    expect(seed).not.toBeNull();
  });

  const curriculum = seed!;

  it('covers 2026-09-21 to 2031-08-31 without a gap', () => {
    expect(curriculum.phases[0]!.start).toBe('2026-09-21');
    expect(curriculum.phases.at(-1)!.end).toBe('2031-08-31');
    for (let i = 1; i < curriculum.phases.length; i++) {
      const previousEnd = new Date(curriculum.phases[i - 1]!.end + 'T00:00:00Z');
      const start = new Date(curriculum.phases[i]!.start + 'T00:00:00Z');
      const gapDays = (start.getTime() - previousEnd.getTime()) / 86_400_000;
      expect(gapDays).toBe(1);
    }
  });

  it('teaches all software engineering in years 1-3 and all engineering in years 4-5', () => {
    // The brief's hard requirement. Graphics, simulation and gamedev are deliberately absent from both
    // lists: the brief makes the simulation and engine work the bridge between the stages ("simulate what
    // you study, then build it in hardware"), so those courses are expected on both sides of year 4.
    // Robotics and control are the same kind of bridge since the brief of 2026-10-07: robotics software
    // (ROS 2, simulators, control) belongs to years 1-3, the hardware side of it to years 4-5.
    const SOFTWARE = ['swe', 'systems', 'ai'];
    const ENGINEERING = ['ee', 'embedded', 'mech', 'chem'];
    const planOf = new Map(curriculum.plan.map((i) => [i.resourceId ?? i.projectId!, i]));
    const stageOf = new Map([...planOf].map(([id, i]) => [id, curriculum.phases.find((p) => p.id === i.phaseId)!.stage]));

    let softwareCourses = 0;
    let engineeringCourses = 0;
    for (const resource of curriculum.resources) {
      const item = planOf.get(resource.id);
      if (!item) continue; // in the library, not on the roadmap
      // Block E carries the maths and physics that stage 2 depends on, from day one, so it is exempt.
      if (item.block === 'E') continue;
      const stage = stageOf.get(resource.id)!;
      const isBridge = resource.tracks.some((t) => ['simulation', 'graphics', 'robotics', 'controls'].includes(t));
      const isEngineering = resource.tracks.some((t) => ENGINEERING.includes(t));
      const isSoftwareOnly = !isEngineering && !isBridge && resource.tracks.some((t) => SOFTWARE.includes(t));
      // A course that teaches engineering is never scheduled before year 4...
      if (isEngineering) {
        engineeringCourses++;
        expect(stage, resource.id).toBe(2);
      }
      // ...and a course that teaches only software is finished by the end of year 3.
      if (isSoftwareOnly) {
        softwareCourses++;
        expect(stage, resource.id).toBe(1);
      }
    }
    expect(softwareCourses).toBeGreaterThanOrEqual(25);
    expect(engineeringCourses).toBeGreaterThan(15);

    // Stage 2 projects may still touch software (a sensor node reports to the year 3 backend),
    // but every stage 2 project carries at least one engineering track.
    const stage2Projects = curriculum.projects.filter((p) => p.stage === 2 && stageOf.get(p.id) === 2);
    expect(stage2Projects.length).toBeGreaterThan(20);
    for (const project of stage2Projects) {
      const touchesEngineering = project.tracks.some((t) => [...ENGINEERING, 'simulation'].includes(t));
      expect(touchesEngineering, project.id).toBe(true);
    }
  });

  it('gives every planned subject a certificate or a portfolio milestone', () => {
    const plannedSubjects = new Set<string>();
    for (const item of curriculum.plan) {
      const ref = item.resourceId
        ? curriculum.resources.find((r) => r.id === item.resourceId)!
        : curriculum.projects.find((p) => p.id === item.projectId)!;
      if (ref.subject) plannedSubjects.add(ref.subject);
    }
    expect(plannedSubjects.size).toBeGreaterThan(20);
    for (const id of plannedSubjects) {
      const subject = curriculum.subjects.find((s) => s.id === id);
      expect(subject, id).toBeDefined();
      expect(subject!.certs.length > 0 || Boolean(subject!.certNote), id).toBe(true);
      expect(subject!.milestones.length, id).toBeGreaterThan(0);
    }
  });

  it('keeps the cadences the brief asks for: a capstone a year, a monthly project a month, a weekly pool', () => {
    for (const year of [1, 2, 3, 4, 5]) {
      const phaseIds = curriculum.phases.filter((p) => p.year === year).map((p) => p.id);
      const capstones = curriculum.projects.filter((p) => p.cadence === 'capstone' && p.phaseId && phaseIds.includes(p.phaseId));
      expect(capstones.length, 'year ' + year).toBeGreaterThanOrEqual(1);
    }
    const numbered = curriculum.projects.filter((p) => p.number !== undefined).map((p) => p.number!);
    // The brief numbers its monthly projects 1 to 59; 35 and 57 are the two capstones it names.
    expect(Math.min(...numbered)).toBe(1);
    expect(numbered).toContain(35);
    expect(numbered).toContain(57);
    const weekly = curriculum.projects.filter((p) => p.cadence === 'weekly');
    expect(weekly.length).toBeGreaterThanOrEqual(MIN_WEEKLY_PROJECTS);
    expect(weekly.filter((p) => p.stage === 2).length).toBeGreaterThanOrEqual(MIN_WEEKLY_STAGE2);
  });

  it('never stores an unverified link, and dates every verified one', () => {
    const linked = [...curriculum.resources, ...curriculum.papers, ...curriculum.certs, ...curriculum.paperSources];
    for (const item of linked) {
      if (item.url === null) {
        expect(item.urlVerified, item.id).toBe(false);
        expect(item.searchHint, item.id).toBeTruthy();
      } else {
        expect(item.urlVerified, item.id).toBe(true);
        expect(item.lastVerified, item.id).toBeTruthy();
      }
    }
    expect(linked.filter((i) => i.url !== null).length).toBeGreaterThan(200);
  });

  it('does not include the discontinued TensorFlow Developer Certificate', () => {
    expect(curriculum.certs.some((c) => /tensorflow/i.test(c.title))).toBe(false);
  });

  it('plans every item after its prerequisites', () => {
    const phaseOrder = new Map(curriculum.phases.map((p, i) => [p.id, i]));
    const planned = new Map(curriculum.plan.filter((i) => i.resourceId).map((i) => [i.resourceId!, i]));
    for (const [id, item] of planned) {
      const resource = curriculum.resources.find((r) => r.id === id)!;
      for (const prerequisite of resource.prerequisites) {
        const before = planned.get(prerequisite);
        if (!before) continue;
        const a = phaseOrder.get(before.phaseId)!;
        const b = phaseOrder.get(item.phaseId)!;
        expect(a, prerequisite + ' before ' + id).toBeLessThanOrEqual(b);
        if (a === b && before.block === item.block) expect(before.order).toBeLessThan(item.order);
      }
    }
  });

  it('seeds enough of the reading queue to reach the one-paper-a-week cadence of year 2', () => {
    const weeksInYear2 = 52;
    expect(curriculum.papers.length).toBeGreaterThanOrEqual(weeksInYear2 * 0.75);
    for (const group of ['classics', 'llm', 'systems', 'graphics-sim']) {
      expect(curriculum.papers.filter((p) => p.group === group).length, group).toBeGreaterThanOrEqual(8);
    }
  });

  it('attaches a unit checklist to the courses the day-to-day plan needs one for', () => {
    const withUnits = curriculum.resources.filter((r) => r.units && r.units.length > 0);
    expect(withUnits.length).toBeGreaterThanOrEqual(30);
    for (const resource of withUnits) {
      const ids = resource.units!.map((u) => u.id);
      expect(new Set(ids).size, resource.id).toBe(ids.length);
    }
    // The first thing Today shows on day one is lecture 1 of 18.06.
    const linearAlgebra = curriculum.resources.find((r) => r.id === 'mit-18-06')!;
    expect(linearAlgebra.units![0]!.title).toMatch(/^Lecture 1:/);
  });
});

describe('splitting the seed for the browser', () => {
  const { app, units } = splitSeed(seed!);
  const appSeed = app as { resources: { id: string; unitCount: number; units?: unknown }[] };

  it('moves every checklist out of the main payload and leaves a count behind', () => {
    const total = seed!.resources.reduce((n, r) => n + (r.units?.length ?? 0), 0);
    expect(total).toBeGreaterThan(900);
    expect(Object.values(units).reduce((n, u) => n + u.length, 0)).toBe(total);
    for (const resource of appSeed.resources) {
      expect(resource.units, resource.id).toBeUndefined();
      expect(resource.unitCount, resource.id).toBe(units[resource.id]?.length ?? 0);
    }
  });

  it('makes the main payload meaningfully smaller', () => {
    const size = (v: unknown): number => JSON.stringify(v).length;
    expect(size(app)).toBeLessThan(size(seed) * 0.7);
  });
});
