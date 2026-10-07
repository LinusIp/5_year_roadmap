import { useMemo, useState } from 'react';
import { patchMany } from '../../db/edits.ts';
import type { StoredSettings, UserItemState } from '../../db/types.ts';
import { formatLong } from '../../lib/dates.ts';
import { describeReason, replan, replanToPatches } from '../../lib/replan.ts';
import type { AppSeed } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { plural, span } from '../parts/text.ts';

/**
 * What a re-plan would change, applied only when asked. The diff is the point: every move and why it moves,
 * before anything happens.
 */
export function ReplanSheet({ open, onClose, seed, settings, states, asOf }: { open: boolean; onClose: () => void; seed: AppSeed; settings: StoredSettings; states: Map<string, UserItemState>; asOf: string }) {
  const [applying, setApplying] = useState(false);
  const result = useMemo(() => (open ? replan({ seed, settings, states, asOf }) : null), [open, seed, settings, states, asOf]);
  const phaseTitle = (id: string): string => seed.phases.find((p) => p.id === id)?.title ?? id;
  const nothingToDo = result !== null && result.moves.length === 0 && result.reorders.length === 0;
  const overBudget = result?.lanes.filter((l) => l.overflowHours > 0.5) ?? [];
  const planEnd = seed.phases.at(-1)!.end;

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

  return (
    <Sheet
      open={open}
      title="Re-plan from today"
      onClose={onClose}
      footer={
        nothingToDo ? undefined : (
          <Button variant="filled" onClick={() => void apply()} aria-disabled={applying || undefined}>
            {applying ? 'Applying' : 'Apply ' + plural(result?.moves.length ?? 0, 'move')}
          </Button>
        )
      }
    >
      <p className="text-body text-ink2">
        Every unfinished item is laid out again from today, lane by lane, in its present order. An item only goes where its lane has hours left, and never before a phase
        holding one of its prerequisites. Nothing is dropped.
      </p>

      {nothingToDo && <p className="mt-4 text-body">Everything already fits. Nothing would move.</p>}

      {result && result.moves.length > 0 && (
        <RowList className="mt-5" label={plural(result.moves.length, 'item moves', 'items move') + ' · ' + result.unchanged + ' stay where they are'}>
          {result.moves.map((move) => (
            <Row
              key={move.planItemId}
              title={move.title}
              meta={phaseTitle(move.fromPhaseId) + ' → ' + phaseTitle(move.toPhaseId) + ' · ' + span(move.remainingHours * 60) + ' left · ' + describeReason(move.reason)}
              trailing={'Block ' + move.block}
            />
          ))}
        </RowList>
      )}

      {result && result.reorders.length > 0 && result.moves.length === 0 && (
        <p className="mt-4 text-body">{plural(result.reorders.length, 'item takes', 'items take')} a new position within its phase.</p>
      )}

      {result && result.pastPlanEnd.length > 0 && (
        <p className="mt-4 text-body">
          <span className="font-medium">
            {plural(result.pastPlanEnd.length, 'item does', 'items do')} not fit before {formatLong(planEnd)}.
          </span>{' '}
          They stay in the last phase, over its budget. Raise a block&apos;s minutes in Settings, drop a stretch item, or accept a later finish.
        </p>
      )}

      {overBudget.length > 0 && (
        <RowList className="mt-5" label="Lanes still over their hours after this">
          {overBudget.map((lane) => (
            <Row key={lane.block + lane.phaseId} title={phaseTitle(lane.phaseId) + ' · Block ' + lane.block} trailing={Math.round(lane.plannedHours) + ' of ' + Math.round(lane.budgetHours) + ' h'} />
          ))}
        </RowList>
      )}
    </Sheet>
  );
}
