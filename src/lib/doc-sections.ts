/**
 * The tech doc's jump bar: four parts, and which one the reader is in. Pure, so the tracking is unit-tested.
 */
export type DocPart = 'overview' | 'design' | 'build' | 'checks';

export const DOC_PARTS: readonly { value: DocPart; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'design', label: 'Design' },
  { value: 'build', label: 'Build' },
  { value: 'checks', label: 'Checks' },
];

/**
 * The part being read: the last one whose heading has scrolled up to the line just under the sticky bar
 * (`offset` px from the top of the scroller). At the very bottom it is the last part, even when that one is too
 * short to reach the line. `tops` are each part's distance from the top of the scrolled content.
 */
export function currentPart(tops: readonly { part: DocPart; top: number }[], scroll: { top: number; height: number; scrollHeight: number }, offset = 80): DocPart {
  if (tops.length === 0) return 'overview';
  const sorted = [...tops].sort((a, b) => a.top - b.top);
  if (scroll.top + scroll.height >= scroll.scrollHeight - 2 && scroll.top > 0) return sorted[sorted.length - 1]!.part;
  let current = sorted[0]!.part;
  for (const t of sorted) if (t.top <= scroll.top + offset) current = t.part;
  return current;
}

/**
 * The thing that travels through the system, for the step list's heading: "One ticket, step by step". The noun the
 * flow and overview use most, from a short list; "request" when none of them is used.
 */
export function flowNoun(texts: readonly string[]): string {
  const nouns = ['ticket', 'request', 'frame', 'job', 'packet', 'message', 'sample', 'batch', 'order', 'query', 'event', 'reading', 'image', 'file', 'document', 'step', 'tick'];
  const all = texts.join(' ').toLowerCase();
  let best = 'request';
  let most = 0;
  for (const noun of nouns) {
    const n = all.match(new RegExp('\\b' + noun + 's?\\b', 'g'))?.length ?? 0;
    if (n > most) {
      most = n;
      best = noun;
    }
  }
  return best;
}

/** Splits text into plain runs and the numbers worth stressing ("< 3 s", "1,200 tickets", "$15", "0.80"). */
export function keyNumbers(text: string): { text: string; number: boolean }[] {
  const parts: { text: string; number: boolean }[] = [];
  const re = /(?:[<>≤≥~]\s?)?\$?\d[\d,.]*(?:\s?(?:%|ms|s|h|min|k|M|B|GB|MB|kB|TB|px|fps|Hz|kHz|MHz|GHz|°C|V|mV|A|mA|W|kW|x|×))?(?![\w]|-[A-Za-z])/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    // A digit inside a word or an id (v2, H100, 6061-T6) stays plain.
    const before = text[m.index - 1];
    if (before && /[A-Za-z-]/.test(before)) continue;
    if (m.index > last) parts.push({ text: text.slice(last, m.index), number: false });
    parts.push({ text: m[0], number: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), number: false });
  return parts;
}
