/**
 * node scripts/fetch-units.ts [resource-id ...]
 *
 * Builds data/units/<resource-id>.yaml (the lecture / chapter / lab checklist of a resource) from
 * the resource's own official syllabus page, so that no unit title or unit link is typed from memory.
 * Only titles and links are read; no course content is copied.
 *
 * This is a maintenance tool, not part of the build: the generated YAML is committed and can be
 * edited by hand afterwards. Re-running it overwrites the files it knows about, so keep `id`s stable
 * if you edit them (user progress is stored against unit ids).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { DATA_DIR } from './lib/load-seed.ts';
import { UNIT_SOURCES } from './lib/unit-sources.ts';
import type { UnitSource } from './lib/unit-sources.ts';

export interface FetchedUnit {
  id: string;
  title: string;
  url?: string;
  section?: string;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*' }, signal: AbortSignal.timeout(40_000) });
  if (!res.ok) throw new Error(res.status + ' for ' + url);
  return res.text();
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#0*39;|&#x27;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)));
}

function clean(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function slugify(s: string, max = 60): string {
  const slug = s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.slice(0, max).replace(/-+$/g, '') || 'unit';
}

/** Short, stable ids: "lecture-12" when the source numbers its items, otherwise a slug of the title. */
export function assignIds(units: Omit<FetchedUnit, 'id'>[]): FetchedUnit[] {
  const numbered = /^(lecture|lec|session|ses|recitation|rec|unit|week|lesson|part|chapter|lab|day|module|video|problem set|exam|quiz|project|assignment|homework|checkpoint|step|course)\s*#?(\d+[a-z]?)\b/i;
  const used = new Set<string>();
  return units.map((u) => {
    const m = numbered.exec(u.title);
    let id = m ? slugify(m[1]! + '-' + m[2]!) : slugify(u.title, 48);
    if (used.has(id)) id = slugify((u.section ? u.section + '-' : '') + u.title, 70);
    let n = 2;
    const base = id;
    while (used.has(id)) id = base + '-' + n++;
    used.add(id);
    return { id, ...u };
  });
}

/* ------------------------------------------------------------------ extractors */

/** An OCW video gallery: every link to a /resources/ page, in page order. */
async function ocwGallery(source: Extract<UnitSource, { kind: 'ocw-gallery' }>): Promise<Omit<FetchedUnit, 'id'>[]> {
  const out: Omit<FetchedUnit, 'id'>[] = [];
  for (const page of source.pages) {
    const html = await get(page.url);
    const seen = new Set<string>();
    for (const m of html.matchAll(/<a[^>]+href="(\/courses\/[^"]*\/resources\/[^"#]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const title = clean(m[2]!);
      const href = m[1]!;
      if (!title || seen.has(href)) continue;
      if (source.skip && source.skip.test(title)) continue;
      seen.add(href);
      const unit: Omit<FetchedUnit, 'id'> = { title, url: 'https://ocw.mit.edu' + href };
      if (page.section) unit.section = page.section;
      out.push(unit);
    }
  }
  if (source.sort) {
    const num = (t: string): number => Number(/(\d+)/.exec(t)?.[1] ?? 1e9);
    out.sort((a, b) => num(a.title) - num(b.title));
  }
  return out;
}

/** An OCW course whose left-hand navigation is the syllabus: top-level pages are sections, their children are units. */
async function ocwNav(source: Extract<UnitSource, { kind: 'ocw-nav' }>): Promise<Omit<FetchedUnit, 'id'>[]> {
  const slug = new URL(source.url).pathname.split('/').filter(Boolean)[1]!;
  const html = await get(source.url);
  const prefix = '/courses/' + slug + '/pages/';
  const out: Omit<FetchedUnit, 'id'>[] = [];
  const seen = new Set<string>();
  const sections = new Map<string, string>();
  for (const m of html.matchAll(/<a[^>]+href="(\/courses\/[^"#]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const href = m[1]!;
    const title = clean(m[2]!);
    if (!href.startsWith(prefix) || !title || seen.has(href)) continue;
    seen.add(href);
    const parts = href.slice(prefix.length).split('/').filter(Boolean);
    if (parts.length === 1) {
      sections.set(parts[0]!, title);
      if (source.flat && !(source.skip && source.skip.test(title))) out.push({ title, url: 'https://ocw.mit.edu' + href });
      continue;
    }
    if (source.flat) continue;
    const section = sections.get(parts[0]!);
    if (!section || (source.skipSections && source.skipSections.test(section))) continue;
    if (source.skip && source.skip.test(title)) continue;
    // Deeper levels (a part inside a unit) are flattened; the section stays the top-level unit.
    out.push({ title, url: 'https://ocw.mit.edu' + href, section });
  }
  await resolveOcwTitles(out);
  return out;
}

/** OCW shortens long titles in its navigation; the unit's own page carries the full one in <title>. */
async function resolveOcwTitles(units: Omit<FetchedUnit, 'id'>[]): Promise<void> {
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < units.length) {
      const unit = units[next++]!;
      if (!unit.url) continue;
      try {
        const html = await get(unit.url);
        const full = clean(/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? '').split(' | ')[0]!.trim();
        if (full.length >= unit.title.length) unit.title = full;
      } catch {
        /* keep the navigation title */
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
}

/** Titles captured by a regular expression, for pages that list lectures as headings rather than links. */
async function byPattern(source: Extract<UnitSource, { kind: 'pattern' }>): Promise<Omit<FetchedUnit, 'id'>[]> {
  const out: Omit<FetchedUnit, 'id'>[] = [];
  for (const page of source.pages) {
    const html = await get(page.url);
    for (const m of html.matchAll(source.pattern)) {
      const title = clean(m[1] ?? '').replace(/\.$/, '');
      if (!title || (source.skip && source.skip.test(title))) continue;
      const unit: Omit<FetchedUnit, 'id'> = { title, url: page.url };
      if (page.section) unit.section = page.section;
      out.push(unit);
    }
  }
  return out;
}

/** Any page: every link matching `link`, optionally only inside the slice of HTML between `from` and `to`. */
async function linkList(source: Extract<UnitSource, { kind: 'links' }>): Promise<Omit<FetchedUnit, 'id'>[]> {
  let html = await get(source.url);
  if (source.from) {
    const i = html.indexOf(source.from);
    if (i < 0) throw new Error('marker "' + source.from + '" not found in ' + source.url);
    html = html.slice(i);
  }
  if (source.to) {
    const j = html.indexOf(source.to);
    if (j > 0) html = html.slice(0, j);
  }
  const out: Omit<FetchedUnit, 'id'>[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a[^>]+href="([^"#]+)(?:#[^"]*)?"[^>]*>([\s\S]*?)<\/a>/g)) {
    const href = decodeEntities(m[1]!);
    let title = clean(m[2]!);
    if (!title || !source.link.test(href)) continue;
    if (source.skip && source.skip.test(title)) continue;
    const abs = new URL(href, source.url).href;
    if (seen.has(abs)) continue;
    seen.add(abs);
    if (source.title) title = source.title(title, out.length);
    const unit: Omit<FetchedUnit, 'id'> = { title, url: abs };
    if (source.sectionFromPath !== undefined) {
      const segment = new URL(abs).pathname.split('/').filter(Boolean)[source.sectionFromPath];
      if (segment) unit.section = decodeURIComponent(segment).replace(/[-_]+/g, ' ');
    }
    out.push(unit);
  }
  return out;
}

/** A Markdown document (usually a GitHub README, fetched raw): every link matching `link`. */
async function markdownLinks(source: Extract<UnitSource, { kind: 'markdown' }>): Promise<Omit<FetchedUnit, 'id'>[]> {
  let md = await get(source.url);
  if (source.from) {
    const i = md.indexOf(source.from);
    if (i < 0) throw new Error('marker "' + source.from + '" not found in ' + source.url);
    md = md.slice(i);
  }
  if (source.to) {
    const j = md.indexOf(source.to, 1);
    if (j > 0) md = md.slice(0, j);
  }
  const out: Omit<FetchedUnit, 'id'>[] = [];
  const seen = new Set<string>();
  for (const m of md.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    let title = m[1]!.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
    const href = m[2]!;
    if (!source.link.test(href)) continue;
    if (source.skip && source.skip.test(title)) continue;
    const abs = new URL(source.html ? href.replace(/\.md$/, '.html') : href, source.base).href;
    if (seen.has(abs)) continue;
    seen.add(abs);
    if (source.title) title = source.title(title, out.length);
    out.push({ title, url: abs });
  }
  return out;
}

/** An OCW page holding the lecture list as a table: one-cell rows are section headings, the rest are "number | topic". */
async function ocwTable(source: Extract<UnitSource, { kind: 'ocw-table' }>): Promise<Omit<FetchedUnit, 'id'>[]> {
  const html = await get(source.url);
  const table = /<table[\s\S]*?<\/table>/.exec(html)?.[0];
  if (!table) throw new Error('no table in ' + source.url);
  const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) =>
    [...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => clean(c[1]!).replace(/\(\s*PDF[^)]*\)/gi, '').replace(/\s+/g, ' ').trim()),
  );
  const header = rows[0] ?? [];
  let topicCol = header.findIndex((h) => /topic/i.test(h));
  if (topicCol < 0) topicCol = 1;
  const label = source.label ?? 'Lecture';
  const out: Omit<FetchedUnit, 'id'>[] = [];
  let section: string | undefined;
  for (const cells of rows.slice(1)) {
    if (cells.length === 1) {
      if (cells[0]) section = cells[0];
      continue;
    }
    const num = cells[0] ?? '';
    const topic = cells[topicCol] ?? '';
    if (!topic || (source.skip && source.skip.test(topic))) continue;
    const prefix = /^[A-Za-z]*\s*\d+[a-z]?$/.test(num) ? (/^\d/.test(num) ? label + ' ' + num : num) + ': ' : '';
    const unit: Omit<FetchedUnit, 'id'> = { title: (prefix + topic).slice(0, 160) };
    if (section) unit.section = section;
    out.push(unit);
  }
  return out;
}

/** A Hugging Face course: chapters/en/_toctree.yml in the course repository. One unit per chapter. */
async function hfToctree(source: Extract<UnitSource, { kind: 'hf-toctree' }>): Promise<Omit<FetchedUnit, 'id'>[]> {
  const doc = parseYaml(await get(source.url)) as { title?: string; sections?: { local?: string }[] }[];
  const out: Omit<FetchedUnit, 'id'>[] = [];
  for (const chapter of doc) {
    if (!chapter.title || (source.skip && source.skip.test(chapter.title))) continue;
    const first = chapter.sections?.[0]?.local;
    const unit: Omit<FetchedUnit, 'id'> = { title: chapter.title.trim() };
    if (first) unit.url = source.base + first;
    out.push(unit);
  }
  return out;
}

async function extract(source: UnitSource): Promise<Omit<FetchedUnit, 'id'>[]> {
  switch (source.kind) {
    case 'ocw-gallery':
      return ocwGallery(source);
    case 'ocw-nav':
      return ocwNav(source);
    case 'links':
      return linkList(source);
    case 'markdown':
      return markdownLinks(source);
    case 'ocw-table':
      return ocwTable(source);
    case 'hf-toctree':
      return hfToctree(source);
    case 'pattern':
      return byPattern(source);
  }
}

/* ------------------------------------------------------------------ output */

const quote = (s: string): string => JSON.stringify(s);

export function toYaml(resourceId: string, from: string, units: FetchedUnit[], today: string): string {
  const lines = [
    '# Units of "' + resourceId + '". Titles and links were read from the official page:',
    '#   ' + from,
    '# by scripts/fetch-units.ts on ' + today + '. Safe to edit; keep ids stable (progress is stored against them).',
  ];
  let section: string | undefined;
  let grouped = false;
  for (const u of units) {
    if (u.section !== section) {
      section = u.section;
      if (section) {
        lines.push('- section: ' + quote(section), '  items:');
        grouped = true;
      } else {
        grouped = false;
      }
    }
    const body = '{ id: ' + u.id + ', title: ' + quote(u.title) + (u.url ? ', url: ' + quote(u.url) : '') + ' }';
    lines.push((grouped ? '    - ' : '- ') + body);
  }
  return lines.join('\n') + '\n';
}

function localToday(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

async function main(): Promise<void> {
  const wanted = process.argv.slice(2);
  const sources = UNIT_SOURCES.filter((s) => wanted.length === 0 || wanted.includes(s.id));
  const outDir = join(DATA_DIR, 'units');
  mkdirSync(outDir, { recursive: true });
  const today = localToday();
  let failed = 0;
  for (const source of sources) {
    try {
      const raw = await extract(source);
      const min = source.expect ?? 3;
      if (raw.length < min) throw new Error('only ' + raw.length + ' units found, expected at least ' + min);
      const units = assignIds(raw);
      const from = source.kind === 'ocw-gallery' || source.kind === 'pattern' ? source.pages[0]!.url : source.url;
      writeFileSync(join(outDir, source.id + '.yaml'), toYaml(source.id, from, units, today));
      console.log('ok    ' + source.id.padEnd(34) + String(units.length).padStart(4) + ' units   first: ' + units[0]!.title.slice(0, 60));
    } catch (err) {
      failed++;
      console.log('FAIL  ' + source.id.padEnd(34) + (err instanceof Error ? err.message : String(err)));
    }
  }
  console.log('\n' + (sources.length - failed) + ' written, ' + failed + ' failed');
}

if (process.argv[1] && import.meta.filename === process.argv[1]) await main();
