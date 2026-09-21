import { useMemo, useState } from 'react';
import { Icon } from './Icon.tsx';
import { Modal } from './Modal.tsx';
import { patchMany } from '../db/edits.ts';
import { formatHours } from '../lib/dates.ts';
import { describeReason, replan, replanToPatches } from '../lib/replan.ts';
import type { AppSeed, BlockId } from '../seed/schema.ts';
import type { StoredSettings, UserItemState } from '../db/types.ts';

interface ReplanDialogProps {
  open: boolean;
  onClose: () => void;
  seed: AppSeed;
  settings: StoredSettings;
  states: Map<string, UserItemState>;
  asOf: string;
}

/**
 * Shows what a re-plan would change and applies it only when asked. The diff is the whole point: the
 * user sees every move, and why, before anything happens.
 */
export function ReplanDialog({ open, onClose, seed, settings, states, asOf }: ReplanDialogProps) {
  const [applying, setApplying] = useState(false);
  const result = useMemo(() => (open ? replan({ seed, settings, states, asOf }) : null), [open, seed, settings, states, asOf]);

  const phaseTitle = (id: string): string => seed.phases.find((p) => p.id === id)?.title ?? id;
  const blockName = (id: BlockId): string => settings.core.blocks.find((b) => b.id === id)?.name ?? id;

  const apply = async (): Promise<void> => {
    if (!result) return;
    setApplying(true);
    try {
      await patchMany('planItem', replanToPatches(result));
      onClose();
    } finally {
      setApplying(false);
    }
  };

  const overBudget = result?.lanes.filter((l) => l.overflowHours > 0.5) ?? [];
  const nothingToDo = result !== null && result.moves.length === 0 && result.reorders.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Re-plan from today"
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            {nothingToDo ? 'Close' : 'Cancel'}
          </button>
          {!nothingToDo && (
            <button type="button" className="btn btn-primary" onClick={() => void apply()} disabled={applying}>
              {applying ? 'Applying…' : 'Apply ' + (result?.moves.length ?? 0) + (result?.moves.length === 1 ? ' move' : ' moves')}
            </button>
          )}
        </>
      }
    >
      <p className="mb-4 text-sm text-ink-2">
        Lays every unfinished item out again from today, lane by lane, in its present order. An item only goes
        where its lane has hours left, and never before a phase holding one of its prerequisites. Nothing is
        dropped.
      </p>

      {result && nothingToDo && (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-raised/50 p-3 text-sm">
          <Icon name="check" size={16} className="text-good-text" />
          Everything already fits. Nothing would move.
        </div>
      )}

      {result && result.moves.length > 0 && (
        <section className="mb-4">
          <h3 className="mb-2 text-sm font-semibold">
            {result.moves.length} {result.moves.length === 1 ? 'item moves' : 'items move'}
            <span className="font-normal text-ink-3"> · {result.unchanged} stay where they are</span>
          </h3>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {result.moves.map((move) => (
              <li key={move.planItemId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <span className="chip w-7 justify-center px-0 font-mono text-[0.6875rem]" title={blockName(move.block)}>
                  {move.block}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{move.title}</span>
                <span className="flex items-center gap-1.5 text-xs text-ink-2">
                  <span>{phaseTitle(move.fromPhaseId)}</span>
                  <Icon name="arrowRight" size={12} className="text-ink-3" />
                  <span className="font-medium text-ink">{phaseTitle(move.toPhaseId)}</span>
                </span>
                <span className="w-full pl-10 text-xs text-ink-3 sm:w-auto sm:pl-0">
                  {formatHours(move.remainingHours * 60)} left · {describeReason(move.reason)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result && result.reorders.length > 0 && result.moves.length === 0 && (
        <p className="mb-4 text-sm text-ink-2">
          {result.reorders.length} {result.reorders.length === 1 ? 'item takes' : 'items take'} a new position within
          its phase.
        </p>
      )}

      {result && result.pastPlanEnd.length > 0 && (
        <section className="mb-4 rounded-lg border border-warning/50 bg-warning/10 p-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-warning-text">
            <Icon name="alert" size={15} />
            {result.pastPlanEnd.length} {result.pastPlanEnd.length === 1 ? 'item does' : 'items do'} not fit before 31 August 2031
          </h3>
          <p className="mt-1 text-sm text-ink-2">
            They stay in the last phase, over its budget. Raise a block&apos;s minutes in Settings, drop a stretch
            item, or accept a later finish.
          </p>
        </section>
      )}

      {overBudget.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Lanes still over their hours after this</h3>
          <ul className="flex flex-wrap gap-1.5">
            {overBudget.map((lane) => (
              <li key={lane.block + lane.phaseId} className="chip num">
                {phaseTitle(lane.phaseId)} · {lane.block}: {formatHours(lane.plannedHours * 60, 0)} of {formatHours(lane.budgetHours * 60, 0)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Modal>
  );
}
