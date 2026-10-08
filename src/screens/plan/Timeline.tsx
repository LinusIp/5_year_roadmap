import { useState } from 'react';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { describeVerdict } from '../../lib/forecast.ts';
import { monthName } from '../../lib/dates.ts';
import type { BlockId, Unit } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { ProgressLine } from '../../ui/ProgressLine.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { nameOf, span } from '../parts/text.ts';
import { isOpenItem, itemDetail } from './model.ts';
import type { PhaseModel } from './model.ts';

/** Each lane keeps one colour, as in the mockup and the five-year map: orange, green, blue, purple, teal. */
export const LANE_COLOR: Record<BlockId, string> = {
  A: 'var(--track-gamedev)',
  B: 'var(--track-languages)',
  C: 'var(--track-ai)',
  D: 'var(--track-systems)',
  E: 'var(--track-math)',
};

/** "Math & physics" -> "Math and physics", "Core track" -> "Core", "Projects / hands-on" -> "Projects". */
export function laneName(name: string): string {
  return name.split('/')[0]!.trim().replace(/ track$/i, '').replace(/\s*&\s*/g, ' and ');
}

/** "February → August 2027", or both years when the range crosses one. */
function monthRange(start: string, end: string): string {
  const [ys, ms] = start.split('-').map(Number) as [number, number];
  const [ye, me] = end.split('-').map(Number) as [number, number];
  return ys === ye ? monthName(ms - 1) + ' → ' + monthName(me - 1) + ' ' + ye : monthName(ms - 1) + ' ' + ys + ' → ' + monthName(me - 1) + ' ' + ye;
}

/**
 * The five lanes of a phase, as in the mockup: a card of rows, each with its lane colour as a 3 px edge flush
 * with the card, the block and its hours, the forecast on the right, the item it is on, and a 2 px progress line
 * that turns pink when the lane is behind.
 */
function Lanes({ atlas, model, units, isCurrent, weekly, onLane }: { atlas: Atlas; model: PhaseModel; units: Record<string, Unit[]> | undefined; isCurrent: boolean; weekly: string | null; onLane: (block: string) => void }) {
  return (
    <ul className="overflow-hidden rounded-card bg-surface px-4 py-1">
      {model.progress.lanes.map((lane) => {
        const def = atlas.settings.core.blocks.find((b) => b.id === lane.block)!;
        const next = lane.items.find(isOpenItem);
        const forecast = model.forecast.lanes.find((l) => l.block === lane.block);
        let meta: string;
        if (lane.items.length === 0) meta = 'Nothing planned';
        else if (!next) meta = 'All ' + lane.items.length + ' done';
        else {
          const detail = itemDetail(next, units, atlas.states.get(next.refId)?.unitsDone ?? []);
          meta = nameOf(next) + (detail ? ', ' + detail : '');
          if (lane.block === 'D' && isCurrent && weekly) meta = 'Weekly: ' + weekly + ' · Monthly: ' + nameOf(next);
        }
        const behind = isCurrent && forecast?.verdict === 'behind';
        const title = laneName(def.name) + ' · ' + span(def.minutes);
        return (
          <li key={lane.block}>
            <button
              type="button"
              onClick={() => onLane(lane.block)}
              className="-ml-4 flex w-[calc(100%+1rem)] flex-col gap-1.5 border-t border-l-[3px] border-t-line py-3.5 pl-[25px] text-left"
              style={{ borderLeftColor: LANE_COLOR[lane.block] }}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-body font-medium leading-[1.3]">{title}</span>
                <span className="shrink-0 text-meta text-ink2">{isCurrent && forecast ? describeVerdict(forecast.verdict, forecast.weeksLate) : Math.round(lane.totalHours) + ' h'}</span>
              </span>
              <span className="text-meta leading-[1.3] text-ink2">{meta}</span>
              <ProgressLine value={lane.fraction} label={laneName(def.name) + ' progress'} color={behind ? 'var(--behind)' : undefined} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Timeline: the current phase's lanes, then the phases after it as rows that open in place. Re-plan sits behind
 * one quiet button at the end, never as a banner; next to it, the five-year map.
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

  /** "February → August 2027 · C, C++, 6.006" for the phase straight after this one, "Year 2 · …" for the rest. */
  const phaseMeta = (m: PhaseModel, position: number): string => {
    const topics = m.phase.topics ?? m.progress.lanes.map((l) => l.items[0]).filter((i) => i !== undefined).map((i) => nameOf(i)).join(', ');
    const when = position === 0 ? monthRange(m.phase.start, m.phase.end) : 'Year ' + m.phase.year;
    return when + (topics ? ' · ' + topics : '');
  };

  const phaseRows = (list: PhaseModel[]) =>
    list.map((m, position) => {
      const open = openPhase === m.phase.id;
      return (
        <Row key={m.phase.id} height={52} title={m.phase.title} meta={phaseMeta(m, position)} expanded={open} onClick={() => setOpenPhase(open ? null : m.phase.id)}>
          {open && (
            <div className="pb-4">
              {m.phase.theme && <p className="mb-1 text-meta font-medium">{m.phase.theme}</p>}
              <p className="mb-3 text-meta text-ink2">{m.phase.goal}</p>
              <Lanes atlas={atlas} model={m} units={units} isCurrent={false} weekly={null} onLane={(block) => onLane(m.phase.id, block)} />
            </div>
          )}
        </Row>
      );
    });

  return (
    <div className="mt-6">
      {current && <Lanes atlas={atlas} model={current} units={units} isCurrent weekly={weekly} onLane={(block) => onLane(current.phase.id, block)} />}
      {earlier.length > 0 && (
        <RowList flat label="Earlier" className="mt-6">
          {phaseRows(earlier)}
        </RowList>
      )}
      {later.length > 0 && (
        <RowList flat label="Next" className="mt-6">
          {phaseRows(later)}
        </RowList>
      )}
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={onReplan}>
          Re-plan
        </Button>
        <Button size="sm" to="/plan/map">
          Five-year map
        </Button>
      </div>
    </div>
  );
}
