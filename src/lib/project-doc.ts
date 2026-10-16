/**
 * A project's tech doc (data/projects/docs/<project id>.md): parsing, checking and the README skeleton.
 *
 * The doc follows one template, a title then bold-labelled paragraphs in a fixed order:
 *
 *   # Title
 *   **Goal.** … **Why.** … **Scope.** … **Architecture.** … **Stack.** … [**Parts and budget.** …]
 *   **Milestones.** Step one (3 h) · Step two (4 h) · … Total 7 h.
 *   **Done when.** … **Measure and report.** … **Pitfalls.** … **References.** id-a, id-b. **Write-up.** …
 *
 * Milestones become checkboxes (stored as `milestone-1`, `milestone-2`, … in the item's unitsDone) and count
 * toward the project's progress. References are catalogue ids only, so they stay verified.
 *
 * Pure: shared by the app, by validate:data and by the tests.
 */

export const DOC_SECTIONS = [
  'Goal', 'Why', 'Scope', 'Architecture', 'Stack', 'Parts and budget', 'Milestones', 'Done when', 'Measure and report',
  'Pitfalls', 'References', 'Write-up',
] as const;
export type DocSection = (typeof DOC_SECTIONS)[number];
/** Every section but this one is required; it is required for stage 2 builds that list parts. */
export const OPTIONAL_SECTION: DocSection = 'Parts and budget';

export interface DocMilestone {
  /** Stored in unitsDone: `milestone-1`, … */
  id: string;
  title: string;
  hours: number;
}

export interface ProjectDoc {
  title: string;
  /** The Markdown body of each section, label removed, in template order. */
  sections: Partial<Record<DocSection, string>>;
  milestones: DocMilestone[];
  /** The "Total N h." the doc states. */
  statedTotal: number | null;
  references: string[];
  words: number;
}

export interface DocParse {
  doc: ProjectDoc | null;
  errors: string[];
}

const LABEL = /^\*\*([A-Z][A-Za-z -]+)\.\*\*\s?/;

export function milestoneId(index: number): string {
  return 'milestone-' + (index + 1);
}

export function parseMilestones(text: string): { milestones: DocMilestone[]; total: number | null; errors: string[] } {
  const errors: string[] = [];
  const flat = text.replace(/\s+/g, ' ').trim();
  const totalMatch = /Total\s+(\d+(?:\.\d+)?)\s*h\.?\s*$/.exec(flat);
  const body = totalMatch ? flat.slice(0, totalMatch.index).trim().replace(/[·.]\s*$/, '').trim() : flat;
  const milestones: DocMilestone[] = [];
  for (const raw of body.split(/\s+·\s+/)) {
    const m = /^(.+?)\s*\((\d+(?:\.\d+)?)\s*h\)\.?$/.exec(raw.trim());
    if (!m) {
      errors.push('milestone "' + raw.trim().slice(0, 60) + '" must read "What to do (N h)"');
      continue;
    }
    milestones.push({ id: milestoneId(milestones.length), title: m[1]!.trim(), hours: Number(m[2]) });
  }
  if (!totalMatch) errors.push('milestones must end with "Total N h."');
  return { milestones, total: totalMatch ? Number(totalMatch[1]) : null, errors };
}

export function parseDoc(markdown: string): DocParse {
  const errors: string[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const first = lines.findIndex((l) => l.trim() !== '');
  const titleMatch = first >= 0 ? /^#\s+(.+)$/.exec(lines[first]!.trim()) : null;
  if (!titleMatch) return { doc: null, errors: ['the doc must start with "# Title"'] };

  const sections: Partial<Record<DocSection, string>> = {};
  const order: DocSection[] = [];
  let current: DocSection | null = null;
  let buffer: string[] = [];
  let fence = false;
  const flush = (): void => {
    if (current) sections[current] = buffer.join('\n').trim();
    buffer = [];
  };
  for (const line of lines.slice(first + 1)) {
    if (/^\s*```/.test(line)) fence = !fence;
    const m = fence ? null : LABEL.exec(line);
    if (m) {
      const label = m[1] as DocSection;
      if (!(DOC_SECTIONS as readonly string[]).includes(label)) {
        errors.push('unknown section "' + m[1] + '"');
        buffer.push(line);
        continue;
      }
      if (sections[label] !== undefined || order.includes(label)) errors.push('section "' + label + '" appears twice');
      flush();
      current = label;
      order.push(label);
      buffer.push(line.slice(m[0].length));
    } else if (current) {
      buffer.push(line);
    } else if (line.trim()) {
      errors.push('text before the first section: "' + line.trim().slice(0, 40) + '"');
    }
  }
  flush();

  for (const s of DOC_SECTIONS) {
    if (s === OPTIONAL_SECTION) continue;
    if (!sections[s]) errors.push('missing section "' + s + '"');
  }
  const expected = DOC_SECTIONS.filter((s) => order.includes(s));
  if (expected.join('|') !== order.join('|')) errors.push('sections must follow the template order: ' + DOC_SECTIONS.join(', '));

  const parsed = parseMilestones(sections.Milestones ?? '');
  errors.push(...parsed.errors);
  const sum = parsed.milestones.reduce((s, m) => s + m.hours, 0);
  if (parsed.milestones.length < 3 || parsed.milestones.length > 6) errors.push('3 to 6 milestones, found ' + parsed.milestones.length);
  if (parsed.total !== null && Math.abs(sum - parsed.total) > 1e-9) errors.push('milestones add up to ' + sum + ' h but the doc says Total ' + parsed.total + ' h');

  const references = (sections.References ?? '')
    .replace(/\.$/, '')
    .split(/[,\s]+/)
    .map((r) => r.replace(/[`.]/g, '').trim())
    .filter(Boolean);
  if (/https?:\/\/|www\./.test(markdown)) errors.push('no raw URLs: reference catalogue ids instead');

  const words = markdown.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
  return {
    doc: { title: titleMatch[1]!.trim(), sections, milestones: parsed.milestones, statedTotal: parsed.total, references, words },
    errors,
  };
}

/** "Copy as README skeleton": the doc's Goal, Architecture, Stack and Done when as the start of a repository README. */
export function readmeSkeleton(doc: Pick<ProjectDoc, 'title' | 'sections'>): string {
  const part = (heading: string, body: string | undefined): string => (body ? '## ' + heading + '\n\n' + body.trim() + '\n' : '');
  return [
    '# ' + doc.title + '\n',
    doc.sections.Goal ? doc.sections.Goal.trim() + '\n' : '',
    part('Architecture', doc.sections.Architecture),
    part('Stack', doc.sections.Stack),
    part('Done when', doc.sections['Done when']),
    '## Results\n\n_To fill in: the numbers from "Measure and report", and a demo GIF or chart._\n',
  ]
    .filter(Boolean)
    .join('\n');
}
