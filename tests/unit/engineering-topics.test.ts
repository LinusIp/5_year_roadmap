import { describe, expect, it } from 'vitest';
import { TOPICS, topicsOf } from '../../src/lib/engineering-topics.ts';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';

describe('Engineering path areas', () => {
  it('offers the eleven chips of the prompt, in its order', () => {
    expect(TOPICS.map((t) => t.label)).toEqual(['Mechanics', 'Materials', 'Thermo-fluids', 'Design & CAD', 'Manufacturing', 'Electronics & PCB', 'Power & energy', 'Control', 'Aerospace', 'Chemical & nuclear', 'Practice']);
  });

  it('reads an area from the title and the summary, at the start of a word', () => {
    expect(topicsOf('Mechanical Vibrations (MIT 2.003SC)')).toEqual(['mechanics']);
    expect(topicsOf('KiCad Getting Started')).toEqual(['electronics']);
    expect(topicsOf('Rocket Propulsion Elements')).toEqual(['aerospace']);
    expect(topicsOf('Elements of Chemical Reaction Engineering (Fogler)')).toContain('chemical');
    expect(topicsOf('A course', 'PID loops, Bode plots and state-space control of a motor drive')).toEqual(['power', 'control']);
    expect(topicsOf('Systems Engineering Handbook (NASA)')).toEqual(expect.arrayContaining(['aerospace', 'practice']));
  });

  it('matches whole word starts, not the inside of a word', () => {
    expect(topicsOf('OpenSCAD is CAD; scads of ocaml are not')).toEqual(['design']);
    expect(topicsOf('Scads of OCaml')).toEqual([]);
    expect(topicsOf('Sheet metal design in Onshape')).toEqual(expect.arrayContaining(['manufacturing', 'design']));
    expect(topicsOf('An introduction to nothing in particular')).toEqual([]);
  });

  it('covers most of the engineering track, each area with dozens of rows', () => {
    const seed = loadSeedOrThrow();
    const rows = seed.resources.filter((r) => ['engineering', 'ee', 'embedded', 'controls', 'mech'].includes(r.tracks[0]!));
    const counts = new Map<string, number>();
    let none = 0;
    for (const r of rows) {
      const areas = topicsOf(r.title, r.summary ?? '');
      if (areas.length === 0) none += 1;
      for (const a of areas) counts.set(a, (counts.get(a) ?? 0) + 1);
    }
    for (const t of TOPICS) expect(counts.get(t.key) ?? 0, t.label).toBeGreaterThan(40);
    expect(none / rows.length).toBeLessThan(0.15);
  });
});
