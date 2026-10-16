import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { BusyEvent } from '../../db/types.ts';
import { GRID_END, GRID_START, hm, parseHm, snap, SNAP } from '../../lib/calendar-layout.ts';
import type { PlacedBlock } from '../../lib/calendar-layout.ts';
import { blockTone } from '../../ui/colors.ts';
import { BlockIcon } from '../../ui/glyphs.tsx';
import { span } from '../parts/text.ts';

/** 48 px an hour: 06:00 to 24:00 is 864 px, scrolled inside the page. */
export const PX_PER_MIN = 0.8;
export const GRID_HEIGHT = (GRID_END - GRID_START) * PX_PER_MIN;
/** How long a finger rests on an event before it can be dragged; a mouse or pen drags at once. */
const LONG_PRESS_MS = 350;

const top = (minute: number): number => (minute - GRID_START) * PX_PER_MIN;

export interface ColumnBlock extends PlacedBlock {
  name: string;
  item?: string;
  logged: number;
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
      {/* Half-hour lines, and the empty grid a tap adds to. */}
      <div aria-hidden="true" className="calendar-lines absolute inset-0" onPointerUp={emptyTap} data-testid={'grid-' + date} />
      {busy.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onOpenBusy(e.id)}
          className="knob absolute inset-x-1 flex items-start overflow-hidden rounded-box px-2.5 py-1 text-left text-meta"
          style={{ top: top(parseHm(e.start)), height: Math.max(22, e.minutes * PX_PER_MIN) }}
          aria-label={'Busy: ' + e.title + ', ' + e.start + ' to ' + hm(parseHm(e.start) + e.minutes)}
        >
          <span className="truncate font-semibold text-ink2">{compact ? e.title.slice(0, 3) : e.title + ' · ' + e.start}</span>
        </button>
      ))}
      {blocks.map((b) => {
        const live = drag?.block === b.id && drag.active ? drag : null;
        const start = live ? live.nextStart : b.start;
        const minutes = live ? live.nextMinutes : b.minutes;
        const tone = blockTone(b.id);
        const filled = Math.min(1, b.logged / Math.max(1, minutes));
        const label = b.name + ', ' + hm(start) + ' to ' + hm(start + minutes) + (b.item ? ', ' + b.item : '') + (b.logged > 0 ? ', ' + span(b.logged) + ' logged' : '');
        return (
          <div
            key={b.id}
            className={'absolute inset-x-1 ' + (live ? 'z-10 drop-shadow-lg' : '')}
            style={{ top: top(start), height: Math.max(24, minutes * PX_PER_MIN) }}
          >
            <button
              type="button"
              data-block={b.id}
              aria-label={label}
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
              className={'well relative flex h-full w-full touch-pan-y select-none flex-col items-start overflow-hidden rounded-box px-2 py-1 text-left ' + (tone === 'ice' ? 'text-ice-deep' : 'text-blue-deep')}
            >
              {/* Time already logged fills the pill from the top; time still to come stays pressed in. */}
              {filled > 0 && <span aria-hidden="true" className={'absolute inset-x-0 top-0 ' + (tone === 'ice' ? 'bg-ice-soft' : 'bg-blue-soft')} style={{ height: filled * 100 + '%' }} />}
              <span aria-hidden="true" className="relative flex min-w-0 items-center gap-1.5 text-meta font-semibold">
                <BlockIcon block={b.id} size={14} />
                {!compact && <span className="truncate">{b.name}</span>}
              </span>
              {!compact && minutes >= 45 && (
                <span aria-hidden="true" className="relative truncate text-small font-semibold text-ink2">
                  {hm(start) + ' · ' + span(minutes) + (b.item ? ' · ' + b.item : '')}
                </span>
              )}
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
          <span className="-ml-1 size-2.5 rounded-pill bg-ice-deep" />
          <span className="h-0.5 flex-1 bg-ice-deep" />
        </div>
      )}
    </div>
  );
}
