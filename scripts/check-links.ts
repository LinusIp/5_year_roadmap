/**
 * npm run check:links [-- --titles] [-- --only <substring>] [-- --json]
 *
 * Requests every URL under /data and prints a report. Report only: the exit code is always 0,
 * so a course site having a bad day can never break a build (brief, section 7, rule 4).
 *
 *   default    HEAD request, falling back to GET when a server refuses HEAD
 *   --titles   GET every page and print its <title>, to confirm a link still points at the right thing
 *   --only x   restrict to URLs or ids containing x
 *   --json     also write reports/links.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const TIMEOUT_MS = 25_000;
const CONCURRENCY = 6;

function collectTargets(): Target[] {
  const seed = loadSeedOrThrow();
  const byUrl = new Map<string, string[]>();
  const add = (url: string | null | undefined, ref: string): void => {
    if (!url) return;
    const list = byUrl.get(url) ?? [];
    list.push(ref);
    byUrl.set(url, list);
  };
  for (const r of seed.resources) {
    add(r.url, 'resource:' + r.id);
    for (const u of r.units ?? []) add(u.url, 'resource:' + r.id + '#' + u.id);
  }
  for (const p of seed.projects) add(p.sourceUrl, 'project:' + p.id);
  for (const p of seed.papers) add(p.url, 'paper:' + p.id);
  for (const s of seed.paperSources) add(s.url, 'source:' + s.id);
  for (const c of seed.certs) add(c.url, 'cert:' + c.id);
  return [...byUrl.entries()]
    .map(([url, refs]) => ({ url, refs }))
    .filter((t) => !only || t.url.includes(only) || t.refs.some((r) => r.includes(only)));
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

async function check(target: Target): Promise<Result> {
  const base: Result = { ...target, status: null, ok: false, finalUrl: target.url, title: '', error: '', method: 'HEAD' };
  try {
    if (!wantTitles) {
      const head = await request(target.url, 'HEAD');
      if (head.status < 400) return { ...base, status: head.status, ok: true, finalUrl: head.finalUrl };
    }
    const get = await request(target.url, 'GET');
    return { ...base, method: 'GET', status: get.status, ok: get.status < 400, finalUrl: get.finalUrl, title: extractTitle(get.body) };
  } catch (err) {
    const cause = err instanceof Error && err.cause instanceof Error ? ' (' + err.cause.message + ')' : '';
    return { ...base, error: (err instanceof Error ? err.message : String(err)) + cause };
  }
}

async function run(): Promise<void> {
  const targets = collectTargets();
  console.log('Checking ' + targets.length + ' distinct URLs' + (wantTitles ? ' (GET, with titles)' : '') + '…\n');
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
  console.log('\n' + (results.length - failed.length) + ' ok, ' + failed.length + ' failed');
  if (failed.length > 0) {
    console.log('\nFailed (a 403 or 429 often means "no bots", not "gone": open those in a browser before changing anything):');
    for (const r of failed) console.log('  ' + String(r.status ?? 'ERR').padEnd(4) + r.url + '  [' + r.refs.join(', ') + ']');
  }
  if (wantJson) {
    const dir = join(REPO_ROOT, 'reports');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'links.json'), JSON.stringify(results.sort((a, b) => a.url.localeCompare(b.url)), null, 2));
    console.log('\nWrote reports/links.json');
  }
}

await run();
