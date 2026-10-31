import { useMemo, useState } from 'react';
import { setItemStatus } from '../../db/state.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { monthName } from '../../lib/dates.ts';
import { checklistCounts, checklistMeta, isChecklist } from '../../lib/checklist.ts';
import { buildPaths, inProgress, pathDots, pathExtras, PATHS, researchAreas, SHELVES, startsMuchLater, upNext } from '../../lib/library-home.ts';
import { laneSlot } from '../../lib/scenes.ts';
import { Button } from '../../ui/Button.tsx';
import type { LibraryPath, ShelfKey } from '../../lib/library-home.ts';
import { minutesForRef } from '../../lib/logs.ts';
import type { Unit } from '../../seed/schema.ts';
import { Icon } from '../../ui/Icon.tsx';
import type { IconName } from '../../ui/Icon.tsx';
import { IconTile } from '../../ui/glyphs.tsx';
import { ProgressLine } from '../../ui/ProgressLine.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { ScenePanel } from '../../ui/ScenePanel.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { count, plural } from '../parts/text.ts';

/** Each path's icon and tone, the same glyphs Today gives the blocks that teach them. */
export const PATH_ICON: Record<string, { icon: IconName; tone: 'blue' | 'ice' }> = {
  ai: { icon: 'cpu', tone: 'blue' },
  languages: { icon: 'code', tone: 'blue' },
  graphics: { icon: 'cube', tone: 'ice' },
  math: { icon: 'sigma', tone: 'blue' },
  systems: { icon: 'server', tone: 'ice' },
  ee: { icon: 'zap', tone: 'blue' },
  me: { icon: 'wrench', tone: 'ice' },
  engineering: { icon: 'zap', tone: 'blue' },
  architecture: { icon: 'network', tone: 'blue' },
  robotics: { icon: 'bot', tone: 'blue' },
  inference: { icon: 'gauge', tone: 'ice' },
  devops: { icon: 'container', tone: 'blue' },
  simulation: { icon: 'atom', tone: 'ice' },
  hardware: { icon: 'chip', tone: 'blue' },
  quantum: { icon: 'orbit', tone: 'ice' },
  research: { icon: 'flask', tone: 'ice' },
};

export const SHELF_ICON: Record<ShelfKey, IconName> = { course: 'course', book: 'book', paper: 'paper', article: 'article', blog: 'blog', tool: 'wrench', practice: 'target', project: 'layers' };

/** "Feb 2027", or "Feb" in the current year. */
export function monthOf(date: string, thisYear: string): string {
  return monthName(Number(date.slice(5, 7)) - 1, true) + (date.slice(0, 4) === thisYear ? '' : ' ' + date.slice(0, 4));
}

/** "Module 6 of 10", "Day 19 of 30", or the next unit's name, and how far along: what an in-progress card shows. */
export function progressFor(id: string, units: Record<string, Unit[]> | undefined, unitsDone: string[], loggedMinutes: number, estHours: number): { meta: string; fraction: number } {
  const list = units?.[id] ?? [];
  if (isChecklist(list)) {
    // A lesson checklist (ZOOMCAMP-CHECKLIST): "Module 1 · 6 of 97", and its share of the course's hours.
    const c = checklistCounts(list, unitsDone);
    return { meta: checklistMeta(list, unitsDone, true), fraction: c.hours > 0 ? c.hoursDone / c.hours : 0 };
  }
  if (list.length > 0) {
    const done = new Set(unitsDone);
    const index = list.findIndex((u) => !done.has(u.id));
    if (index < 0) return { meta: 'Every unit ticked', fraction: 1 };
    const head = list[index]!.title.split(':')[0]!.trim();
    const meta = /\d/.test(head) && head.length <= 20 ? head + ' of ' + list.length : head;
    return { meta, fraction: unitsDone.length / list.length };
  }
  const hours = Math.round(loggedMinutes / 60);
  // Past the estimate the hours say so (ATLAS-UI-POLISH); "43 of 40 h" is never written.
  if (estHours > 0 && hours >= estHours) return { meta: hours + ' h logged · over estimate', fraction: 1 };
  return { meta: hours > 0 ? hours + ' of ' + estHours + ' h' : 'Started', fraction: estHours > 0 ? Math.min(1, loggedMinutes / 60 / estHours) : 0 };
}

/** A path's subway line: done in --deco, the current step ice and larger, the steps ahead pressed in. */
export function SubwayLine({ path, max = 8 }: { path: LibraryPath; max?: number }) {
  const { dots, more } = pathDots(path, max);
  const current = dots.indexOf('current');
  return (
    <span aria-hidden="true" className="flex items-center">
      {dots.map((dot, i) => (
        <span key={i} className="flex flex-1 items-center last:flex-none">
          <span
            className={
              'shrink-0 rounded-pill ' +
              (dot === 'current' ? 'fill-ice size-[18px]' : dot === 'done' ? 'size-3' : 'well size-3')
            }
            style={dot === 'done' ? { background: 'var(--deco)' } : undefined}
          />
          {i < dots.length - 1 && (
            <span className="h-[3px] flex-1 rounded-pill" style={{ background: current < 0 || i < current ? 'var(--deco)' : 'var(--dash)' }} />
          )}
        </span>
      ))}
      {more > 0 && <span className="ml-2 shrink-0 text-small font-semibold text-ink2">+{more}</span>}
    </span>
  );
}

/**
 * The Library's home, as the "Library — home" board draws it: in progress, your paths, up next, and the shelves.
 * Dropped and done things stay off it; done steps are the filled dots of their path.
 */
export function LibraryHome({
  atlas,
  units,
  counts,
  today,
  onOpen,
  onPath,
  onShelf,
}: {
  atlas: Atlas;
  units: Record<string, Unit[]> | undefined;
  counts: Record<ShelfKey, number>;
  today: string;
  onOpen: (refId: string) => void;
  onPath: (pathId: string) => void;
  onShelf: (shelf: ShelfKey) => void;
}) {
  const { seed, states, logs } = atlas;
  const thisYear = today.slice(0, 4);
  const [menu, setMenu] = useState<string | null>(null);
  const [showLater, setShowLater] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [swaps, setSwaps] = useState([0, 0, 0]);
  // Over thousands of resources (ATLAS-LIBRARY): worked out once per change to the curriculum or the user's progress,
  // not on every render (a keystroke in search renders the home until the results take over).
  const { paths, browsePaths, researchCount } = useMemo(() => {
    const paths = buildPaths(seed, states);
    return {
      paths,
      // Paths with nothing on the plan (Software architecture): the Library's resources for them, to browse.
      browsePaths: PATHS.filter((def) => !paths.some((p) => p.id === def.id))
        .map((def) => ({ def, count: pathExtras(seed, states, def.id).length }))
        .filter((p) => p.count > 0),
      // The Research view (ATLAS-LIBRARY): year 3's reading on inference, world models, diffusion and generative AI.
      researchCount: researchAreas(seed, states).reduce((n, a) => n + a.items.length, 0),
    };
  }, [seed, states]);
  const laterPaths = paths.filter((p) => startsMuchLater(p, seed, today));
  const shownPaths = showLater ? paths : paths.filter((p) => !laterPaths.includes(p));
  const active = inProgress(seed.resources, states);
  const pathOfRef = (refId: string): string | undefined => paths.find((p) => p.steps.some((s) => s.refId === refId))?.id;
  const iconFor = (refId: string): { icon: IconName; tone: 'blue' | 'ice' } => PATH_ICON[pathOfRef(refId) ?? ''] ?? { icon: 'course', tone: 'blue' };
  // A path's lane (its colours): the block that teaches it on the plan, else its place in the list.
  const laneOfPath = (pathId: string, index: number): number => {
    const block = seed.plan.find((i) => paths.find((p) => p.id === pathId)?.steps.some((st) => st.refId === (i.resourceId ?? i.projectId)))?.block;
    return block ? laneSlot(block) : index % 5;
  };
  const laneOf = (refId: string, index: number): number => {
    const id = pathOfRef(refId);
    return id ? laneOfPath(id, index) : index % 5;
  };
  const menuResource = menu ? seed.resources.find((r) => r.id === menu) : undefined;

  // This week's picks (the mockup's): the next steps of the paths, three at a time; Swap turns a row to the next
  // candidate down the list. New on Monday: the pool follows the plan, so it changes as steps are ticked.
  const pool = upNext(paths, seed, 12, states);
  const picks = [0, 1, 2].map((i) => pool[(i + swaps[i]! * 3) % Math.max(1, pool.length)]).filter((p) => p !== undefined);
  const nowPath = paths.find((p) => p.steps.some((st) => states.get(st.refId)?.status === 'active'));

  return (
    <>
      <section aria-labelledby="in-progress" className="mt-[18px]">
        <h2 id="in-progress" className="section-label px-1">
          In progress
        </h2>
        {active.length === 0 ? (
          <p className="tile px-[18px] py-4 text-meta text-ink2">Nothing in progress. Start the next step of a path.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3.5">
            {active.map((r, i) => {
              const state = states.get(r.id);
              const { meta, fraction } = progressFor(r.id, units, state?.unitsDone ?? [], logs.reduce((sum, l) => sum + minutesForRef(l, r.id), 0), r.estHours);
              const { icon } = iconFor(r.id);
              const lane = laneOf(r.id, i);
              const title = r.short ?? r.title;
              return (
                <li key={r.id} className="tile relative flex min-h-[156px] flex-col gap-2 p-3.5">
                  <span className="flex items-start justify-between">
                    <IconTile icon={icon} lane={lane} />
                    <button type="button" aria-label={'More for ' + title} aria-haspopup="dialog" onClick={() => setMenu(r.id)} className="relative z-10 -mr-2 -mt-2 grid size-11 place-items-center rounded-pill text-ink2">
                      <Icon name="more" size={20} />
                    </button>
                  </span>
                  {/* The title opens the resource; the card's long press is the menu, as on a phone's home screen. */}
                  <button
                    type="button"
                    onClick={() => onOpen(r.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenu(r.id);
                    }}
                    className="line-clamp-2 min-h-11 text-left text-body font-medium leading-tight after:absolute after:inset-0 after:content-['']"
                  >
                    {title}
                  </button>
                  <span className="mt-auto text-label text-ink2">{meta}</span>
                  <ProgressLine value={fraction} label={title + ' progress'} lane={lane} size={10} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* This week's picks (the mockup's): the scene over the title, then three next steps with Swap. */}
      <section aria-labelledby="picks" className="tile mt-[18px] overflow-hidden !p-0">
        <ScenePanel
          slot="library"
          focal="50% 30%"
          decorative
          bare
          className="h-[150px] rounded-t-[24px]"
          fallback={<div className="h-4" />}
          bottom={
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="picks" className="text-[19px] font-black">
                This week&apos;s picks
              </h2>
              <span className="text-small text-ink2">new on Monday</span>
            </div>
          }
        />
        <ul className="px-[18px] pb-1.5">
          {picks.length === 0 && <li className="py-4 text-meta text-ink2">Every step of every path is done.</li>}
          {picks.map((u, i) => {
            const type = u.step.type === 'project' ? 'Project' : u.step.type.charAt(0).toUpperCase() + u.step.type.slice(1);
            const lane = laneOfPath(u.path.id, i);
            return (
              <li key={u.step.refId} className="flex min-h-[60px] items-center gap-3 border-t-[1.5px] border-dashed border-[var(--sd)] py-2 first:border-t-0">
                <IconTile icon="star" lane={lane} />
                <button type="button" onClick={() => onOpen(u.step.refId)} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-0.5 text-left">
                  <span className="truncate text-chip font-medium leading-tight">{u.step.title}</span>
                  <span className="truncate text-label text-ink2">{u.path.name + ' · ' + type + (u.after ? ' · after ' + u.after : ' · ' + Math.round(u.step.hours) + ' h')}</span>
                </button>
                <Button variant="ice" size="sm" name={'Swap pick: ' + u.step.title} onClick={() => setSwaps((s) => s.map((n, k) => (k === i ? n + 1 : n)))}>
                  Swap
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="your-paths" className="tile mt-[18px] px-[18px] py-2">
        <h2 id="your-paths" className="section-label pb-0.5 pt-2">
          Your paths
        </h2>
        <ul className="rows">
          {shownPaths.map((path, i) => {
            const nextStep = path.current >= 0 ? path.steps[path.current] : undefined;
            const startsLater = path.done === 0 && nextStep ? seed.phases.find((p) => p.id === nextStep.phaseId)?.start : undefined;
            const later = startsLater && startsLater > today ? 'From ' + monthOf(startsLater, thisYear) : null;
            const lane = laneOfPath(path.id, i);
            const isNow = nowPath?.id === path.id;
            return (
              <li key={path.id}>
                <button type="button" onClick={() => onPath(path.id)} className="flex min-h-[60px] w-full items-center gap-3 py-2 text-left">
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-pill" style={{ background: 'var(--l' + lane + ')' }} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-chip font-medium leading-tight">{path.name}</span>
                    <span className="truncate text-label text-ink2">
                      {plural(path.steps.length, 'step') + (path.done > 0 ? ' · ' + path.done + ' done' : later ? ' · ' + later.toLowerCase() : '') + (nextStep ? ' · next: ' + nextStep.title : ' · every step done')}
                    </span>
                  </span>
                  {isNow ? <span className={'lane-fill lane-' + lane + ' rounded-pill px-2.5 py-[3px] text-small font-black text-[var(--on-lane)]'}>Now</span> : <Icon name="chevronRight" size={16} className="text-[var(--x0)]" />}
                </button>
              </li>
            );
          })}
          {researchCount > 0 && <Row icon={<IconTile icon="flask" tone="neutral" />} title="Research" meta={'Year 3 · ' + count(researchCount) + ' to read'} chevron onClick={() => onPath('research')} />}
          {(laterPaths.length > 0 || browsePaths.length > 0) && !showLater && (
            <li>
              <button type="button" onClick={() => setShowLater(true)} className="flex min-h-[60px] w-full items-center gap-3 py-2 text-left">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-pill bg-[var(--sd)]" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-chip font-medium leading-tight">{plural(laterPaths.length + browsePaths.length, 'more path')}</span>
                  <span className="truncate text-label text-ink2">{[...laterPaths.map((p) => p.name), ...browsePaths.map((b) => b.def.name)].join(', ')}</span>
                </span>
                <Icon name="chevronRight" size={16} className="text-[var(--x0)]" />
              </button>
            </li>
          )}
          {showLater &&
            browsePaths.map(({ def, count: n }) => {
              const { icon } = PATH_ICON[def.id] ?? { icon: 'course' };
              return <Row key={def.id} icon={<IconTile icon={icon} tone="neutral" />} title={def.name} meta={'Not on the plan · ' + count(n) + ' to browse'} chevron onClick={() => onPath(def.id)} />;
            })}
        </ul>
      </section>

      {/* Browse all (the mockup's row): the shelves open under it. */}
      <section aria-labelledby="browse" className="tile mt-[18px] px-[18px] py-1">
        <button type="button" aria-expanded={browsing} onClick={() => setBrowsing((v) => !v)} className="flex min-h-[60px] w-full items-center gap-3 py-2 text-left">
          <IconTile icon="projects" lane={2} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 id="browse" className="text-chip font-medium leading-tight">
              Browse all
            </h2>
            <span className="truncate text-label text-ink2">Courses, books, papers, blogs, practice, projects</span>
          </span>
          <Icon name={browsing ? 'chevronDown' : 'chevronRight'} size={16} className="text-[var(--x0)]" />
        </button>
        {browsing && (
          <ul className="grid grid-cols-3 gap-3 pb-3 pt-1">
            {SHELVES.map((shelf) => (
              <li key={shelf.key}>
                <button type="button" onClick={() => onShelf(shelf.key)} className="lane-tile lane-0 flex min-h-[72px] w-full flex-col items-center justify-center gap-0.5 rounded-[14px] px-2 py-2">
                  <Icon name={SHELF_ICON[shelf.key]} size={18} />
                  <span className="text-chip font-semibold leading-tight">{count(counts[shelf.key])}</span>
                  <span className="text-[11px] font-semibold">{shelf.key === 'blog' ? 'Blogs' : shelf.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet open={menuResource !== undefined} title={menuResource ? (menuResource.short ?? menuResource.title) : ''} onClose={() => setMenu(null)}>
        <RowList>
          <Row
            title="Pause"
            meta="Back to not started; its progress stays"
            onClick={() => {
              if (menu) void setItemStatus(menu, 'todo');
              setMenu(null);
            }}
          />
          <Row
            title="Mark done"
            onClick={() => {
              if (menu) void setItemStatus(menu, 'done');
              setMenu(null);
            }}
          />
          <Row
            title="Open"
            chevron
            onClick={() => {
              if (menu) onOpen(menu);
              setMenu(null);
            }}
          />
        </RowList>
      </Sheet>
    </>
  );
}
