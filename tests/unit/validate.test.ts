import { describe, expect, it } from 'vitest';
import { validateSeed } from '../../src/seed/validate.ts';
import { minimalSeed, project, resource } from './fixtures.ts';

const structural = { requireComplete: false };

function errorsOf(mutate: (raw: ReturnType<typeof minimalSeed>) => void): string {
  const raw = minimalSeed();
  mutate(raw);
  return validateSeed(raw, structural).errors.join('\n');
}

function list(file: { data: unknown } | undefined): Record<string, unknown>[] {
  return file!.data as Record<string, unknown>[];
}

describe('validateSeed', () => {
  it('accepts the minimal fixture and derives plan ids, order and project stage', () => {
    const { seed, errors } = validateSeed(minimalSeed(), structural);
    expect(errors).toEqual([]);
    expect(seed!.plan.map((p) => [p.id, p.block, p.order])).toEqual([
      ['plan.proj1', 'D', 10],
      ['plan.r1', 'E', 10],
      ['plan.r2', 'E', 20],
    ]);
    expect(seed!.projects[0]!.stage).toBe(1);
  });

  it('rejects duplicate ids inside a collection', () => {
    expect(errorsOf((raw) => list(raw.resources[0]).push(resource('r1')))).toMatch(/duplicate resource id "r1"/);
  });

  it('rejects an id shared by a resource and a project, because log entries reference ids without a kind', () => {
    expect(errorsOf((raw) => list(raw.projects[0]).push(project('r1')))).toMatch(/"r1" is used by both a resource and a project/);
  });

  it('rejects an invented link: a url must be verified, or null with a searchHint', () => {
    const unverified = errorsOf((raw) => list(raw.resources[0]).push(resource('r3', { urlVerified: false })));
    expect(unverified).toMatch(/an unverified url may not be stored/);

    const noHint = errorsOf((raw) => list(raw.resources[0]).push(resource('r4', { url: null, urlVerified: false, lastVerified: undefined })));
    expect(noHint).toMatch(/searchHint: is required when url is null/);

    const ok = errorsOf((raw) =>
      list(raw.resources[0]).push(resource('r5', { url: null, urlVerified: false, lastVerified: undefined, searchHint: 'r5 official course page' })),
    );
    expect(ok).toBe('');
  });

  it('rejects unknown keys, so a typo in the YAML cannot pass silently', () => {
    expect(errorsOf((raw) => list(raw.resources[0]).push(resource('r6', { esthours: 3 })))).toMatch(/Unrecognized key/);
  });

  it('rejects a roadmap item whose subject has no credential-map row', () => {
    const missing = errorsOf((raw) => {
      list(raw.resources[0])[0]!.subject = undefined;
    });
    expect(missing).toMatch(/"r1" is on the roadmap but has no `subject`/);

    const dangling = errorsOf((raw) => {
      list(raw.resources[0])[0]!.subject = 'nope';
    });
    expect(dangling).toMatch(/subject "nope" has no row/);
  });

  it('rejects a subject without a portfolio milestone, and one with neither certs nor a reason', () => {
    const errors = errorsOf((raw) => {
      raw.subjects[0]!.data = [{ id: 'maths', title: 'Maths', tracks: ['math'] }];
    });
    expect(errors).toMatch(/every subject needs a portfolio milestone/);
    expect(errors).toMatch(/needs either `certs` or a `certNote`/);
  });

  it('rejects dangling prerequisites and prerequisite cycles', () => {
    expect(errorsOf((raw) => list(raw.resources[0]).push(resource('r7', { prerequisites: ['ghost'] })))).toMatch(
      /prerequisite "ghost" is not a resource/,
    );
    const cyclic = errorsOf((raw) => {
      raw.resources[0]!.data = [resource('r1', { prerequisites: ['r2'] }), resource('r2', { prerequisites: ['r1'] })];
    });
    expect(cyclic).toMatch(/prerequisite cycle/);
  });

  it('rejects a plan that schedules an item before its prerequisite', () => {
    const errors = errorsOf((raw) => {
      raw.plan[0]!.data = [{ phase: 'p1', lanes: { E: [{ resource: 'r2' }, { resource: 'r1' }], D: [{ project: 'proj1' }] } }];
    });
    expect(errors).toMatch(/"r2" \(p1\) is scheduled before its prerequisite "r1"/);
  });

  it('rejects planning the same thing twice, unknown refs, and weekly cards on the plan', () => {
    const twice = errorsOf((raw) => {
      raw.plan[0]!.data = [{ phase: 'p1', lanes: { E: [{ resource: 'r1' }, { resource: 'r2' }], C: [{ resource: 'r1' }], D: [{ project: 'proj1' }] } }];
    });
    expect(twice).toMatch(/"r1" is planned twice/);

    const unknown = errorsOf((raw) => {
      raw.plan[0]!.data = [{ phase: 'p1', lanes: { E: [{ resource: 'missing' }] } }];
    });
    expect(unknown).toMatch(/"missing" is not a resource/);

    const weekly = errorsOf((raw) => {
      list(raw.projects[0]).push(project('w1', { cadence: 'weekly', estHours: 3 }));
      raw.plan[0]!.data = [{ phase: 'p1', lanes: { D: [{ project: 'proj1' }, { project: 'w1' }] } }];
    });
    expect(weekly).toMatch(/weekly mini-build; those are drawn from the pool/);
  });

  it('rejects overlapping phases and a stage that contradicts the year', () => {
    const overlapping = errorsOf((raw) => {
      list(raw.phases[0])[1]!.start = '2027-08-01';
    });
    expect(overlapping).toMatch(/starts on or before the end of "p1"/);

    const wrongStage = errorsOf((raw) => {
      list(raw.phases[0])[1]!.stage = 2;
    });
    expect(wrongStage).toMatch(/years 1-3 are stage 1/);
  });

  it('refuses the discontinued TensorFlow Developer Certificate', () => {
    const errors = errorsOf((raw) => {
      raw.certs[0]!.data = [
        {
          id: 'tf-dev', title: 'TensorFlow Developer Certificate', vendor: 'Google', subject: 'maths',
          url: 'https://example.org/tf', urlVerified: true, lastVerified: '2026-09-20', cost: null,
          targetYear: 1, targetQuarter: '2027-Q1', mode: 'optional',
        },
      ];
      list(raw.subjects[0])[0]!.certs = ['tf-dev'];
    });
    expect(errors).toMatch(/TensorFlow Developer Certificate is discontinued/);
  });

  it('enforces the content quotas of the brief when asked to', () => {
    const text = validateSeed(minimalSeed(), { requireComplete: true }).errors.join('\n');
    expect(text).toMatch(/the weekly pool has 0 cards; the brief requires at least 100/);
    expect(text).toMatch(/the weekly pool has 0 stage 2 cards; the brief requires at least 30/);
    expect(text).toMatch(/year 1 has no capstone/);
    expect(text).toMatch(/no phase covers year 3/);
    expect(text).toMatch(/track "ai" is missing/);
  });

  it('reports every problem at once instead of stopping at the first', () => {
    const raw = minimalSeed();
    list(raw.resources[0]).push(resource('r1'), resource('Bad Id'), resource('r8', { estHours: -1 }));
    expect(validateSeed(raw, structural).errors.length).toBeGreaterThanOrEqual(3);
  });
});
