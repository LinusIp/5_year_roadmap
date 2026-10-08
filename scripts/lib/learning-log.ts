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
import type { BackupFile } from '../../src/db/types.ts';
import { renderDayMarkdown, titleIndex } from '../../src/lib/day-markdown.ts';
import { resolveSeed } from '../../src/lib/plan.ts';
import type { AppSeed } from '../../src/seed/schema.ts';

export interface LearningLogOptions {
  /** Include the day's reflection and energy rating. Off by default: the log is meant to be public. */
  reflections?: boolean;
}

/** "2026-09-21" → "2026/09/21.md". */
export function logPath(date: string): string {
  return date.slice(0, 4) + '/' + date.slice(5, 7) + '/' + date.slice(8, 10) + '.md';
}

/** Every file of the log, by path relative to the log's folder. */
export function buildLearningLog(file: BackupFile, seed: AppSeed, options: LearningLogOptions = {}): Map<string, string> {
  const resolved = resolveSeed(seed, file.data.overrides, file.data.customEntities);
  const core = file.data.settings.find((s) => s.id === 'app')?.core ?? resolved.settings;
  const context = { core, titles: titleIndex(resolved), planStart: resolved.phases[0]!.start, states: file.data };

  const out = new Map<string, string>();
  const days = [...file.data.dayLogs].sort((a, b) => a.date.localeCompare(b.date));
  for (const log of days) {
    if (!log.entries.some((e) => e.minutes > 0)) continue;
    out.set(logPath(log.date), renderDayMarkdown(log, context, options));
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
