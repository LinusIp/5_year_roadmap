import type { Page, Route } from '@playwright/test';
import type { FakeGithub } from '../fake-github.ts';

/**
 * The CORS headers api.github.com sends (checked against the real API on 2026-10-08). The token-expiration
 * header is not in the expose list, so the page cannot read it, here as there.
 */
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-GitHub-Api-Version',
  'Access-Control-Expose-Headers': 'ETag, Link, Location, Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset',
};

/** Five days of a contribution calendar, for the GraphQL stand-in. */
export const CALENDAR_DAYS = [
  { date: '2026-09-20', contributionCount: 2, contributionLevel: 'FIRST_QUARTILE' },
  { date: '2026-09-21', contributionCount: 5, contributionLevel: 'SECOND_QUARTILE' },
  { date: '2026-09-22', contributionCount: 0, contributionLevel: 'NONE' },
  { date: '2026-09-23', contributionCount: 9, contributionLevel: 'FOURTH_QUARTILE' },
  { date: '2026-09-24', contributionCount: 2, contributionLevel: 'FIRST_QUARTILE' },
];

/**
 * Serves tests/fake-github.ts at api.github.com for a page: its REST routes, and a GraphQL endpoint for the
 * calendar. Returns every Authorization header seen.
 */
export async function serveGithub(page: Page, fake: FakeGithub): Promise<string[]> {
  const authorizations: string[] = [];
  await page.route('https://api.github.com/**', async (route: Route) => {
    const request = route.request();
    const auth = request.headers()['authorization'];
    if (auth) authorizations.push(auth);
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    if (request.url() === 'https://api.github.com/graphql') {
      if (auth !== 'bearer ' + fake.token) {
        await route.fulfill({ status: 401, headers: CORS, json: { message: 'Bad credentials' } });
        return;
      }
      const body = request.postDataJSON() as { query: string };
      const viewer = body.query.includes('contributionsCollection')
        ? { login: fake.owner, contributionsCollection: { contributionCalendar: { weeks: [{ contributionDays: CALENDAR_DAYS }] } } }
        : { login: fake.owner };
      await route.fulfill({ headers: CORS, json: { data: { viewer } } });
      return;
    }
    const raw = request.postData();
    const r = await fake.handle(request.method(), request.url(), raw ? JSON.parse(raw) : undefined, request.headers());
    await route.fulfill({ status: r.status, headers: { ...r.headers, ...CORS }, body: r.status === 204 ? '' : JSON.stringify(r.json ?? null) });
  });
  return authorizations;
}
