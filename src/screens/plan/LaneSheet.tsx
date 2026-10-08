import { useState } from 'react';
import { patchMany, removePlanItem } from '../../db/edits.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { reorderLane } from '../../lib/plan.ts';
import type { LaneProgress } from '../../lib/progress.ts';
import type { BlockId, Phase, Unit } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { ProgressLine } from '../../ui/ProgressLine.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { ItemStatusPill } from '../parts/ItemSheet.tsx';
import { blockShort, nameOf, shortTitle } from '../parts/text.ts';
import { AddToLaneSheet } from './AddToLaneSheet.tsx';
import { itemDetail } from './model.ts';

/**
 * One lane of one phase: its focus, its hours against what the phase gives it, and its items in order. Each
 * item has its status pill; "Edit" swaps the pills for move and remove; "Add to this lane" opens the picker.
 */
export function LaneSheet({
  atlas,
  phase,
  lane,
  units,
  onClose,
  onOpenItem,
}: {
  atlas: Atlas;
  phase: Phase | null;
  lane: LaneProgress | null;
  units: Record<string, Unit[]> | undefined;
  onClose: () => void;
  onOpenItem: (refId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const def = lane ? atlas.settings.core.blocks.find((b) => b.id === lane.block) : undefined;
  const open = Boolean(phase && lane && def);
  const name = def ? 'Block ' + def.id + ' · ' + blockShort(def.name) : '';
  const overBudget = lane ? lane.totalHours > lane.budgetHours * 1.05 : false;
  const titleOf = (refId: string): string => atlas.seed.resources.find((r) => r.id === refId)?.title ?? atlas.seed.projects.find((p) => p.id === refId)?.title ?? refId;

  const move = (from: number, to: number): void => {
    if (!lane) return;
    const reordered = reorderLane(
      lane.items.map((i) => i.planItem),
      from,
      to,
    );
    if (reordered.length > 0) void patchMany('planItem', reordered.map((r) => ({ id: r.id, patch: { order: r.order } })));
  };
  const close = (): void => {
    setEditing(false);
    onClose();
  };

  return (
    <>
      <Sheet open={open && !adding} title={name + (phase ? ' · ' + phase.title : '')} onClose={close}>
        {phase && lane && def && (
          <div className="space-y-5">
            <div>
              <p className="text-body text-ink2">{phase.focus[lane.block as BlockId]}</p>
              <div className="mt-3">
                <ProgressLine value={lane.fraction} label={name + ' progress'} />
              </div>
              <p className="mt-1.5 text-meta text-ink2">
                {Math.round(lane.totalHours)} h planned of {Math.round(lane.budgetHours)} h this phase gives it{overBudget ? ' · over budget' : ''}
              </p>
            </div>

            {lane.items.length === 0 ? (
              <p className="text-body text-ink2">Nothing planned in this lane.</p>
            ) : (
              <RowList>
                {lane.items.map((item, index) => {
                  const unitsDone = atlas.states.get(item.refId)?.unitsDone ?? [];
                  const meta = [
                    Math.round(item.laneHours) + ' h',
                    itemDetail(item, units, unitsDone),
                    item.provider,
                    item.stretch ? 'stretch' : null,
                    item.blockedBy.length > 0 ? 'waits on ' + item.blockedBy.map((id) => shortTitle(titleOf(id))).join(', ') : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <Row
                      key={item.planItem.id}
                      title={nameOf(item)}
                      meta={meta}
                      onClick={editing ? undefined : () => onOpenItem(item.refId)}
                      action={
                        editing ? (
                          <span className="flex shrink-0">
                            <Button variant="icon" icon="arrowUp" label={'Move ' + item.title + ' up'} aria-disabled={index === 0 || undefined} onClick={() => index > 0 && move(index, index - 1)} />
                            <Button
                              variant="icon"
                              icon="arrowDown"
                              label={'Move ' + item.title + ' down'}
                              aria-disabled={index === lane.items.length - 1 || undefined}
                              onClick={() => index < lane.items.length - 1 && move(index, index + 1)}
                            />
                            <Button variant="icon" icon="x" label={'Take ' + item.title + ' off the plan'} onClick={() => void removePlanItem(item.planItem.id)} />
                          </span>
                        ) : (
                          <ItemStatusPill kind={item.kind} refId={item.refId} title={item.title} state={atlas.states.get(item.refId)} />
                        )
                      }
                    />
                  );
                })}
              </RowList>
            )}

            {editing && <p className="text-meta text-ink2">Taking an item off the plan keeps it in the Library. Your edits are kept apart from the curriculum files, so they survive an update.</p>}

            <div className="flex flex-wrap gap-2">
              <Button icon="plus" onClick={() => setAdding(true)}>
                Add to this lane
              </Button>
              <Button onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
                {editing ? 'Done' : 'Edit'}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
      {phase && lane && (
        <AddToLaneSheet open={adding} onClose={() => setAdding(false)} seed={atlas.seed} phaseId={phase.id} block={lane.block} title={'Add to ' + name} />
      )}
    </>
  );
}
