import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Button } from './Button.tsx';

export interface DeckCard {
  id: string;
  /** "Weekly build · 5 h": the line above the title. */
  kind: string;
  title: string;
  brief: string;
  /** "Languages · from build-your-own-x": the line at the foot of the card. */
  footer: string;
}

interface DeckProps {
  cards: DeckCard[];
  /** Called with the top card and its element, so the caller can move it into place. */
  onTake: (card: DeckCard, element: HTMLElement) => void;
  /** One line under the buttons saying what Skip and Take it do here. */
  hint: string;
}

/** How many cards the stack shows; the fourth is there to fade in from behind. */
const VISIBLE = 4;
const SETTLE = 'transform 420ms cubic-bezier(.2,.8,.2,1), opacity 300ms ease';
const SWAP = 'transform 160ms cubic-bezier(.4,0,.2,1)';
const FLY = 'transform 320ms ease-in, opacity 320ms ease-in';
/** How far a swipe has to travel before it counts as Skip or Take it. */
const SWIPE = 80;

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * The project deck, the one orchestrated motion in Atlas (section 4.0, Motion). Up to four cards; each one
 * behind steps down 10 px and scales by 4 %. Shuffle makes 7 to 10 swaps that slow down and land on one card;
 * Skip flies the top card left and the next one rises; Take it hands the card to the caller. A swipe does the
 * same as Skip (left) and Take it (right). With reduced motion every change is instant.
 *
 * `top` counts up without wrapping, and each visible card is keyed by its position in that count, so the card
 * that rises keeps its element (and its transition) while the one that left is gone.
 */
export function Deck({ cards, onTake, hint }: DeckProps) {
  const [top, setTop] = useState(0);
  const [shuffling, setShuffling] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  const timers = useRef<number[]>([]);
  const dragStart = useRef<{ x: number; id: number } | null>(null);
  const topEl = useRef<HTMLElement | null>(null);
  const n = cards.length;
  const busy = shuffling || leaving;

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const later = (fn: () => void, ms: number): void => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const current = (index: number): DeckCard => cards[((index % n) + n) % n]!;

  const skip = (): void => {
    if (busy || n < 2) return;
    if (reducedMotion()) {
      setDrag(null);
      setTop((t) => t + 1);
      setAnnounce(current(top + 1).title);
      return;
    }
    setLeaving(true);
    later(() => {
      setLeaving(false);
      setDrag(null);
      setTop((t) => t + 1);
      setAnnounce(current(top + 1).title);
    }, 320);
  };

  const shuffle = (): void => {
    if (busy || n < 2) return;
    const jump = (): number => 1 + Math.floor(Math.random() * (n - 1));
    if (reducedMotion()) {
      const next = top + jump();
      setTop(next);
      setShuffled(true);
      setAnnounce(current(next).title);
      return;
    }
    const steps = 7 + Math.floor(Math.random() * 4);
    let landed = top;
    setShuffling(true);
    for (let i = 1; i <= steps; i++) {
      landed += jump();
      const at = landed;
      // Each swap waits longer than the one before, so the deck visibly slows and lands.
      later(() => {
        setTop(at);
        if (i === steps) {
          setShuffling(false);
          setShuffled(true);
          setAnnounce(current(at).title);
        }
      }, 90 * i + 12 * i * i);
    }
  };

  const take = (): void => {
    if (busy || n === 0 || !topEl.current) return;
    onTake(current(top), topEl.current);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>): void => {
    if (busy || e.button !== 0) return;
    dragStart.current = { x: e.clientX, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLElement>): void => {
    const start = dragStart.current;
    if (!start || start.id !== e.pointerId) return;
    setDrag(e.clientX - start.x);
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLElement>): void => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    if (dx <= -SWIPE && n > 1) skip();
    else if (dx >= SWIPE) {
      take();
      setDrag(null);
    } else setDrag(null);
  };

  if (n === 0) return null;
  const reduce = reducedMotion();
  const shown = Math.min(VISIBLE, n);
  const stack = Array.from({ length: shown }, (_, i) => top + i).reverse();

  return (
    <div>
      <div className={'relative h-[330px]' + (n > 1 ? ' touch-pan-y' : '')}>
        {stack.map((position) => {
          const i = position - top;
          const card = current(position);
          const isTop = i === 0;
          let transform = 'translateY(' + i * 10 + 'px) scale(' + (1 - i * 0.04) + ')';
          // Opaque, so a card in flight never shows the text of the ones further back; the fourth fades in.
          let opacity = i === VISIBLE - 1 ? 0 : 1;
          let transition = reduce ? 'none' : shuffling ? SWAP : SETTLE;
          if (isTop && leaving) {
            transform = 'translateX(-440px) rotate(' + (reduce ? 0 : -14) + 'deg)';
            opacity = 0;
            transition = reduce ? 'none' : FLY;
          } else if (isTop && drag !== null) {
            const width = topEl.current?.offsetWidth ?? 360;
            const turn = reduce ? 0 : Math.max(-12, Math.min(12, (drag / width) * 12));
            transform = 'translateX(' + drag + 'px) rotate(' + turn + 'deg)';
            transition = 'none';
          }
          return (
            <article
              key={position}
              ref={isTop ? (el) => void (topEl.current = el) : undefined}
              aria-hidden={isTop ? undefined : true}
              aria-labelledby={isTop ? 'deck-top-title' : undefined}
              onPointerDown={isTop ? onPointerDown : undefined}
              onPointerMove={isTop ? onPointerMove : undefined}
              onPointerUp={isTop ? onPointerUp : undefined}
              onPointerCancel={isTop ? () => ((dragStart.current = null), setDrag(null)) : undefined}
              className="absolute inset-x-0 top-0 flex h-[300px] flex-col gap-2 rounded-card border border-line bg-surface p-5 select-none"
              style={{ zIndex: VISIBLE - i, transform, opacity, transition, willChange: 'transform' }}
            >
              <p className="text-meta text-ink2">{card.kind}</p>
              <h2 id={isTop ? 'deck-top-title' : undefined} className="text-headline font-semibold">
                {card.title}
              </h2>
              <p className="line-clamp-4 text-body text-ink2">{card.brief}</p>
              <p className="mt-auto truncate text-meta text-ink2">{card.footer}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Button variant="filled" icon="shuffle" onClick={shuffle} aria-disabled={n < 2 || undefined}>
          {shuffling ? 'Shuffling' : shuffled ? 'Shuffle again' : 'Shuffle'}
        </Button>
        <Button onClick={skip} aria-disabled={busy || n < 2 || undefined}>
          Skip
        </Button>
        <Button className="ml-auto" onClick={take} aria-disabled={busy || undefined}>
          Take it
        </Button>
      </div>
      <p className="mt-4 text-meta text-ink2">{hint}</p>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
