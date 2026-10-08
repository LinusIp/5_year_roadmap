/**
 * One commit per flush, through the Git Data API (brief 4.10): create a blob per changed file, one tree on top
 * of the branch's tree, one commit authored as the user (so GitHub counts it on their contribution graph),
 * then move the branch, only as a fast-forward.
 */
import type { DayLog } from '../db/types.ts';
import type { SettingsDefaults } from '../seed/schema.ts';
import { weekday } from '../lib/dates.ts';
import type { Author, GithubClient } from './github-api.ts';

export interface FileChange {
  path: string;
  /** null deletes the file. */
  content: string | null;
}

export interface CommitResult {
  commitSha: string;
  treeSha: string;
  /** The new sha of every changed path; null for a deleted one. */
  shas: Record<string, string | null>;
}

export async function commitFiles(
  client: GithubClient,
  options: { branch: string; parentSha: string; baseTreeSha: string; changes: FileChange[]; message: string; author: Author; date: string },
): Promise<CommitResult> {
  const shas: Record<string, string | null> = {};
  for (const change of options.changes) shas[change.path] = change.content === null ? null : await client.createBlob(change.content);
  const treeSha = await client.createTree(
    options.baseTreeSha,
    options.changes.map((c) => ({ path: c.path, sha: shas[c.path]! })),
  );
  const commitSha = await client.createCommit(options.message, treeSha, [options.parentSha], options.author, options.date);
  await client.updateRef(options.branch, commitSha);
  return { commitSha, treeSha, shas };
}

/** "8 h 10 m", "45 m", "8 h". */
export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return m + ' m';
  return m === 0 ? h + ' h' : h + ' h ' + m + ' m';
}

/**
 * The commit message: "log: 2026-10-07 · 8 h 10 m · 5/5 blocks" when a day changed (the latest day in the
 * flush), otherwise "state: mark 18.06 lecture 9 done". Every other change of the flush is listed in the body.
 */
export function commitMessage(days: DayLog[], summaries: string[], core: SettingsDefaults): string {
  const unique = [...new Set(summaries)];
  const latest = [...days].sort((a, b) => b.date.localeCompare(a.date))[0];
  let subject: string;
  let rest = unique;
  if (latest) {
    const minutes = latest.entries.reduce((sum, e) => sum + e.minutes, 0);
    const scheduled = core.blocks.filter((b) => b.days.includes(weekday(latest.date))).length;
    const done = (latest.doneBlocks ?? []).length;
    subject = 'log: ' + latest.date + ' · ' + duration(minutes) + ' · ' + done + '/' + scheduled + ' blocks';
    if (days.length > 1) subject += ' (and ' + (days.length - 1) + ' more ' + (days.length === 2 ? 'day' : 'days') + ')';
  } else if (unique.length > 0) {
    subject = 'state: ' + unique[unique.length - 1]!;
    rest = unique.slice(0, -1);
  } else {
    subject = 'state: update';
  }
  if (rest.length === 0) return subject;
  return subject + '\n\n' + rest.map((s) => '- ' + s).join('\n') + '\n';
}
