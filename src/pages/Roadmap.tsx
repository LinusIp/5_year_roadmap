import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { AddItemForm } from '../components/AddItemForm.tsx';
import { Icon } from '../components/Icon.tsx';
import { Page } from '../components/Page.tsx';
import { ReplanDialog } from '../components/ReplanDialog.tsx';
import { RoadmapItem } from '../components/RoadmapItem.tsx';
import { patchMany } from '../db/edits.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import type { Atlas } from '../hooks/useAtlas.ts';
import { formatHours, formatRange, formatShort, today as todayDate } from '../lib/dates.ts';
import { describeVerdict, forecastPhase, paceSummary, verdictTone } from '../lib/forecast.ts';
import type { LaneForecast, PhaseForecast, Verdict } from '../lib/forecast.ts';
import { reorderLane } from '../lib/plan.ts';
import { buildPlanItemView, laneProgress, phaseProgress } from '../lib/progress.ts';
import type { LaneProgress, PhaseProgress } from '../lib/progress.ts';
import { laneCapacity } from '../lib/replan.ts';
import { activePhase, lane as laneItems } from '../lib/schedule.ts';
import type { BlockId, Phase } from '../seed/schema.ts';

const TONE_CLASS: Record<ReturnType<typeof verdictTone>, string> = {
  good: 'text-good-text border-good/40',
  warning: 'text-warning-text border-warning/50',
  critical: 'text-critical-text border-critical/50',
  muted: 'text-ink-2 border-line',
};

function VerdictChip({ verdict, weeksLate }: { verdict: Verdict; weeksLate: number | null }) {
  return <span className={'chip ' + TONE_CLASS[verdictTone(verdict)]}>{describeVerdict(verdict, weeksLate)}</span>;
}

function Bar({ fraction, label }: { fraction: number; label: string }) {
  const percent = Math.round(fraction * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised" role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-accent-fill" style={{ width: percent + '%' }} />
      </div>
      <span className="num w-9 shrink-0 text-right text-xs text-ink-3">{percent}%</span>
    </div>
  );
}

interface PhaseModel {
  phase: Phase;
  progress: PhaseProgress;
  forecast: PhaseForecast;
}

function buildModel(atlas: Atlas, asOf: string): PhaseModel[] {
  const { seed, settings, states, logs } = atlas;
  return seed.phases.map((phase) => {
    const lanes: LaneProgress[] = settings.core.blocks.map((block) => {
      const items = laneItems(seed, phase.id, block.id)
        .map((planItem) => buildPlanItemView(planItem, seed, states))
        .filter((v) => v !== null);
      return laneProgress(block.id, items, laneCapacity(settings, block.id, phase.start, phase.end));
    });
    const progress = phaseProgress(phase.id, lanes);
    const forecast = forecastPhase({ phase, lanes, logs, settings, asOf });
    return { phase, progress, forecast };
  });
}

/* ------------------------------------------------------------------ one lane */

interface LaneViewProps {
  atlas: Atlas;
  phase: Phase;
  lane: LaneProgress;
  forecast: LaneForecast | undefined;
  editing: boolean;
  onAdd: (block: BlockId) => void;
}

function LaneView({ atlas, phase, lane, forecast, editing, onAdd }: LaneViewProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const def = atlas.settings.core.blocks.find((b) => b.id === lane.block)!;
  const focus = phase.focus[lane.block];
  const overBudget = lane.totalHours > lane.budgetHours * 1.05;

  const titleOf = (refId: string): string =>
    atlas.seed.resources.find((r) => r.id === refId)?.title ?? atlas.seed.projects.find((p) => p.id === refId)?.title ?? refId;

  const move = (from: number, to: number): void => {
    const planItems = lane.items.map((i) => i.planItem);
    const reordered = reorderLane(planItems, from, to);
    if (reordered.length > 0) void patchMany('planItem', reordered.map((r) => ({ id: r.id, patch: { order: r.order } })));
  };

  const dragProps = (index: number) =>
    editing
      ? {
          draggable: true,
          onDragStart: (e: DragEvent) => {
            setDragIndex(index);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(index));
          },
          onDragOver: (e: DragEvent) => {
            if (dragIndex === null) return;
            e.preventDefault();
            setOverIndex(index);
          },
          onDrop: (e: DragEvent) => {
            e.preventDefault();
            if (dragIndex !== null && dragIndex !== index) move(dragIndex, index);
            setDragIndex(null);
            setOverIndex(null);
          },
          onDragEnd: () => {
            setDragIndex(null);
            setOverIndex(null);
          },
        }
      : {};

  return (
    <section className="min-w-0 rounded-xl border border-line bg-page/40 p-3" aria-label={'Block ' + lane.block + ': ' + def.name}>
      <header className="mb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">
            Block {lane.block} · {def.name}
          </span>
          {forecast && lane.remainingHours > 0 && lane.doneHours > 0 && <VerdictChip verdict={forecast.verdict} weeksLate={forecast.weeksLate} />}
        </div>
        <p className="mt-0.5 text-xs text-ink-2">{focus}</p>
        <div className="mt-2">
          <Bar fraction={lane.fraction} label={'Block ' + lane.block + ' progress'} />
        </div>
        <p className={'num mt-1 text-xs ' + (overBudget ? 'text-warning-text' : 'text-ink-3')}>
          {formatHours(lane.totalHours * 60, 0)} planned of {formatHours(lane.budgetHours * 60, 0)} available
          {overBudget && ' · over budget'}
        </p>
      </header>

      {lane.items.length === 0 ? (
        <p className="py-2 text-xs text-ink-3">Nothing planned in this lane.</p>
      ) : (
        <ol className="space-y-1.5">
          {lane.items.map((item, index) => (
            <div
              key={item.planItem.id}
              {...dragProps(index)}
              className={
                (editing ? 'cursor-grab ' : '') +
                (dragIndex === index ? 'opacity-40 ' : '') +
                (overIndex === index && dragIndex !== index ? 'rounded-lg ring-2 ring-accent ' : '')
              }
            >
              <RoadmapItem
                item={item}
                tracks={atlas.seed.tracks}
                editing={editing}
                titleOf={titleOf}
                onMove={(direction) => move(index, index + direction)}
                canMoveUp={index > 0}
                canMoveDown={index < lane.items.length - 1}
              />
            </div>
          ))}
        </ol>
      )}

      {editing && (
        <button type="button" className="btn btn-ghost btn-sm mt-2 w-full justify-center border border-dashed border-line" onClick={() => onAdd(lane.block)}>
          <Icon name="plus" size={13} />
          Add to this lane
        </button>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ one phase */

function PhaseView({
  atlas,
  model,
  open,
  current,
  editing,
  onToggle,
  onAdd,
}: {
  atlas: Atlas;
  model: PhaseModel;
  open: boolean;
  current: boolean;
  editing: boolean;
  onToggle: () => void;
  onAdd: (phaseId: string, block: BlockId) => void;
}) {
  const { phase, progress, forecast } = model;
  const started = progress.fraction > 0;
  const showForecast = started && forecast.verdict !== 'done';

  return (
    <article className={'card overflow-hidden' + (current ? ' ring-1 ring-accent/60' : '')}>
      <button type="button" className="flex w-full items-start gap-3 p-4 text-left hover:bg-raised/40" onClick={onToggle} aria-expanded={open}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={18} className="mt-0.5 text-ink-3" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="eyebrow">Year {phase.year}</span>
            {current && <span className="chip border-accent/50 text-accent-text">Now</span>}
            {showForecast && <VerdictChip verdict={forecast.verdict} weeksLate={forecast.weeksLate} />}
            {forecast.verdict === 'done' && <VerdictChip verdict="done" weeksLate={null} />}
          </div>
          <h2 className="mt-0.5 text-lg font-semibold">{phase.title}</h2>
          <p className="num text-xs text-ink-3">{formatRange(phase.start, phase.end)}</p>
          <p className="mt-1.5 max-w-3xl text-sm text-ink-2">{phase.goal}</p>
          <div className="mt-3 max-w-md">
            <Bar fraction={progress.fraction} label={phase.title + ' progress'} />
          </div>
          <p className="num mt-1 text-xs text-ink-3">
            {progress.itemsDone} of {progress.itemsTotal} items done · {formatHours(progress.remainingHours * 60, 0)} to go
            {showForecast && forecast.projectedEnd && ' · finishes about ' + formatShort(forecast.projectedEnd)}
          </p>
        </div>
      </button>

      {open && (
        <div className="grid gap-3 border-t border-line p-3 md:grid-cols-2 xl:grid-cols-3">
          {progress.lanes.map((lane) => (
            <LaneView
              key={lane.block}
              atlas={atlas}
              phase={phase}
              lane={lane}
              forecast={forecast.lanes.find((l) => l.block === lane.block)}
              editing={editing}
              onAdd={(block) => onAdd(phase.id, block)}
            />
          ))}
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ the page */

export function Roadmap() {
  const atlas = useAtlas();
  const asOf = todayDate();
  const [editing, setEditing] = useState(false);
  const [replanOpen, setReplanOpen] = useState(false);
  const [adding, setAdding] = useState<{ phaseId: string; block: BlockId } | null>(null);
  const [openPhases, setOpenPhases] = useState<Set<string> | null>(null);

  const model = useMemo(() => (atlas ? buildModel(atlas, asOf) : null), [atlas, asOf]);

  if (!atlas || !model) {
    return (
      <Page title="Roadmap">
        <p className="text-sm text-ink-3">Loading the roadmap…</p>
      </Page>
    );
  }

  const current = activePhase(asOf, atlas.seed.phases) ?? (asOf < atlas.seed.phases[0]!.start ? atlas.seed.phases[0]! : null);
  const expanded = openPhases ?? new Set(current ? [current.id] : []);
  const toggle = (id: string): void => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenPhases(next);
  };

  const totalHours = model.reduce((sum, m) => sum + m.progress.totalHours, 0);
  const remaining = model.reduce((sum, m) => sum + m.progress.remainingHours, 0);
  const pace = paceSummary(atlas.logs, atlas.settings, asOf);

  const stages = [
    { stage: 1, title: 'Stage 1 · Software', sub: 'Years 1 to 3: languages, CS core, AI engineering, scalable systems, graphics, engines and simulation' },
    { stage: 2, title: 'Stage 2 · Electrical and mechanical', sub: 'Years 4 and 5: circuits, signals, embedded, control, mechanics, robotics; simulate it, then build it' },
  ];

  const addingBlock = adding ? atlas.settings.core.blocks.find((b) => b.id === adding.block) : undefined;

  return (
    <Page
      title="Roadmap"
      lead="Five years, six phases, five lanes."
      actions={
        <>
          <button type="button" className={'btn' + (editing ? ' btn-primary' : '')} onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
            <Icon name={editing ? 'check' : 'edit'} size={15} />
            {editing ? 'Done editing' : 'Edit'}
          </button>
          <button type="button" className="btn" onClick={() => setReplanOpen(true)}>
            <Icon name="refresh" size={15} />
            Re-plan
          </button>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="card px-3 py-2.5">
          <div className="eyebrow">Overall</div>
          <div className="num mt-0.5 text-lg font-semibold">{totalHours > 0 ? Math.round(((totalHours - remaining) / totalHours) * 100) : 0}%</div>
          <div className="text-xs text-ink-3">of {formatHours(totalHours * 60, 0)} planned</div>
        </div>
        <div className="card px-3 py-2.5">
          <div className="eyebrow">Still to do</div>
          <div className="num mt-0.5 text-lg font-semibold">{formatHours(remaining * 60, 0)}</div>
          <div className="text-xs text-ink-3">{atlas.seed.plan.length} items on the roadmap</div>
        </div>
        <div className="card px-3 py-2.5">
          <div className="eyebrow">Pace</div>
          <div className="num mt-0.5 text-lg font-semibold">{pace.actual.toFixed(1)} h/day</div>
          <div className="text-xs text-ink-3">
            last {pace.windowDays} days · plan {pace.planned.toFixed(0)} h
          </div>
        </div>
        <div className="card px-3 py-2.5">
          <div className="eyebrow">Now</div>
          <div className="mt-0.5 truncate text-lg font-semibold">{current?.title ?? 'Outside the plan'}</div>
          <div className="text-xs text-ink-3">{current ? 'Year ' + current.year : ''}</div>
        </div>
      </div>

      {editing && (
        <p className="mb-4 rounded-lg border border-line bg-raised/50 p-3 text-sm text-ink-2">
          Drag items to reorder a lane, or use the arrows. Removing an item takes it off the roadmap; it stays in the
          Library. Your edits are kept separately from the curriculum files, so they survive a curriculum update.
        </p>
      )}

      {stages.map(({ stage, title, sub }) => (
        <section key={stage} className="mb-8">
          <header className="mb-3">
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-sm text-ink-3">{sub}</p>
          </header>
          <div className="space-y-3">
            {model
              .filter((m) => m.phase.stage === stage)
              .map((m) => (
                <PhaseView
                  key={m.phase.id}
                  atlas={atlas}
                  model={m}
                  open={expanded.has(m.phase.id)}
                  current={current?.id === m.phase.id}
                  editing={editing}
                  onToggle={() => toggle(m.phase.id)}
                  onAdd={(phaseId, block) => setAdding({ phaseId, block })}
                />
              ))}
          </div>
        </section>
      ))}

      <ReplanDialog open={replanOpen} onClose={() => setReplanOpen(false)} seed={atlas.seed} settings={atlas.settings} states={atlas.states} asOf={asOf} />

      {adding && addingBlock && (
        <AddItemForm
          open
          onClose={() => setAdding(null)}
          seed={atlas.seed}
          phaseId={adding.phaseId}
          block={adding.block}
          blockName={'Block ' + adding.block + ' · ' + addingBlock.name}
        />
      )}
    </Page>
  );
}
