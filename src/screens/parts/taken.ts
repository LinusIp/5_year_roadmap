/**
 * "Take it" on the project deck: the card moves into Today's Block D row. The deck notes which project it
 * handed over, and Today, rendering a moment later, gives that row the shared-element name and its underline.
 */

let handoff: { id: string; kind: 'weekly' | 'monthly'; at: number } | null = null;

/** How long a hand-off stays fresh: long enough for Today to render, short enough not to linger. */
const FRESH_MS = 2000;

export const takenProject = {
  set(id: string, kind: 'weekly' | 'monthly'): void {
    handoff = { id, kind, at: Date.now() };
  },
  /** The project just taken, if Today is rendering straight after the deck; reading it does not clear it. */
  recent(): { id: string; kind: 'weekly' | 'monthly' } | null {
    return handoff && Date.now() - handoff.at < FRESH_MS ? { id: handoff.id, kind: handoff.kind } : null;
  },
};

type TransitionDocument = Document & { startViewTransition?: (update: () => Promise<void>) => unknown };

/** Polls with timers: rendering, and so requestAnimationFrame, is paused while a view transition updates the DOM. */
function waitFor(selector: string, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const until = performance.now() + ms;
    const check = (): void => {
      if (document.querySelector(selector) || performance.now() > until) resolve();
      else window.setTimeout(check, 16);
    };
    check();
  });
}

/**
 * Moves the card into Today with a 300 ms shared-element move (CSS: `taken-project`). Where the browser has no
 * view transitions, or motion is reduced, Today simply appears.
 */
export function moveIntoToday(card: HTMLElement, go: () => void): void {
  const doc = document as TransitionDocument;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  if (!doc.startViewTransition || reduce) {
    go();
    return;
  }
  card.style.setProperty('view-transition-name', 'taken-project');
  doc.startViewTransition(async () => {
    card.style.removeProperty('view-transition-name');
    go();
    await waitFor('.taken', 400);
  });
}
