import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { shelfOf } from '../../src/lib/library-home.ts';
import { isResearchScience, RESEARCH_SCIENCE_AREAS, researchScienceAreasOf } from '../../src/lib/craft.ts';
import { isElectronics, isFormalMethods, isMechanics, isScientificComputing, MECHANICS_AREAS, mechanicsAreasOf } from '../../src/lib/foundations.ts';
import { quickFilterOf, quickPicks } from '../../src/lib/quick-filters.ts';

/** The fourteenth file (ATLAS-LIBRARY, 17,848 rows): engineering-physics foundations and software depth. */
describe('Electronics & EM', () => {
  it('names circuits, analog and RF design and fields on the engineering tracks', () => {
    expect(isElectronics('MT-047 Tutorial: Op Amp Noise', 'Voltage, current and resistor noise.', 'engineering')).toBe(true);
    expect(isElectronics('Microwave Engineering (4th ed.)', 'S-parameters.', 'engineering')).toBe(true);
    expect(isElectronics('Electromagnetics, Volume 1', 'CC-licensed EM textbook.', 'engineering')).toBe(true);
    // Noise on the AI track is a loss, not a circuit; CAD is design, not electronics.
    expect(isElectronics('Noise contrastive estimation', '', 'ai')).toBe(false);
    expect(isElectronics('FreeCAD Manual', 'Parametric 3D modelling.', 'engineering')).toBe(false);
  });
});

describe('Mechanics & materials', () => {
  it('offers the four sub-chips of the prompt', () => {
    expect(MECHANICS_AREAS.map((a) => a.label)).toEqual(['Fluids', 'Solids', 'Materials', 'Nuclear']);
  });
  it('names fluids, solids, materials and the nuclear codes on the engineering, simulation and math tracks', () => {
    expect(isMechanics('Fluid Mechanics (6th Edition)', 'The standard graduate-entry fluids text.', 'engineering')).toBe(true);
    expect(mechanicsAreasOf('Fluid Mechanics (6th Edition)', 'The standard graduate-entry fluids text.')).toEqual(['fluids']);
    expect(mechanicsAreasOf('Applied Mechanics of Solids', 'A complete graduate solid mechanics text.')).toEqual(['solids']);
    expect(mechanicsAreasOf('Introduction to Dislocations (5th ed.)', 'Compact standard text on dislocation geometry.')).toEqual(['materials']);
    expect(mechanicsAreasOf('An MCNP Primer (2024 edition)', 'The gentlest walk through MCNP input decks.')).toEqual(['nuclear']);
    // A chip-design "flow" is not a fluid; the AI track is not the cluster.
    expect(isMechanics('OpenROAD Documentation', 'An RTL-to-GDS flow.', 'engineering')).toBe(false);
    expect(isMechanics('Fluid Mechanics', '', 'ai')).toBe(false);
  });
});

describe('Scientific computing', () => {
  it('names the numerical methods, the solver libraries and scientific ML, not a DNS server or a service mesh', () => {
    expect(isScientificComputing('PETSc tutorials', 'Krylov solvers and preconditioners.', 'simulation')).toBe(true);
    expect(isScientificComputing('DeepONet: Learning nonlinear operators', 'Branch-trunk operator networks for differential equations.', 'ai')).toBe(true);
    expect(isScientificComputing('Implement DNS in a weekend', '', 'systems')).toBe(false);
    expect(isScientificComputing('Pattern: Service mesh', '', 'architecture')).toBe(false);
    expect(isScientificComputing('Numerical stability in low-precision training', '', 'ai')).toBe(false);
  });
});

describe('Formal methods', () => {
  it('names specification, model checking, proof assistants and verified software, not a proof of stake or lean manufacturing', () => {
    expect(isFormalMethods('Specifying Systems: The TLA+ Language and Tools', '', 'architecture')).toBe(true);
    expect(isFormalMethods('seL4 verification', 'Machine-checked proofs of the microkernel.', 'systems')).toBe(true);
    expect(isFormalMethods('Mathematics in Lean', 'Lean 4 and mathlib.', 'ai')).toBe(true);
    expect(isFormalMethods('Proving the Lottery Ticket Hypothesis', '', 'ai')).toBe(false);
    expect(isFormalMethods('Ethereum Proof-of-Stake Consensus Specifications', '', 'systems')).toBe(false);
    expect(isFormalMethods('Lean manufacturing', 'Lean six sigma.', 'engineering')).toBe(false);
  });
});

describe('Research writing', () => {
  it('is an area of Research & science, and its rows join the filter on the research tracks', () => {
    expect(RESEARCH_SCIENCE_AREAS.map((a) => a.label)).toEqual(['Rigorous math', 'ML theory', 'Physics', 'How science works', 'Research writing', 'Great lectures']);
    expect(isResearchScience('The Science of Scientific Writing', 'Reader expectations.', 'ai')).toBe(true);
    expect(researchScienceAreasOf('Ten simple rules for writing a response to reviewers', 'Rebuttals.')).toContain('writing');
    // A posterior is not a poster; a LaTeX résumé template on the architecture track is a career row.
    expect(researchScienceAreasOf('What Are Bayesian Neural Network Posteriors Really Like?', '')).not.toContain('writing');
    expect(isResearchScience("Jake's Resume (LaTeX template)", '', 'architecture')).toBe(false);
  });
});

describe('in the data', () => {
  it('gathers each cluster, every Mechanics & materials row in an area, and the registry carries the four', () => {
    const seed = loadSeedOrThrow();
    const rows = [...seed.resources.map((r) => ({ id: r.id, title: r.title, summary: r.summary, track: r.tracks[0], tags: r.tags, shelf: shelfOf(r) })), ...seed.papers.map((p) => ({ id: p.id, title: p.title, summary: p.summary, track: p.tracks[0], tags: undefined, shelf: 'paper' }))];
    const picks = rows.map((r) => quickPicks(r));
    const count = (key: string): number => picks.filter((p) => p.includes(key)).length;
    const bounds: Record<string, [number, number]> = { electronics: [300, 600], mechanics: [800, 1300], scicomp: [300, 600], formal: [120, 300] };
    for (const [key, [lo, hi]] of Object.entries(bounds)) {
      expect(count(key), key).toBeGreaterThan(lo);
      expect(count(key), key).toBeLessThan(hi);
    }
    expect(rows.filter((r) => isMechanics(r.title, r.summary ?? '', r.track ?? '') && mechanicsAreasOf(r.title, r.summary ?? '').length === 0)).toHaveLength(0);
    expect(quickFilterOf('mechanics')?.areas?.map((a) => a.label)).toEqual(['Fluids', 'Solids', 'Materials', 'Nuclear']);
    expect(quickFilterOf('electronics')?.areas).toBeUndefined();
    expect(quickFilterOf('formal')?.search).toBe('Search formal methods');
  }, 60_000);
});
