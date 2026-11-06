import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadInternships } from '../../scripts/lib/load-internships.ts';
import { loadAliases, loadPortfolio } from '../../scripts/lib/load-portfolio.ts';
import { DATA_DIR, loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { createBackup, importBackup, serialiseBackup } from '../../src/db/backup.ts';
import { AtlasDB } from '../../src/db/db.ts';
import { setPortfolioRepo, setPortfolioStatus, setTick, updatePortfolio } from '../../src/db/portfolio.ts';
import type { DayLog, PortfolioState } from '../../src/db/types.ts';
import { addEntry } from '../../src/lib/logs.ts';
import { paceForBlock } from '../../src/lib/forecast.ts';
import { laneBalance } from '../../src/lib/pace.ts';
import { defaultSettings } from '../../src/lib/settings.ts';
import {
  allDoneWhen, currentProject, cycleStatus, daysToEvent, defaultStatus, isOverrun, isPortfolioRef, isRepoUrl, matchesSearch, planRowMeta, portfolioLabel, portfolioRef, portfolioTrack, progressLine, progressOf,
  statusOf, timelineOf, windowLabel,
} from '../../src/lib/portfolio.ts';
import { parsePortfolio, renderPortfolio } from '../../src/sync/files.ts';
import { idOfPortfolioPath, isPulledPath, pathsForRecord, portfolioPath } from '../../src/sync/paths.ts';
import { readPortfolio } from '../../src/seed/portfolio.ts';
import type { PortfolioProject } from '../../src/seed/portfolio.ts';

/** The portfolio (ATLAS-PORTFOLIO): data/portfolio/, the loader's checks, the rules and the progress store. */
const seed = loadSeedOrThrow();
const internships = loadInternships(seed).goals;
const aliases = loadAliases(seed);
const loaded = loadPortfolio({ seed, internships, aliases: aliases.aliases });
const portfolio = loaded.portfolio!;
const project = (id: string): PortfolioProject => portfolio.projects.find((p) => p.id === id)!;
const state = (patch: Partial<PortfolioState> = {}): PortfolioState => ({ id: 'nanoserve', milestones: [], doneWhen: [], ship: [], ...patch });

const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
/** A copy of data/portfolio/ to break one thing in. */
function copy(change: (json: Record<string, unknown> & { projects: Record<string, unknown>[] }, dir: string) => void): string[] {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-portfolio-'));
  dirs.push(dir);
  cpSync(join(DATA_DIR, 'portfolio'), join(dir, 'portfolio'), { recursive: true });
  const file = join(dir, 'portfolio', 'projects.json');
  const json = JSON.parse(readFileSync(file, 'utf8'));
  change(json, dir);
  writeFileSync(file, JSON.stringify(json));
  return loadPortfolio({ seed, internships, dataDir: dir, aliases: aliases.aliases }).errors;
}

describe('the files', () => {
  it('load with no errors: nine projects, 47 milestones, a doc and a full design each, every related project still there', () => {
    expect(aliases.errors).toEqual([]);
    expect(loaded.errors).toEqual([]);
    expect(loaded.warnings).toEqual([]);
    expect(portfolio.projects.map((p) => p.id)).toEqual(['nanoserve', 'kernel-lab', 'minitrain', 'kvroute', 'forge', 'raftkv', 'splat', 'drive-perf', 'world-model-capstone']);
    expect(portfolio.projects.reduce((n, p) => n + p.milestones.length, 0)).toBe(47);
    expect(Object.keys(portfolio.docs).sort()).toEqual(portfolio.projects.map((p) => p.id).sort());
    expect(Object.keys(portfolio.designs).sort()).toEqual(portfolio.projects.map((p) => p.id).sort());
    expect(portfolio.projects.filter((p) => p.core).map((p) => p.number)).toEqual([1, 2, 5]);
  });

  it('resolve the Library file’s ids through data/library-aliases.json, in read_first, the docs and the designs, and never rewrite the files', () => {
    expect(loaded.resolved).toContain('paper-pagedattention-vllm → pagedattention');
    expect(project('nanoserve').read_first.map((r) => r.library_id)).toContain('pagedattention');
    expect(portfolio.docs.nanoserve).toMatch(/\*\*References\.\*\* pagedattention, orca, flashattention-2,/);
    expect(portfolio.designs.nanoserve!.learn.map((l) => l.ref)).toContain('eagle');
    expect(readFileSync(join(DATA_DIR, 'portfolio', 'docs', 'nanoserve.md'), 'utf8')).toContain('paper-pagedattention-vllm');
    const ids = new Set([...seed.resources.map((r) => r.id), ...seed.papers.map((p) => p.id)]);
    for (const p of portfolio.projects) for (const r of p.read_first) if (r.library_id) expect(ids.has(r.library_id), r.library_id).toBe(true);
  });

  it('keep their ids apart from the plan’s and the Internships screen’s projects', () => {
    const others = new Set([...seed.projects.map((p) => p.id), ...internships.flatMap((g) => g.projects.map((p) => p.id))]);
    for (const p of portfolio.projects) expect(others.has(p.id), p.id).toBe(false);
  });
});

describe('the checks', () => {
  it('refuse a duplicate id, a milestone sum that is not estHours, an unknown library id and months out of order', () => {
    expect(copy((j) => ((j.projects[1]!.milestones as { id: string }[])[0]!.id = 'nanoserve-m1'))).toContain('data/portfolio/projects.json: the id "nanoserve-m1" (a milestone of kernel-lab) is already used by a milestone of nanoserve');
    expect(copy((j) => ((j.projects[0]!.milestones as { hours: number }[])[0]!.hours = 50))).toEqual(
      expect.arrayContaining(['data/portfolio/projects.json (nanoserve): milestones add up to 330 h, estHours is 336', expect.stringMatching(/^data\/portfolio\/docs\/nanoserve\.md: milestones read .*Correct forward pass \(56 h\).*projects\.json has .*Correct forward pass \(50 h\)/)]),
    );
    expect(copy((j) => ((j.projects[0]!.read_first as { library_id: string }[])[0]!.library_id = 'paper-not-in-atlas'))).toEqual(['data/portfolio/projects.json (nanoserve): read_first "PagedAttention (vLLM)" names "paper-not-in-atlas", which is not in the Library']);
    expect(copy((j) => ((j.projects[0]!.schedule as { from: string }[])[0]!.from = '2027-02'))).toEqual(['data/portfolio/projects.json (nanoserve): a schedule window runs from 2027-02 to 2027-01']);
    expect(copy((j) => ((j.projects[0]!.schedule as { from: string }[])[0]!.from = '2026-13'))[0]).toMatch(/a month is YYYY-MM/);
    expect(copy((j) => ((j.projects[0]!.read_first as { url: string }[])[0]!.url = 'http://arxiv.org/abs/2309.06180'))[0]).toMatch(/a URL is https/);
  });

  it('refuse a doc whose milestones differ from the file, and a missing design; a related project that left is a warning', () => {
    expect(
      copy((_, dir) => {
        const doc = join(dir, 'portfolio', 'docs', 'raftkv.md');
        writeFileSync(doc, readFileSync(doc, 'utf8').replace(/\*\*Milestones\.\*\* [^\n]+/, (line) => line.replace(/^(\*\*Milestones\.\*\* )([^(]+)/, '$1Renamed')));
      }).some((e) => e.startsWith('data/portfolio/docs/raftkv.md: milestones read "Renamed')),
    ).toBe(true);
    expect(copy((_, dir) => rmSync(join(dir, 'portfolio', 'design', 'splat.yaml')))).toEqual(['data/portfolio/design/splat.yaml: missing (every portfolio project has a full design)']);
    const dir = mkdtempSync(join(tmpdir(), 'atlas-portfolio-'));
    dirs.push(dir);
    cpSync(join(DATA_DIR, 'portfolio'), join(dir, 'portfolio'), { recursive: true });
    const file = join(dir, 'portfolio', 'projects.json');
    const json = JSON.parse(readFileSync(file, 'utf8'));
    json.projects[0].related.push({ where: 'plan', id: 'gone-project', title: 'Gone' });
    writeFileSync(file, JSON.stringify(json));
    const result = loadPortfolio({ seed, internships, dataDir: dir, aliases: aliases.aliases });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(['data/portfolio/projects.json (nanoserve): related plan project "gone-project" (Gone) no longer exists; dropped']);
    expect(result.portfolio!.projects[0]!.related.map((r) => r.id)).not.toContain('gone-project');
  });

  it('refuse a project that names a role the file does not list', () => {
    const raw = JSON.parse(readFileSync(join(DATA_DIR, 'portfolio', 'projects.json'), 'utf8'));
    raw.projects[0].roles = ['JR-NONE'];
    expect(readPortfolio(raw, 'f.json').errors).toEqual(['f.json (nanoserve): role "JR-NONE" is not in roles']);
  });
});

describe('the rules', () => {
  it('default a status from the schedule: next once the first window has started or starts within 30 days, later before', () => {
    // nanoserve starts 1 November 2026: within 30 days from 2 October, not from 1 October.
    expect(defaultStatus(project('nanoserve'), '2026-10-02')).toBe('next');
    expect(defaultStatus(project('nanoserve'), '2026-10-01')).toBe('later');
    expect(defaultStatus(project('nanoserve'), '2027-03-01')).toBe('next');
    expect(defaultStatus(project('forge'), '2026-11-05')).toBe('later'); // March 2027
    expect(defaultStatus(project('forge'), '2027-02-01')).toBe('next');
    expect(statusOf(project('forge'), state({ status: 'building' }), '2026-11-05')).toBe('building');
    expect(cycleStatus('later')).toBe('next');
    expect(cycleStatus('done')).toBe('later');
  });

  it('count progress by checked milestone hours over estHours', () => {
    const p = project('nanoserve');
    expect(progressOf(p, undefined)).toBe(0);
    expect(progressOf(p, state({ milestones: ['nanoserve-m1', 'nanoserve-m4'] }))).toBeCloseTo((56 + 96) / 336);
    expect(progressOf(p, state({ milestones: ['nanoserve-m1', 'not-a-milestone'] }))).toBeCloseTo(56 / 336);
    expect(progressLine(portfolio.projects, new Map([['nanoserve', state({ status: 'building', milestones: ['nanoserve-m1'] })]]), '2026-11-05')).toBe('1 of 47 milestones · 1 building');
  });

  it('show the overrun hint only past the last window by more than half its length, and never once done', () => {
    const p = project('raftkv'); // October to December 2027: 92 days
    expect(isOverrun(p, 'building', '2027-12-31')).toBe(false);
    expect(isOverrun(p, 'building', '2028-02-15')).toBe(false); // 46 days past
    expect(isOverrun(p, 'building', '2028-02-16')).toBe(true); // 47 days past
    expect(isOverrun(p, 'done', '2029-01-01')).toBe(false);
  });

  it('name the window, the Plan row’s project, the countdown and the timeline from the data alone', () => {
    expect(windowLabel(project('nanoserve'))).toBe('Nov 2026 – Jun 2027');
    expect(windowLabel(project('world-model-capstone'))).toBe('Mar 2028 – Sep 2028');
    expect(planRowMeta(portfolio.projects, new Map(), '2026-11-05')).toBe('9 projects · next: nanoserve');
    expect(planRowMeta(portfolio.projects, new Map([['kernel-lab', state({ id: 'kernel-lab', status: 'building' })]]), '2026-11-05')).toBe('9 projects · building kernel-lab');
    expect(currentProject(portfolio.projects, new Map(portfolio.projects.map((p) => [p.id, state({ id: p.id, status: 'done' })])), '2026-11-05')).toBeUndefined();
    expect(daysToEvent(portfolio.events[0]!, '2026-11-05')).toBe(208);
    const t = timelineOf(portfolio, '2026-11-16');
    expect(t.months[0]).toBe('2026-11');
    expect(t.months.at(-1)).toBe('2028-09');
    expect(t.months).toHaveLength(23);
    expect(t.today).toBeCloseTo(15 / 30);
    expect(t.events).toEqual([{ index: 7, title: portfolio.events[0]!.title, date: '2027-06' }]);
    expect(t.rows[0]!.bars[0]).toMatchObject({ from: 0, to: 2, label: 'Nov 2026 – Jan 2027' });
  });

  it('offer done only when every done-when item is ticked; search by code, title and stack; check a repository URL', () => {
    expect(allDoneWhen(project('nanoserve'), state({ doneWhen: ['nanoserve-d1', 'nanoserve-d2'] }))).toBe(false);
    expect(allDoneWhen(project('nanoserve'), state({ doneWhen: ['nanoserve-d1', 'nanoserve-d2', 'nanoserve-d3'] }))).toBe(true);
    expect(portfolio.projects.filter((p) => matchesSearch(p, 'raft')).map((p) => p.id)).toEqual(['raftkv']);
    expect(portfolio.projects.filter((p) => matchesSearch(p, 'cuda kernel')).map((p) => p.id)).toContain('kernel-lab');
    expect(isRepoUrl('https://github.com/octo/nanoserve')).toBe(true);
    expect(isRepoUrl('https://gitlab.com/octo/nanoserve')).toBe(false);
    expect(isRepoUrl('https://github.com/octo')).toBe(false);
  });
});

describe('time logged to a portfolio project', () => {
  const log = (entries: DayLog['entries']): DayLog => ({ date: '2026-11-04', entries });
  it('counts for the day, is named "Portfolio · <code>", and never moves a lane’s balance or pace', () => {
    const plain = addEntry(log([]), { block: 'D', track: 'ai', refId: 'some-resource', minutes: 60 });
    const withPortfolio = addEntry(plain, { block: 'D', track: portfolioTrack('inference'), refId: portfolioRef('nanoserve'), note: portfolioLabel('nanoserve'), minutes: 30 });
    const merged = addEntry(withPortfolio, { block: 'D', track: 'ai', refId: portfolioRef('nanoserve'), note: portfolioLabel('nanoserve'), minutes: 15 });
    expect(merged.entries).toHaveLength(2);
    expect(merged.entries[1]).toMatchObject({ refId: 'portfolio:nanoserve', note: 'Portfolio · nanoserve', minutes: 45, track: 'ai' });
    expect(merged.entries.reduce((s, e) => s + e.minutes, 0)).toBe(105);
    expect(isPortfolioRef(merged.entries[1]!.refId)).toBe(true);
    expect(paceForBlock([merged], 'D', '2026-11-04', 1)).toBe(paceForBlock([plain], 'D', '2026-11-04', 1));
    const settings = defaultSettings(seed.settings);
    expect(laneBalance(settings, [merged], 'D', '2026-11-04', '2026-11-05').logged).toBe(60);
  });
});

describe('the progress store', () => {
  it('ticks, sets a status and a repository in a table of its own, synced as portfolio/<id>.json and kept in backups', async () => {
    const db = new AtlasDB('portfolio-test-' + Math.random());
    await db.open();
    await setTick('nanoserve', 'milestones', 'nanoserve-m1', undefined, db);
    await setTick('nanoserve', 'milestones', 'nanoserve-m2', true, db);
    await setTick('nanoserve', 'milestones', 'nanoserve-m1', undefined, db);
    await setTick('nanoserve', 'ship', 'rule-1', true, db);
    await setPortfolioStatus('nanoserve', 'building', db);
    await setPortfolioRepo('nanoserve', 'https://github.com/octo/nanoserve', db);
    const row = await db.portfolio.get('nanoserve');
    expect(row).toMatchObject({ id: 'nanoserve', milestones: ['nanoserve-m2'], ship: ['rule-1'], status: 'building', repo: 'https://github.com/octo/nanoserve' });
    // Nothing reaches the plan's item states.
    expect(await db.itemStates.count()).toBe(0);

    expect(pathsForRecord('portfolio', 'nanoserve', row, () => false)).toEqual(['portfolio/nanoserve.json']);
    expect(portfolioPath('kernel-lab')).toBe('portfolio/kernel-lab.json');
    expect(idOfPortfolioPath('portfolio/kernel-lab.json')).toBe('kernel-lab');
    expect(isPulledPath('portfolio/kernel-lab.json')).toBe(true);
    const parsed = parsePortfolio(renderPortfolio(row!), 'nanoserve');
    expect(parsed.ok && parsed.value).toEqual(row);

    const file = await createBackup(new Date('2026-11-06T10:00:00Z'), db);
    expect(file.data.portfolio).toHaveLength(1);
    const other = new AtlasDB('portfolio-test-' + Math.random());
    await other.open();
    const result = await importBackup(serialiseBackup(file), other);
    expect(result.ok).toBe(true);
    expect(await other.portfolio.get('nanoserve')).toMatchObject({ status: 'building', milestones: ['nanoserve-m2'] });
    await updatePortfolio('kernel-lab', (s) => ({ ...s, notes: 'Start with the roofline.' }), other);
    expect((await other.portfolio.get('kernel-lab'))!.notes).toBe('Start with the roofline.');
    db.close();
    other.close();
  });
});
