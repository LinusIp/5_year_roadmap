import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collectBackup, serialiseBackup, createBackup } from '../../src/db/backup.ts';
import { AtlasDB } from '../../src/db/db.ts';
import { CALENDAR_MAX_AGE_MS, calendarKey, checkGithub, connectGithub, disconnectGithub, refreshCalendar } from '../../src/db/github.ts';
import { readSettings } from '../../src/db/settings.ts';
import {
  GITHUB_GRAPHQL_URL,
  buildContributionGrid,
  calendarQueryRange,
  compareDays,
  fetchCalendar,
  fetchViewer,
} from '../../src/lib/github.ts';
import type { FetchLike } from '../../src/lib/github.ts';
import { buildGrid } from '../../src/lib/heatmap.ts';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';

const core = loadSeedOrThrow().settings;
const TOKEN = 'github_pat_test_1234';

interface Call {
  url: string;
  init: RequestInit;
  body: { query: string; variables?: Record<string, string> };
}

/** A stand-in for api.github.com that records every request and answers from `respond`. */
function fakeGithub(respond: (call: Call) => Response | Promise<Response>): { fetch: FetchLike; calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    fetch: async (url, init) => {
      const call = { url, init, body: JSON.parse(String(init.body)) as Call['body'] };
      calls.push(call);
      return respond(call);
    },
  };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

/** A calendar the way GitHub sends it: whole weeks, Sunday first, padded beyond the range asked for. */
function calendarBody(days: [string, number, string][]): unknown {
  const weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push({ contributionDays: days.slice(i, i + 7).map(([date, contributionCount, contributionLevel]) => ({ date, contributionCount, contributionLevel })) });
  }
  return { data: { viewer: { login: 'octo-learner', contributionsCollection: { contributionCalendar: { weeks } } } } };
}

const SEPTEMBER: [string, number, string][] = [
  ['2026-09-20', 9, 'FOURTH_QUARTILE'], // before the range: dropped
  ['2026-09-21', 3, 'SECOND_QUARTILE'],
  ['2026-09-22', 0, 'NONE'],
  ['2026-09-23', 1, 'FIRST_QUARTILE'],
  ['2026-09-24', 12, 'FOURTH_QUARTILE'],
];

describe('the GitHub client', () => {
  it('asks api.github.com with a bearer token, and nothing else', async () => {
    const github = fakeGithub(() => json({ data: { viewer: { login: 'octo-learner' } } }));
    expect(await fetchViewer(TOKEN, github.fetch)).toEqual({ ok: true, value: { login: 'octo-learner' } });
    expect(github.calls).toHaveLength(1);
    expect(github.calls[0]!.url).toBe(GITHUB_GRAPHQL_URL);
    expect(github.calls[0]!.url).toBe('https://api.github.com/graphql');
    expect(github.calls[0]!.init.method).toBe('POST');
    expect((github.calls[0]!.init.headers as Record<string, string>).Authorization).toBe('bearer ' + TOKEN);
    expect(github.calls[0]!.url).not.toContain(TOKEN);
    expect(github.calls[0]!.body.query).toContain('viewer');
  });

  it('asks for whole days up to today only, and keeps only the days in range', async () => {
    const github = fakeGithub(() => json(calendarBody(SEPTEMBER)));
    const result = await fetchCalendar(TOKEN, '2026-09-21', '2026-12-31', { asOf: '2026-09-24', fetchImpl: github.fetch });
    expect(github.calls[0]!.body.variables).toEqual({ from: '2026-09-21T00:00:00Z', to: '2026-09-24T23:59:59Z' });
    expect(result).toEqual({
      ok: true,
      value: {
        login: 'octo-learner',
        days: [
          ['2026-09-21', 3, 2],
          ['2026-09-22', 0, 0],
          ['2026-09-23', 1, 1],
          ['2026-09-24', 12, 4],
        ],
      },
    });
  });

  it('does not ask about a range that has not started', () => {
    expect(calendarQueryRange('2027-01-01', '2027-12-31', '2026-09-21')).toBeNull();
    expect(calendarQueryRange('2026-01-01', '2026-12-31', '2026-09-21')).toEqual({ from: '2026-01-01T00:00:00Z', to: '2026-09-21T23:59:59Z' });
    expect(calendarQueryRange('2025-01-01', '2025-12-31', '2026-09-21')).toEqual({ from: '2025-01-01T00:00:00Z', to: '2025-12-31T23:59:59Z' });
  });

  it('says plainly what went wrong', async () => {
    const answer = async (response: Response | Error) =>
      fetchViewer(TOKEN, async () => {
        if (response instanceof Error) throw response;
        return response;
      });
    expect(await answer(json({ message: 'Bad credentials' }, 401))).toMatchObject({ ok: false, reason: 'unauthorized' });
    expect(await answer(json({}, 403, { 'x-ratelimit-remaining': '0' }))).toMatchObject({ ok: false, reason: 'rate-limited' });
    expect(await answer(json({ errors: [{ type: 'RATE_LIMITED', message: 'API rate limit exceeded' }] }))).toMatchObject({ ok: false, reason: 'rate-limited' });
    expect(await answer(json({ errors: [{ message: 'Something odd' }] }))).toEqual({ ok: false, reason: 'unexpected', message: 'GitHub said: Something odd' });
    expect(await answer(json({ data: { viewer: {} } }))).toMatchObject({ ok: false, reason: 'unexpected' });
    expect(await answer(json({}, 502))).toEqual({ ok: false, reason: 'unexpected', message: 'GitHub answered with HTTP 502.' });
    expect(await answer(new TypeError('Failed to fetch'))).toMatchObject({ ok: false, reason: 'network' });
  });

  it('lays the calendar out exactly like the Atlas heatmap over the same range', () => {
    for (const weekStartsOn of [0, 1] as const) {
      const atlas = buildGrid({ from: '2026-09-21', to: '2026-12-31', logs: [], thresholds: [1, 120, 300, 420], weekStartsOn });
      const github = buildContributionGrid('2026-09-21', '2026-12-31', [], weekStartsOn);
      expect(github.columns).toBe(atlas.columns);
      expect(github.months).toEqual(atlas.months);
      expect(github.cells.map((c) => [c.date, c.column, c.row, c.outside])).toEqual(atlas.cells.map((c) => [c.date, c.column, c.row, c.outside]));
    }
  });

  it('counts contributions and the days both calendars were active', () => {
    const days: [string, number, 0 | 1 | 2 | 3 | 4][] = [
      ['2026-09-21', 3, 2],
      ['2026-09-22', 0, 0],
      ['2026-09-23', 1, 1],
    ];
    const grid = buildContributionGrid('2026-09-21', '2026-09-30', days);
    expect(grid.total).toBe(4);
    expect(grid.activeDays).toBe(2);
    expect(grid.cells.find((c) => c.date === '2026-09-21')).toMatchObject({ count: 3, level: 2 });
    expect(compareDays(['2026-09-21', '2026-09-22', '2026-10-01'], days, '2026-09-21', '2026-09-30')).toEqual({ atlas: 2, github: 2, both: 1 });
  });
});

describe('the GitHub connection', () => {
  let database: AtlasDB;
  let counter = 0;
  beforeEach(() => {
    database = new AtlasDB('atlas-github-test-' + counter++);
  });
  afterEach(async () => {
    database.close();
    await database.delete();
  });

  const viewer = () => fakeGithub(() => json({ data: { viewer: { login: 'octo-learner' } } }));

  it('stores a token only once GitHub accepts it, and turns the calendar on', async () => {
    const refused = await connectGithub(core, 'github_pat_wrong', { fetchImpl: async () => json({ message: 'Bad credentials' }, 401), database });
    expect(refused).toMatchObject({ ok: false, reason: 'unauthorized' });
    expect(await database.secrets.count()).toBe(0);

    const accepted = await connectGithub(core, '  ' + TOKEN + '\n', { fetchImpl: viewer().fetch, database });
    expect(accepted).toEqual({ ok: true, value: { login: 'octo-learner' } });
    expect(await database.secrets.get('github')).toEqual({ id: 'github', token: TOKEN });
    expect((await readSettings(core, database)).github).toEqual({ username: 'octo-learner', showCalendar: true });
  });

  it('refuses something that cannot be a token without asking GitHub', async () => {
    const github = viewer();
    expect(await connectGithub(core, 'two words', { fetchImpl: github.fetch, database })).toMatchObject({ ok: false });
    expect(await connectGithub(core, '   ', { fetchImpl: github.fetch, database })).toMatchObject({ ok: false });
    expect(github.calls).toHaveLength(0);
  });

  it('caches a calendar for an hour, refetches after that or on request, and shares concurrent requests', async () => {
    await connectGithub(core, TOKEN, { fetchImpl: viewer().fetch, database });
    const github = fakeGithub(() => json(calendarBody(SEPTEMBER)));
    const options = { asOf: '2026-09-24', fetchImpl: github.fetch, database };
    const t0 = Date.parse('2026-09-24T10:00:00+05:00');

    const [a, b] = await Promise.all([refreshCalendar('2026-09-21', '2026-12-31', { ...options, now: t0 }), refreshCalendar('2026-09-21', '2026-12-31', { ...options, now: t0 })]);
    expect([a, b]).toEqual([{ status: 'fetched' }, { status: 'fetched' }]);
    expect(github.calls).toHaveLength(1);
    const cached = (await database.secrets.get('github'))!.calendars![calendarKey('2026-09-21', '2026-12-31')]!;
    expect(cached.fetchedAt).toBe(t0);
    expect(cached.days).toHaveLength(4);

    expect(await refreshCalendar('2026-09-21', '2026-12-31', { ...options, now: t0 + CALENDAR_MAX_AGE_MS - 1 })).toEqual({ status: 'fresh' });
    expect(github.calls).toHaveLength(1);
    expect(await refreshCalendar('2026-09-21', '2026-12-31', { ...options, now: t0 + 1, force: true })).toEqual({ status: 'fetched' });
    expect(await refreshCalendar('2026-09-21', '2026-12-31', { ...options, now: t0 + CALENDAR_MAX_AGE_MS + 5 })).toEqual({ status: 'fetched' });
    expect(github.calls).toHaveLength(3);

    expect(await refreshCalendar('2027-01-01', '2027-12-31', options)).toEqual({ status: 'not-started' });
    expect(github.calls).toHaveLength(3);
  });

  it('keeps the old copy when GitHub cannot be reached', async () => {
    await connectGithub(core, TOKEN, { fetchImpl: viewer().fetch, database });
    await refreshCalendar('2026-09-21', '2026-12-31', { asOf: '2026-09-24', now: 1, fetchImpl: fakeGithub(() => json(calendarBody(SEPTEMBER))).fetch, database });
    const offline: FetchLike = async () => {
      throw new TypeError('Failed to fetch');
    };
    const outcome = await refreshCalendar('2026-09-21', '2026-12-31', { asOf: '2026-09-24', force: true, fetchImpl: offline, database });
    expect(outcome).toMatchObject({ status: 'failed', reason: 'network' });
    expect((await database.secrets.get('github'))!.calendars![calendarKey('2026-09-21', '2026-12-31')]!.days).toHaveLength(4);
  });

  it('does nothing without a token', async () => {
    const github = viewer();
    expect(await refreshCalendar('2026-09-21', '2026-12-31', { fetchImpl: github.fetch, database })).toEqual({ status: 'no-token' });
    expect(await checkGithub(core, { fetchImpl: github.fetch, database })).toMatchObject({ ok: false });
    expect(github.calls).toHaveLength(0);
  });

  it('forgets the token and its calendars on disconnect, even with a request still out', async () => {
    await connectGithub(core, TOKEN, { fetchImpl: viewer().fetch, database });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const slow = fakeGithub(async () => {
      await gate;
      return json(calendarBody(SEPTEMBER));
    });
    const pending = refreshCalendar('2026-09-21', '2026-12-31', { asOf: '2026-09-24', fetchImpl: slow.fetch, database });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await disconnectGithub(core, database);
    release();
    await pending;
    expect(await database.secrets.get('github')).toBeUndefined();
    expect((await readSettings(core, database)).github).toEqual({ username: '', showCalendar: false });
  });

  it('never puts the token or the cached calendars in a backup', async () => {
    await connectGithub(core, TOKEN, { fetchImpl: viewer().fetch, database });
    await refreshCalendar('2026-09-21', '2026-12-31', { asOf: '2026-09-24', fetchImpl: fakeGithub(() => json(calendarBody(SEPTEMBER))).fetch, database });
    const text = serialiseBackup(await createBackup(new Date('2026-09-24T12:00:00Z'), database));
    expect(text).not.toContain(TOKEN);
    expect(text).not.toContain('calendars');
    expect(Object.keys(await collectBackup(database))).not.toContain('secrets');
    // The login and the on/off switch are ordinary settings, and travel with the backup.
    expect(text).toContain('"username": "octo-learner"');
  });
});
