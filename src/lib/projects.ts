/**
 * Rules about projects that the UI and the tests share.
 *
 * The brief: "A project is only done when a repo URL is filled in." That rule lives here, in one place, so
 * that the status control, the Projects page and any import path all enforce the same thing.
 */
import type { ItemStatus, UserItemState } from '../db/types.ts';
import { isHttpUrl } from '../seed/schema.ts';

export function hasRepo(state: UserItemState | undefined): boolean {
  return Boolean(state?.repoUrl && isHttpUrl(state.repoUrl));
}

/** Why a status cannot be set, or null when it can. */
export function statusBlocker(kind: 'resource' | 'project', status: ItemStatus, state: UserItemState | undefined): string | null {
  if (kind === 'project' && status === 'done' && !hasRepo(state)) {
    return 'A project is only done once its repository link is filled in.';
  }
  return null;
}

/** Whether a string is a plausible repository link: http(s), and usually a known code host. */
export function repoLinkProblem(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isHttpUrl(trimmed)) return 'Use the full address, starting with https://';
  return null;
}
