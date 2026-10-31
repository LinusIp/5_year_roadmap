import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { BusyEvent } from '../../db/types.ts';
import { GRID_END, GRID_START, hm, parseHm, snap, SNAP } from '../../lib/calendar-layout.ts';
import type { PlacedBlock } from '../../lib/calendar-layout.ts';
import { BlockIcon } from '../../ui/glyphs.tsx';
import { span } from '../parts/text.ts';

/** 56 px an hour, so a 15-minute step is a finger's 14 px: 06:00 to 24:00 is 1,008 px, scrolled inside the page. */
export const PX_PER_MIN = 56 / 60;
export const GRID_HEIGHT = (GRID_END - GRID_START) * PX_PER_MIN;
/** How long a finger rests on an event before it can be dragged; a mouse or pen drags at once. */
const LONG_PRESS_MS = 350;

const top = (minute: number): number => (minute - GRID_START) * PX_PER_MIN;

/** The week view's 2–4 letter labels, written on an event once it is 48 px tall. */
const SHORT: Record<string, string> = { C: 'ML', A: 'GD', H: 'HF', B: 'Code', E: 'Math', D: 'Proj' };

export interface ColumnBlock extends PlacedBlock {
  name: string;
  item?: string;
  logged: number;
  /** The block's lane (ATLAS-DAILY-SCENES), for its colours. */
  lane?: number;
  /** Marked done on the day. */
  done?: boolean;
  /** The timer runs on it now. */
  running?: boolean;
}

interface Drag {
  block: string;
  mode: 'move' | 'resize';
  pointerY: number;
  start: number;
  minutes: number;
  /** Where it is now, while dragging. */
  nextStart: number;
  nextMinutes: number;
  active: boolean;
}

/**
 * One day of the time grid: busy events as neutral knobs, blocks as 12 px rounded pills in their tone with the time
 * logged filled and the time still to come pressed in, the current-time line on today. A block is dragged to move
 * it and by its bottom edge to change its length, in 15-minute steps (a long press first on a phone); a tap opens
 * its sheet. A tap on an empty slot adds something there.
 */
export function DayColumn({
  date,
  blocks,
  busy,
  nowMinute,
  compact = false,
  onOpenBlock,
  onOpenBusy,
  onEmpty,
  onMove,
  onResize,
}: {
  date: string;
  blocks: ColumnBlock[];
  busy: BusyEvent[];
  /** Minutes since midnight when the column is today. */
  nowMinute?: number;
  /** The week view's narrow column: icons and times only. */
  compact?: boolean;
  onOpenBlock: (block: string) => void;
  onOpenBusy: (id: string) => void;
  onEmpty: (minute: number) => void;
  onMove: (block: string, start: number) => void;
  onResize: (block: string, minutes: number) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moved = useRef(false);
  useEffect(() => () => void (press.current && clearTimeout(press.current)), []);
  // Once a finger's drag has begun, the page must not scroll under it.
  const dragging = Boolean(drag?.active);
  useEffect(() => {
    if (!dragging) return undefined;
    const stop = (e: TouchEvent): void => e.preventDefault();
    document.addEventListener('touchmove', stop, { passive: false });
    return () => document.removeEventListener('touchmove', stop);
  }, [dragging]);

  const begin = (e: ReactPointerEvent<HTMLElement>, block: ColumnBlock, mode: Drag['mode']): void => {
    if (e.button !== 0) return;
    moved.current = false;
    const base: Drag = { block: block.id, mode, pointerY: e.clientY, start: block.start, minutes: block.minutes, nextStart: block.start, nextMinutes: block.minutes, active: false };
    const target = e.currentTarget;
    const pointerId = e.pointerId;
    if (e.pointerType === 'touch') {
      // A finger scrolls the grid unless it rests on the event first.
      setDrag(base);
      press.current = setTimeout(() => {
        setDrag((d) => (d ? { ...d, active: true } : d));
        try {
          target.setPointerCapture(pointerId);
        } catch {
          // The pointer is gone already.
        }
        navigator.vibrate?.(10);
      }, LONG_PRESS_MS);
    } else {
      setDrag(base);
      target.setPointerCapture(pointerId);
    }
  };

  const move = (e: ReactPointerEvent<HTMLElement>): void => {
    if (!drag) return;
    const dy = e.clientY - drag.pointerY;
    if (!drag.active) {
      if (Math.abs(dy) < 6) return;
      if (e.pointerType === 'touch') {
        // Moved before the long press: it was a scroll.
        if (press.current) clearTimeout(press.current);
        setDrag(null);
        return;
      }
    }
    moved.current = true;
    const delta = snap(dy / PX_PER_MIN);
    if (drag.mode === 'move') {
      const nextStart = Math.max(GRID_START, Math.min(GRID_END - drag.minutes, drag.start + delta));
      setDrag({ ...drag, active: true, nextStart });
    } else {
      const nextMinutes = Math.max(SNAP, Math.min(GRID_END - drag.start, drag.minutes + delta));
      setDrag({ ...drag, active: true, nextMinutes });
    }
  };

  const end = (): void => {
    if (press.current) clearTimeout(press.current);
    const d = drag;
    setDrag(null);
    if (!d || !d.active || !moved.current) return;
    if (d.mode === 'move' && d.nextStart !== d.start) onMove(d.block, d.nextStart);
    if (d.mode === 'resize' && d.nextMinutes !== d.minutes) onResize(d.block, d.nextMinutes);
  };

  const emptyTap = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minute = Math.floor((e.clientY - rect.top) / PX_PER_MIN / 30) * 30 + GRID_START;
    onEmpty(Math.max(GRID_START, Math.min(GRID_END - 30, minute)));
  };

  return (
    <div className="relative min-w-0 flex-1" style={{ height: GRID_HEIGHT }}>
      {/* A line every two hours (the mockup's), and the empty grid a tap adds to. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundImage: 'repeating-linear-gradient(to bottom, var(--sd) 0 1px, transparent 1px ' + 120 * PX_PER_MIN + 'px)' }}
        onPointerUp={emptyTap}
        data-testid={'grid-' + date}
      />
      {busy.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onOpenBusy(e.id)}
          className={'absolute flex items-start overflow-hidden rounded-[16px] border-2 border-dashed border-[var(--sd)] text-left text-meta text-ink2 ' + (compact ? 'inset-x-0.5 px-1.5 py-1' : 'inset-x-0 px-3 py-2')}
          style={{ top: top(parseHm(e.start)), height: Math.max(22, e.minutes * PX_PER_MIN) }}
        >
          <span className="truncate font-semibold">{compact ? e.title.slice(0, 3) : e.title + ' · ' + e.start}</span>
          <span className="sr-only">{(compact ? e.title.slice(3) : '') + ', busy, ' + e.start + ' to ' + hm(parseHm(e.start) + e.minutes)}</span>
        </button>
      ))}
      {blocks.map((b) => {
        const live = drag?.block === b.id && drag.active ? drag : null;
        const start = live ? live.nextStart : b.start;
        const minutes = live ? live.nextMinutes : b.minutes;
        const lane = b.lane ?? 0;
        const filled = Math.min(1, b.logged / Math.max(1, minutes));
        // The block's state, as the mockup colours it: done (its hours, or marked) is the lane's fill; under way (the
        // timer on it, or the hour) the fill with a ring; partly (past, some hours) the tint with a strip; planned (nothing
        // yet) the tint with a dashed edge.
        const over = nowMinute !== undefined ? start + minutes <= nowMinute : date < new Date().toISOString().slice(0, 10);
        const state: 'done' | 'now' | 'partly' | 'planned' = b.done || (b.logged > 0 && b.logged >= minutes) ? 'done' : b.running || (nowMinute !== undefined && start <= nowMinute && nowMinute < start + minutes) ? 'now' : b.logged > 0 ? 'partly' : over ? 'partly' : 'planned';
        const sub =
          state === 'done'
            ? span(minutes) + (b.item ? ' · ' + b.item : '')
            : state === 'now'
              ? (b.logged > 0 ? span(b.logged) + ' logged' : 'now') + (b.running ? ' · timer running' : '')
              : state === 'partly'
                ? (b.logged > 0 ? span(b.logged) + ' of ' + span(minutes) : 'nothing logged') + (b.item ? ' · ' + b.item : '')
                : (b.item ?? 'planned');
        const cls =
          'relative flex h-full w-full touch-pan-y select-none flex-col overflow-hidden text-left lane-' +
          lane +
          (state === 'done' || state === 'now' ? ' lane-fill text-[var(--on-lane)]' : ' lane-tile') +
          (state === 'planned' ? ' border-2 border-dashed border-[var(--lane-deco)]' : '') +
          (state === 'now' ? ' shadow-[0_0_0_3px_var(--bg),0_0_0_5px_var(--lane)]' : '') +
          (compact ? ' items-center gap-0.5 rounded-[10px] px-0.5 py-1' : ' gap-0.5 rounded-[16px] px-3 py-2');
        return (
          <div
            key={b.id}
            className={'absolute ' + (compact ? 'inset-x-0.5' : 'inset-x-0') + (live ? ' z-10 drop-shadow-lg' : '')}
            style={{ top: top(start), height: Math.max(24, minutes * PX_PER_MIN) }}
          >
            <button
              type="button"
              data-block={b.id}
              aria-describedby="calendar-drag-hint"
              onPointerDown={(e) => begin(e, b, 'move')}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={() => setDrag(null)}
              onClick={() => {
                if (moved.current) return;
                onOpenBlock(b.id);
              }}
              onContextMenu={(e) => e.preventDefault()}
              className={cls}
            >
              {/* The name starts with what is written on the pill, then says the rest. */}
              <span className={'relative flex min-w-0 items-center font-semibold ' + (compact ? 'flex-col gap-0.5 text-meta' : 'gap-1.5 text-meta')}>
                {compact && <BlockIcon block={b.id} size={14} />}
                {compact && minutes * PX_PER_MIN >= 48 && (
                  <span aria-hidden="true" className="max-w-full truncate text-[11px] font-bold leading-none">
                    {SHORT[b.id] ?? b.name.slice(0, 3)}
                  </span>
                )}
                <span className={compact ? 'sr-only' : 'truncate'}>
                  {b.name}
                  <span className="sr-only">{', ' + hm(start) + ' to ' + hm(start + minutes) + (b.item ? ', ' + b.item : '') + (b.logged > 0 ? ', ' + span(b.logged) + ' logged' : '') + '. '}</span>
                </span>
              </span>
              {!compact && minutes >= 45 && <span className="relative truncate text-small font-medium">{sub}</span>}
              {/* A block partly done: a strip along the bottom, its share of the hours. */}
              {!compact && state === 'partly' && filled > 0 && <span aria-hidden="true" className="lane-fill absolute bottom-0 left-0 h-1.5 rounded-tr-[6px]" style={{ width: filled * 100 + '%' }} />}
            </button>
            {/* The bottom edge: drag to change the length. */}
            <span
              aria-hidden="true"
              onPointerDown={(e) => {
                e.stopPropagation();
                begin(e, b, 'resize');
              }}
              onPointerMove={move}
              onPointerUp={end}
              className="absolute inset-x-3 -bottom-1 h-3 cursor-ns-resize touch-none"
            />
          </div>
        );
      })}
      {nowMinute !== undefined && nowMinute >= GRID_START && nowMinute <= GRID_END && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: top(nowMinute) - 1 }}>
          <span className="-ml-1 size-2.5 rounded-pill bg-[var(--x0)]" />
          <span className="h-0.5 flex-1 bg-[var(--x0)]" />
        </div>
      )}
    </div>
  );
}
