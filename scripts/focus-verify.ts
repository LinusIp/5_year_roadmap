/**
 * node scripts/focus-verify.ts [--json]
 *
 * Asks YouTube's oEmbed endpoint about every starter session (ATLAS-FOCUS-MUSIC): a 200 with an iframe in its
 * `html` means the video exists and allows embedding; 401 means embedding is off, 404 that it is gone. Prints a
 * table and exits 1 when any entry fails, so CI (every pull request, and the weekly focus-check workflow, which
 * opens an issue) catches a dead or non-embeddable entry. Never run from the app: the app asks oEmbed only for a
 * link the user pastes.
 */
import { loadFocusSessions } from './lib/load-focus.ts';
import { oembedUrl, readOembed } from '../src/lib/focus.ts';

const json = process.argv.includes('--json');
const { sessions, errors } = loadFocusSessions();
if (!sessions) {
  for (const e of errors) console.error(e);
  process.exit(1);
}
const rows: { id: string; url: string; status: number | string; ok: boolean; title?: string; channel?: string; reason?: string }[] = [];
for (const s of sessions) {
  try {
    const response = await fetch(oembedUrl(s.url), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    const read = response.ok ? readOembed(body) : null;
    // A 200 that does not read: say what came back, so the row can be judged from the log.
    const shape = body && typeof body === 'object' ? 'keys ' + Object.keys(body as object).join(',') + (typeof (body as { html?: unknown }).html === 'string' ? '; html ' + (body as { html: string }).html.slice(0, 80).replace(/\|/g, '/') : '; no html') : 'not JSON: ' + text.slice(0, 80).replace(/\|/g, '/');
    rows.push({ id: s.id, url: s.url, status: response.status, ok: Boolean(read), title: read?.title, channel: read?.channel, reason: read ? undefined : response.status === 401 ? 'embedding not allowed' : response.status === 404 ? 'not found' : response.ok ? 'oEmbed answered 200 but ' + shape : 'oEmbed answered ' + response.status });
  } catch (err) {
    rows.push({ id: s.id, url: s.url, status: 'error', ok: false, reason: err instanceof Error ? err.message : String(err) });
  }
}
if (json) console.log(JSON.stringify(rows, null, 1));
else {
  console.log('| id | oEmbed | title | channel |');
  console.log('|---|---|---|---|');
  for (const r of rows) console.log('| ' + r.id + ' | ' + (r.ok ? 'ok' : 'FAILED (' + r.reason + ')') + ' | ' + (r.title ?? '') + ' | ' + (r.channel ?? '') + ' |');
}
const failed = rows.filter((r) => !r.ok);
console.error(rows.length - failed.length + ' of ' + rows.length + ' sessions embed' + (failed.length ? '; failed: ' + failed.map((r) => r.id).join(', ') : ''));
process.exit(failed.length > 0 ? 1 : 0);
