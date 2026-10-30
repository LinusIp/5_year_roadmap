/**
 * The drawn stand-ins for the illustrations (ATLAS-ART): soft washes and brush-stroke silhouettes in the theme's
 * own colours, one motif per kind of slot, until the user supplies images. Inline SVG, so they weigh nothing, read
 * in both themes and scale to any panel; `preserveAspectRatio` crops them like a photograph would be cropped.
 */
import type { ArtSlot } from '../seed/art.ts';

export type Motif = 'mountains' | 'leaves' | 'boat' | 'night' | 'stream' | 'bamboo' | 'river' | 'mill' | 'sea' | 'tall-river' | 'shoot' | 'pine' | 'summit' | 'lantern' | 'wash';

export function motifOf(slot: ArtSlot): Motif {
  switch (slot) {
    case 'today-morning':
    case 'season-spring':
    case 'track-math':
      return 'mountains';
    case 'today-midday':
    case 'season-summer':
    case 'track-graphics':
      return 'leaves';
    case 'today-evening':
    case 'season-autumn':
    case 'track-languages':
      return 'boat';
    case 'today-night':
    case 'season-winter':
    case 'track-ai':
      return 'night';
    case 'track-inference':
    case 'phase-y1-foundations':
      return 'stream';
    case 'phase-y2-building':
    case 'streak-30':
      return 'bamboo';
    case 'phase-y3-systems':
    case 'track-systems':
      return 'river';
    case 'phase-y4-engineering':
    case 'track-engineering':
      return 'mill';
    case 'phase-y5-engineering':
      return 'sea';
    case 'map-river-long':
      return 'tall-river';
    case 'streak-7':
      return 'shoot';
    case 'streak-100':
      return 'pine';
    case 'phase-complete':
    case 'path-complete':
      return 'summit';
    case 'empty-state':
      return 'lantern';
    default:
      return slot.startsWith('path-') ? 'wash' : 'wash';
  }
}

/* The palette, from the tokens: ink-wash blue, teal and sage over the paper ground. */
const BLUE = 'var(--blue)';
const DEEP = 'var(--blue-deep)';
const TEAL = 'var(--ice-deep)';
const SAGE = 'color-mix(in srgb, var(--ice-deep) 45%, var(--bg))';
const MIST = 'color-mix(in srgb, var(--blue) 18%, var(--bg))';

function Wash({ id, dark = false }: { id: string; dark?: boolean }) {
  return (
    <defs>
      <linearGradient id={id + '-wash'} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={dark ? 'color-mix(in srgb, var(--blue-deep) 35%, var(--bg))' : 'var(--bg)'} />
        <stop offset="1" stopColor={dark ? 'color-mix(in srgb, var(--blue-deep) 12%, var(--bg))' : 'color-mix(in srgb, var(--ice-soft) 70%, var(--bg))'} />
      </linearGradient>
      <linearGradient id={id + '-mist'} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--bg)" stopOpacity="0" />
        <stop offset="1" stopColor="var(--bg)" stopOpacity="0.9" />
      </linearGradient>
    </defs>
  );
}

/** Layered ridges, each softer than the one before it: the far ones vanish into mist. */
function Ridges({ y = 55, color = BLUE }: { y?: number; color?: string }) {
  return (
    <g>
      <path d={`M0 ${y + 25} L45 ${y - 10} L80 ${y + 12} L120 ${y - 22} L160 ${y + 8} L200 ${y - 14} L245 ${y + 14} L300 ${y - 6} L300 100 L0 100 Z`} fill={color} opacity="0.22" />
      <path d={`M0 ${y + 32} L30 ${y + 12} L70 ${y + 26} L110 ${y + 2} L150 ${y + 24} L190 ${y + 6} L230 ${y + 26} L270 ${y + 10} L300 ${y + 22} L300 100 L0 100 Z`} fill={color} opacity="0.4" />
      <path d={`M0 ${y + 42} L40 ${y + 30} L90 ${y + 40} L140 ${y + 26} L190 ${y + 40} L240 ${y + 30} L300 ${y + 40} L300 100 L0 100 Z`} fill={color} opacity="0.62" />
    </g>
  );
}

/** One brush stroke of water, from the far bank to the near one. */
function Stream({ d, width = 6, color = TEAL }: { d: string; width?: number; color?: string }) {
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" opacity="0.55" />;
}

function Figure({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={DEEP} opacity="0.8">
      <circle cx="0" cy="-7" r="1.8" />
      <path d="M-1.4 -5 L1.4 -5 L1.8 2 L-1.8 2 Z" />
      <path d="M2 -5 L5 4" stroke={DEEP} strokeWidth="0.8" fill="none" />
    </g>
  );
}

function Bamboo({ x, h = 60, lean = 0 }: { x: number; h?: number; lean?: number }) {
  const nodes = [0.2, 0.45, 0.7];
  return (
    <g transform={`translate(${x} 100) skewX(${lean})`}>
      <rect x="-2" y={-h} width="4" height={h} rx="2" fill={SAGE} />
      {nodes.map((n) => (
        <g key={n}>
          <rect x="-2.6" y={-h * n - 1} width="5.2" height="2" rx="1" fill={TEAL} opacity="0.7" />
          <path d={`M0 ${-h * n} q 10 -6 22 -3`} stroke={SAGE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d={`M0 ${-h * n - 4} q -9 -5 -18 -2`} stroke={SAGE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

export function ArtPlaceholder({ slot, className = '' }: { slot: ArtSlot; className?: string }) {
  const motif = motifOf(slot);
  const id = 'art-' + slot;
  const dark = motif === 'night';
  const tall = motif === 'tall-river';
  return (
    <svg viewBox={tall ? '0 0 100 300' : '0 0 300 100'} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" className={className}>
      <Wash id={id} dark={dark} />
      <rect width="100%" height="100%" fill={`url(#${id}-wash)`} />
      {motif === 'mountains' && (
        <>
          <circle cx="238" cy="30" r="9" fill={SAGE} opacity="0.5" />
          <Ridges y={50} />
          <Stream d="M300 92 C 250 84, 200 96, 140 90 S 60 98, 0 96" width={5} />
          <rect width="300" height="100" fill={`url(#${id}-mist)`} opacity="0.5" />
          <path d="M262 20 l 3 -2 l 3 2" stroke={DEEP} strokeWidth="0.8" fill="none" />
        </>
      )}
      {motif === 'leaves' && (
        <>
          <rect x="0" y="62" width="300" height="38" fill="color-mix(in srgb, var(--ink) 6%, var(--bg))" />
          <rect x="190" y="70" width="22" height="16" rx="2" fill={MIST} />
          {[
            [40, 24, -20],
            [70, 44, 15],
            [110, 18, -35],
            [150, 36, 10],
            [95, 60, 30],
            [220, 40, -10],
            [255, 22, 25],
            [30, 70, 5],
          ].map(([x, y, r]) => (
            <ellipse key={x + '-' + y} cx={x} cy={y} rx="9" ry="4" transform={`rotate(${r} ${x} ${y})`} fill={SAGE} opacity="0.85" />
          ))}
          <path d="M0 10 q 60 20 120 5 t 120 8" stroke={TEAL} strokeWidth="1.2" fill="none" opacity="0.5" />
        </>
      )}
      {motif === 'boat' && (
        <>
          <Ridges y={38} color={MIST} />
          <rect x="0" y="66" width="300" height="34" fill={TEAL} opacity="0.18" />
          <Stream d="M0 78 Q 150 72 300 80" width={2} />
          <Stream d="M0 90 Q 150 84 300 92" width={2} />
          <path d="M126 70 L178 70 L170 78 L134 78 Z" fill={DEEP} opacity="0.85" />
          <Figure x={152} y={70} scale={1.1} />
          <path d="M156 56 L162 74" stroke={DEEP} strokeWidth="1" />
          <circle cx="250" cy="22" r="7" fill={SAGE} opacity="0.5" />
        </>
      )}
      {motif === 'night' && (
        <>
          <circle cx="232" cy="26" r="10" fill="var(--bg)" opacity="0.85" />
          <Ridges y={48} color={DEEP} />
          <rect x="0" y="80" width="300" height="20" fill={DEEP} opacity="0.35" />
          <ellipse cx="232" cy="90" rx="10" ry="1.5" fill="var(--bg)" opacity="0.5" />
        </>
      )}
      {motif === 'stream' && (
        <>
          <Ridges y={30} />
          <Stream d="M150 52 C 170 62, 130 72, 150 82 S 170 96, 160 100" width={4} />
          <Figure x={138} y={50} />
        </>
      )}
      {motif === 'bamboo' && (
        <>
          <Bamboo x={60} h={80} lean={-3} />
          <Bamboo x={82} h={70} lean={2} />
          <Bamboo x={110} h={88} lean={-1} />
          <Bamboo x={230} h={76} lean={3} />
          <Bamboo x={258} h={84} lean={-2} />
          <Stream d="M0 92 Q 150 80 300 94" width={5} />
          <path d="M140 84 L180 84" stroke={DEEP} strokeWidth="2" opacity="0.7" />
          <Figure x={160} y={84} />
        </>
      )}
      {motif === 'river' && (
        <>
          <Ridges y={34} color={MIST} />
          <path d="M0 60 L300 60 L300 72 L0 72 Z" fill={SAGE} opacity="0.35" />
          <path d="M0 68 L300 68 L300 78 L0 78 Z" fill={SAGE} opacity="0.25" />
          <Stream d="M0 90 C 80 80, 220 100, 300 86" width={9} />
          <path d="M40 58 h10 v8 h-10 z M54 56 l5 -5 l5 5 v10 h-10 z" fill={DEEP} opacity="0.6" />
          <path d="M200 86 l14 0 l-3 4 l-8 0 z" fill={DEEP} opacity="0.8" />
        </>
      )}
      {motif === 'mill' && (
        <>
          <Ridges y={36} color={MIST} />
          <Stream d="M0 88 C 100 80, 200 96, 300 84" width={8} />
          <rect x="196" y="52" width="30" height="30" fill={DEEP} opacity="0.55" />
          <circle cx="188" cy="76" r="12" fill="none" stroke={DEEP} strokeWidth="2" opacity="0.8" />
          {[0, 45, 90, 135].map((a) => (
            <path key={a} d="M176 76 L200 76" stroke={DEEP} strokeWidth="1.4" transform={`rotate(${a} 188 76)`} opacity="0.8" />
          ))}
          {[40, 70, 100, 130].map((x) => (
            <path key={x} d={`M${x} 72 a 12 12 0 0 1 24 0 v 10 h -24 z`} fill="none" stroke={DEEP} strokeWidth="1.4" opacity="0.6" />
          ))}
        </>
      )}
      {motif === 'sea' && (
        <>
          <circle cx="150" cy="40" r="14" fill={SAGE} opacity="0.4" />
          <rect x="0" y="58" width="300" height="42" fill={TEAL} opacity="0.2" />
          <Stream d="M0 70 Q 150 64 300 72" width={2} />
          <Stream d="M0 84 Q 150 78 300 86" width={2} />
          <path d="M230 60 L270 60 L300 100 L220 100 Z" fill={DEEP} opacity="0.45" />
          <rect x="256" y="36" width="8" height="24" fill={DEEP} opacity="0.85" />
          <path d="M254 36 h12 l-2 -6 h-8 z" fill={TEAL} />
        </>
      )}
      {motif === 'tall-river' && (
        <>
          <path d="M0 40 L20 18 L40 34 L60 10 L80 30 L100 20 L100 60 L0 60 Z" fill={BLUE} opacity="0.3" />
          <Stream d="M50 40 C 70 70, 20 100, 40 130 S 80 170, 50 200 S 20 240, 50 270 S 70 290, 50 300" width={5} />
          <path d="M34 128 h30" stroke={DEEP} strokeWidth="2" opacity="0.7" />
          <path d="M60 190 h8 v8 h-8 z M70 188 l4 -4 l4 4 v10 h-8 z" fill={DEEP} opacity="0.6" />
          <circle cx="28" cy="230" r="6" fill="none" stroke={DEEP} strokeWidth="1.2" opacity="0.8" />
          <rect x="74" y="266" width="5" height="16" fill={DEEP} opacity="0.85" />
          <rect x="0" y="280" width="100" height="20" fill={TEAL} opacity="0.2" />
        </>
      )}
      {motif === 'shoot' && (
        <>
          <rect width="300" height="100" fill={`url(#${id}-mist)`} opacity="0.4" />
          <Bamboo x={150} h={64} lean={0} />
        </>
      )}
      {motif === 'pine' && (
        <>
          <rect x="0" y="70" width="300" height="30" fill="var(--bg)" opacity="0.7" />
          <path d="M100 72 L300 72 L300 100 L100 100 Z" fill={BLUE} opacity="0.3" />
          <rect x="146" y="40" width="6" height="34" fill={DEEP} opacity="0.8" />
          <path d="M120 44 Q 150 36 180 44 Q 150 40 120 44 Z M126 36 Q 150 28 174 36 Q 150 32 126 36 Z M134 28 Q 150 20 166 28 Q 150 24 134 28 Z" fill={SAGE} opacity="0.95" />
          <path d="M150 12 q 4 4 0 8 q -4 -4 0 -8" fill={SAGE} />
        </>
      )}
      {motif === 'summit' && (
        <>
          <rect x="0" y="64" width="300" height="36" fill="var(--bg)" opacity="0.75" />
          <path d="M60 100 L150 24 L240 100 Z" fill={BLUE} opacity="0.5" />
          <path d="M110 100 L150 24 L190 100 Z" fill={DEEP} opacity="0.3" />
          <path d="M150 24 L150 8" stroke={DEEP} strokeWidth="1.4" />
          <path d="M150 8 l10 3 l-10 3 z" fill={TEAL} />
        </>
      )}
      {motif === 'lantern' && (
        <>
          <rect x="0" y="74" width="300" height="26" fill={TEAL} opacity="0.14" />
          <ellipse cx="150" cy="74" rx="34" ry="7" fill={SAGE} opacity="0.5" />
          <rect x="138" y="42" width="24" height="28" rx="10" fill="var(--bg)" stroke={DEEP} strokeWidth="1.4" opacity="0.9" />
          <path d="M142 50 h16 M142 57 h16 M142 64 h16" stroke={DEEP} strokeWidth="0.8" opacity="0.5" />
          <path d="M150 42 v-6" stroke={DEEP} strokeWidth="1.2" />
          <Stream d="M0 90 Q 150 86 300 92" width={2} />
        </>
      )}
      {motif === 'wash' && (
        <>
          <Ridges y={56} color={MIST} />
          <Stream d="M0 94 Q 150 84 300 96" width={4} />
        </>
      )}
    </svg>
  );
}
