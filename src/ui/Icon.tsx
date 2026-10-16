import type { ComponentType, ReactNode, SVGProps } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Atom,
  Box,
  Briefcase,
  Check,
  ChevronDown,
  CircleCheck,
  CircleDot,
  Clock,
  Code,
  Cpu,
  ExternalLink,
  FileText,
  Flame,
  Grid3x3,
  GripVertical,
  Hammer,
  Lightbulb,
  Moon,
  Pause,
  Pencil,
  Play,
  Plus,
  Puzzle,
  RefreshCw,
  Search,
  Settings,
  Shuffle,
  Sigma,
  SlidersHorizontal,
  SquareFunction,
  Sun,
  Undo2,
  Wrench,
  X,
} from 'lucide-react';

/**
 * Icons. The four tabs (and the optional Reviews, Projects and map tabs) keep the mockup's own glyphs; everything
 * else is lucide-react, outline, imported one by one so the build carries only these. Icons carry meaning: a block,
 * a subject, a kind of project, a status, or an action next to its label. They are decorative (aria-hidden) because
 * a text label always sits next to them; the few icon-only header buttons carry an aria-label of their own.
 * Sizes: 24 in the tabs, 20 in rows and headers, 16 inside buttons.
 */
const TAB_GLYPHS = {
  today: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  plan: <path d="M4 6h16M4 12h10M4 18h7" />,
  library: <path d="M4 4h5v16H4zM10 4h5v16h-5zM16 5l4 1-3 14-4-1z" />,
  activity: (
    <>
      <rect x="4" y="4" width="4" height="4" />
      <rect x="10" y="4" width="4" height="4" />
      <rect x="16" y="4" width="4" height="4" />
      <rect x="4" y="10" width="4" height="4" />
      <rect x="10" y="10" width="4" height="4" />
      <rect x="16" y="10" width="4" height="4" />
      <rect x="4" y="16" width="4" height="4" />
      <rect x="10" y="16" width="4" height="4" />
      <rect x="16" y="16" width="4" height="4" />
    </>
  ),
  projects: <path d="M4 7h16v12H4zM9 7V5h6v2" />,
  map: <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14" />,
  reviews: <path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h5" />,
} satisfies Record<string, ReactNode>;

type Glyph = ComponentType<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>;

const LUCIDE = {
  // Actions
  gear: Settings,
  moon: Moon,
  sun: Sun,
  play: Play,
  pause: Pause,
  check: Check,
  shuffle: Shuffle,
  search: Search,
  external: ExternalLink,
  chevronDown: ChevronDown,
  x: X,
  plus: Plus,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  sliders: SlidersHorizontal,
  undo: Undo2,
  grip: GripVertical,
  refresh: RefreshCw,
  doc: FileText,
  hint: Lightbulb,
  // Blocks: graphics and simulation, languages, the core track, projects, maths and physics, practice
  cube: Box,
  code: Code,
  cpu: Cpu,
  hammer: Hammer,
  sigma: Sigma,
  pencil: Pencil,
  // Subjects
  grid: Grid3x3,
  function: SquareFunction,
  atom: Atom,
  // Kinds of project
  puzzle: Puzzle,
  wrench: Wrench,
  briefcase: Briefcase,
  // Status
  done: CircleCheck,
  inProgress: CircleDot,
  clock: Clock,
  flame: Flame,
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof TAB_GLYPHS | keyof typeof LUCIDE;

/** The stroke for each size: 2 inside buttons and fields, 1.75 in rows and headers, 1.8 for the tabs. */
function strokeFor(size: number): number {
  if (size <= 18) return 2;
  if (size <= 20) return 1.75;
  return 1.8;
}

export function Icon({ name, size = 24, className, color }: { name: IconName; size?: number; className?: string; color?: string }) {
  const style = { flexShrink: 0, ...(color ? { color } : {}) };
  if (name in LUCIDE) {
    const Glyph = LUCIDE[name as keyof typeof LUCIDE];
    return <Glyph size={size} strokeWidth={strokeFor(size)} className={className} style={style} aria-hidden="true" focusable="false" />;
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeFor(size)}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {TAB_GLYPHS[name as keyof typeof TAB_GLYPHS]}
    </svg>
  );
}
