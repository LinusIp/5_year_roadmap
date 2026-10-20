import { useState } from 'react';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { buildPaths, byFit, fitOf, pathExtras, pathOfTrack, PATHS, roadmapPage, SHELVES, shelfOf } from '../../lib/library-home.ts';
import { Button } from '../../ui/Button.tsx';
import { Header } from '../../ui/Header.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { IconTile } from '../../ui/glyphs.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { plural } from '../parts/text.ts';
import { SHELF_ICON } from './Home.tsx';

/** A shelf's name for one item: "Book", "Practice". */
const SHELF_LABEL = Object.fromEntries(SHELVES.map((s) => [s.key, s.key === 'practice' ? 'Practice' : s.label.replace(/s$/, '')]));

/** How many optional rows show at a time: a path can offer hundreds (ATLAS-LIBRARY). */
const PAGE = 40;

const STATUS_LABEL = { todo: '', active: 'Active', done: 'Done', dropped: 'Dropped' } as const;

/** A step's mark on the path's vertical line: done filled, the current one ice and larger, later ones pressed in. */
function StepDot({ state }: { state: 'done' | 'current' | 'later' }) {
  return (
    <span aria-hidden="true" className="grid w-5 shrink-0 place-items-center">
      <span className={'rounded-pill ' + (state === 'current' ? 'fill-ice size-[18px]' : state === 'done' ? 'size-3' : 'well size-3')} style={state === 'done' ? { background: 'var(--deco)' } : undefined} />
    </span>
  );
}

/**
 * One path: every step in plan order, grouped by phase, with its dot, kind, hours and status; the current step is
 * highlighted. A path that follows roadmap.sh roadmaps opens with their official pages (ATLAS-LIBRARY). Alternatives to
 * its steps, then the Library's other resources of its tracks and roadmaps and the papers of its tracks, by priority,
 * year and level, wait, folded, under "Optional for this path", forty at a time. A path with nothing on the plan
 * (Inference engineering, Software architecture, DevOps) is that list alone, open.
 */
export function PathView({ atlas, pathId, onOpen, onOpenPaper }: { atlas: Atlas; pathId: string; onOpen: (refId: string) => void; onOpenPaper: (id: string) => void }) {
  const { seed, states } = atlas;
  const def = PATHS.find((p) => p.id === pathId);
  const path = buildPaths(seed, states).find((p) => p.id === pathId) ?? (def ? { ...def, steps: [], current: -1, done: 0 } : undefined);
  const [extras, setExtras] = useState(path?.steps.length === 0);
  const [shownCount, setShownCount] = useState(PAGE);
  if (!path || !def) {
    return <Header title="Library" back={<Button variant="icon" icon="chevronLeft" label="Back to the Library" to="/library" />} sub="This path has no steps." />;
  }
  const phases = seed.phases.filter((ph) => path.steps.some((s) => s.phaseId === ph.id));
  const inPath = new Set(path.steps.map((s) => s.refId));
  const alternatives = [...new Set(path.steps.flatMap((s) => seed.resources.find((r) => r.id === s.refId)?.alternatives ?? []))]
    .filter((id) => !inPath.has(id))
    .map((id) => seed.resources.find((r) => r.id === id))
    .filter((r) => r !== undefined);
  const shown = new Set(alternatives.map((r) => r.id));
  const pages = (def.roadmaps ?? []).map((id) => roadmapPage(seed, id)).filter((r) => r !== undefined);
  // The Library's resources and the reading queue's papers in one list, by fit.
  const more = [
    ...pathExtras(seed, states, pathId)
      .filter((r) => !shown.has(r.id))
      .map((r) => ({ kind: 'resource' as const, item: r })),
    ...seed.papers.filter((p) => p.tracks.some((t) => pathOfTrack(seed, t)?.id === pathId)).map((p) => ({ kind: 'paper' as const, item: p })),
  ].sort((a, b) => byFit(fitOf(a.item), fitOf(b.item)) || (a.item.short ?? a.item.title).localeCompare(b.item.short ?? b.item.title));
  const optional = alternatives.length + more.length;
  const visible = more.slice(0, Math.max(0, shownCount - alternatives.length));

  return (
    <>
      <Header
        title={def.name}
        sub={path.steps.length > 0 ? plural(path.steps.length, 'step') + ' · ' + path.done + ' done' : 'Not on the plan · ' + optional + ' to browse'}
        back={<Button variant="icon" icon="chevronLeft" label="Back to the Library" to="/library" />}
      />
      {pages.length > 0 && (
        <RowList label="roadmap.sh" className="mt-[18px]">
          {pages.map((r) => (
            <Row key={r.id} icon={<IconTile icon="map" />} title={r.short ?? r.title} meta="The official roadmap · roadmap.sh" onClick={() => onOpen(r.id)} />
          ))}
        </RowList>
      )}
      {phases.map((phase) => (
        <RowList key={phase.id} label={'Year ' + phase.year + ' · ' + phase.title} className="mt-[18px]">
          {path.steps
            .map((step, index) => ({ step, index }))
            .filter(({ step }) => step.phaseId === phase.id)
            .map(({ step, index }) => {
              const state = index === path.current ? 'current' : step.status === 'done' ? 'done' : 'later';
              const shelf = step.kind === 'project' ? 'project' : shelfOf(seed.resources.find((r) => r.id === step.refId) ?? { type: step.type });
              return (
                <Row
                  key={step.refId}
                  className={state === 'current' ? 'well-ice -mx-2 rounded-box px-2' : ''}
                  icon={
                    <span className="flex items-center gap-2">
                      <StepDot state={state} />
                      <IconTile icon={SHELF_ICON[shelf]} tone={shelf === 'project' || shelf === 'paper' ? 'ice' : 'blue'} />
                    </span>
                  }
                  title={step.title}
                  meta={(step.kind === 'project' ? 'Project' : step.type.charAt(0).toUpperCase() + step.type.slice(1)) + ' · ' + Math.round(step.hours) + ' h' + (state === 'current' ? ' · now' : '')}
                  trailing={STATUS_LABEL[step.status] || undefined}
                  onClick={() => onOpen(step.refId)}
                />
              );
            })}
        </RowList>
      ))}
      {optional > 0 && (
        <section className="tile mt-[18px] px-[18px] py-1">
          <button type="button" aria-expanded={extras} onClick={() => setExtras(!extras)} className="flex min-h-14 w-full items-center gap-3 text-left">
            <span className="min-w-0 flex-1 text-body font-medium">Optional for this path</span>
            <span className="text-meta text-ink2">{optional}</span>
            <Icon name={extras ? 'chevronDown' : 'chevronRight'} size={18} className="text-ink2" />
          </button>
          {extras && (
            <ul className="rows pb-2">
              {alternatives.map((r) => (
                <Row key={r.id} icon={<IconTile icon={SHELF_ICON[shelfOf(r)]} />} title={r.short ?? r.title} meta={'Alternative · ' + r.estHours + ' h'} onClick={() => onOpen(r.id)} />
              ))}
              {visible.map(({ kind, item: r }) =>
                kind === 'paper' ? (
                  <Row key={r.id} icon={<IconTile icon="paper" tone="ice" />} title={r.short ?? r.title} meta={[r.fromYear ? 'Year ' + r.fromYear : null, 'Paper', r.year].filter(Boolean).join(' · ')} truncate onClick={() => onOpenPaper(r.id)} />
                ) : (
                  <Row
                    key={r.id}
                    icon={<IconTile icon={SHELF_ICON[shelfOf(r)]} tone={shelfOf(r) === 'practice' || shelfOf(r) === 'paper' || shelfOf(r) === 'blog' ? 'ice' : 'blue'} />}
                    title={r.short ?? r.title}
                    meta={[r.fromYear ? 'Year ' + r.fromYear : null, SHELF_LABEL[shelfOf(r)], r.estHours + ' h'].filter(Boolean).join(' · ')}
                    onClick={() => onOpen(r.id)}
                  />
                ),
              )}
              {alternatives.length + visible.length < optional && (
                <Row title={'Show ' + Math.min(PAGE, optional - alternatives.length - visible.length) + ' more'} meta={optional - alternatives.length - visible.length + ' not shown yet'} chevron height={44} onClick={() => setShownCount(shownCount + PAGE)} />
              )}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
