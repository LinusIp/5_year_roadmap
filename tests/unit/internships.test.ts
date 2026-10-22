import { describe, expect, it } from 'vitest';
import { loadInternships } from '../../scripts/lib/load-internships.ts';
import { loadSeedOrThrow, splitSeed } from '../../scripts/lib/load-seed.ts';
import { createBackup, importBackup, serialiseBackup } from '../../src/db/backup.ts';
import { AtlasDB } from '../../src/db/db.ts';
import { readInternProgress, setGateDone, setProjectStatus, setRating, setResumeDone, setTargetStatus, updateInternProgress } from '../../src/db/internships.ts';
import {
  currentPhase, cycleStatus, daysToApply, EMPTY_PROGRESS, gateProgress, goalName, nextApplication, phaseLabel, phaseSpan, readyCount, resolveResources, roleName, todayCard, weekLabel, weekOf,
} from '../../src/lib/internships.ts';
import type { InternProgress } from '../../src/lib/internships.ts';
import { readInternshipGoal } from '../../src/seed/internships.ts';
import type { InternshipGoal } from '../../src/seed/internships.ts';

/** The Internships screen (INTERNSHIPS): data/internships.json, the arithmetic and the progress store. */
const seed = loadSeedOrThrow();
const { app } = splitSeed(seed);
const loaded = loadInternships(seed);
const goal = loaded.goals[0]!;
const progress = (patch: Partial<InternProgress>): InternProgress => ({ ...EMPTY_PROGRESS, ...patch });

describe('the file', () => {
  it('reads with no errors, one goal with three targets, five phases, six projects, three open-source items and seven interview areas', () => {
    expect(loaded.errors).toEqual([]);
    expect(loaded.goals).toHaveLength(1);
    expect(goal.goal.id).toBe('nvidia-2027');
    expect(goal.targets).toHaveLength(3);
    expect(goal.phases).toHaveLength(5);
    expect(goal.projects).toHaveLength(6);
    expect(goal.open_source).toHaveLength(3);
    expect(goal.interview_areas).toHaveLength(7);
    expect(goalName(goal)).toBe('NVIDIA 2027');
  });

  it('refuses a duplicate id, a resource the library does not have, a bad fit and a date that is not ISO', () => {
    const ids = new Set([...seed.resources.map((r) => r.id), ...seed.papers.map((p) => p.id)]);
    const base: InternshipGoal = JSON.parse(JSON.stringify(goal));
    const dup = JSON.parse(JSON.stringify(base));
    dup.projects[0].id = dup.targets[0].id;
    expect(readInternshipGoal(dup, 'data/x.json', ids).errors).toEqual(['data/x.json: the id "nv-ai-agent" is used twice (a target and a project)']);
    const stranger = JSON.parse(JSON.stringify(base));
    stranger.phases[0].resources = ['ostep', 'no-such-thing'];
    stranger.open_source[0].resource = 'nor-this';
    expect(readInternshipGoal(stranger, 'data/x.json', ids).errors).toEqual([
      'data/x.json: phase p1 names "no-such-thing", which is not in the library',
      'data/x.json: open-source item os-trtllm names "nor-this", which is not in the library',
    ]);
    const fit = JSON.parse(JSON.stringify(base));
    fit.targets[0].fit = 'perfect';
    expect(readInternshipGoal(fit, 'data/x.json', ids).errors[0]).toMatch(/^data\/x\.json: targets\.0\.fit: /);
    const date = JSON.parse(JSON.stringify(base));
    date.targets[0].apply.date = '1 Dec 2026';
    expect(readInternshipGoal(date, 'data/x.json', ids).errors).toEqual(['data/x.json: targets.0.apply.date: a date is YYYY-MM-DD']);
    const open = JSON.parse(JSON.stringify(base));
    open.targets[0].apply.date = null;
    expect(readInternshipGoal(open, 'data/x.json', ids).errors).toEqual([]);
  });

  it('names resources and papers the library has, every one of them', () => {
    const named = [...goal.phases.flatMap((p) => p.resources), ...goal.open_source.map((o) => o.resource).filter((r): r is string => Boolean(r))];
    expect(named.length).toBe(27);
    const resolved = resolveResources(named, app, new Map());
    expect(resolved.map((r) => r.id)).toEqual(named);
    expect(resolved.find((r) => r.id === 'karpathy-zero-to-hero')).toMatchObject({ title: 'Andrej Karpathy: Neural Networks, Zero to Hero', kind: 'Lectures', status: 'todo', to: '/library/karpathy-zero-to-hero' });
    expect(resolved.find((r) => r.id === 'roofline')).toMatchObject({ kind: 'Paper', status: 'queued', to: '/library?paper=roofline' });
  });
});

describe('the next application', () => {
  it('is the soonest dated target that is still open, skipping past dates and applied ones', () => {
    expect(nextApplication(goal, EMPTY_PROGRESS, '2026-10-22')).toMatchObject({ target: { id: 'nv-ai-agent' }, days: 40 });
    expect(nextApplication(goal, EMPTY_PROGRESS, '2026-12-01')).toMatchObject({ target: { id: 'nv-ai-agent' }, days: 0 });
    // The day after its date, the first role is past: the second is next.
    expect(nextApplication(goal, EMPTY_PROGRESS, '2026-12-02')).toMatchObject({ target: { id: 'nv-ad-gpu' }, days: 89 });
    expect(nextApplication(goal, progress({ targets: { 'nv-ai-agent': 'applied' } }), '2026-10-22')).toMatchObject({ target: { id: 'nv-ad-gpu' } });
    expect(nextApplication(goal, EMPTY_PROGRESS, '2027-07-02')).toBeNull();
    expect(daysToApply(40)).toBe('40 days to apply');
    expect(daysToApply(1)).toBe('1 day to apply');
    expect(daysToApply(0)).toBe('Apply today');
    expect(roleName(goal.targets[0]!)).toBe('AI Agent Engineer Intern');
  });
});

describe('the current phase', () => {
  it('is the one whose dates hold today, else the first with an open gate, else the last', () => {
    expect(currentPhase(goal, EMPTY_PROGRESS, '2026-11-18').id).toBe('p1');
    expect(currentPhase(goal, EMPTY_PROGRESS, '2027-02-10').id).toBe('p2');
    // Phase 5 has no end: it holds every later day.
    expect(currentPhase(goal, EMPTY_PROGRESS, '2028-01-01').id).toBe('p5');
    // Before the first phase starts, no dates hold: the first open gate.
    expect(currentPhase(goal, EMPTY_PROGRESS, '2026-10-22').id).toBe('p1');
    const p1Done = progress({ gates: Object.fromEntries(goal.phases[0]!.gate.map((g) => [g.id, true])) });
    expect(currentPhase(goal, p1Done, '2026-10-22').id).toBe('p2');
    const allDone = progress({ gates: Object.fromEntries(goal.phases.flatMap((p) => p.gate.map((g) => [g.id, true]))) });
    const dateless: InternshipGoal = { ...goal, phases: goal.phases.map((p) => ({ ...p, start: null, end: null })) };
    expect(currentPhase(dateless, allDone, '2026-10-22').id).toBe('p5');
  });

  it('counts the week from the phase start and the gate from the ticks', () => {
    const p1 = goal.phases[0]!;
    expect(weekOf(p1, '2026-11-01')).toEqual({ week: 1, of: 9 });
    expect(weekOf(p1, '2026-11-18')).toEqual({ week: 3, of: 9 });
    expect(weekOf(p1, '2026-12-31')).toEqual({ week: 9, of: 9 });
    expect(weekOf(p1, '2026-10-22')).toEqual({ week: 0, of: 9 });
    expect(weekLabel(p1, '2026-10-22')).toBe('starts 1 Nov 2026');
    expect(weekLabel(goal.phases[4]!, '2027-09-01')).toBe('week 9');
    expect(phaseSpan(p1)).toBe('Nov–Dec 2026');
    expect(phaseSpan(goal.phases[4]!)).toBe('from Jul 2027');
    expect(gateProgress(p1, EMPTY_PROGRESS)).toEqual({ done: 0, total: 5 });
    expect(gateProgress(p1, progress({ gates: { 'p1-wsl': true, 'p1-py': true, 'p2-cpp': true } }))).toEqual({ done: 2, total: 5 });
    expect(phaseLabel(goal, 'p2-p3')).toBe('Phases 2–3');
    expect(phaseLabel(goal, 'p4')).toBe('Phase 4');
    expect(cycleStatus('later')).toBe('next');
    expect(cycleStatus('done')).toBe('later');
    expect(readyCount(goal, progress({ ratings: { cuda: 3, kernels: 2, cpp: 3 } }))).toEqual({ ready: 2, total: 7 });
  });

  it("gives Today its card: the role, the gate, the week and the first open gate item, then the project being built", () => {
    const card = todayCard(goal, EMPTY_PROGRESS, '2026-11-18')!;
    expect(card).toMatchObject({ target: { id: 'nv-ai-agent' }, days: 13, gate: { done: 0, total: 5 }, week: 'week 3 of 9', line: 'WSL2 Ubuntu with CUDA working', block: 'Intern Prep' });
    const twoDone = progress({ gates: { 'p1-wsl': true, 'p1-py': true } });
    expect(todayCard(goal, twoDone, '2026-11-18')!.line).toBe('Project 1 tiny GPT trains');
    const gateDone = progress({ gates: Object.fromEntries(goal.phases[0]!.gate.map((g) => [g.id, true])) });
    expect(todayCard(goal, gateDone, '2026-11-18')!.line).toBe('Build Measured developer-productivity agent');
    expect(todayCard(goal, EMPTY_PROGRESS, '2027-08-01')).toBeNull();
  });
});

describe('the progress store', () => {
  it('keeps every tick by id, survives a backup and its import, and never touches the file', async () => {
    const database = new AtlasDB('internships-' + Date.now());
    await setGateDone('nvidia-2027', 'p1-wsl', true, database);
    await setProjectStatus('nvidia-2027', 'proj-1', 'building', database);
    await updateInternProgress('nvidia-2027', (p) => ({ ...p, projects: { ...p.projects, 'proj-1': { ...p.projects['proj-1'], progress: 0.4 } } }), database);
    await setRating('nvidia-2027', 'cuda', 3, database);
    await setResumeDone('nvidia-2027', 1, true, database);
    await setTargetStatus('nvidia-2027', 'nv-ai-agent', 'applied', database);
    const saved = await readInternProgress('nvidia-2027', database);
    expect(saved).toEqual({ gates: { 'p1-wsl': true }, projects: { 'proj-1': { status: 'building', progress: 0.4 } }, ratings: { cuda: 3 }, resume: { '1': true }, targets: { 'nv-ai-agent': 'applied' } });
    expect(gateProgress(goal.phases[0]!, saved)).toEqual({ done: 1, total: 5 });

    const text = serialiseBackup(await createBackup(new Date('2026-10-22T10:00:00Z'), database));
    const fresh = new AtlasDB('internships-fresh-' + Date.now());
    const result = await importBackup(text, fresh);
    expect(result.ok).toBe(true);
    expect(await readInternProgress('nvidia-2027', fresh)).toEqual(saved);
    expect(await readInternProgress('other-goal', fresh)).toEqual(EMPTY_PROGRESS);
    // A row that is not an object reads as empty rather than breaking the screen.
    await fresh.meta.put({ key: 'internships:broken', value: 'nonsense' });
    expect(await readInternProgress('broken', fresh)).toEqual(EMPTY_PROGRESS);
    database.close();
    fresh.close();
  });
});
