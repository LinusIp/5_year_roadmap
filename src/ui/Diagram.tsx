import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { Button } from './Button.tsx';
import { layoutDiagram } from '../lib/diagram.ts';
import type { DiagramKind, DiagramLayout } from '../lib/diagram.ts';
import { flowText } from '../seed/design-text.ts';
import type { Design } from '../seed/design.ts';

type DiagramDesign = Pick<Design, 'components' | 'flow'>;

/** Colours by kind, all tokens so dark mode follows: the request path blue, offline ice, external a dashed outline. */
const FILL: Record<DiagramKind, string> = { core: 'var(--blue-soft)', offline: 'var(--ice-soft)', external: 'var(--bg)' };
const STROKE: Record<DiagramKind, string> = { core: 'var(--blue)', offline: 'var(--ice)', external: 'var(--ink3)' };
const INK: Record<DiagramKind, string> = { core: 'var(--blue-deep)', offline: 'var(--ice-deep)', external: 'var(--ink)' };
const DASH = '4 3';
const LINE_H = 16;

/**
 * The drawing itself: boxes, labels and arrows from the layout, with a title and the flow as its text alternative.
 * Ids come from useId, so the phone-sized copy and the full-screen one each have their own arrowheads.
 */
function DiagramSvg({ layout, design, title, className }: { layout: DiagramLayout; design: DiagramDesign; title: string; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const titleId = 'diagram-title-' + uid;
  const descId = 'diagram-desc-' + uid;
  const head = 'diagram-head-' + uid;
  const iceHead = 'diagram-head-ice-' + uid;
  const kind = new Map(layout.boxes.map((b) => [b.id, b.kind]));

  return (
    <svg role="img" aria-labelledby={titleId} aria-describedby={descId} viewBox={'0 0 ' + layout.width + ' ' + layout.height} className={className}>
      <title id={titleId}>{'Diagram of ' + title}</title>
      <desc id={descId}>{flowText(design)}</desc>
      <defs>
        {[
          [head, 'var(--ink3)'],
          [iceHead, 'var(--ice-deep)'],
        ].map(([id, color]) => (
          <marker key={id} id={id} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={color} />
          </marker>
        ))}
      </defs>
      {/* Arrows first, so a box sits over any line that passes behind it. Links to offline parts are ice. */}
      <g fill="none" strokeWidth={1.5} strokeLinejoin="round">
        {layout.arrows.map((a) => {
          const ice = kind.get(a.from) === 'offline' || kind.get(a.to) === 'offline';
          return (
            <polyline
              key={a.from + '>' + a.to}
              points={a.points.map((p) => p.join(',')).join(' ')}
              stroke={ice ? 'var(--ice-deep)' : 'var(--ink3)'}
              strokeDasharray={a.dashed ? DASH : undefined}
              markerEnd={'url(#' + (ice ? iceHead : head) + ')'}
            />
          );
        })}
      </g>
      <g fontSize={12} fontWeight={700} style={{ fontFamily: 'inherit' }} textAnchor="middle">
        {layout.boxes.map((b) => (
          <g key={b.id}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={12} fill={FILL[b.kind]} stroke={STROKE[b.kind]} strokeWidth={1.5} strokeDasharray={b.kind === 'external' ? DASH : undefined} />
            <text fill={INK[b.kind]} dominantBaseline="central">
              {b.lines.map((line, i) => (
                <tspan key={i} x={b.x + b.w / 2} y={b.y + b.h / 2 + (i - (b.lines.length - 1) / 2) * LINE_H}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/** What each colour means, under the drawing: 12 px, ink2. */
function Legend() {
  const swatch = 'inline-block size-3 shrink-0 rounded-[4px] border-[1.5px]';
  return (
    <ul aria-label="Legend" className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-small text-ink2">
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className={swatch + ' border-blue bg-blue-soft'} />
        Request path
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className={swatch + ' border-ice bg-ice-soft'} />
        Offline
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className={swatch + ' border-dashed bg-bg'} style={{ borderColor: 'var(--ink3)' }} />
        External
      </li>
    </ul>
  );
}

interface View {
  scale: number;
  x: number;
  y: number;
}
const REST: View = { scale: 1, x: 0, y: 0 };
const MAX_SCALE = 4;
/** Two taps this close in time and place are a double tap. */
const DOUBLE_TAP_MS = 300;
const TAP_SLOP = 10;

/** Keeps the zoom between 1 and 4 and the drawing covering the surface: no panning off into blank space. */
function clampView(view: View, w: number, h: number): View {
  const scale = Math.min(MAX_SCALE, Math.max(1, view.scale));
  return { scale, x: Math.min(0, Math.max(w * (1 - scale), view.x)), y: Math.min(0, Math.max(h * (1 - scale), view.y)) };
}

/**
 * The full-screen viewer, on the native <dialog> like Sheet (it opens over a sheet, traps focus and closes on
 * Escape). Two fingers pinch-zoom about their midpoint, one finger pans once zoomed, a double tap goes back.
 */
function DiagramViewer({ open, onClose, layout, design, title }: { open: boolean; onClose: () => void; layout: DiagramLayout; design: DiagramDesign; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(REST);
  const viewRef = useRef<View>(REST);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  /** The gesture in progress: where it started, and whether it stayed a single still tap. */
  const gesture = useRef({ x: 0, y: 0, tap: true });
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  const apply = (next: View): void => {
    const rect = surface.current?.getBoundingClientRect();
    const v = rect ? clampView(next, rect.width, rect.height) : next;
    viewRef.current = v;
    setView(v);
  };
  const reset = (): void => apply(REST);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      viewRef.current = REST;
      setView(REST);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const local = (e: ReactPointerEvent | ReactWheelEvent): { x: number; y: number } => {
    const rect = surface.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 1) gesture.current = { ...p, tap: true };
    else gesture.current.tap = false;
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const before = pointers.current.get(e.pointerId);
    if (!before) return;
    const p = local(e);
    if (Math.hypot(p.x - gesture.current.x, p.y - gesture.current.y) > TAP_SLOP) gesture.current.tap = false;
    const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId).map(([, q]) => q);
    pointers.current.set(e.pointerId, p);
    const v = viewRef.current;
    const other = others[0];
    if (other) {
      // Pinch: scale by how far the fingers moved apart, keeping the point under their midpoint under it.
      const d0 = Math.hypot(before.x - other.x, before.y - other.y);
      const d1 = Math.hypot(p.x - other.x, p.y - other.y);
      if (d0 < 1) return;
      const m0 = { x: (before.x + other.x) / 2, y: (before.y + other.y) / 2 };
      const m1 = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
      const scale = Math.min(MAX_SCALE, Math.max(1, (v.scale * d1) / d0));
      const cx = (m0.x - v.x) / v.scale;
      const cy = (m0.y - v.y) / v.scale;
      apply({ scale, x: m1.x - cx * scale, y: m1.y - cy * scale });
    } else if (v.scale > 1) {
      apply({ scale: v.scale, x: v.x + p.x - before.x, y: v.y + p.y - before.y });
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!pointers.current.delete(e.pointerId)) return;
    if (pointers.current.size > 0 || !gesture.current.tap || e.type === 'pointercancel') return;
    const p = local(e);
    const prev = lastTap.current;
    if (prev && e.timeStamp - prev.t < DOUBLE_TAP_MS && Math.hypot(p.x - prev.x, p.y - prev.y) < TAP_SLOP * 3) {
      lastTap.current = null;
      reset();
    } else lastTap.current = { t: e.timeStamp, ...p };
  };

  // A mouse wheel or trackpad zooms about the pointer, for the desktop.
  const onWheel = (e: ReactWheelEvent<HTMLDivElement>): void => {
    const v = viewRef.current;
    const p = local(e);
    const scale = Math.min(MAX_SCALE, Math.max(1, v.scale * Math.exp(-e.deltaY * 0.002)));
    const cx = (p.x - v.x) / v.scale;
    const cy = (p.y - v.y) / v.scale;
    apply({ scale, x: p.x - cx * scale, y: p.y - cy * scale });
  };

  return (
    <dialog
      ref={ref}
      aria-label="Diagram"
      aria-modal="true"
      onClose={(e) => {
        if (e.target === e.currentTarget && open) onClose();
      }}
      onCancel={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-bg p-0 text-ink"
    >
      {open && (
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between gap-3 px-5 pb-1 pt-3">
            <p className="min-w-0 flex-1 text-small text-ink2">Pinch to zoom, double-tap to reset</p>
            <Button variant="icon" icon="x" label="Close" onClick={onClose} />
          </header>
          <div
            ref={surface}
            className="relative min-h-0 flex-1 cursor-grab overflow-hidden"
            style={{ touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={reset}
            onWheel={onWheel}
          >
            <div className="absolute inset-0 p-4" style={{ transformOrigin: '0 0', transform: 'translate(' + view.x + 'px, ' + view.y + 'px) scale(' + view.scale + ')' }}>
              <DiagramSvg layout={layout} design={design} title={title} className="block size-full" />
            </div>
          </div>
          <div className="px-5 pb-5">
            <Legend />
          </div>
        </div>
      )}
    </dialog>
  );
}

/**
 * A project's architecture, drawn from its design: the request path numbered down the left, offline and external
 * parts beside it, an arrow for every link. Fits a 330 px phone column; a tap opens it full screen to zoom in.
 */
export function Diagram({ design, title }: { design: DiagramDesign; title: string }) {
  const layout = useMemo(() => layoutDiagram(design), [design]);
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  // Focus goes back to the drawing once the viewer has closed (its own effect runs first).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) wasOpen.current = true;
    else if (wasOpen.current) {
      wasOpen.current = false;
      opener.current?.focus();
    }
  }, [open]);

  return (
    <figure className="m-0">
      <button
        ref={opener}
        type="button"
        aria-label="Open the diagram full screen"
        className="press block min-h-11 w-full cursor-zoom-in rounded-knob"
        onClick={() => setOpen(true)}
      >
        <DiagramSvg layout={layout} design={design} title={title} className="mx-auto block h-auto w-full max-w-[330px] sm:max-w-[400px]" />
      </button>
      <Legend />
      <DiagramViewer open={open} onClose={() => setOpen(false)} layout={layout} design={design} title={title} />
    </figure>
  );
}
