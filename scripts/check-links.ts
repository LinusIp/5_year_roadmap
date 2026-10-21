/**
 * npm run check:links [-- --titles] [-- --only <substring>] [-- --json]
 *
 * Requests every URL under /data and prints a report. Report only: the exit code is always 0,
 * so a course site having a bad day can never break a build (brief, section 7, rule 4).
 *
 *   default    HEAD request, falling back to GET when a server refuses HEAD
 *   --titles   GET every page and print its <title>, to confirm a link still points at the right thing
 *   --only x   restrict to URLs or ids containing x
 *   --checked YYYY-MM-DD   restrict to the resources and papers whose link was last checked that day (an import's)
 *   --in data/resources/x.yaml   restrict to the resources that file defines (an import's new rows)
 *   --json     also write reports/links.json
 *   --candidates file.json   also check proposed links ({ "resource-id": ["https://…", …] }) for resources that
 *              have none yet, so a link is only ever added after this run fetched it and its title was confirmed
 *
 * A link marked `linkCheck: manual-ok`, or on an address of scripts/lib/link-policy.ts's MANUAL_OK, was opened by hand
 * and is not requested; a failure on one of its SCRIPT_SIDE hosts is listed to check by hand, not as failed. A 429 is
 * tried once more after a few seconds: a burst of requests to one host is rate-limited, not refused.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { linkPolicy } from './lib/link-policy.ts';
import { loadSeedOrThrow, REPO_ROOT } from './lib/load-seed.ts';

interface Target {
  url: string;
  refs: string[];
}

interface Result extends Target {
  status: number | null;
  ok: boolean;
  finalUrl: string;
  title: string;
  error: string;
  method: string;
}

const args = process.argv.slice(2);
const wantTitles = args.includes('--titles');
const wantJson = args.includes('--json');
const onlyIndex = args.indexOf('--only');
const only = onlyIndex >= 0 ? (args[onlyIndex + 1] ?? '') : '';
const checkedIndex = args.indexOf('--checked');
const checkedOn = checkedIndex >= 0 ? (args[checkedIndex + 1] ?? '') : '';
const inIndex = args.indexOf('--in');
const inFile = inIndex >= 0 ? args[inIndex + 1] : undefined;
const candidatesIndex = args.indexOf('--candidates');
const candidatesFile = candidatesIndex >= 0 ? args[candidatesIndex + 1] : undefined;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const TIMEOUT_MS = 25_000;
const CONCURRENCY = 6;

/** The ids a data file defines, for `--in`. */
const inIds = inFile
  ? new Set([...readFileSync(join(REPO_ROOT, inFile), 'utf8').matchAll(/^- id: "?([a-z0-9-]+)"?$/gm)].map((m) => m[1]!))
  : null;

/** The links opened by hand (see the header), counted but not requested. */
let skipped = 0;

function collectTargets(): Target[] {
  const seed = loadSeedOrThrow();
  const byUrl = new Map<string, string[]>();
  const dated = new Set<string>();
  const manual = new Set<string>();
  const add = (url: string | null | undefined, ref: string, lastVerified?: string, linkCheck?: string): void => {
    if (!url) return;
    if (lastVerified && lastVerified === checkedOn) dated.add(url);
    if (linkPolicy(url, linkCheck) === 'skip') manual.add(url);
    const list = byUrl.get(url) ?? [];
    list.push(ref);
    byUrl.set(url, list);
  };
  for (const r of seed.resources) {
    add(r.url, 'resource:' + r.id, r.lastVerified, r.linkCheck);
    for (const u of r.units ?? []) {
      add(u.url, 'resource:' + r.id + '#' + u.id);
      add(u.video, 'resource:' + r.id + '#' + u.id + ' video');
    }
  }
  for (const p of seed.projects) add(p.sourceUrl, 'project:' + p.id);
  for (const p of seed.papers) add(p.url, 'paper:' + p.id, p.lastVerified, p.linkCheck);
  for (const s of seed.paperSources) add(s.url, 'source:' + s.id);
  for (const c of seed.certs) add(c.url, 'cert:' + c.id);
  if (candidatesFile) {
    const candidates = JSON.parse(readFileSync(join(REPO_ROOT, candidatesFile), 'utf8')) as Record<string, string[]>;
    for (const [id, urls] of Object.entries(candidates)) for (const url of urls) add(url, 'candidate:' + id);
  }
  const picked = [...byUrl.entries()]
    .map(([url, refs]) => ({ url, refs }))
    .filter((t) => !only || t.url.includes(only) || t.refs.some((r) => r.includes(only)))
    .filter((t) => !checkedOn || dated.has(t.url))
    .filter((t) => !inIds || t.refs.some((r) => inIds.has(r.replace(/^resource:/, ''))));
  skipped = picked.filter((t) => manual.has(t.url)).length;
  return picked.filter((t) => !manual.has(t.url));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)));
}

function extractTitle(html: string): string {
  const m = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return m ? decodeEntities(m[1]!).replace(/\s+/g, ' ').trim() : '';
}

async function request(url: string, method: 'HEAD' | 'GET'): Promise<{ status: number; finalUrl: string; body: string }> {
  const res = await fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8', 'accept-language': 'en' },
  });
  let body = '';
  if (method === 'GET' && (res.headers.get('content-type') ?? '').includes('html')) {
    // The title is always near the top; 256 KB is plenty and keeps a large page from stalling the run.
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (reader && size < 262_144) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.length;
    }
    await reader?.cancel().catch(() => undefined);
    body = Buffer.concat(chunks).toString('utf8');
  } else {
    await res.body?.cancel().catch(() => undefined);
  }
  return { status: res.status, finalUrl: res.url, body };
}

/** How long to wait before the one retry of a 429: a burst of requests to one host (github.com, with 200 links) is rate-limited for a few seconds. */
const RETRY_AFTER_MS = 4000;

async function check(target: Target): Promise<Result> {
  const base: Result = { ...target, status: null, ok: false, finalUrl: target.url, title: '', error: '', method: 'HEAD' };
  try {
    if (!wantTitles) {
      const head = await request(target.url, 'HEAD');
      if (head.status < 400) return { ...base, status: head.status, ok: true, finalUrl: head.finalUrl };
    }
    let get = await request(target.url, 'GET');
    if (get.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_AFTER_MS));
      get = await request(target.url, 'GET');
    }
    return { ...base, method: 'GET', status: get.status, ok: get.status < 400, finalUrl: get.finalUrl, title: extractTitle(get.body) };
  } catch (err) {
    const cause = err instanceof Error && err.cause instanceof Error ? ' (' + err.cause.message + ')' : '';
    return { ...base, error: (err instanceof Error ? err.message : String(err)) + cause };
  }
}

async function run(): Promise<void> {
  const targets = collectTargets();
  console.log('Checking ' + targets.length + ' distinct URLs' + (wantTitles ? ' (GET, with titles)' : '') + (skipped ? ', leaving ' + skipped + ' opened by hand' : '') + '…\n');
  const results: Result[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < targets.length) {
      const target = targets[next++]!;
      const result = await check(target);
      results.push(result);
      const flag = result.ok ? 'ok  ' : 'FAIL';
      const redirected = result.ok && result.finalUrl !== result.url ? '\n        -> ' + result.finalUrl : '';
      const title = result.title ? '\n        "' + result.title.slice(0, 110) + '"' : '';
      console.log(flag + ' ' + String(result.status ?? 'ERR').padEnd(4) + result.url + '  [' + result.refs.join(', ') + ']' + (result.error ? '\n        ' + result.error : '') + redirected + title);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const failed = results.filter((r) => !r.ok);
  // A 401, 403 or 429 usually means the site turns bots away, not that the page is gone, and some hosts fail any
  // script (link-policy.ts): those are to open by hand.
  const byHand = failed.filter((r) => r.status === 401 || r.status === 403 || r.status === 429 || linkPolicy(r.url) === 'script-side');
  const broken = failed.filter((r) => !byHand.includes(r));
  console.log('\n' + (results.length - failed.length) + ' ok, ' + broken.length + ' failed, ' + byHand.length + ' to check by hand');
  if (broken.length > 0) {
    console.log('\nFailed (open each in a browser before changing anything; nothing here edits the data):');
    for (const r of broken) console.log('  ' + String(r.status ?? 'ERR').padEnd(4) + r.url + '  [' + r.refs.join(', ') + ']' + (r.error ? '  ' + r.error : ''));
  }
  if (byHand.length > 0) {
    console.log('\nCheck by hand (the site turned the checker away, or its host fails scripts):');
    for (const r of byHand) console.log('  ' + String(r.status ?? 'ERR').padEnd(4) + r.url + '  [' + r.refs.join(', ') + ']' + (r.error ? '  ' + r.error : ''));
  }
  if (wantJson) {
    const dir = join(REPO_ROOT, 'reports');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'links.json'), JSON.stringify(results.sort((a, b) => a.url.localeCompare(b.url)), null, 2));
    console.log('\nWrote reports/links.json');
  }
}

await run();
