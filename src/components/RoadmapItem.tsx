import { useEffect, useState } from 'react';
import { Icon } from './Icon.tsx';
import { TrackDot } from './TrackDot.tsx';
import { Link } from '../router/router.tsx';
import { removePlanItem } from '../db/edits.ts';
import { setItemStatus, toggleUnit, useItemState } from '../db/state.ts';
import { formatHours } from '../lib/dates.ts';
import { loadUnits } from '../seed/index.ts';
import type { Unit } from '../seed/schema.ts';
import type { ItemStatus } from '../db/types.ts';
import type { PlanItemView } from '../lib/progress.ts';
import type { Track } from '../seed/schema.ts';

const STATUS_LABEL: Record<ItemStatus, string> = { todo: 'To do', active: 'In progress', done: 'Done', dropped: 'Dropped' };
const STATUS_ORDER: ItemStatus[] = ['todo', 'active', 'done', 'dropped'];

function statusClass(status: ItemStatus): string {
  switch (status) {
    case 'done':
      return 'text-good-text border-good/40';
    case 'active':
      return 'text-accent-text border-accent/40';
    case 'dropped':
      return 'text-ink-3 border-line line-through';
    default:
      return 'text-ink-2 border-line';
  }
}

/** The checklist, loaded from its own chunk the first time an item is opened. */
function UnitList({ refId, unitsDone }: { refId: string; unitsDone: string[] }) {
  const [units, setUnits] = useState<Unit[] | null>(null);
  useEffect(() => {
    let live = true;
    void loadUnits(refId).then((list) => {
      if (live) setUnits(list);
    });
    return () => {
      live = false;
    };
  }, [refId]);

  // Ticks show at once and are reconciled with the database when it answers; the key keeps the reset
  // from firing on every render, since the stored list arrives as a fresh array each time.
  const doneKey = unitsDone.join('|');
  const [pending, setPending] = useState<Map<string, boolean>>(() => new Map());
  useEffect(() => setPending(new Map()), [doneKey]);

  if (units === null) return <p className="py-2 text-xs text-ink-3">Loading the checklist…</p>;
  if (units.length === 0) return null;

  const stored = new Set(unitsDone);
  const isDone = (id: string): boolean => pending.get(id) ?? stored.has(id);
  let lastSection: string | undefined;

  return (
    <ul className="mt-2 max-h-72 space-y-0.5 overflow-y-auto pr-1">
      {units.map((unit) => {
        const showSection = unit.section && unit.section !== lastSection;
        lastSection = unit.section;
        return (
          <li key={unit.id}>
            {showSection && <p className="eyebrow mt-2 first:mt-0">{unit.section}</p>}
            <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 text-sm hover:bg-raised">
              <input
                type="checkbox"
                className="mt-0.5 size-3.5 shrink-0 accent-[var(--accent-fill)]"
                checked={isDone(unit.id)}
                onChange={() => {
                  setPending((current) => new Map(current).set(unit.id, !isDone(unit.id)));
                  void toggleUnit(refId, unit.id);
                }}
              />
              <span className={isDone(unit.id) ? 'text-ink-3 line-through' : 'text-ink-2'}>{unit.title}</span>
              {unit.url && (
                <a
                  href={unit.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ml-auto shrink-0 text-ink-3 hover:text-accent-text"
                  aria-label={'Open ' + unit.title}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon name="external" size={13} />
                </a>
              )}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

interface RoadmapItemProps {
  item: PlanItemView;
  tracks: Track[];
  editing: boolean;
  onMove?: (direction: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  titleOf?: (refId: string) => string;
}

export function RoadmapItem({ item, tracks, editing, onMove, canMoveUp, canMoveDown, titleOf }: RoadmapItemProps) {
  const [open, setOpen] = useState(false);
  const track = tracks.find((t) => t.id === item.tracks[0]);
  const percent = Math.round(item.fraction * 100);

  return (
    <li className="rounded-lg border border-line bg-surface">
      <div className="flex items-start gap-2 p-2.5">
        <TrackDot track={track} size={7} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <button
              type="button"
              className={'text-left text-sm font-medium leading-snug hover:text-accent-text' + (item.status === 'dropped' ? ' text-ink-3 line-through' : '')}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              {item.title}
            </button>
            {item.stretch && <span className="chip px-1.5 text-[0.625rem]">stretch</span>}
            {item.cadence && <span className="chip px-1.5 text-[0.625rem]">{item.cadence}</span>}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
            <span className="num">{formatHours(item.estHours * 60, 0)}</span>
            {item.unitCount > 0 && (
              <span className="num">
                {item.unitsDone}/{item.unitCount}
              </span>
            )}
            {item.provider && <span className="truncate">{item.provider}</span>}
            {item.blockedBy.length > 0 && (
              <span className="text-warning-text" title={'Waiting on: ' + item.blockedBy.map((id) => titleOf?.(id) ?? id).join(', ')}>
                <Icon name="lock" size={11} className="inline" /> blocked
              </span>
            )}
          </div>

          {percent > 0 && (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-raised">
              <div className="h-full rounded-full bg-accent-fill" style={{ width: percent + '%' }} />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {editing && onMove && (
            <>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label={'Move ' + item.title + ' up'}>
                <Icon name="arrowUp" size={13} />
              </button>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => onMove(1)} disabled={!canMoveDown} aria-label={'Move ' + item.title + ' down'}>
                <Icon name="arrowDown" size={13} />
              </button>
            </>
          )}
          <select
            className="input h-7 w-auto px-1.5 text-xs"
            style={{ minHeight: '1.75rem' }}
            value={item.status}
            aria-label={'Status of ' + item.title}
            onChange={(e) => void setItemStatus(item.refId, e.target.value as ItemStatus)}
          >
            {STATUS_ORDER.map((status) => {
              // The brief: a project is only done once its repository link is filled in.
              const needsRepo = status === 'done' && item.kind === 'project' && !item.hasRepo;
              return (
                <option key={status} value={status} disabled={needsRepo}>
                  {STATUS_LABEL[status]}
                  {needsRepo ? ' (add a repo link first)' : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {open && (
        <div className="border-t border-line px-2.5 pb-2.5 pt-2">
          {item.note && <p className="mb-2 text-xs text-ink-3">{item.note}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            <Link to={'/library/' + item.refId} className="btn btn-sm btn-ghost">
              <Icon name="info" size={13} />
              Details
            </Link>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noreferrer noopener" className="btn btn-sm btn-ghost">
                <Icon name="external" size={13} />
                Open
              </a>
            ) : (
              item.searchHint && (
                <a
                  href={'https://duckduckgo.com/?q=' + encodeURIComponent(item.searchHint)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn btn-sm btn-ghost text-warning-text"
                >
                  <Icon name="search" size={13} />
                  Find link
                </a>
              )
            )}
            {editing && (
              <button
                type="button"
                className="btn btn-sm btn-ghost text-critical-text"
                onClick={() => void removePlanItem(item.planItem.id)}
                title="Take this off the roadmap. It stays in the Library."
              >
                <Icon name="trash" size={13} />
                Remove
              </button>
            )}
          </div>
          <span className={'chip mt-2 ' + statusClass(item.status)}>{STATUS_LABEL[item.status]}</span>
          {item.unitCount > 0 && item.kind === 'resource' && <LiveUnitList refId={item.refId} />}
        </div>
      )}
    </li>
  );
}

/** Reads the item's own state, so a tick made on Today shows here straight away. */
function LiveUnitList({ refId }: { refId: string }) {
  const state = useItemState(refId);
  return <UnitList refId={refId} unitsDone={state?.unitsDone ?? []} />;
}
