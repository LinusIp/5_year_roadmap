import { useState } from 'react';
import { setItemStatus } from '../../db/state.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { monthName } from '../../lib/dates.ts';
import { buildPaths, inProgress, pathDots, SHELVES, startsMuchLater, upNext } from '../../lib/library-home.ts';
import type { LibraryPath, ShelfKey } from '../../lib/library-home.ts';
import { minutesForRef } from '../../lib/logs.ts';
import type { Unit } from '../../seed/schema.ts';
import { Icon } from '../../ui/Icon.tsx';
import type { IconName } from '../../ui/Icon.tsx';
import { IconTile } from '../../ui/glyphs.tsx';
import { ProgressLine } from '../../ui/ProgressLine.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { plural } from '../parts/text.ts';

/** Each path's icon and tone, the same glyphs Today gives the blocks that teach them. */
export const PATH_ICON: Record<string, { icon: IconName; tone: 'blue' | 'ice' }> = {
  ai: { icon: 'cpu', tone: 'blue' },
  languages: { icon: 'code', tone: 'blue' },
  graphics: { icon: 'cube', tone: 'ice' },
  math: { icon: 'sigma', tone: 'blue' },
  systems: { icon: 'server', tone: 'ice' },
  ee: { icon: 'zap', tone: 'blue' },
  me: { icon: 'wrench', tone: 'ice' },
};

export const SHELF_ICON: Record<ShelfKey, IconName> = { course: 'course', book: 'book', paper: 'paper', article: 'article', blog: 'blog', tool: 'wrench', project: 'layers' };

/** "Feb 2027", or "Feb" in the current year. */
export function monthOf(date: string, thisYear: string): string {
  return monthName(Number(date.slice(5, 7)) - 1, true) + (date.slice(0, 4) === thisYear ? '' : ' ' + date.slice(0, 4));
}

/** "Module 6 of 10", "Day 19 of 30", or the next unit's name, and how far along: what an in-progress card shows. */
export function progressFor(id: string, units: Record<string, Unit[]> | undefined, unitsDone: string[], loggedMinutes: number, estHours: number): { meta: string; fraction: number } {
  const list = units?.[id] ?? [];
  if (list.length > 0) {
    const done = new Set(unitsDone);
    const index = list.findIndex((u) => !done.has(u.id));
    if (index < 0) return { meta: 'Every unit ticked', fraction: 1 };
    const head = list[index]!.title.split(':')[0]!.trim();
    const meta = /\d/.test(head) && head.length <= 20 ? head + ' of ' + list.length : head;
    return { meta, fraction: unitsDone.length / list.length };
  }
  const hours = Math.round(loggedMinutes / 60);
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
  const paths = buildPaths(seed, states);
  const laterPaths = paths.filter((p) => startsMuchLater(p, seed, today));
  const shownPaths = showLater ? paths : paths.filter((p) => !laterPaths.includes(p));
  const active = inProgress(seed.resources, states);
  const next = upNext(paths, seed);
  const pathOfRef = (refId: string): string | undefined => paths.find((p) => p.steps.some((s) => s.refId === refId))?.id;
  const iconFor = (refId: string): { icon: IconName; tone: 'blue' | 'ice' } => PATH_ICON[pathOfRef(refId) ?? ''] ?? { icon: 'course', tone: 'blue' };
  const menuResource = menu ? seed.resources.find((r) => r.id === menu) : undefined;

  return (
    <>
      <section aria-labelledby="in-progress" className="mt-[18px]">
        <h2 id="in-progress" className="section-label px-1">
          In progress
        </h2>
        {active.length === 0 ? (
          <p className="tile px-[18px] py-4 text-meta text-ink2">Nothing in progress. Start the next step of a path.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4">
            {active.map((r) => {
              const state = states.get(r.id);
              const { meta, fraction } = progressFor(r.id, units, state?.unitsDone ?? [], logs.reduce((sum, l) => sum + minutesForRef(l, r.id), 0), r.estHours);
              const { icon, tone } = iconFor(r.id);
              const title = r.short ?? r.title;
              return (
                <li key={r.id} className="tile relative flex min-h-[168px] flex-col gap-2 p-4">
                  <span className="flex items-start justify-between">
                    <IconTile icon={icon} tone={tone} />
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
                  <span className="mt-auto text-meta text-ink2">{meta}</span>
                  <ProgressLine value={fraction} label={title + ' progress'} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="your-paths" className="tile mt-[18px] px-4 py-1">
        <h2 id="your-paths" className="section-label pt-2.5">
          Your paths
        </h2>
        <ul className="rows">
          {shownPaths.map((path) => {
            const { icon, tone } = PATH_ICON[path.id] ?? { icon: 'course', tone: 'blue' };
            const nextStep = path.current >= 0 ? path.steps[path.current] : undefined;
            const startsLater = path.done === 0 && nextStep ? seed.phases.find((p) => p.id === nextStep.phaseId)?.start : undefined;
            const later = startsLater && startsLater > today ? 'From ' + monthOf(startsLater, thisYear) : null;
            return (
              <li key={path.id}>
                <button type="button" onClick={() => onPath(path.id)} className="flex w-full flex-col gap-2.5 py-3 text-left">
                  <span className="flex w-full items-center gap-3">
                    <IconTile icon={icon} tone={tone} />
                    <span className="min-w-0 flex-1 text-body font-medium">{path.name}</span>
                    <span className="shrink-0 text-meta text-ink2">{plural(path.steps.length, 'step')}</span>
                    <Icon name="chevronRight" size={18} className="text-ink2" />
                  </span>
                  <span className="block pl-[52px] pr-1">
                    <SubwayLine path={path} />
                  </span>
                  <span className="flex justify-between gap-3 pl-[52px] text-meta text-ink2">
                    <span className="shrink-0">{path.done > 0 ? path.done + ' done' : (later ?? 'Not started')}</span>
                    <span className="min-w-0 truncate text-right">
                      {nextStep ? (
                        <>
                          Next: <span className="font-semibold text-ink">{nextStep.title}</span>
                        </>
                      ) : (
                        'Every step done'
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {laterPaths.length > 0 && !showLater && (
            <Row title="Later in the plan" meta={laterPaths.map((p) => p.name).join(' · ')} chevron height={44} onClick={() => setShowLater(true)} />
          )}
        </ul>
      </section>

      {next.length > 0 && (
        <RowList label="Up next" className="mt-[18px]">
          {next.map((u) => {
            const { icon, tone } = PATH_ICON[u.path.id] ?? { icon: 'course', tone: 'blue' };
            const type = u.step.type === 'project' ? 'Project' : u.step.type.charAt(0).toUpperCase() + u.step.type.slice(1);
            return (
              <Row
                key={u.step.refId}
                icon={<IconTile icon={icon} tone={tone} />}
                title={u.step.title}
                meta={type + (u.after ? ' · after ' + u.after : ' · ' + Math.round(u.step.hours) + ' h')}
                trailing={u.start > today ? monthOf(u.start, thisYear) : 'Now'}
                onClick={() => onOpen(u.step.refId)}
              />
            );
          })}
        </RowList>
      )}

      <section aria-labelledby="browse" className="mt-[18px]">
        <h2 id="browse" className="section-label px-1">
          Browse when you need something
        </h2>
        <ul className="grid grid-cols-3 gap-4">
          {SHELVES.map((shelf) => (
            <li key={shelf.key}>
              <button type="button" onClick={() => onShelf(shelf.key)} className="tile press flex w-full flex-col items-center gap-1 px-2 py-4">
                <span className={shelf.key === 'paper' || shelf.key === 'blog' || shelf.key === 'project' ? 'text-ice-deep' : 'text-blue-deep'}>
                  <Icon name={SHELF_ICON[shelf.key]} size={22} />
                </span>
                <span className="text-lead font-semibold leading-tight">{counts[shelf.key]}</span>
                <span className="text-small font-semibold text-ink2">{shelf.key === 'blog' ? 'Blogs to follow' : shelf.label}</span>
              </button>
            </li>
          ))}
        </ul>
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
