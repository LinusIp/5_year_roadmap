/**
 * Files in atlas-data written by a device that still runs an older Atlas (the build before the briefs of
 * 2026-10-16). That build cannot read state/plan.json version 2, state/settings.json version 2, a day that holds a
 * Practice (P) entry, or a review whose numbers include P, so when it changes one of them it writes its own older
 * copy over the newer one. A device on this build recognises those copies and merges instead of giving way, then
 * writes the merged file back, and says that a device needs updating.
 *
 * Pure.
 */
import { BLOCK_IDS } from '../seed/schema.ts';
import type { DayLog, Review, StoredSettings, StoredSettingsInput } from '../db/types.ts';
import type { PlanData } from './files.ts';
import { mergeDay, mergeRecords } from './merge.ts';

export const NOTICE_OLD_DEVICE =
  'A device with an older version of Atlas changed your data on GitHub. This device kept the newer copy and wrote it back. Open Atlas on your other devices and reload to update them.';

const LEGACY_BLOCKS: ReadonlySet<string> = new Set(BLOCK_IDS);

function versionOf(text: string): unknown {
  try {
    return (JSON.parse(text) as { version?: unknown }).version;
  } catch {
    return undefined;
  }
}

/** state/plan.json as the older build writes it: version 1. */
export function isOldPlanFile(text: string): boolean {
  return versionOf(text) === 1;
}

/** state/settings.json as the older build writes it: no version at all. */
export function isOldSettingsFile(text: string): boolean {
  return versionOf(text) === undefined;
}

/**
 * An older plan file over a plan with patches: both sides' records, the newer of each. The older file's plan-item
 * edits arrive as the same `legacy-…` patches the database upgrade made, so they do not double up.
 */
export function mergeOldPlan(local: PlanData, remote: PlanData): PlanData {
  return {
    overrides: mergeRecords(local.overrides, remote.overrides, (o) => o.kind + ':' + o.id),
    customEntities: mergeRecords(local.customEntities, remote.customEntities, (c) => c.kind + ':' + c.id),
    replans: mergeRecords(local.replans, remote.replans, (r) => r.id),
    weekPicks: mergeRecords(local.weekPicks, remote.weekPicks, (w) => w.weekStart),
    patches: mergeRecords(local.patches, remote.patches, (p) => p.id),
  };
}

/** Whether local settings are of the newer build: an older copy must not replace them. */
export function isNewSettings(local: StoredSettingsInput | StoredSettings | undefined): boolean {
  return Boolean(local && 'version' in local && local.version === 2);
}

/**
 * Whether a pulled day dropped entries the older build cannot hold: a local entry in a block outside A to E that the
 * remote copy neither has nor marks as removed. Only a device that could not read the day writes such a copy.
 */
export function droppedNewBlocks(local: DayLog | undefined, remote: DayLog): boolean {
  if (!local) return false;
  const remoteIds = new Set(remote.entries.map((e) => e.id).filter(Boolean));
  const removed = new Set((remote.removed ?? []).map((r) => r.id));
  return local.entries.some((e) => e.id && !LEGACY_BLOCKS.has(e.block) && !remoteIds.has(e.id) && !removed.has(e.id));
}

/** The day both copies make: the remote's edits, and the entries the older build could not keep. */
export function mergeOldDay(local: DayLog, remote: DayLog): DayLog {
  return mergeDay(local, remote);
}

/**
 * A review written by the older build loses the minutes of blocks beyond A to E from its numbers. The newer
 * record's text wins as usual; the numbers keep every block either side knows.
 */
export function mergeReviewNumbers(winner: Review, local: Review | undefined): Review {
  const mine = local?.snapshot?.minutesByBlock;
  const theirs = winner.snapshot?.minutesByBlock;
  if (!mine || !winner.snapshot || !theirs) return winner;
  const missing = Object.keys(mine).filter((k) => !(k in theirs));
  if (missing.length === 0) return winner;
  return { ...winner, snapshot: { ...winner.snapshot, minutesByBlock: { ...theirs, ...Object.fromEntries(missing.map((k) => [k, mine[k]!])) } } };
}

/** Whether a review copy lost block numbers the local copy has. */
export function reviewLostBlocks(remote: Review, local: Review | undefined): boolean {
  const mine = local?.snapshot?.minutesByBlock;
  const theirs = remote.snapshot?.minutesByBlock;
  return Boolean(mine && theirs && Object.keys(mine).some((k) => !LEGACY_BLOCKS.has(k) && !(k in theirs)));
}
