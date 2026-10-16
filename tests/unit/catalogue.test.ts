/**
 * The three-tier project catalogue: loading and normalising the files, the validator's errors, the daily pick, the
 * weekly slot, the Deck's and the Library's filters, and the refs and covers of the keyword mapping.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapItem } from '../../scripts/lib/catalogue-mapping.ts';
import { catalogueRefs, loadCatalogue } from '../../scripts/lib/load-catalogue.ts';
import { DATA_DIR, loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import type { ChallengeEvent, UserItemState } from '../../src/db/types.ts';
import { challengeStreak, dailyChallenge, isSlotDay, languageOf, SKIPS_PER_DAY, suggestLanguage, weeklyChallenge } from '../../src/lib/catalogue/daily.ts';
import { deckEntries, groupsOf, inScope, matchesFilter, solvedSet } from '../../src/lib/catalogue/filters.ts';
import { addDays } from '../../src/lib/dates.ts';
import { weeklyBuildFor } from '../../src/lib/schedule.ts';
import { CATALOGUE_FILES, entryOf, normalise, parseCatalogue, phaseIdOf, RawCatalogueItemSchema, splitParts } from '../../src/seed/catalogue.ts';
import type { CatalogueEntry } from '../../src/seed/catalogue.ts';

const seed = loadSeedOrThrow();
const { items, errors } = loadCatalogue(seed);
const entries = items.map(entryOf);
const DAY = '2026-10-19';

let n = 0;
const ev = (challengeId: string, date: string, event: ChallengeEvent['event'], extra: Partial<ChallengeEvent> = {}): ChallengeEvent => ({ id: date + '|' + event + '|' + challengeId + '|' + ++n, challengeId, date, event, daily: true, ...extra });

describe('loading the catalogue', () => {
  it('reads all three files without an error: 254 daily, 112 + 250 weekly, 304 monthly', () => {
    expect(errors).toEqual([]);
    const count = (kind: string, difficulty: string) => items.filter((i) => i.kind === kind && i.difficulty === difficulty).length;
    expect(count('challenge', 'easy')).toBe(254);
    expect(count('challenge', 'medium')).toBe(112);
    expect(count('build', 'medium')).toBe(250);
    expect(count('case', 'advanced')).toBe(304);
  });

  it('normalises phases, tracks, measure, parts and milestones', () => {
    expect(phaseIdOf('Y1-P0')).toBe('y1-p0');
    expect(phaseIdOf('Y3')).toBe('y3');
    expect(splitParts('Load cell 1-5 kg $8, op-amp quad $2-4, 1,200 mAh cell')).toEqual(['Load cell 1-5 kg $8', 'op-amp quad $2-4', '1,200 mAh cell']);
    const phases = new Set(seed.phases.map((p) => p.id));
    for (const i of items) {
      if (i.kind === 'challenge') continue;
      expect(phases.has(i.phaseId), i.id).toBe(true);
      expect(i.tracks.length, i.id).toBeGreaterThan(0);
      expect(Array.isArray(i.measure)).toBe(true);
      if (i.kind === 'case') {
        expect(i.milestones.map((m) => m.id)).toEqual(i.milestones.map((_, k) => 'milestone-' + (k + 1)));
        expect(i.milestones.reduce((s, m) => s + m.hours, 0)).toBe(i.estHours);
      }
    }
    // The catalogue's inference domain counts toward the AI track.
    const inference = items.find((i) => i.kind !== 'challenge' && i.domain === 'inference');
    expect(inference && inference.kind !== 'challenge' ? inference.tracks : []).toContain('ai');
  });

  it('keeps existing projects untouched: the curriculum still has its own 245, numbered as before', () => {
    expect(seed.projects).toHaveLength(245);
    const ids = new Set(seed.projects.map((p) => p.id));
    expect(items.some((i) => ids.has(i.id))).toBe(false);
  });
});

describe('the validator', () => {
  const refs = catalogueRefs(seed);
  const line = (o: Record<string, unknown>): string => JSON.stringify(o);
  const base = JSON.parse(readFileSync(join(DATA_DIR, 'projects', CATALOGUE_FILES[2]), 'utf8').split('\n')[0]!) as Record<string, unknown>;
  const easy = JSON.parse(readFileSync(join(DATA_DIR, 'projects', CATALOGUE_FILES[0]), 'utf8').split('\n')[0]!) as Record<string, unknown>;
  const check = (...objects: Record<string, unknown>[]) => parseCatalogue([{ file: 'x.jsonl', text: objects.map(line).join('\n') }], refs).errors;

  it('accepts a good line', () => {
    expect(check(base)).toEqual([]);
  });
  it('rejects a duplicate id, and an id the curriculum already uses', () => {
    expect(check(base, base).join()).toMatch(/is also at x\.jsonl:1/);
    expect(check({ ...base, id: 'mit-18-06' }).join()).toMatch(/already the id of something in the curriculum/);
  });
  it('rejects a difficulty that does not match the cadence', () => {
    expect(check({ ...base, cadence: 'weekly' }).join()).toMatch(/advanced but its cadence is weekly/);
  });
  it('rejects a challenge without examples', () => {
    expect(check({ ...easy, examples: [] }).join()).toMatch(/has no examples/);
  });
  it('rejects case milestones that do not add up to its hours', () => {
    expect(check({ ...base, estHours: (base.estHours as number) + 1 }).join()).toMatch(/milestones add up to/);
  });
  it('rejects a prerequisite that resolves to nothing', () => {
    expect(check({ ...base, prereq: ['no-such-thing'] }).join()).toMatch(/prereq "no-such-thing"/);
  });
  it('rejects a URL anywhere in the text', () => {
    expect(check({ ...base, scenario: 'See https://example.com for details.' }).join()).toMatch(/has a URL/);
  });
  it('rejects refs and covers that do not exist', () => {
    expect(check({ ...base, refs: ['no-such-course'] }).join()).toMatch(/refs "no-such-course"/);
    expect(check({ ...base, covers: ['inference-engineering/no-such-node'] }).join()).toMatch(/not a roadmap node/);
  });
});

describe('refs and covers', () => {
  it('match the reviewed keyword table, and every id they name exists', () => {
    const resources = new Set(seed.resources.map((r) => r.id));
    for (const name of CATALOGUE_FILES) {
      for (const l of readFileSync(join(DATA_DIR, 'projects', name), 'utf8').split('\n').filter(Boolean)) {
        const raw = RawCatalogueItemSchema.parse(JSON.parse(l));
        const mapped = mapItem(raw);
        expect(raw.refs ?? [], raw.id).toEqual(mapped.refs);
        expect(raw.covers ?? [], raw.id).toEqual(mapped.covers);
        for (const r of mapped.refs) expect(resources.has(r)).toBe(true);
      }
    }
  });

  it('map clear phrases and leave vague text alone', () => {
    const build = RawCatalogueItemSchema.parse(JSON.parse(readFileSync(join(DATA_DIR, 'projects', 'weekly-medium.jsonl'), 'utf8').split('\n').find((l) => l.includes('"kind": "build"'))!));
    if (build.kind !== 'build') throw new Error('expected a build');
    expect(mapItem({ ...build, title: 'Paged KV cache with continuous batching', goal: 'A scheduler.', stack: 'Python', approach: ['Write it'] }).covers).toEqual(['inference-engineering/kv-cache', 'inference-engineering/continuous-batching', 'inference-engineering/pagedattention']);
    expect(mapItem({ ...build, title: 'A small tool', goal: 'Something useful.', stack: 'Python', approach: ['Write it'] })).toEqual({ refs: [], covers: [] });
    // Language names that are common words count only in the stack.
    expect(mapItem({ ...build, title: 'Go further', goal: 'Go on.', stack: 'Python', approach: ['Go'] }).refs).toEqual([]);
    expect(mapItem({ ...build, title: 'A tool', goal: 'x', stack: 'Go, SQLite', approach: ['x'] }).refs).toEqual(['tour-of-go']);
  });
});

describe('the daily challenge', () => {
  const easy = entries.filter((e) => e.kind === 'challenge' && e.difficulty === 'easy');
  const pick = (events: ChallengeEvent[], date = DAY, blockLanguage?: string) => dailyChallenge({ entries, events, date, blockLanguage })!;

  it('is the same for the same date and log, an easy challenge, and offers Block B’s language', () => {
    expect(pick([]).challenge.id).toBe(pick([]).challenge.id);
    expect(pick([]).challenge.difficulty).toBe('easy');
    expect(pick([], DAY, 'C++').language).toBe('C++');
    expect(pick([]).language).toBe('Python');
  });

  it('rotates topics: the day after a solve starts at the next topic', () => {
    const first = pick([]);
    const solved = [ev(first.challenge.id, DAY, 'solved')];
    const next = pick(solved, addDays(DAY, 1));
    const topics = [...new Set(easy.map((e) => e.group))].sort();
    expect(next.challenge.group).toBe(topics[(topics.indexOf(first.challenge.group) + 1) % topics.length]);
  });

  it('stays today’s pick once solved today, marked solved', () => {
    const first = pick([]);
    const today = pick([ev(first.challenge.id, DAY, 'solved')]);
    expect(today.challenge.id).toBe(first.challenge.id);
    expect(today.solved).toBe(true);
  });

  it('never repeats a solved challenge until all are solved, then cycles with another language', () => {
    const events: ChallengeEvent[] = [];
    const seen = new Set<string>();
    let date = DAY;
    for (let i = 0; i < easy.length; i++) {
      const p = pick(events, date);
      expect(seen.has(p.challenge.id), 'repeat on day ' + i).toBe(false);
      expect(p.cycle).toBe(0);
      seen.add(p.challenge.id);
      events.push(ev(p.challenge.id, date, 'solved', { language: 'Python' }));
      date = addDays(date, 1);
    }
    expect(seen.size).toBe(easy.length);
    const again = pick(events, date, 'Python');
    expect(again.cycle).toBe(1);
    expect(again.anotherLanguage).toBe(true);
    expect(again.language).not.toBe('Python');
  });

  it('allows three skips a day, each to another challenge, then no more', () => {
    const events: ChallengeEvent[] = [];
    const ids = new Set<string>();
    for (let i = 0; i < SKIPS_PER_DAY; i++) {
      const p = pick(events);
      expect(p.skipsLeft).toBe(SKIPS_PER_DAY - i);
      ids.add(p.challenge.id);
      events.push(ev(p.challenge.id, DAY, 'skipped'));
    }
    const last = pick(events);
    expect(last.skipsLeft).toBe(0);
    ids.add(last.challenge.id);
    expect(ids.size).toBe(SKIPS_PER_DAY + 1);
  });

  it('is gone for the day after Not today, and back tomorrow', () => {
    const p = pick([]);
    const events = [ev(p.challenge.id, DAY, 'hidden')];
    expect(dailyChallenge({ entries, events, date: DAY })).toBeNull();
    expect(dailyChallenge({ entries, events, date: addDays(DAY, 1) })).not.toBeNull();
  });

  it('keeps its own streak, apart from the study streak', () => {
    const events = [ev('a', '2026-10-17', 'solved'), ev('b', '2026-10-18', 'solved'), ev('c', '2026-10-15', 'solved'), ev('d', '2026-10-18', 'solved', { daily: false })];
    expect(challengeStreak(events, '2026-10-19')).toEqual({ current: 2, longest: 2 });
    expect(challengeStreak(events, '2026-10-20')).toEqual({ current: 0, longest: 2 });
  });

  it('reads the language of a Block B item, and suggests an unused one later', () => {
    expect(languageOf('learncpp learncpp.com')).toBe('C++');
    expect(languageOf('30-days-of-python 30 Days of Python')).toBe('Python');
    expect(languageOf('rust-book The Rust Programming Language')).toBe('Rust');
    expect(languageOf('beej-c Beej’s Guide to C')).toBe('C');
    expect(languageOf('tour-of-go A Tour of Go')).toBe('Go');
    expect(suggestLanguage('Python', ['Python', 'C++'], 2)).toBe('C');
  });
});

describe('the weekly slot', () => {
  it('is on the weekend by default, and on whichever days are set', () => {
    expect(isSlotDay('2026-10-17', [6, 0])).toBe(true);
    expect(isSlotDay('2026-10-18', [6, 0])).toBe(true);
    expect(isSlotDay('2026-10-19', [6, 0])).toBe(false);
    expect(isSlotDay('2026-10-21', [3])).toBe(true);
  });

  it('holds one medium challenge a week, the same all week, kept once solved', () => {
    const week = '2026-10-12';
    const p = weeklyChallenge({ entries, events: [], weekStart: week })!;
    expect(p.challenge.difficulty).toBe('medium');
    expect(weeklyChallenge({ entries, events: [], weekStart: week })!.challenge.id).toBe(p.challenge.id);
    const solved = weeklyChallenge({ entries, events: [ev(p.challenge.id, '2026-10-17', 'solved', { daily: false })], weekStart: week })!;
    expect(solved).toMatchObject({ solved: true, challenge: { id: p.challenge.id } });
    const next = weeklyChallenge({ entries, events: [ev(p.challenge.id, '2026-10-17', 'solved', { daily: false })], weekStart: '2026-10-19' })!;
    expect(next.challenge.id).not.toBe(p.challenge.id);
  });

  it('takes a catalogue build as the week’s build', () => {
    const build = entries.find((e) => e.kind === 'build')!;
    const item = weeklyBuildFor(null, build.id, { seed: seed as never, states: new Map(), catalogue: entries })!;
    expect(item).toMatchObject({ refId: build.id, cadence: 'weekly', estHours: build.hours });
  });
});

describe('Deck and Library filters', () => {
  const phases = seed.phases;
  const current = phases.find((p) => p.id === 'y2')!;
  const ctx = { phases, current, states: new Map<string, UserItemState>(), solved: new Set<string>() };

  it('Daily is easy challenges, Weekly medium builds and challenges, Monthly cases', () => {
    const tiers = (tier: 'daily' | 'weekly' | 'monthly') => new Set(deckEntries(entries, { tier, scope: 'all' }, ctx).map((e) => e.kind + ':' + e.difficulty));
    expect(tiers('daily')).toEqual(new Set(['challenge:easy']));
    expect(tiers('weekly')).toEqual(new Set(['build:medium', 'challenge:medium']));
    expect(tiers('monthly')).toEqual(new Set(['case:advanced']));
  });

  it('This phase, Earlier and Everything compare phases; challenges are always in', () => {
    const at = (e: CatalogueEntry) => phases.findIndex((p) => p.id === e.phaseId);
    const thisPhase = deckEntries(entries, { tier: 'monthly', scope: 'phase' }, ctx);
    const earlier = deckEntries(entries, { tier: 'monthly', scope: 'earlier' }, ctx);
    expect(thisPhase.length).toBeGreaterThan(0);
    expect(thisPhase.every((e) => e.phaseId === 'y2')).toBe(true);
    expect(earlier.length).toBeGreaterThan(0);
    expect(earlier.every((e) => at(e) < at(thisPhase[0]!))).toBe(true);
    expect(inScope(entries.find((e) => e.kind === 'challenge')!, 'phase', phases, current)).toBe(true);
  });

  it('a topic or domain narrows it, and solved or done ones leave the deck', () => {
    const topics = groupsOf(entries, 'daily');
    expect(topics).toContain('arrays');
    const arrays = deckEntries(entries, { tier: 'daily', scope: 'all', group: 'arrays' }, ctx);
    expect(arrays.every((e) => e.group === 'arrays')).toBe(true);
    const fewer = deckEntries(entries, { tier: 'daily', scope: 'all', group: 'arrays' }, { ...ctx, solved: solvedSet([ev(arrays[0]!.id, DAY, 'solved')]) });
    expect(fewer).toHaveLength(arrays.length - 1);
    const kase = deckEntries(entries, { tier: 'monthly', scope: 'all' }, ctx)[0]!;
    const states = new Map<string, UserItemState>([[kase.id, { refId: kase.id, status: 'done', unitsDone: [] }]]);
    expect(deckEntries(entries, { tier: 'monthly', scope: 'all' }, { ...ctx, states }).some((e) => e.id === kase.id)).toBe(false);
  });

  it('Library › Projects combines kind, difficulty, domain, track, phase, level and hours', () => {
    const y2Inference = entries.filter((e) => matchesFilter(e, { kind: 'case', difficulty: 'advanced', group: 'inference', phaseId: 'y2' }));
    expect(y2Inference.length).toBeGreaterThan(0);
    expect(y2Inference.every((e) => e.kind === 'case' && e.group === 'inference' && e.phaseId === 'y2')).toBe(true);
    expect(entries.filter((e) => matchesFilter(e, { hours: 'short' })).every((e) => e.hours < 1)).toBe(true);
    expect(entries.filter((e) => matchesFilter(e, { level: 5, track: 'ai' })).every((e) => e.level === 5 && e.tracks.includes('ai'))).toBe(true);
  });
});

describe('normalise', () => {
  it('turns a raw build into the app’s shape', () => {
    const raw = RawCatalogueItemSchema.parse({ id: 'x-build', title: 'X', kind: 'build', cadence: 'weekly', difficulty: 'medium', phase: 'Y1-P1', tracks: ['inference', 'swe'], level: 3, estHours: 5, domain: 'inference', stack: 'Python', goal: 'A thing.', approach: ['Do it'], doneWhen: 'Done.', measure: '', pitfalls: [], parts: 'A $1, B $2' });
    expect(normalise(raw)).toMatchObject({ phaseId: 'y1-p1', tracks: ['ai', 'swe'], measure: [], parts: ['A $1', 'B $2'] });
  });
});
