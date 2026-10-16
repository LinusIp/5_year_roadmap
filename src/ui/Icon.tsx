import type { ComponentType, SVGProps } from 'react';
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  Atom,
  BookOpen,
  Box,
  Briefcase,
  CalendarDays,
  ChartColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDot,
  Clock,
  Code,
  Cpu,
  ExternalLink,
  FileText,
  Flag,
  Flame,
  GraduationCap,
  Grid3x3,
  GripVertical,
  Hammer,
  Layers,
  Library,
  Lightbulb,
  Map,
  Moon,
  Newspaper,
  NotebookPen,
  Pause,
  Pencil,
  Play,
  Plus,
  Puzzle,
  RefreshCw,
  Rss,
  Search,
  Server,
  Settings,
  Shuffle,
  Sigma,
  SlidersHorizontal,
  Square,
  SquareFunction,
  Sun,
  Undo2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

/**
 * Icons: lucide-react only (CLAY-STYLE.md), stroke 2.2, imported one by one so the build carries only these. Icons
 * carry meaning: a tab, a block, a subject, a kind of project, a status, or an action next to its label. They are
 * decorative (aria-hidden) because a text label always sits next to them; the few icon-only buttons (the header's
 * knobs, the tabs, a sheet's close) carry an aria-label of their own.
 */
type Glyph = ComponentType<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>;

const LUCIDE = {
  // Tabs
  today: Clock,
  plan: AlignLeft,
  library: Library,
  activity: Grid3x3,
  projects: Layers,
  map: Map,
  reviews: NotebookPen,
  calendar: CalendarDays,
  // Actions
  gear: Settings,
  moon: Moon,
  sun: Sun,
  play: Play,
  pause: Pause,
  stop: Square,
  check: Check,
  shuffle: Shuffle,
  search: Search,
  external: ExternalLink,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
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
  flag: Flag,
  zap: Zap,
  stats: ChartColumn,
  // Blocks: graphics and simulation, languages, the core track, projects, maths and physics, practice
  cube: Box,
  code: Code,
  cpu: Cpu,
  hammer: Hammer,
  sigma: Sigma,
  pencil: Pencil,
  server: Server,
  layers: Layers,
  // Subjects
  grid: Grid3x3,
  function: SquareFunction,
  atom: Atom,
  // Kinds of project
  puzzle: Puzzle,
  wrench: Wrench,
  briefcase: Briefcase,
  // Library shelves
  course: GraduationCap,
  book: BookOpen,
  paper: FileText,
  article: Newspaper,
  blog: Rss,
  // Status
  done: CircleCheck,
  inProgress: CircleDot,
  clock: Clock,
  flame: Flame,
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof LUCIDE;

export function Icon({ name, size = 20, className, color }: { name: IconName; size?: number; className?: string; color?: string }) {
  const Glyph = LUCIDE[name];
  return <Glyph size={size} strokeWidth={2.2} className={className} style={{ flexShrink: 0, ...(color ? { color } : {}) }} aria-hidden="true" focusable="false" />;
}
