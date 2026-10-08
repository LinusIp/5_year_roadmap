/**
 * A day as Markdown: what was worked on and for how long, what was finished, what shipped. Used for the
 * learning log (`npm run log:export`) and for the human-readable twin of each day in the GitHub Sync data
 * repository. No timestamps, so an unchanged day renders byte for byte the same.
 */
import type { CertState, DayLog, PaperState, UserItemState } from '../db/types.ts';
import type { AppSeed, BlockId, SettingsDefaults } from '../seed/schema.ts';
import { daysBetween, formatLong, formatMinutes, weekday } from './dates.ts';

export interface DayMarkdownOptions {
  /** Include the day's reflection and energy rating. Off for the public learning log, on for the private data repo. */
  reflections?: boolean;
}

export interface Titles {
  title(refId: string): string;
}

/** What was finished on a day comes from these. */
export interface DayStates {
  itemStates: readonly UserItemState[];
  paperStates: readonly PaperState[];
  certStates: readonly CertState[];
}

/** One line of Markdown: user text can hold newlines, which would break a list item. */
export function inline(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ').trim();
}

export function titleIndex(seed: Pick<AppSeed, 'resources' | 'projects' | 'papers' | 'certs'>): Titles {
  const titles = new Map<string, string>();
  for (const list of [seed.resources, seed.projects, seed.papers, seed.certs] as { id: string; title: string }[][]) {
    for (const item of list) titles.set(item.id, item.title);
  }
  return { title: (refId) => titles.get(refId) ?? refId };
}

function blockHeading(core: SettingsDefaults, block: BlockId, date: string): string {
  // On the review day, the review takes over its block (Sunday's projects block, by default).
  if (weekday(date) === core.review.day && block === core.review.block) return block + ' · ' + core.review.title;
  const name = core.blocks.find((b) => b.id === block)?.name;
  return name ? block + ' · ' + name : 'Block ' + block;
}

export function renderDayMarkdown(
  log: DayLog,
  context: { core: SettingsDefaults; titles: Titles; planStart: string; states: DayStates },
  options: DayMarkdownOptions = {},
): string {
  const { core, titles, planStart, states } = context;
  const total = log.entries.reduce((sum, e) => sum + e.minutes, 0);
  const lines: string[] = ['# ' + formatLong(log.date), ''];

  const dayNumber = daysBetween(planStart, log.date) + 1;
  lines.push((dayNumber >= 1 ? 'Day ' + dayNumber + ' of the plan. ' : '') + formatMinutes(total) + ' of study.', '');

  // Blocks in order, and within a block each item once, with its minutes summed and its notes kept.
  const blocks = [...new Set(log.entries.filter((e) => e.minutes > 0).map((e) => e.block))].sort();
  for (const block of blocks) {
    const entries = log.entries.filter((e) => e.block === block && e.minutes > 0);
    const minutes = entries.reduce((sum, e) => sum + e.minutes, 0);
    lines.push('## ' + blockHeading(core, block, log.date) + ' (' + formatMinutes(minutes) + ')', '');
    const items = new Map<string, { minutes: number; notes: string[] }>();
    for (const entry of entries) {
      const key = entry.refId ?? '';
      const item = items.get(key) ?? { minutes: 0, notes: [] };
      item.minutes += entry.minutes;
      if (entry.note?.trim()) item.notes.push(inline(entry.note));
      items.set(key, item);
    }
    for (const [refId, item] of items) {
      lines.push('- ' + (refId ? inline(titles.title(refId)) : 'Something not on the plan') + ': ' + formatMinutes(item.minutes));
      for (const note of item.notes) lines.push('  - ' + note);
    }
    lines.push('');
  }

  const finished: string[] = [];
  const shipped: string[] = [];
  for (const state of states.itemStates) {
    if (state.status !== 'done' || state.doneAt !== log.date) continue;
    const title = inline(titles.title(state.refId));
    if (state.repoUrl) shipped.push('- [' + title + '](' + state.repoUrl + ')' + (state.demoUrl ? ' · [demo](' + state.demoUrl + ')' : ''));
    else finished.push('- ' + title);
  }
  for (const paper of states.paperStates) {
    if (paper.readAt === log.date) finished.push('- Read: ' + inline(titles.title(paper.refId)));
  }
  for (const cert of states.certStates) {
    if (cert.earnedAt === log.date) {
      const title = inline(titles.title(cert.refId));
      finished.push('- Earned: ' + (cert.credentialUrl ? '[' + title + '](' + cert.credentialUrl + ')' : title));
    }
  }
  if (finished.length > 0) lines.push('## Finished', '', ...finished, '');
  if (shipped.length > 0) lines.push('## Shipped', '', ...shipped, '');

  if (options.reflections && (log.reflection?.trim() || log.energy !== undefined)) {
    lines.push('## Reflection', '');
    if (log.reflection?.trim()) lines.push(...log.reflection.trim().split('\n').map((line) => ('> ' + line).trimEnd()), '');
    if (log.energy !== undefined) lines.push('Energy: ' + log.energy + '/5', '');
  }

  return lines.join('\n').trimEnd() + '\n';
}
