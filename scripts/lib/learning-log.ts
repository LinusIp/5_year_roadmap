/**
 * Turns a backup into a public learning log: one Markdown file per day with time logged, at YYYY/MM/DD.md.
 *
 * It is written for a public repository. Each day says what was worked on and for how long, what was finished,
 * and what shipped. Reflections and energy ratings are private unless asked for. A day with no time logged gets
 * no file: a freeze day is not work. There are no timestamps in the files, so a second run leaves unchanged days
 * byte for byte the same, and a commit shows only what is new.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { BackupFile, DayLog } from '../../src/db/types.ts';
import { daysBetween, formatLong, formatMinutes, weekday } from '../../src/lib/dates.ts';
import { resolveSeed } from '../../src/lib/plan.ts';
import type { AppSeed, BlockId, SettingsDefaults } from '../../src/seed/schema.ts';

export interface LearningLogOptions {
  /** Include the day's reflection and energy rating. Off by default: the log is meant to be public. */
  reflections?: boolean;
}

/** "2026-09-21" → "2026/09/21.md". */
export function logPath(date: string): string {
  return date.slice(0, 4) + '/' + date.slice(5, 7) + '/' + date.slice(8, 10) + '.md';
}

/** One line of Markdown: user text can hold newlines, which would break a list item. */
function inline(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ').trim();
}

interface Titles {
  title(refId: string): string;
}

function titleIndex(seed: AppSeed): Titles {
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

export function renderDay(
  log: DayLog,
  context: { core: SettingsDefaults; titles: Titles; planStart: string; file: BackupFile },
  options: LearningLogOptions = {},
): string {
  const { core, titles, planStart, file } = context;
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
  for (const state of file.data.itemStates) {
    if (state.status !== 'done' || state.doneAt !== log.date) continue;
    const title = inline(titles.title(state.refId));
    if (state.repoUrl) shipped.push('- [' + title + '](' + state.repoUrl + ')' + (state.demoUrl ? ' · [demo](' + state.demoUrl + ')' : ''));
    else finished.push('- ' + title);
  }
  for (const paper of file.data.paperStates) {
    if (paper.readAt === log.date) finished.push('- Read: ' + inline(titles.title(paper.refId)));
  }
  for (const cert of file.data.certStates) {
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

/** Every file of the log, by path relative to the log's folder. */
export function buildLearningLog(file: BackupFile, seed: AppSeed, options: LearningLogOptions = {}): Map<string, string> {
  const resolved = resolveSeed(seed, file.data.overrides, file.data.customEntities);
  const core = file.data.settings.find((s) => s.id === 'app')?.core ?? resolved.settings;
  const context = { core, titles: titleIndex(resolved), planStart: resolved.phases[0]!.start, file };

  const out = new Map<string, string>();
  const days = [...file.data.dayLogs].sort((a, b) => a.date.localeCompare(b.date));
  for (const log of days) {
    if (!log.entries.some((e) => e.minutes > 0)) continue;
    out.set(logPath(log.date), renderDay(log, context, options));
  }
  return out;
}

/** Day files already in the folder (YYYY/MM/DD.md), relative to it. Anything else there is left alone. */
export function existingLogFiles(dir: string): string[] {
  const found: string[] = [];
  const list = (path: string): string[] => {
    try {
      return readdirSync(path).sort();
    } catch {
      return [];
    }
  };
  for (const year of list(dir).filter((name) => /^\d{4}$/.test(name))) {
    for (const month of list(join(dir, year)).filter((name) => /^\d{2}$/.test(name))) {
      for (const day of list(join(dir, year, month)).filter((name) => /^\d{2}\.md$/.test(name))) {
        if (statSync(join(dir, year, month, day)).isFile()) found.push(year + '/' + month + '/' + day);
      }
    }
  }
  return found;
}
