import { useMemo, useState } from 'react';
import { addPlanEdit } from '../../db/edits.ts';
import { updateSettings } from '../../db/settings.ts';
import type { StoredSettings, UserItemState } from '../../db/types.ts';
import { formatLong, formatRange } from '../../lib/dates.ts';
import { dropOrDefer, pushDatesBack, redistribute } from '../../lib/replan-strategies.ts';
import type { Strategy } from '../../lib/replan-strategies.ts';
import { seed as rawSeed } from '../../seed/index.ts';
import type { AppSeed } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { SegmentedControl } from '../../ui/SegmentedControl.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { blockShort, plural, shortTitle, span } from '../parts/text.ts';

const INTRO: Record<Strategy, string> = {
  push: 'Each phase from today on gets as many more days as its fullest lane needs, and the phases after it move along. Nothing is dropped and no lane changes.',
  redistribute: 'For the rest of this phase, lanes with room give minutes a day to lanes that are short. The day stays as long as it is; dates stay put.',
  defer: 'Where a lane does not fit its phase, its stretch items go first, then the ones teaching the lowest-priority roadmap, then the latest. They move to the start of the next phase; in the last phase they come off the plan, restorable.',
};

/**
 * Re-plan from today, three ways, each shown as a diff before anything changes: push dates back, redistribute
 * across lanes, or drop and defer the lowest-priority items.
 */
export function ReplanSheet({ open, onClose, seed, settings, states, asOf }: { open: boolean; onClose: () => void; seed: AppSeed; settings: StoredSettings; states: Map<string, UserItemState>; asOf: string }) {
  const [strategy, setStrategy] = useState<Strategy>('push');
  const [applying, setApplying] = useState(false);
  const result = useMemo(() => {
    if (!open) return null;
    const input = { seed, settings, states, asOf };
    if (strategy === 'push') return { kind: 'push' as const, push: pushDatesBack(input) };
    if (strategy === 'redistribute') return { kind: 'redistribute' as const, spread: redistribute(input) };
    return { kind: 'defer' as const, defer: dropOrDefer(input) };
  }, [open, strategy, seed, settings, states, asOf]);
  const phaseTitle = (id: string): string => seed.phases.find((p) => p.id === id)?.title ?? id;
  const titleOf = (id: string): string => shortTitle(seed.resources.find((r) => r.id === id)?.title ?? seed.projects.find((p) => p.id === id)?.title ?? id);
  const blockName = (id: string): string => blockShort(settings.core.blocks.find((b) => b.id === id)?.name ?? id);

  const count = !result ? 0 : result.kind === 'push' ? result.push.shifts.length : result.kind === 'redistribute' ? result.spread.changes.length : result.defer.deferrals.length;
  const apply = async (): Promise<void> => {
    if (!result) return;
    setApplying(true);
    try {
      if (result.kind === 'push') await addPlanEdit(result.push.patches, 'Re-planned: pushed the dates back ' + plural(result.push.days, 'day'));
      if (result.kind === 'defer') await addPlanEdit(result.defer.patches, 'Re-planned: deferred ' + plural(result.defer.deferrals.length, 'item'));
      if (result.kind === 'redistribute') await updateSettings(rawSeed.settings, (s) => ({ ...s, pace: { ...s.pace, ...result.spread.pace } }));
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
        count === 0 ? undefined : (
          <Button variant="filled" onClick={() => void apply()} aria-disabled={applying || undefined}>
            {applying ? 'Applying' : 'Apply ' + plural(count, 'change')}
          </Button>
        )
      }
    >
      <SegmentedControl
        label="How to re-plan"
        value={strategy}
        onChange={setStrategy}
        options={[
          { value: 'push', label: 'Push dates' },
          { value: 'redistribute', label: 'Redistribute' },
          { value: 'defer', label: 'Defer or drop' },
        ]}
      />
      <p className="mt-3 text-body text-ink2">{INTRO[strategy]}</p>

      {result && count === 0 && <p className="mt-4 text-body">Everything already fits. Nothing would change.</p>}

      {result?.kind === 'push' && count > 0 && (
        <RowList className="mt-5" label={'The plan ends ' + plural(result.push.days, 'day') + ' later'}>
          {result.push.shifts.map((s) => (
            <Row key={s.phaseId} title={s.title} meta={formatRange(s.from.start, s.from.end) + ' → ' + formatRange(s.to.start, s.to.end)} />
          ))}
        </RowList>
      )}

      {result?.kind === 'redistribute' && count > 0 && (
        <>
          <RowList className="mt-5" label="Minutes a day for the rest of this phase">
            {result.spread.changes.map((c) => (
              <Row key={c.block} title={'Block ' + c.block + ' · ' + blockName(c.block)} trailing={span(c.before) + ' → ' + span(c.after)} />
            ))}
          </RowList>
          {result.spread.stillShortHours > 1 && <p className="mt-3 text-body">Still {span(result.spread.stillShortHours * 60)} short this phase: the other lanes have no more room.</p>}
        </>
      )}

      {result?.kind === 'defer' && count > 0 && (
        <RowList className="mt-5" label={plural(count, 'item moves', 'items move')}>
          {result.defer.deferrals.map((d) => (
            <Row
              key={d.planItemId}
              title={titleOf(d.refId)}
              meta={phaseTitle(d.fromPhaseId) + ' → ' + (d.toPhaseId ? phaseTitle(d.toPhaseId) : 'off the plan') + ' · ' + span(d.hours * 60) + ' left · ' + d.why}
              trailing={'Block ' + d.block}
            />
          ))}
        </RowList>
      )}

      <p className="mt-4 text-meta text-ink2">The plan runs to {formatLong(seed.phases.at(-1)!.end)}. Every change can be undone.</p>
    </Sheet>
  );
}
