/**
 * "Blocks today" (ATLAS-UI-POLISH): how many of the day's blocks are done, how many are under way, and which is
 * which. A block is done once it is marked done or its minutes reach its target; it is in progress while it has
 * minutes short of that, or its timer is running. Pure.
 */
export type BlockState = 'done' | 'in-progress' | 'todo';

export interface BlockTally {
  done: number;
  inProgress: number;
  total: number;
  states: Map<string, BlockState>;
  /** "0/5", with " · 1 in progress" while any block is under way. */
  label: string;
}

export function blockTally(
  blocks: readonly { id: string; targetMinutes: number }[],
  minutesOf: (id: string) => number,
  isDone: (id: string) => boolean,
  running: string | null = null,
): BlockTally {
  const states = new Map<string, BlockState>();
  for (const b of blocks) {
    const minutes = minutesOf(b.id);
    const done = isDone(b.id) || (b.targetMinutes > 0 && minutes >= b.targetMinutes);
    states.set(b.id, done ? 'done' : minutes > 0 || running === b.id ? 'in-progress' : 'todo');
  }
  const done = [...states.values()].filter((s) => s === 'done').length;
  const inProgress = [...states.values()].filter((s) => s === 'in-progress').length;
  return {
    done,
    inProgress,
    total: blocks.length,
    states,
    label: done + '/' + blocks.length + (inProgress > 0 ? ' · ' + inProgress + ' in progress' : ''),
  };
}
