import { describe, expect, it } from 'vitest';
import { ENERGY_WORDS, isEnergy } from '../../src/lib/energy.ts';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';

describe('Compact power & energy conversion', () => {
  it('uses the words of the prompt', () => {
    expect(ENERGY_WORDS).toEqual(['fusion', 'aneutronic', 'direct conversion', 'thermoelectric', 'thermionic', 'thermophotovoltaic', 'betavoltaic', 'RTG', 'radioisotope', 'Kilopower', 'microreactor', 'nuclear thermal', 'pulsed power', 'superconduct', 'HTS', 'MHD', 'Stirling', 'accelerator', 'plasma']);
  });

  it('matches a word at its start in the title or summary, in the energy tracks', () => {
    expect(isEnergy('What is a Tokamak?', 'Magnetic confinement fusion explained', 'math')).toBe(true);
    expect(isEnergy('Superconducting magnets', '', 'engineering')).toBe(true);
    expect(isEnergy('A Stirling engine build', '', 'mech')).toBe(true);
    expect(isEnergy('Thermoelectric generators', '', 'engineering')).toBe(true);
    expect(isEnergy('PlasmaPy', 'Python for plasma physics', 'simulation')).toBe(true);
    expect(isEnergy('High-temperature superconductors', 'HTS tape', 'hardware')).toBe(true);
  });

  it('reads an acronym as a whole word in its own case', () => {
    expect(isEnergy('MHD generators', '', 'engineering')).toBe(true);
    expect(isEnergy('Rtg is a name', '', 'engineering')).toBe(false);
    expect(isEnergy('Lights for the night', '', 'engineering')).toBe(false);
  });

  it('leaves kernel fusion and GPU accelerators out: the filter is over the energy tracks', () => {
    expect(isEnergy('FLUX: kernel fusion on GPUs', '', 'ai')).toBe(false);
    expect(isEnergy('Fusion Blossom: a QEC decoder', '', 'quantum')).toBe(false);
    expect(isEnergy('tiny-tpu', 'An ML accelerator in Verilog', 'hardware')).toBe(false);
    expect(isEnergy('Operator fusion in a compiler', '', 'hardware')).toBe(false);
    expect(isEnergy('A particle accelerator', '', 'math')).toBe(true);
  });

  it('finds the cluster in the data, in simulation, math and physics and engineering', () => {
    const seed = loadSeedOrThrow();
    const hits = seed.resources.filter((r) => isEnergy(r.title, r.summary, r.tracks[0]));
    expect(hits.length).toBeGreaterThan(50);
    const tracks = new Set<string>(hits.map((r) => r.tracks[0]!));
    expect(tracks.has('simulation')).toBe(true);
    expect(tracks.has('math')).toBe(true);
    expect(tracks.has('ai')).toBe(false);
  });
});
