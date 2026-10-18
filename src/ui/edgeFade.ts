import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';

/**
 * The clay strips' edge fade (CLAY-STYLE, Scrolling): a horizontal strip with no scrollbar fades 24 px into the
 * background on each side where more of it is hidden, and on that side only. The element gets the `edge-fade` class
 * (index.css); this keeps its `data-fade-start` and `data-fade-end` in step with the scroll position and its size.
 *
 * `open` places it when it first draws: 'end' at the latest item (a chart over time), 'current' with its
 * `[aria-pressed="true"]` or `[aria-current]` child in view (a chip row, the phase map), or the start.
 */
export function useEdgeFade(ref: RefObject<HTMLElement | null>, open: 'start' | 'end' | 'current' = 'start'): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
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
      el.dataset.fadeStart = String(el.scrollLeft > 1);
      el.dataset.fadeEnd = String(el.scrollLeft < max - 1);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
    // Placed once, when it first draws: a later selection never moves a strip the user has scrolled.
  }, []);
}
