import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';

/**
 * The clay strips' edge fade (CLAY-STYLE, Scrolling): a horizontal strip with no scrollbar shows a 24 px gradient from
 * the background on each side where more of it is hidden, and on that side only. `ref` is the scroller; its parent is
 * the `fade-strip` (index.css) that draws the gradients, and this keeps the parent's `data-fade-start` and
 * `data-fade-end` in step with the scroll position and the sizes.
 *
 * `open` places it when it first draws: 'end' at the latest item (a chart over time, the heatmap), 'current' with its
 * `[aria-pressed="true"]` or `[aria-current]` child in view (a chip row, the phase map), or the start.
 */
export function useEdgeFade(ref: RefObject<HTMLElement | null>, open: 'start' | 'end' | 'current' = 'start'): void {
  useLayoutEffect(() => {
    const el = ref.current;
    const frame = el?.parentElement;
    if (!el || !frame) return;
    if (open === 'end') el.scrollLeft = el.scrollWidth;
    else if (open === 'current') {
      const current = el.querySelector<HTMLElement>('[aria-pressed="true"], [aria-current]:not([aria-current="false"])');
      if (current) {
        const box = el.getBoundingClientRect();
        const item = current.getBoundingClientRect();
        if (item.right > box.right) el.scrollLeft += item.right - box.right + 24;
        else if (item.left < box.left) el.scrollLeft -= box.left - item.left + 24;
      }
    }
    const update = (): void => {
      const max = el.scrollWidth - el.clientWidth;
      frame.dataset.fadeStart = String(el.scrollLeft > 1);
      frame.dataset.fadeEnd = String(el.scrollLeft < max - 1);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(() => {
      // A strip that opens at its end stays there while its content first grows (the heatmap measures its card).
      if (open === 'end' && el.dataset.touched !== 'true') el.scrollLeft = el.scrollWidth;
      update();
    });
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    const touched = (): void => {
      el.dataset.touched = 'true';
    };
    el.addEventListener('pointerdown', touched, { passive: true });
    el.addEventListener('wheel', touched, { passive: true });
    el.addEventListener('keydown', touched);
    return () => {
      el.removeEventListener('scroll', update);
      el.removeEventListener('pointerdown', touched);
      el.removeEventListener('wheel', touched);
      el.removeEventListener('keydown', touched);
      observer.disconnect();
    };
    // Placed once, when it first draws: a later selection never moves a strip the user has scrolled.
  }, []);
}
