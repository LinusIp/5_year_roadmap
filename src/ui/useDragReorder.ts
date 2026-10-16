import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/** How long a touch must rest on the grip before the row lifts, so a scroll never starts a drag. */
const LONG_PRESS_MS = 350;

/**
 * Drag to reorder a list: a mouse drags the grip straight away, a finger after a long press. While dragging, the
 * index the row would land on is `over`; letting go calls `onMove(from, to)`. Keyboard users have Move up / Move
 * down buttons instead, which call the same `onMove`.
 */
export function useDragReorder(onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const listRef = useRef<HTMLElement | null>(null);
  const timer = useRef<number | null>(null);

  const indexAt = (y: number): number => {
    const rows = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-drag-row]') ?? [])];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!.getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return Math.max(0, rows.length - 1);
  };

  const gripProps = (index: number) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      const target = e.currentTarget;
      const pointerId = e.pointerId;
      const start = (): void => {
        target.setPointerCapture?.(pointerId);
        setDrag({ from: index, over: index });
      };
      if (e.pointerType === 'mouse') start();
      else timer.current = window.setTimeout(start, LONG_PRESS_MS);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      if (!drag) return;
      e.preventDefault();
      const over = indexAt(e.clientY);
      if (over !== drag.over) setDrag({ from: drag.from, over });
    },
    onPointerUp: () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
      if (drag && drag.over !== drag.from) onMove(drag.from, drag.over);
      setDrag(null);
    },
    onPointerCancel: () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
      setDrag(null);
    },
    style: { touchAction: drag ? 'none' : 'pan-y' } as const,
  });

  return { drag, listRef, gripProps };
}
