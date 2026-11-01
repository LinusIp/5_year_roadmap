import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { shelfOf } from '../../src/lib/library-home.ts';
import {
  AEROSPACE_AREAS, AEROSPACE_WORDS, aerospaceAreasOf, BUILD_YOURSELF_AREAS, BUILD_YOURSELF_WORDS, buildYourselfAreasOf, FUSION_AREAS, FUSION_WORDS, fusionAreasOf, GPU_CUDA_WORDS, isAerospace, isBuildYourself, isFusion, isGpuCuda, isLowLevel, isResearchScience, isSdkApi, LOW_LEVEL_AREAS, LOW_LEVEL_WORDS, lowLevelAreasOf, RESEARCH_SCIENCE_AREAS, RESEARCH_SCIENCE_WORDS, researchScienceAreasOf, SDK_API_WORDS,
} from '../../src/lib/craft.ts';
import { quickPicks } from '../../src/lib/quick-filters.ts';
import { compile, compilePhrases, hits, isProper, reason } from '../../src/lib/words.ts';

/** The thirteenth file (ATLAS-LIBRARY, 17,283 rows): seven quick filters for the cracked dev, the researcher and the frontier engineer. */
describe('the shared matcher', () => {
  it('reads a proper name as a whole word in its own case, a plain word at its start in any case, a phrase in any case', () => {
    expect(isProper('GDB')).toBe(true);
    expect(isProper('Linux kernel')).toBe(false);
    expect(hits(compile(['GDB']), 'Debugging with gdb')).toBe(false);
    expect(hits(compile(['GDB']), 'GDB cheat sheet')).toBe(true);
    expect(hits(compile(['perf ']), 'High performance')).toBe(false);
    expect(hits(compile(['perf ']), 'perf Examples')).toBe(true);
    expect(hits(compilePhrases(['from scratch']), 'A GPT From Scratch')).toBe(true);
    expect(reason(['assembly', 'x86'], 'x86-64 assembly')).toBe('assembly');
    expect(reason(['assembly'], 'A disassembly')).toBeNull();
  });
});

describe('the prompt\'s words and the areas', () => {
  it('keeps the words of the prompt for each filter', () => {
    expect(BUILD_YOURSELF_WORDS).toEqual(['from scratch', 'build your own', 'implement', 'write a', 'tutorial series', 'emulator', 'interpreter', 'compiler', 'kernel', 'OS']);
    expect(LOW_LEVEL_WORDS).toEqual(['assembly', 'x86', 'ARM', 'RISC-V', 'ABI', 'linker', 'ELF', 'microarchitecture', 'SIMD', 'profiler', 'perf', 'debugger', 'gdb', 'lldb', 'rr', 'kernel', 'syscall', 'RCU', 'LWN', 'RFC', 'TCP']);
    expect(RESEARCH_SCIENCE_WORDS).toEqual(['theory', 'proof', 'probability', 'measure', 'statistics', 'inference', 'learning theory', 'physics', 'quantum', 'relativity', 'philosophy of science', 'experiment', 'reproducibility', 'Nobel', 'Turing lecture']);
    expect(GPU_CUDA_WORDS).toEqual(['CUDA', 'PTX', 'SASS', 'CUTLASS', 'CuTe', 'tensor core', 'TMA', 'warp', 'kernel', 'Nsight', 'NCCL', 'HIP', 'ROCm', 'Triton']);
    expect(SDK_API_WORDS).toEqual(['SDK', 'API design', 'AIP', 'guidelines', 'semver', 'versioning', 'deprecation', 'ABI', 'FFI', 'bindings', 'pybind11', 'nanobind', 'PyO3', 'protobuf', 'OpenAPI', 'Smithy']);
    expect(FUSION_WORDS).toEqual(['fusion', 'tokamak', 'stellarator', 'blanket', 'tritium', 'direct energy conversion', 'Brayton', 'magnet', 'REBCO', 'accelerator', 'beam', 'linac', 'synchrotron', 'SRF', 'RF cavity', 'FEL', 'wakefield', 'CERN']);
    expect(AEROSPACE_WORDS).toEqual(['rocket', 'propulsion', 'turbopump', 'nozzle', 'orbit', 'astrodynamics', 'trajectory', 'guidance', 'GNC', 'reentry', 'aerodynamics', 'compressible', 'combustion', 'spacecraft', 'NASA', 'NACA', 'JPL']);
  });

  it('offers the sub-chips the prompt names', () => {
    expect(BUILD_YOURSELF_AREAS.map((a) => a.label)).toEqual(['Languages & compilers', 'OS & kernels', 'Networking', 'Databases & storage', 'Emulators & graphics', 'AI from scratch']);
    expect(LOW_LEVEL_AREAS.map((a) => a.label)).toEqual(['Assembly & ISA', 'Microarchitecture', 'Debugging & profiling', 'Linux kernel', 'Networking']);
    expect(RESEARCH_SCIENCE_AREAS.map((a) => a.label)).toEqual(['Rigorous math', 'ML theory', 'Physics', 'How science works', 'Great lectures']);
    expect(FUSION_AREAS.map((a) => a.label)).toEqual(['Plasma', 'Energy conversion', 'Magnets', 'Accelerators']);
    expect(AEROSPACE_AREAS.map((a) => a.label)).toEqual(['Propulsion', 'Astrodynamics', 'GNC', 'Aero & structures', 'Space systems']);
  });
});

describe('Build it yourself', () => {
  it('names a thing written from nothing, in the software tracks', () => {
    expect(isBuildYourself('Crafting Interpreters', 'A handbook for making programming languages.', 'languages')).toBe(true);
    expect(isBuildYourself('Writing an OS in Rust', 'Blog OS.', 'systems')).toBe(true);
    expect(isBuildYourself('Build a Large Language Model (From Scratch)', '', 'ai')).toBe(true);
    expect(isBuildYourself('CHIP-8 emulator tutorial', 'A first emulator.', 'systems')).toBe(true);
    // The prompt's broad words count in their phrases: "implement" and "write a" alone name every paper and every proposal guide.
    expect(isBuildYourself('CleanRL', 'Single-file implementations of PPO.', 'ai')).toBe(false);
    expect(isBuildYourself('How to write a proposal', 'Writing a GSoC proposal.', 'devops')).toBe(false);
    expect(isBuildYourself('Build your own robot', 'A robot arm from scratch.', 'robotics')).toBe(false);
  });
  it('reads the areas from the title and summary', () => {
    expect(buildYourselfAreasOf('Crafting Interpreters', 'A tree-walk interpreter and a bytecode virtual machine.')).toEqual(['languages', 'os']);
    expect(buildYourselfAreasOf('Implementing DNS in a weekend', 'A toy DNS resolver.')).toEqual(['networking']);
    expect(buildYourselfAreasOf('micrograd', 'A tiny autograd engine.')).toEqual(['ai']);
  });
});

describe('Low-level & performance', () => {
  it('names the machine, the kernel and the wire, in the systems tracks', () => {
    expect(isLowLevel('perf Examples', "Brendan Gregg's perf one-liners.", 'systems')).toBe(true);
    expect(isLowLevel('Linux kernel memory barriers', 'memory-barriers.txt', 'systems')).toBe(true);
    expect(isLowLevel('RFC 9293: Transmission Control Protocol (TCP)', '', 'systems')).toBe(true);
    expect(isLowLevel('x86-64 Assembly Language Programming with Ubuntu', '', 'systems')).toBe(true);
    // "kernel" alone names every GPU kernel; "perf" alone every performance guide; the ai track is not the cluster.
    expect(isLowLevel('Epilogue Fusion in CUTLASS', 'GPU kernel fusion.', 'inference')).toBe(false);
    expect(isLowLevel('High performance Python', '', 'languages')).toBe(false);
    expect(isLowLevel('TCP congestion control for LLM serving', '', 'ai')).toBe(false);
  });
  it('reads the areas from the title and summary', () => {
    expect(lowLevelAreasOf('perf Examples', "Brendan Gregg's perf one-liners for CPU profiling.")).toEqual(['micro', 'debug']);
    expect(lowLevelAreasOf('RFC 9293: Transmission Control Protocol (TCP)', '')).toEqual(['networking']);
    expect(lowLevelAreasOf('Sequence counters and sequential locks', 'The kernel seqlock.')).toEqual(['kernel']);
  });
});

describe('Research & science', () => {
  it('names the mathematics and the physics on the math track, learning theory on the ai track, lectures and the craft of science anywhere', () => {
    expect(isResearchScience('Probability: Theory and Examples (5th ed.)', 'The standard graduate measure-theoretic probability text.', 'math')).toBe(true);
    expect(isResearchScience('8.033 Relativity (Fall 2006)', "Tegmark's undergraduate relativity course.", 'math')).toBe(true);
    expect(isResearchScience('Boltzmann Machines (Nobel Lecture 2024)', "Hinton's own explanation.", 'ai')).toBe(true);
    expect(isResearchScience('Benefits of depth in neural networks', 'A crisp depth-separation result.', 'ai')).toBe(true);
    expect(isResearchScience('Cargo Cult Science', 'Feynman at Caltech.', 'engineering')).toBe(true);
    // The inference track's "inference" is serving; a scaling-law paper is engineering; a Vulkan "optimization" row is graphics.
    expect(isResearchScience('SGLang deterministic inference', 'Statistical inference served fast.', 'inference')).toBe(false);
    expect(isResearchScience('Scaling Laws for Neural Language Models', 'The engineering of scaling.', 'ai')).toBe(false);
    expect(isResearchScience('Vulkan optimization', 'Measure the frame.', 'graphics')).toBe(false);
  });
  it('reads the areas from the title and summary', () => {
    expect(researchScienceAreasOf('Boltzmann Machines (Nobel Lecture 2024)', "Hinton's own explanation of Boltzmann machines.")).toEqual(['mltheory', 'lectures']);
    expect(researchScienceAreasOf('Measure, Integration & Real Analysis', '')).toEqual(['math']);
    expect(researchScienceAreasOf('Reproducibility of Scientific Results (Stanford Encyclopedia of Philosophy)', '')).toEqual(['craft']);
  });
});

describe('the frontier round', () => {
  it('finds GPU & CUDA by the kernel-level vocabulary, "kernel" alone only on the inference track', () => {
    expect(isGpuCuda('CUDA Programming Guide 2.3: Writing SIMT Kernels', '', 'inference')).toBe(true);
    expect(isGpuCuda('Epilogue Fusion in CUTLASS', 'Fusing the epilogue into the kernel.', 'inference')).toBe(true);
    expect(isGpuCuda('HIP Programming Model', 'Maps the CUDA thread/block/warp model.', 'inference')).toBe(true);
    expect(isGpuCuda('Memory Allocation Guide', 'The kernel memory allocation APIs.', 'systems')).toBe(false);
    expect(isGpuCuda('CUDA by Example', '', 'engineering')).toBe(false);
  });
  it('finds SDK & API design by the vocabulary of public interfaces, not every REST tutorial', () => {
    expect(isSdkApi('AIP-180: Backwards compatibility', '', 'architecture')).toBe(true);
    expect(isSdkApi('pybind11 documentation', 'Expose C++ to Python.', 'languages')).toBe(true);
    expect(isSdkApi('SemVer Compatibility (The Cargo Book)', '', 'languages')).toBe(true);
    expect(isSdkApi('Flask Quickstart', 'Build a REST API with Flask.', 'languages')).toBe(false);
    expect(isSdkApi('Swift Concurrency', 'async/await in Swift.', 'languages')).toBe(false);
  });
  it('finds Fusion & accelerators on the engineering tracks, not a kernel fusion or a beam search', () => {
    expect(isFusion('Plasma Physics and Fusion Energy', "MIT's standard fusion text.", 'engineering')).toBe(true);
    expect(isFusion('II.5 Superconducting RF cavities', 'Connects RF superconductivity to cavity design.', 'engineering')).toBe(true);
    expect(isFusion('Epilogue Fusion in CUTLASS', '', 'inference')).toBe(false);
    expect(isFusion('Beam search decoding', '', 'ai')).toBe(false);
    expect(fusionAreasOf('II.5 Superconducting RF cavities', 'Connects RF superconductivity to cavity design.')).toEqual(['magnets', 'accelerators']);
    expect(fusionAreasOf('A Review of Direct Energy Conversion for Fusion Reactors', '')).toEqual(['plasma', 'conversion']);
  });
  it('finds Aerospace on the engineering tracks, with its five areas', () => {
    expect(isAerospace('Fundamentals of Astrodynamics', 'A 700-page TU Delft textbook.', 'engineering')).toBe(true);
    expect(isAerospace('Apollo Lunar-Descent Guidance', '', 'robotics')).toBe(true);
    expect(isAerospace('Orbit: a JavaScript HTTP client', '', 'languages')).toBe(false);
    expect(aerospaceAreasOf('Turbopump Systems for Liquid Rocket Engines (NASA SP-8107)', 'Design criteria.')).toEqual(['propulsion', 'space']);
    expect(aerospaceAreasOf('Apollo Lunar-Descent Guidance', 'The guidance law that landed the lunar module.')).toEqual(['astro', 'gnc', 'space']);
  });
});

describe('in the data', () => {
  it('gathers each cluster with hundreds of rows, every row of a cluster with areas in at least one area, and the registry agrees', () => {
    const seed = loadSeedOrThrow();
    const rows = [...seed.resources.map((r) => ({ id: r.id, title: r.title, summary: r.summary, track: r.tracks[0], tags: r.tags, shelf: shelfOf(r) })), ...seed.papers.map((p) => ({ id: p.id, title: p.title, summary: p.summary, track: p.tracks[0], tags: undefined, shelf: 'paper' }))];
    const picks = rows.map((r) => quickPicks(r));
    const count = (key: string): number => picks.filter((p) => p.includes(key)).length;
    const bounds: Record<string, [number, number]> = { buildyourself: [200, 450], lowlevel: [600, 1100], science: [600, 1200], gpu: [600, 1100], sdk: [150, 350], fusion: [400, 700], aerospace: [350, 650] };
    for (const [key, [lo, hi]] of Object.entries(bounds)) {
      const n = count(key);
      expect(n, key).toBeGreaterThan(lo);
      expect(n, key).toBeLessThan(hi);
    }
    const noArea = (is: (t: string, s: string, tr: string) => boolean, areasOf: (t: string, s: string) => string[]): number =>
      rows.filter((r) => is(r.title, r.summary ?? '', r.track ?? '') && areasOf(r.title, r.summary ?? '').length === 0).length;
    expect(noArea(isFusion, fusionAreasOf)).toBeLessThan(40);
    expect(noArea(isAerospace, aerospaceAreasOf)).toBeLessThan(40);
    expect(noArea(isLowLevel, lowLevelAreasOf)).toBeLessThan(60);
  }, 60_000);
});
