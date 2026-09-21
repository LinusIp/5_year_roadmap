import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';
import { credentialRows, describeQuarter, expiryWarnings, milestoneView } from '../../src/lib/credentials.ts';
import { cadenceStatus, nextPaper, sentenceCount } from '../../src/lib/papers.ts';
import { hasRepo, repoLinkProblem, statusBlocker } from '../../src/lib/projects.ts';
import type { AppSeed } from '../../src/seed/schema.ts';
import type { CertState, PaperState, UserItemState } from '../../src/db/types.ts';

const seed = splitSeed(loadSeedOrThrow()).app as AppSeed;

describe('a project is only done with a repository', () => {
  it('blocks "done" on a project without a repo link, and allows it with one', () => {
    expect(statusBlocker('project', 'done', undefined)).toMatch(/repository link/);
    expect(statusBlocker('project', 'done', { refId: 'm01', status: 'active', unitsDone: [], repoUrl: '' })).toMatch(/repository link/);
    expect(statusBlocker('project', 'done', { refId: 'm01', status: 'active', unitsDone: [], repoUrl: 'https://github.com/me/m01' })).toBeNull();
  });

  it('never blocks a resource, or any status other than done', () => {
    expect(statusBlocker('resource', 'done', undefined)).toBeNull();
    for (const status of ['todo', 'active', 'dropped'] as const) expect(statusBlocker('project', status, undefined)).toBeNull();
  });

  it('only accepts a real web address as a repository', () => {
    expect(hasRepo({ refId: 'x', status: 'todo', unitsDone: [], repoUrl: 'github.com/me/x' })).toBe(false);
    expect(hasRepo({ refId: 'x', status: 'todo', unitsDone: [], repoUrl: 'https://github.com/me/x' })).toBe(true);
    expect(repoLinkProblem('github.com/me/x')).toMatch(/https/);
    expect(repoLinkProblem('')).toBeNull();
  });
});

describe('the credential map', () => {
  const rows = credentialRows(seed, new Map(), new Map(), new Map());

  it('has a row for every subject, each with a certificate, a reason there is none, or a milestone', () => {
    expect(rows).toHaveLength(seed.subjects.length);
    for (const row of rows) {
      const hasCredential = row.certs.length > 0 || Boolean(row.subject.certNote);
      expect(hasCredential, row.subject.id).toBe(true);
      if (row.subject.kind === 'subject') expect(row.milestones.length, row.subject.id).toBeGreaterThan(0);
    }
  });

  it('starts an "investigate" certificate as investigating, and the rest as planned', () => {
    const fe = rows.flatMap((r) => r.certs).find((c) => c.id === 'cert-fe-exam')!;
    expect(fe.status).toBe('investigating');
    const pcep = rows.flatMap((r) => r.certs).find((c) => c.id === 'cert-pcep')!;
    expect(pcep.status).toBe('planned');
  });

  it('counts how many roadmap items feed each subject', () => {
    const math = rows.find((r) => r.subject.id === 'math-physics')!;
    expect(math.plannedItems).toBeGreaterThan(10);
  });

  it('works a milestone out from its projects until the user sets it', () => {
    const subject = seed.subjects.find((s) => s.id === 'c-cpp')!;
    const milestone = subject.milestones.find((m) => m.id === 'ms-shell-in-c')!;
    const none = milestoneView(milestone, undefined, seed, new Map());
    expect(none).toMatchObject({ status: 'todo', derived: true });

    const shipped = new Map<string, UserItemState>([['m07', { refId: 'm07', status: 'done', unitsDone: [], repoUrl: 'https://github.com/me/shell' }]]);
    expect(milestoneView(milestone, undefined, seed, shipped)).toMatchObject({ status: 'done', derived: true });

    // A status the user set wins over the derived one.
    expect(milestoneView(milestone, { refId: 'ms-shell-in-c', status: 'active' }, seed, shipped)).toMatchObject({ status: 'active', derived: false });
  });

  it('warns about a credential that is about to expire, from its validity or its date', () => {
    const saa = seed.certs.find((c) => c.id === 'cert-aws-saa')!;
    expect(saa.validityYears).toBe(3);
    const earned = new Map<string, CertState>([['cert-aws-saa', { refId: 'cert-aws-saa', status: 'earned', earnedAt: '2029-03-01' }]]);
    // Earned 2029-03-01 and valid three years: it lapses around 2032-03-01, so it warns in the last 90 days.
    expect(expiryWarnings(seed.certs, earned, '2032-01-15')).toHaveLength(1);
    expect(expiryWarnings(seed.certs, earned, '2031-01-01')).toHaveLength(0);

    const dated = new Map<string, CertState>([['cert-pcep', { refId: 'cert-pcep', status: 'earned', expiresAt: '2027-02-01' }]]);
    const warning = expiryWarnings(seed.certs, dated, '2027-01-15')[0]!;
    expect(warning.daysLeft).toBe(17);
  });

  it('reads a quarter as months', () => {
    expect(describeQuarter('2027-Q3')).toBe('Jul to Sep 2027');
    expect(describeQuarter('2026-Q4')).toBe('Oct to Dec 2026');
  });
});

describe('the reading cadence', () => {
  const settings = seed.settings.paperCadence;

  it('does not start before year 2', () => {
    const status = cadenceStatus(seed.phases, settings, new Map(), '2026-09-21', 1);
    expect(status.active).toBe(false);
    expect(status.startsOn).toBe('2027-09-01');
  });

  it('expects one paper a week once it has started, and counts what was read', () => {
    const read = new Map<string, PaperState>([
      ['paper-attention', { refId: 'paper-attention', status: 'read', readAt: '2027-09-02' }],
      ['paper-resnet', { refId: 'paper-resnet', status: 'implemented', readAt: '2027-09-10' }],
    ]);
    const status = cadenceStatus(seed.phases, settings, read, '2027-09-29', 1);
    expect(status.active).toBe(true);
    expect(status.read).toBe(2);
    expect(status.expected).toBe(status.weeks);
    expect(status.behindBy).toBe(status.weeks - 2);
  });

  it('knows whether this week has had its paper', () => {
    const read = new Map<string, PaperState>([['paper-raft', { refId: 'paper-raft', status: 'read', readAt: '2027-09-29' }]]);
    expect(cadenceStatus(seed.phases, settings, read, '2027-09-30', 1).readThisWeek).toBe(true);
    expect(cadenceStatus(seed.phases, settings, read, '2027-10-07', 1).readThisWeek).toBe(false);
  });

  it('suggests the paper being read, else the first in the queue', () => {
    expect(nextPaper(seed.papers, new Map())!.id).toBe(seed.papers[0]!.id);
    const reading = new Map<string, PaperState>([['paper-gan', { refId: 'paper-gan', status: 'reading' }]]);
    expect(nextPaper(seed.papers, reading)!.id).toBe('paper-gan');
  });

  it('counts the sentences of a summary', () => {
    expect(sentenceCount('One. Two! Three?')).toBe(3);
    expect(sentenceCount('One sentence without a stop')).toBe(1);
    expect(sentenceCount('')).toBe(0);
  });
});
