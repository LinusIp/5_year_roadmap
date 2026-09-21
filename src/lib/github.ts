/**
 * The optional GitHub integration: the user's real contribution calendar, drawn beside the Atlas heatmap.
 *
 * With `db/github.ts`, this is the only code in the app that uses the network, and only towards
 * api.github.com, and only once the user has saved a token in Settings. `fetch` is passed in, so the tests
 * never leave the machine.
 */
import { z } from 'zod';
import type { ContributionDay } from '../db/types.ts';
import { today as todayDate } from './dates.ts';
import { layoutGrid } from './heatmap.ts';
import type { GridSlot, MonthLabel } from './heatmap.ts';
import type { HeatLevel } from './streaks.ts';

export const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
/** Where a fine-grained token is created, per GitHub's documentation. */
export const NEW_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';

/** GitHub's own scale, in order: level 0 to 4. */
const LEVELS = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'] as const;

export const LEVEL_TITLES = [
  'No contributions',
  'The lowest quarter of your active days',
  'The second quarter',
  'The third quarter',
  'The busiest quarter of your active days',
] as const;

export type GithubFailure = 'unauthorized' | 'rate-limited' | 'network' | 'unexpected';
export type GithubResult<T> = { ok: true; value: T } | { ok: false; reason: GithubFailure; message: string };
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

const defaultFetch: FetchLike = (input, init) => fetch(input, init);

const VIEWER_QUERY = 'query { viewer { login } }';

const CALENDAR_QUERY = `query ($from: DateTime!, $to: DateTime!) {
  viewer {
    login
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;

// Network data is checked like any other input. Not strict: GitHub may add fields.
const ViewerResponse = z.object({ data: z.object({ viewer: z.object({ login: z.string().min(1) }) }) });

const CalendarResponse = z.object({
  data: z.object({
    viewer: z.object({
      login: z.string().min(1),
      contributionsCollection: z.object({
        contributionCalendar: z.object({
          weeks: z.array(
            z.object({
              contributionDays: z.array(
                z.object({
                  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
                  contributionCount: z.number().int().min(0),
                  contributionLevel: z.enum(LEVELS),
                }),
              ),
            }),
          ),
        }),
      }),
    }),
  }),
});

async function query<T>(
  token: string,
  body: { query: string; variables?: Record<string, string> },
  schema: z.ZodType<T>,
  fetchImpl: FetchLike,
): Promise<GithubResult<T>> {
  let response: Response;
  try {
    response = await fetchImpl(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: { Authorization: 'bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, reason: 'network', message: 'Could not reach GitHub. Check the connection and try again.' };
  }

  if (response.status === 401) {
    return { ok: false, reason: 'unauthorized', message: 'GitHub did not accept the token. It may have expired or been revoked.' };
  }
  if (response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')) {
    return { ok: false, reason: 'rate-limited', message: "GitHub's rate limit was reached. Try again in an hour." };
  }
  if (!response.ok) return { ok: false, reason: 'unexpected', message: 'GitHub answered with HTTP ' + response.status + '.' };

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { ok: false, reason: 'unexpected', message: "GitHub's answer was not JSON." };
  }
  const errors = (json as { errors?: unknown } | null)?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0] as { type?: unknown; message?: unknown };
    if (first.type === 'RATE_LIMITED') {
      return { ok: false, reason: 'rate-limited', message: "GitHub's rate limit was reached. Try again in an hour." };
    }
    return { ok: false, reason: 'unexpected', message: 'GitHub said: ' + (typeof first.message === 'string' ? first.message : 'an unknown error.') };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { ok: false, reason: 'unexpected', message: "GitHub's answer was not in the expected shape." };
  return { ok: true, value: parsed.data };
}

/** Checks a token by asking whose it is. */
export async function fetchViewer(token: string, fetchImpl: FetchLike = defaultFetch): Promise<GithubResult<{ login: string }>> {
  const result = await query(token, { query: VIEWER_QUERY }, ViewerResponse, fetchImpl);
  return result.ok ? { ok: true, value: { login: result.value.data.viewer.login } } : result;
}

/**
 * The range to ask GitHub for: whole days from `from`, never past today, since the future holds nothing.
 * `null` when the whole range is still ahead, so no request is needed at all. A plan year never spans more
 * than a calendar year, which keeps it inside GitHub's one-year limit.
 */
export function calendarQueryRange(from: string, to: string, asOf: string = todayDate()): { from: string; to: string } | null {
  const end = to < asOf ? to : asOf;
  if (end < from) return null;
  return { from: from + 'T00:00:00Z', to: end + 'T23:59:59Z' };
}

/** The viewer's contributions from `from` to `to`, one entry per day GitHub reports, in date order. */
export async function fetchCalendar(
  token: string,
  from: string,
  to: string,
  options: { asOf?: string; fetchImpl?: FetchLike } = {},
): Promise<GithubResult<{ login: string; days: ContributionDay[] }>> {
  const range = calendarQueryRange(from, to, options.asOf);
  if (!range) return { ok: false, reason: 'unexpected', message: 'This range has not started yet.' };
  const result = await query(token, { query: CALENDAR_QUERY, variables: range }, CalendarResponse, options.fetchImpl ?? defaultFetch);
  if (!result.ok) return result;

  const viewer = result.value.data.viewer;
  const days = viewer.contributionsCollection.contributionCalendar.weeks
    .flatMap((week) => week.contributionDays)
    // GitHub pads its calendar to whole weeks; keep only the days that were asked for.
    .filter((day) => day.date >= from && day.date <= to)
    .map((day): ContributionDay => [day.date, day.contributionCount, LEVELS.indexOf(day.contributionLevel) as HeatLevel])
    .sort((a, b) => a[0].localeCompare(b[0]));
  return { ok: true, value: { login: viewer.login, days } };
}

export interface ContributionCell extends GridSlot {
  count: number;
  level: HeatLevel;
}

export interface ContributionGrid {
  cells: ContributionCell[];
  columns: number;
  months: MonthLabel[];
  total: number;
  activeDays: number;
}

/** The calendar laid out exactly like the Atlas heatmap over the same range, so the columns line up. */
export function buildContributionGrid(from: string, to: string, days: ContributionDay[], weekStartsOn: 0 | 1 = 1): ContributionGrid {
  const byDate = new Map(days.map((day) => [day[0], day]));
  const layout = layoutGrid(from, to, weekStartsOn);
  let total = 0;
  let activeDays = 0;
  const cells = layout.slots.map((slot): ContributionCell => {
    const day = slot.outside ? undefined : byDate.get(slot.date);
    const count = day?.[1] ?? 0;
    if (count > 0) {
      total += count;
      activeDays++;
    }
    return { ...slot, count, level: count > 0 ? (day?.[2] ?? 1) : 0 };
  });
  return { cells, columns: layout.columns, months: layout.months, total, activeDays };
}

/** How the two calendars compare over a range: days with Atlas time, with contributions, and with both. */
export function compareDays(atlasDates: Iterable<string>, days: ContributionDay[], from: string, to: string): { atlas: number; github: number; both: number } {
  const atlas = new Set([...atlasDates].filter((date) => date >= from && date <= to));
  const github = new Set(days.filter((day) => day[1] > 0 && day[0] >= from && day[0] <= to).map((day) => day[0]));
  let both = 0;
  for (const date of atlas) if (github.has(date)) both++;
  return { atlas: atlas.size, github: github.size, both };
}
