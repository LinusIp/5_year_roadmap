import { useEffect, useRef } from 'react';
import { useAtlas } from '../hooks/useAtlas.ts';
import { monthName, today } from '../lib/dates.ts';
import type { Phase } from '../seed/schema.ts';
import { BackKnob } from '../ui/Header.tsx';
import { buildModel } from './plan/model.ts';

const STAGE_NAME: Record<number, string> = { 1: 'Software', 2: 'Engineering' };

const short = (date: string): string => monthName(Number(date.slice(5, 7)) - 1, true) + ' ' + date.slice(0, 4);

/** The route's width: the mockup's phone canvas, centred on a wider screen. */
const WIDTH = 390;
/** Where each pin sits, left to right, repeating; the card goes on the other side. */
const PIN_X = [165, 240, 140, 226, 170, 230, 150];
const TOP = 150;
const STEP = 180;

interface Stop {
  phase: Phase;
  x: number;
  y: number;
  /** The card's left edge: 18 (left of the route) or past the pin (right of it). */
  cardLeft: number;
  lane: number;
}

/** A smooth route through the pins: one cubic curve between each pair, bowing to the side the route turns from. */
function routePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  let d = 'M' + points[0]!.x + ' ' + points[0]!.y;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const dx = b.x > a.x ? -45 : 45;
    d += ' C' + (a.x + dx) + ' ' + (a.y + 60) + ' ' + (b.x - dx) + ' ' + (b.y - 60) + ' ' + b.x + ' ' + b.y;
  }
  return d;
}

/**
 * The five-year map: a dashed route winding down the paper, a pin and a tile per phase ("YEAR 1 · YOU ARE HERE", the
 * title, what it covers), a divider where the second stage begins, and the finish at the end. One column, phone-wide,
 * centred. No picture behind it: the scene made the route hard to read.
 */
export function PhaseMap() {
  const atlas = useAtlas();
  useEffect(() => {
    document.title = 'Five-year map · Atlas';
  }, []);
  // The map opens at the current phase: its card in the middle of the screen, the route above and below it.
  const hereRef = useRef<HTMLDivElement>(null);
  const ready = atlas !== undefined;
  useEffect(() => {
    if (ready) hereRef.current?.scrollIntoView({ block: 'center' });
  }, [ready]);
  if (!atlas) return <main id="main" className="min-h-dvh bg-bg" />;

  const { seed } = atlas;
  const phases = seed.phases;
  const first = phases[0]!;
  const last = phases.at(-1)!;
  const asOf = today();
  const model = buildModel(atlas, asOf);
  const nowId = phases.find((p) => p.start <= asOf && asOf <= p.end)?.id;
  const stops: Stop[] = phases.map((phase, i) => {
    const x = PIN_X[i % PIN_X.length]!;
    return { phase, x, y: TOP + 74 + i * STEP, cardLeft: x > WIDTH / 2 ? 18 : x + 36, lane: (i + 1) % 5 };
  });
  const start = { x: 187, y: TOP };
  const finishY = TOP + 74 + phases.length * STEP;
  const height = finishY + 120;
  const points = [start, ...stops.map((s) => ({ x: s.x, y: s.y })), { x: 195, y: finishY }];
  const stageTwo = stops.find((s) => s.phase.stage === 2);
  const dividerY = stageTwo ? stageTwo.y - STEP / 2 - 10 : null;

  return (
    <main id="main" tabIndex={-1} className="relative min-h-dvh overflow-hidden bg-bg outline-none" style={{ minHeight: height }}>
      <div className="relative mx-auto" style={{ width: WIDTH, height }}>
        {/* The route: a pale road in the first lane's tint, the dashes in its colour. */}
        <svg viewBox={'0 0 ' + WIDTH + ' ' + height} width={WIDTH} height={height} className="absolute inset-0" aria-hidden="true">
          <path d={routePath(points)} fill="none" stroke="var(--t0)" strokeWidth="12" strokeLinecap="round" />
          <path d={routePath(points)} fill="none" stroke="var(--l0)" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 12" />
        </svg>

        <header className="absolute left-4 right-4 top-10 flex items-center gap-3">
          <BackKnob to="/plan" label="Back to Plan" />
          <span className="flex min-w-0 flex-col">
            <h1 className="text-[26px] font-black leading-tight">Five-year map</h1>
            <p className="truncate text-small font-medium text-ink2">{short(first.start) + ' → ' + short(last.end)}</p>
          </span>
        </header>

        <span className="absolute size-[18px] rounded-pill shadow-[0_0_0_4px_var(--bg)]" style={{ left: start.x, top: start.y, background: 'var(--l4)' }} aria-hidden="true" />
        <div className="tile absolute flex max-w-[196px] flex-col gap-0.5 !rounded-[18px] px-3.5 py-2.5" style={{ left: 18, top: start.y - 47 }}>
          <span className="text-small font-black tracking-[.04em] text-[var(--x4)]">START</span>
          <span className="text-chip font-semibold leading-tight">{short(first.start)}</span>
        </div>

        {dividerY !== null && stageTwo && (
          <div className="absolute left-[18px] right-[18px] flex items-center gap-2.5" style={{ top: dividerY }} aria-hidden="true">
            <span className="h-0.5 flex-1 bg-[var(--sd)]" />
            <span className="pill-neutral rounded-pill px-2.5 py-1 text-small font-black uppercase tracking-[.04em]">{'Stage 2 · ' + STAGE_NAME[2]}</span>
            <span className="h-0.5 flex-1 bg-[var(--sd)]" />
          </div>
        )}

        <ol>
          {stops.map((s) => {
            const here = s.phase.id === nowId;
            const m = model.find((x) => x.phase.id === s.phase.id);
            const topics = s.phase.topics ?? s.phase.theme ?? '';
            const size = here ? 24 : 18;
            return (
              <li key={s.phase.id} aria-current={here ? 'step' : undefined}>
                <span className="absolute rounded-pill shadow-[0_0_0_4px_var(--bg)]" style={{ left: s.x - (size - 18) / 2, top: s.y - (size - 18) / 2, width: size, height: size, background: 'var(--l' + s.lane + ')' }} aria-hidden="true" />
                <div ref={here ? hereRef : undefined} className="tile absolute flex max-w-[196px] flex-col gap-0.5 !rounded-[18px] px-3.5 py-2.5" style={{ left: s.cardLeft, top: s.y - 35, ...(here ? { borderColor: 'var(--l' + s.lane + ')' } : {}) }}>
                  <span className={'text-small font-black uppercase tracking-[.04em] text-[var(--x' + s.lane + ')]'}>{'Year ' + s.phase.year + (here ? ' · you are here' : '')}</span>
                  <h2 className="text-chip font-semibold leading-tight">{s.phase.title}</h2>
                  <span className="text-small font-medium text-ink2">{topics + (here && m ? (topics ? ' · ' : '') + Math.round(m.progress.fraction * 100) + '%' : '')}</span>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="tile absolute flex max-w-[180px] flex-col items-center gap-0.5 !rounded-[18px] px-3.5 py-2.5 text-center" style={{ left: 105, top: finishY - 5 }}>
          <span className="text-small font-black tracking-[.04em] text-[var(--x0)]">THE FINISH</span>
          <span className="text-chip font-semibold leading-tight">{short(last.end)}</span>
        </div>
      </div>
    </main>
  );
}
