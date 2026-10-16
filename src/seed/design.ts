/**
 * A project's design (data/projects/design/<id>.yaml): how it works, not only what it is. Monthly cases, the plan's
 * own documented projects and, lighter, weekly builds carry one. It replaces the free-text architecture.
 *
 *   overview    2–4 plain sentences (builds 1–2): what you build and how it works, jargon explained inline
 *   learn       3–6 concepts (builds 2–4), each with a Library resource id where one exists
 *   stats       2–3 headline numbers from the requirements, for cases and plan projects
 *   components  4–8 parts (builds 2–4): what each owns, its tech, what it talks to, core / offline / external
 *   flow        4–7 steps (builds 3–4) following one request, frame or job through the components
 *   interface   optional: the main call, signature or message format, as a code block
 *   decisions   2–4 (builds 1): what was chosen, the realistic alternative, and why for this scenario
 *   watchOut    the single most important pitfall
 *
 * In `flow` text, `backticks` mark code terms (drawn as small mono pills) and **double asterisks** mark the words
 * to stress. Pure: the app, validate:data and the writers' checker share it.
 */
import { z } from 'zod';

const Text = z.string().trim().min(1);
const Id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'ids are lowercase words joined by hyphens');

export const ComponentKind = z.enum(['core', 'offline', 'external']);

export const DesignComponentSchema = z.strictObject({
  id: Id,
  name: Text,
  /** One sentence: what it owns. */
  role: Text,
  tech: Text,
  talksTo: z.array(Id).default([]),
  kind: ComponentKind,
});

export const DesignSchema = z.strictObject({
  overview: Text,
  learn: z.array(z.strictObject({ name: Text, ref: Id.optional() })),
  stats: z.array(z.strictObject({ value: Text, label: Text })).optional(),
  components: z.array(DesignComponentSchema),
  flow: z.array(z.strictObject({ component: Id, text: Text })),
  interface: z.strictObject({ lang: Text, code: Text }).optional(),
  decisions: z.array(z.strictObject({ choice: Text, instead: Text, why: Text })),
  watchOut: Text,
});

export type Design = z.infer<typeof DesignSchema>;
export type DesignComponent = z.infer<typeof DesignComponentSchema>;
/** A full design (a monthly case, a plan project with a tech doc) or the light one of a weekly build. */
export type DesignWeight = 'full' | 'light';

const RANGES: Record<DesignWeight, Record<'learn' | 'components' | 'flow' | 'decisions' | 'overviewSentences', [number, number]>> = {
  full: { learn: [3, 6], components: [4, 8], flow: [4, 7], decisions: [2, 4], overviewSentences: [2, 4] },
  light: { learn: [2, 4], components: [2, 4], flow: [3, 4], decisions: [1, 1], overviewSentences: [1, 2] },
};

function sentences(text: string): number {
  // Full stops inside numbers, versions and abbreviations do not end a sentence.
  return text
    .replace(/\b(e\.g|i\.e|vs|etc|approx)\./gi, '$1')
    .replace(/(\d)\.(\d)/g, '$1$2')
    .split(/[.!?](?:\s|$)/)
    .filter((s) => s.trim().length > 0).length;
}

/** Every field of a design, flattened, for the no-URL rule. */
function allText(design: Design): string[] {
  return [
    design.overview,
    design.watchOut,
    ...design.learn.map((l) => l.name),
    ...(design.stats ?? []).flatMap((s) => [s.value, s.label]),
    ...design.components.flatMap((c) => [c.name, c.role, c.tech]),
    ...design.flow.map((f) => f.text),
    ...(design.interface ? [design.interface.code] : []),
    ...design.decisions.flatMap((d) => [d.choice, d.instead, d.why]),
  ];
}

/**
 * The checks validate:data runs on a design, beyond its shape: counts for its weight, every flow step and every
 * talksTo names a component, every component is on the flow unless it is offline or external, decisions argue
 * against something, no URLs, and learn refs resolve when `resourceIds` is given.
 */
export function checkDesign(design: Design, weight: DesignWeight, resourceIds?: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  const range = RANGES[weight];
  const within = (what: string, n: number, [lo, hi]: [number, number]): void => {
    if (n < lo || n > hi) errors.push(what + ': ' + n + ', expected ' + (lo === hi ? lo : lo + ' to ' + hi));
  };
  within('overview sentences', sentences(design.overview), range.overviewSentences);
  within('learn', design.learn.length, range.learn);
  within('components', design.components.length, range.components);
  within('flow steps', design.flow.length, range.flow);
  within('decisions', design.decisions.length, range.decisions);
  if (weight === 'full' && design.stats && (design.stats.length < 2 || design.stats.length > 3)) errors.push('stats: ' + design.stats.length + ', expected 2 or 3');

  const ids = new Set<string>();
  for (const c of design.components) {
    if (ids.has(c.id)) errors.push('component id "' + c.id + '" appears twice');
    ids.add(c.id);
  }
  for (const c of design.components) {
    for (const t of c.talksTo) {
      if (!ids.has(t)) errors.push('component "' + c.id + '" talks to "' + t + '", which is not a component');
      if (t === c.id) errors.push('component "' + c.id + '" talks to itself');
    }
  }
  const onFlow = new Set<string>();
  for (const [i, step] of design.flow.entries()) {
    if (!ids.has(step.component)) errors.push('flow step ' + (i + 1) + ' names "' + step.component + '", which is not a component');
    onFlow.add(step.component);
  }
  for (const c of design.components) {
    if (c.kind === 'core' && !onFlow.has(c.id)) errors.push('core component "' + c.id + '" is not on the flow (make it offline or external, or add a step)');
  }
  for (const [i, d] of design.decisions.entries()) {
    if (d.instead.trim().toLowerCase() === d.choice.trim().toLowerCase()) errors.push('decision ' + (i + 1) + ': "instead" repeats the choice');
  }
  for (const text of allText(design)) {
    if (/https?:\/\/|www\./i.test(text)) {
      errors.push('no URLs in a design: "' + text.slice(0, 50) + '"');
      break;
    }
  }
  if (resourceIds) for (const l of design.learn) if (l.ref && !resourceIds.has(l.ref)) errors.push('learn "' + l.name + '" refers to "' + l.ref + '", which is not a resource');
  return errors;
}

export { DESIGN_BUCKETS, designBucket, flowText } from './design-text.ts';
