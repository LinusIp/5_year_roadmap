/**
 * "Compact power & energy conversion" (ATLAS-LIBRARY, 14,547 rows): the quick filter for the energy and extreme
 * physics cluster, which the file spreads across the engineering, simulation, math and physics and hardware tracks
 * rather than giving it a track of its own. The prompt's words, matched on an item's title and summary (the file's
 * `why`); a filter over those tracks only, since in AI and systems "fusion" is kernel fusion and an "accelerator" a
 * GPU, and in chip design an accelerator is an NPU.
 */
export const ENERGY_WORDS: readonly string[] = ['fusion', 'aneutronic', 'direct conversion', 'thermoelectric', 'thermionic', 'thermophotovoltaic', 'betavoltaic', 'RTG', 'radioisotope', 'Kilopower', 'microreactor', 'nuclear thermal', 'pulsed power', 'superconduct', 'HTS', 'MHD', 'Stirling', 'accelerator', 'plasma'];

/** The tracks the cluster lives in (the file's engineering, simulation, math and hardware, and the tracks they gather). */
export const ENERGY_TRACKS: ReadonlySet<string> = new Set(['engineering', 'ee', 'embedded', 'controls', 'mech', 'simulation', 'math', 'physics', 'chem', 'hardware']);

/** The words that name something else in chip design: an accelerator is an NPU there. */
const NOT_IN_HARDWARE: ReadonlySet<string> = new Set(['accelerator', 'fusion']);

const PATTERNS = ENERGY_WORDS.map((w) => ({
  word: w,
  // An acronym (RTG, HTS, MHD) is a whole word in its own case; a word matches at its start in any case, so
  // "superconduct" finds superconductors and superconducting.
  re: w === w.toUpperCase() ? new RegExp('(^|[^A-Za-z])' + w + '(?![A-Za-z])') : new RegExp('(^|[^a-z])' + w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
}));

/** Whether a resource of `track` belongs to the cluster, by its title and summary. */
export function isEnergy(title: string, summary = '', track = ''): boolean {
  if (!ENERGY_TRACKS.has(track)) return false;
  const text = title + ' ' + summary;
  return PATTERNS.some((p) => !(track === 'hardware' && NOT_IN_HARDWARE.has(p.word)) && p.re.test(text));
}
