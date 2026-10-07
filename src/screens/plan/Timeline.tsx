import { useState } from 'react';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { describeVerdict } from '../../lib/forecast.ts';
import type { Unit } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { ProgressLine } from '../../ui/ProgressLine.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { monthYear } from '../parts/ItemSheet.tsx';
import { blockShort, shortTitle, span } from '../parts/text.ts';
import { isOpenItem, itemDetail } from './model.ts';
import type { PhaseModel } from './model.ts';

/** The five lanes of a phase as rows: lane colour only as the 3 px edge, a 2 px progress line, the forecast in ink2. */
function Lanes({ atlas, model, units, isCurrent, weekly, onLane }: { atlas: Atlas; model: PhaseModel; units: Record<string, Unit[]> | undefined; isCurrent: boolean; weekly: string | null; onLane: (block: string) => void }) {
  return (
    <RowList>
      {model.progress.lanes.map((lane) => {
        const def = atlas.settings.core.blocks.find((b) => b.id === lane.block)!;
        const next = lane.items.find(isOpenItem);
        const shown = next ?? lane.items[0];
        const track = shown?.tracks[0];
        const forecast = model.forecast.lanes.find((l) => l.block === lane.block);
        let meta: string;
        if (!shown) meta = 'Nothing planned';
        else if (!next) meta = 'All ' + lane.items.length + ' done';
        else {
          const detail = itemDetail(next, units, atlas.states.get(next.refId)?.unitsDone ?? []);
          meta = shortTitle(next.title) + (detail ? ', ' + detail : '');
          if (lane.block === 'D' && isCurrent && weekly) meta = 'Weekly: ' + weekly + ' · Monthly: ' + shortTitle(next.title);
        }
        return (
          <Row
            key={lane.block}
            title={blockShort(def.name) + ' · ' + span(def.minutes)}
            meta={meta}
            trailing={isCurrent && forecast ? describeVerdict(forecast.verdict, forecast.weeksLate) : Math.round(lane.totalHours) + ' h'}
            edge={track ? 'var(--track-' + track + ')' : 'var(--line)'}
            onClick={() => onLane(lane.block)}
          >
            <div className="pb-3 pl-3">
              <ProgressLine value={lane.fraction} label={blockShort(def.name) + ' progress'} />
            </div>
          </Row>
        );
      })}
    </RowList>
  );
}

/** "February 2027 → August 2027 · C, C++, 6.006": when a phase runs and what it opens with. */
function phaseMeta(model: PhaseModel): string {
  const firsts = model.progress.lanes.map((l) => l.items[0]).filter((i) => i !== undefined).map((i) => shortTitle(i.title));
  return monthYear(model.phase.start) + ' → ' + monthYear(model.phase.end) + (firsts.length ? ' · ' + firsts.join(', ') : '');
}

/**
 * Timeline: the current phase's lanes, then the other phases as rows that open in place. Re-plan sits behind
 * one quiet button at the end, never as a banner.
 */
export function Timeline({
  atlas,
  model,
  currentId,
  units,
  weekly,
  onLane,
  onReplan,
}: {
  atlas: Atlas;
  model: PhaseModel[];
  currentId: string | null;
  units: Record<string, Unit[]> | undefined;
  weekly: string | null;
  onLane: (phaseId: string, block: string) => void;
  onReplan: () => void;
}) {
  const [openPhase, setOpenPhase] = useState<string | null>(null);
  const index = model.findIndex((m) => m.phase.id === currentId);
  const current = index >= 0 ? model[index] : undefined;
  const earlier = index >= 0 ? model.slice(0, index) : model.filter((m) => m.phase.end < (atlas.seed.phases[0]?.start ?? ''));
  const later = index >= 0 ? model.slice(index + 1) : model;

  const phaseRows = (list: PhaseModel[]) =>
    list.map((m) => {
      const open = openPhase === m.phase.id;
      return (
        <Row key={m.phase.id} title={m.phase.title} meta={phaseMeta(m)} expanded={open} onClick={() => setOpenPhase(open ? null : m.phase.id)}>
          {open && (
            <div className="pb-4">
              <p className="mb-3 text-meta text-ink2">{m.phase.goal}</p>
              <Lanes atlas={atlas} model={m} units={units} isCurrent={false} weekly={null} onLane={(block) => onLane(m.phase.id, block)} />
            </div>
          )}
        </Row>
      );
    });

  return (
    <div>
      {current && <Lanes atlas={atlas} model={current} units={units} isCurrent weekly={weekly} onLane={(block) => onLane(current.phase.id, block)} />}
      {earlier.length > 0 && (
        <RowList flat label="Earlier" className="mt-7">
          {phaseRows(earlier)}
        </RowList>
      )}
      {later.length > 0 && (
        <RowList flat label="Next" className="mt-7">
          {phaseRows(later)}
        </RowList>
      )}
      <Button className="mt-6" icon="refresh" onClick={onReplan}>
        Re-plan
      </Button>
    </div>
  );
}
