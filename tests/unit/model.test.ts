/**
 * Section 5 of the brief is the authoritative data model. These assertions are checked by
 * `npm run typecheck`: if a schema ever drops or retypes a field of the model, `true` stops being
 * assignable and the build fails.
 */
import { describe, expect, it } from 'vitest';
import type * as Model from '../../src/seed/model.ts';
import type { BlockId, Phase, PlanItem, Project, Resource, TrackId } from '../../src/seed/schema.ts';
import { BLOCK_IDS, TRACK_IDS } from '../../src/seed/schema.ts';
import type { DayLog, UserItemState } from '../../src/db/types.ts';

type Extends<A, B> = [A] extends [B] ? true : false;

const checks = {
  resource: true satisfies Extends<Resource, Model.Resource>,
  phase: true satisfies Extends<Phase, Model.Phase>,
  planItem: true satisfies Extends<PlanItem, Model.PlanItem>,
  project: true satisfies Extends<Project, Model.Project>,
  dayLog: true satisfies Extends<DayLog, Model.DayLog>,
  userItemState: true satisfies Extends<UserItemState, Model.UserItemState>,
  trackIdsForward: true satisfies Extends<TrackId, Model.TrackId>,
  trackIdsBackward: true satisfies Extends<Model.TrackId, TrackId>,
  blockIdsForward: true satisfies Extends<BlockId, Model.BlockId>,
  blockIdsBackward: true satisfies Extends<Model.BlockId, BlockId>,
};

describe('authoritative data model', () => {
  it('is a subset of what the schemas produce (checked at compile time)', () => {
    expect(Object.values(checks).every(Boolean)).toBe(true);
  });

  it('has the sixteen tracks and five blocks of the brief', () => {
    expect(TRACK_IDS).toHaveLength(16);
    expect(new Set(TRACK_IDS).size).toBe(16);
    expect([...BLOCK_IDS]).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});
