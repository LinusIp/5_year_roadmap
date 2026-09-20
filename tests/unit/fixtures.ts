import type { RawSeed } from '../../src/seed/validate.ts';

const link = { url: 'https://example.org/x', urlVerified: true, lastVerified: '2026-09-20' };

export function resource(id: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id, title: 'Resource ' + id, provider: 'Test', type: 'course', ...link, tracks: ['math'],
    level: 'intro', cost: 'free', estHours: 10, subject: 'maths', ...extra,
  };
}

export function project(id: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id, title: 'Project ' + id, cadence: 'monthly', tracks: ['swe'], brief: 'Build it.',
    acceptance: ['It works'], estHours: 20, phaseId: 'p1', subject: 'maths', ...extra,
  };
}

const focus = { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' };

/** The smallest curriculum that passes structural validation (quotas off). */
export function minimalSeed(): RawSeed {
  const days = [0, 1, 2, 3, 4, 5, 6];
  return {
    tracks: [{ file: 'data/tracks.yaml', data: [{ id: 'math', name: 'Maths', family: 'Math', slot: 5, summary: 's' }, { id: 'swe', name: 'SWE', family: 'Software', slot: 2, summary: 's' }] }],
    settings: [{
      file: 'data/settings.yaml',
      data: {
        blocks: ['A', 'B', 'C', 'D', 'E'].map((id) => ({ id, name: 'Block ' + id, minutes: id === 'B' || id === 'E' ? 60 : 120, days, summary: 's' })),
        review: { day: 0, block: 'D', title: 'Weekly review' },
        weekStartsOn: 1,
        heatmapThresholds: [1, 120, 300, 420],
        streak: { minMinutes: 60, freezesPerMonth: 2, autoFreeze: true },
        backupReminderDays: 30,
        paperCadence: { fromYear: 2, perWeek: 1 },
        forecast: { paceWindowDays: 28 },
      },
    }],
    phases: [{
      file: 'data/phases.yaml',
      data: [
        { id: 'p1', year: 1, stage: 1, title: 'One', start: '2026-09-21', end: '2027-08-31', goal: 'g', focus },
        { id: 'p2', year: 2, stage: 1, title: 'Two', start: '2027-09-01', end: '2028-08-31', goal: 'g', focus },
      ],
    }],
    resources: [{ file: 'data/resources/a.yaml', data: [resource('r1'), resource('r2', { prerequisites: ['r1'] })] }],
    plan: [{ file: 'data/plan.yaml', data: [{ phase: 'p1', lanes: { E: [{ resource: 'r1' }, { resource: 'r2' }], D: [{ project: 'proj1' }] } }] }],
    projects: [{ file: 'data/projects/a.yaml', data: [project('proj1')] }],
    papers: [{ file: 'data/papers.yaml', data: [] }],
    paperSources: [{ file: 'data/paper-sources.yaml', data: [] }],
    certs: [{ file: 'data/certs.yaml', data: [] }],
    subjects: [{ file: 'data/subjects.yaml', data: [{ id: 'maths', title: 'Maths', tracks: ['math'], certNote: 'none exist', milestones: [{ id: 'ms-notebook', title: 'Problem-set notebook', projects: ['proj1'] }] }] }],
  };
}
