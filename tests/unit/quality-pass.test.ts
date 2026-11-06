import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { splitSeed } from '../../scripts/lib/vite-plugin-seed.ts';
import { ResourceSchema } from '../../src/seed/schema.ts';
import type { AppSeed } from '../../src/seed/schema.ts';
import { buildPaths, byFit, fitOf, isCanon, isLesser, pathExtras, researchAreas, UNGRADED, upNext } from '../../src/lib/library-home.ts';

/** The quality pass (ATLAS-QUALITY-AUDIT, 16,448 rows): grades, removals, the Canon rows and the order. */
const raw = loadSeedOrThrow();
const seed = splitSeed(raw).app as AppSeed;

describe('the grades', () => {
  it('order a list by priority, then quality (canon first, an ungraded row as 4), then year and level', () => {
    const items = [
      { id: 'p2-q5', priority: 2, quality: 5, year: 1 },
      { id: 'p1-q3', priority: 1, quality: 3, year: 1 },
      { id: 'p1-none', priority: 1, year: 3 },
      { id: 'p1-q5-y2', priority: 1, quality: 5, year: 2 },
      { id: 'p1-q5-y1', priority: 1, quality: 5, year: 1 },
      { id: 'p1-q4', priority: 1, quality: 4, year: 1 },
    ];
    expect([...items].sort(byFit).map((i) => i.id)).toEqual(['p1-q5-y1', 'p1-q5-y2', 'p1-q4', 'p1-none', 'p1-q3', 'p2-q5']);
    expect(UNGRADED).toBe(4);
    expect(isCanon(5)).toBe(true);
    expect(isCanon(4)).toBe(false);
    expect(isLesser(3)).toBe(true);
    expect(isLesser(2)).toBe(true);
    expect(isLesser(undefined)).toBe(false);
    expect(fitOf({ tracks: ['ai'], priority: 1, quality: 5 }).quality).toBe(5);
  });

  it('are an integer from 1 to 5 when present', () => {
    const base = raw.resources.find((r) => r.id === 'stanford-cs229')!;
    expect(ResourceSchema.safeParse({ ...base, quality: 5 }).success).toBe(true);
    expect(ResourceSchema.safeParse({ ...base, quality: 6 }).success).toBe(false);
    expect(ResourceSchema.safeParse({ ...base, quality: 3.5 }).success).toBe(false);
    expect(ResourceSchema.safeParse({ ...base, quality: undefined }).success).toBe(true);
  });

  it('come from the file: the canon rows at priority 1, and the grade-3 rows at priority 3 or lower but for the few the file keeps higher', () => {
    const graded = [...raw.resources, ...raw.papers].filter((r) => r.quality !== undefined);
    const canon = graded.filter((r) => r.quality === 5);
    expect(canon.length).toBeGreaterThan(900);
    expect(canon.every((r) => r.priority === 1)).toBe(true);
    const three = graded.filter((r) => r.quality === 3);
    // The "four stars and up" file keeps 23 of its 260 grade-3 rows at priority 1 or 2 (the only coverage of a topic
    // asked for, such as LeetGPU).
    expect(three.filter((r) => (r.priority ?? 4) < 3).length).toBeLessThan(30);
    expect(raw.resources.find((r) => r.id === 'stanford-cs229')?.quality).toBe(5);
  });
});

describe('the rows the pass dropped', () => {
  it('are gone, except the one on the plan, and nothing comes after one', () => {
    const ids = new Set([...raw.resources, ...raw.papers].map((r) => r.id));
    // 16,422 after the quality pass, 7,650 after the "four stars and up" pass (7,640 rows), 7,691 after the upgrade pass,
    // 7,751 after the coverage pass.
    expect(raw.resources.length).toBeLessThan(7_800);
    expect(raw.resources.length).toBeGreaterThan(7_600);
    // 30 Days of Python was graded 1 or 2, but it is on the plan (phase y1-p0, lane B) with its units and its certificate.
    expect(ids.has('30-days-of-python')).toBe(true);
    for (const id of ['article-kdnuggets-winning-entry', 'repo-competitive-companion']) expect(ids.has(id), id).toBe(false);
    for (const r of raw.resources) for (const after of r.after ?? []) expect(ids.has(after), r.id + ' after ' + after).toBe(true);
  });
});

describe('Up next, the paths and Research', () => {
  it('suggest no row graded 3 or lower, and a path keeps them for "More resources"', () => {
    const next = upNext(buildPaths(seed, new Map()), seed, 200, new Map());
    expect(next.length).toBeGreaterThan(5);
    expect(next.every((u) => !isLesser(u.step.fit.quality))).toBe(true);
    expect(next.some((u) => u.step.refId === 'ml-zoomcamp' || u.step.refId === 'roadmap-ai-engineer')).toBe(false);
    const extras = pathExtras(seed, new Map(), 'devops');
    expect(extras.some((r) => isLesser(r.quality))).toBe(true);
    expect(extras.some((r) => !isLesser(r.quality))).toBe(true);
    const areas = researchAreas(seed, new Map());
    expect(areas.every((a) => a.items.some((i) => !isLesser(i.fit.quality)))).toBe(true);
  });
});

describe('the "four stars and up" pass (7,640 rows)', () => {
  it('keeps the rows the plan or the data still name, adds the replacements and grades every row of the file', () => {
    const ids = new Set([...raw.resources, ...raw.papers].map((r) => r.id));
    // On the plan (ML Zoomcamp), or named by a project, a doc or the internships (Kaggle Learn, build-your-own-x, the
    // CuTe DSL notebooks, the WSL setup): kept although the file dropped them.
    for (const id of ['ml-zoomcamp', 'kaggle-learn', 'build-your-own-x', 'tutorial-cute-dsl-notebooks', 'tutorial-wsl-dev-environment']) expect(ids.has(id), id).toBe(true);
    // The replacements came in; Glaser et al.'s 2015 review replaced Koch et al.'s 2022 report and is its own row.
    for (const id of ['paper-diloco', 'paper-ray-distributed-framework', 'paper-carla-simulator', 'paper-dagger-ross', 'repo-docling', 'paper-glaser-training-schrodingers-cat']) expect(ids.has(id), id).toBe(true);
    expect(ids.has('paper-koch-quantum-optimal-control')).toBe(false);
    const fromFile = [...raw.resources, ...raw.papers].filter((r) => r.priority !== undefined);
    expect(fromFile.filter((r) => r.quality === undefined).length).toBeLessThan(fromFile.length * 0.01);
    const graded = [...raw.resources, ...raw.papers].filter((r) => r.quality !== undefined);
    expect(graded.filter((r) => r.quality! >= 4).length / graded.length).toBeGreaterThan(0.9);
  });
});

describe('the category refill and the upgrade pass (7,679 rows)', () => {
  it('brings back the refilled rows under their old ids, adds the new ones and drops the superseded', () => {
    const byId = new Map([...raw.resources, ...raw.papers].map((r) => [r.id, r]));
    // Restored under the ids the "four stars and up" pass removed, so a device's kept progress on them reattaches.
    for (const id of ['repo-swiftide', 'repo-mistral-rs', 'docs-codex-linux-sandbox']) expect(byId.has(id), id).toBe(true);
    // The new 4–5★ rows: expert blogs for the thin tracks, defensive malware analysis, shipping games, agent books.
    for (const id of ['blog-flyio', 'blog-bitsquid', 'blog-pennylane', 'book-practical-malware-analysis', 'docs-steamworks', 'book-designing-multi-agent-systems', 'docs-pyinstaller-manual']) expect(byId.has(id), id).toBe(true);
    // Superseded rows are gone, each by a 4–5★ row on the same topic.
    for (const id of ['paper-harness-learning', 'article-meta-cicero', 'docs-pyinstaller-usage', 'docs-electron-forge-code-signing']) expect(byId.has(id), id).toBe(false);
    // Electron's code-signing tutorial replaced Electron Forge's guide: its own row, not merged into the removed one.
    expect(byId.get('docs-electron-code-signing')?.url).toBe('https://www.electronjs.org/docs/latest/tutorial/code-signing');
    // CSWP came after CSWA, which the pass removed: the prerequisite stays text.
    const cswp = raw.resources.find((r) => r.id === 'cert-solidworks-cswp');
    expect(cswp?.after ?? []).toEqual([]);
    expect(cswp?.doFirst).toBe('SOLIDWORKS CSWA');
    const graded = [...raw.resources, ...raw.papers].filter((r) => r.quality !== undefined);
    expect(graded.filter((r) => r.quality! >= 4).length / graded.length).toBeGreaterThan(0.95);
  });
});

describe('the coverage pass (7,740 rows)', () => {
  it('adds the thin cells’ rows, moves rows to their track and type in place, and leaves the curated rows as they are', () => {
    const byId = new Map(raw.resources.map((r) => [r.id, r]));
    for (const id of ['course-cs50-2d-game-development', 'blog-factorio-friday-facts', 'book-kubernetes-up-and-running-3e', 'video-tudelft-building-blocks-quantum-computer-1', 'blog-everyday-astronaut', 'blog-cern-courier', 'tutorial-mujoco-python-colab', 'book-immersive-linear-algebra']) expect(byId.has(id), id).toBe(true);
    // Seeing Theory was in the Library already, by its URL: no second row.
    expect(byId.has('tutorial-seeing-theory')).toBe(false);
    expect(byId.has('seeing-theory')).toBe(true);
    // Nine quantum-computing rows to quantum, MIT 22.01 to engineering, Pro Git and Accelerate to DevOps.
    for (const id of ['quantum-country', 'docs-qiskit', 'preskill-ph219-quantum-computation', 'notes-aaronson-democritus']) expect(byId.get(id)?.tracks, id).toEqual(['quantum']);
    expect(byId.get('course-mit-22-01-nuclear-eng')?.tracks).toEqual(['engineering']);
    expect(byId.get('book-pro-git')?.tracks).toEqual(['devops']);
    expect(byId.get('book-accelerate')?.tracks).toEqual(['devops']);
    expect(byId.get('paper-cg-without-agonizing-pain')?.type).toBe('article');
    // The plan's own Missing Semester keeps its curated track: the file's DevOps row merged into it.
    expect(byId.get('missing-semester')?.tracks).toEqual(['swe']);
  });
});
