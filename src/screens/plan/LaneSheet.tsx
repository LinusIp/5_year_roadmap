import { useEffect, useState } from 'react';
import { addPlanEdit, removePlanItem, restorePlanItem } from '../../db/edits.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { reorderLane } from '../../lib/plan.ts';
import type { LaneProgress } from '../../lib/progress.ts';
import type { BlockId, Phase, Unit } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { paceSummary } from './LanePace.tsx';
import { ProgressLine } from '../../ui/ProgressLine.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { ItemStatusPill } from '../parts/ItemSheet.tsx';
import { blockShort, nameOf, shortTitle } from '../parts/text.ts';
import { AddToLaneSheet } from './AddToLaneSheet.tsx';
import { SwapSheet } from './EditSheets.tsx';
import { LanePace } from './LanePace.tsx';
import { useDragReorder } from '../../ui/useDragReorder.ts';
import type { PlanItem } from '../../seed/schema.ts';
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
  const [swapping, setSwapping] = useState<PlanItem | null>(null);
  const [pacing, setPacing] = useState(false);
  const [showDropped, setShowDropped] = useState(false);
  // Another lane opened in the same sheet starts out of edit mode.
  const laneKey = (phase?.id ?? '') + '.' + (lane?.block ?? '');
  useEffect(() => {
    setEditing(false);
    setShowDropped(false);
  }, [laneKey]);
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
    const moving = lane.items[from];
    if (reordered.length > 0 && moving) {
      void addPlanEdit(
        reordered.map((r) => ({ op: 'move', planItemId: r.id, order: r.order })),
        'Moved ' + shortTitle(moving.title) + (to < from ? ' up' : ' down'),
      );
    }
  };
  const close = (): void => {
    setEditing(false);
    setShowDropped(false);
    onClose();
  };
  const { drag, listRef, gripProps } = useDragReorder(move);
  const dropped = phase && lane && atlas.settings.layout.plan.showDropped ? (atlas.seed.dropped ?? []).filter((i) => i.phaseId === phase.id && i.block === lane.block) : [];

  return (
    <>
      <Sheet open={open && !adding && !swapping && !pacing} title={name + (phase ? ' · ' + phase.title : '')} onClose={close}>
        {phase && lane && def && (
          <div className="space-y-5">
            <div>
              <p className="text-body text-ink2">{(phase.focus as Record<BlockId, string | undefined>)[lane.block]}</p>
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
              <RowList ref={listRef}>
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
                      dragRow
                      className={drag?.over === index && drag.from !== index ? 'shadow-[inset_0_2px_0_var(--accent)]' : drag?.from === index ? 'opacity-60' : ''}
                      title={nameOf(item)}
                      meta={meta}
                      onClick={editing ? undefined : () => onOpenItem(item.refId)}
                      action={
                        editing ? (
                          <span className="flex shrink-0">
                            <button type="button" aria-label={'Drag ' + item.title + ' to reorder'} className="grid min-h-11 min-w-11 cursor-grab place-items-center text-ink2" {...gripProps(index)}>
                              <Icon name="grip" />
                            </button>
                            <Button variant="icon" icon="shuffle" label={'Swap ' + item.title + ' for another'} onClick={() => setSwapping(item.planItem)} />
                            <Button variant="icon" icon="arrowUp" label={'Move ' + item.title + ' up'} aria-disabled={index === 0 || undefined} onClick={() => index > 0 && move(index, index - 1)} />
                            <Button
                              variant="icon"
                              icon="arrowDown"
                              label={'Move ' + item.title + ' down'}
                              aria-disabled={index === lane.items.length - 1 || undefined}
                              onClick={() => index < lane.items.length - 1 && move(index, index + 1)}
                            />
                            <Button variant="icon" icon="x" label={'Take ' + item.title + ' off the plan'} onClick={() => void removePlanItem(item.planItem.id, 'Dropped ' + shortTitle(item.title))} />
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

            {editing && <p className="text-meta text-ink2">Drag the grip, or long-press it, to move an item; the arrows do the same. Taking an item off the plan keeps it in the Library, under Dropped here. Your edits are kept apart from the curriculum files, so they survive an update.</p>}

            {dropped.length > 0 && (
              <RowList plain>
                <Row title={'Dropped · ' + dropped.length} expanded={showDropped} onClick={() => setShowDropped((v) => !v)}>
                  {showDropped && (
                    <ul className="pb-2">
                      {dropped.map((d) => {
                        const ref = d.resourceId ?? d.projectId!;
                        return (
                          <Row
                            key={d.id}
                            title={shortTitle(titleOf(ref))}
                            action={
                              <Button size="sm" onClick={() => void restorePlanItem(d.id, 'Restored ' + shortTitle(titleOf(ref)))}>
                                Restore
                              </Button>
                            }
                          />
                        );
                      })}
                    </ul>
                  )}
                </Row>
              </RowList>
            )}

            <RowList plain>
              <Row title="Pace" meta={paceSummary(atlas, lane.block)} onClick={() => setPacing(true)} />
            </RowList>

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
      <SwapSheet atlas={atlas} planItem={swapping} onClose={() => setSwapping(null)} />
      {lane && <LanePace atlas={atlas} block={lane.block} open={open && pacing} onClose={() => setPacing(false)} />}
      {phase && lane && (
        <AddToLaneSheet open={adding} onClose={() => setAdding(false)} seed={atlas.seed} phaseId={phase.id} block={lane.block} title={'Add to ' + name} />
      )}
    </>
  );
}
