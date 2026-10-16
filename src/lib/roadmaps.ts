/**
 * roadmap.sh coverage (brief, "Roadmap tracks"): a node is checked when the user ticks it, or when a resource
 * or project that `covers` it is done. A roadmap is mastered at 90 % of its non-optional nodes plus a done
 * credential-map row.
 */
import type { UserItemState } from '../db/types.ts';
import type { AppSeed, Roadmap } from '../seed/schema.ts';
import type { SubjectRow } from './credentials.ts';

/** Manual ticks live in an item state with this prefix: `roadmap:inference-engineering`, units = node ids. */
export const ROADMAP_STATE_PREFIX = 'roadmap:';
export const MASTERED_SHARE = 0.9;

export function roadmapStateId(roadmapId: string): string {
  return ROADMAP_STATE_PREFIX + roadmapId;
}

export interface RoadmapCoverage {
  roadmap: Roadmap;
  /** Every checked node id, ticked or covered. */
  checked: Set<string>;
  /** Node id to the titles of the done items that cover it. Those nodes cannot be unticked by hand. */
  coveredBy: Map<string, string[]>;
  /** Non-optional nodes, and how many of them are checked. */
  required: number;
  requiredChecked: number;
  /** Whole percent of the non-optional nodes checked, rounded down so 89.9 % never reads as 90 %. */
  percent: number;
  /** The credential-map row the roadmap is tied to, and whether it is done. */
  subjectTitle: string;
  rowDone: boolean;
  mastered: boolean;
}

/** A credential-map row is done when one of its certificates is earned or all of its milestones are done. */
export function subjectRowDone(row: SubjectRow | undefined): boolean {
  if (!row) return false;
  if (row.certs.some((c) => c.status === 'earned')) return true;
  return row.milestones.length > 0 && row.milestones.every((m) => m.status === 'done');
}

export function roadmapCoverage(seed: AppSeed, itemStates: Map<string, UserItemState>, rows: SubjectRow[]): RoadmapCoverage[] {
  const coveredBy = new Map<string, string[]>();
  for (const item of [...seed.resources, ...seed.projects]) {
    if (!item.covers?.length || itemStates.get(item.id)?.status !== 'done') continue;
    const name = ('short' in item && item.short) || item.title;
    for (const key of item.covers) coveredBy.set(key, [...(coveredBy.get(key) ?? []), name]);
  }

  return [...seed.roadmaps]
    .sort((a, b) => a.priority - b.priority)
    .map((roadmap) => {
      const ticked = new Set(itemStates.get(roadmapStateId(roadmap.id))?.unitsDone ?? []);
      const checked = new Set<string>();
      const mine = new Map<string, string[]>();
      let required = 0;
      let requiredChecked = 0;
      for (const node of roadmap.sections.flatMap((s) => s.nodes)) {
        const by = coveredBy.get(roadmap.id + '/' + node.id);
        if (by) mine.set(node.id, by);
        const isChecked = ticked.has(node.id) || Boolean(by);
        if (isChecked) checked.add(node.id);
        if (!node.optional) {
          required++;
          if (isChecked) requiredChecked++;
        }
      }
      const percent = required ? Math.floor((requiredChecked / required) * 100) : 0;
      const row = rows.find((r) => r.subject.id === roadmap.subject);
      const rowDone = subjectRowDone(row);
      return {
        roadmap,
        checked,
        coveredBy: mine,
        required,
        requiredChecked,
        percent,
        subjectTitle: row?.subject.title ?? roadmap.subject,
        rowDone,
        mastered: required > 0 && requiredChecked >= Math.ceil(required * MASTERED_SHARE) && rowDone,
      };
    });
}
