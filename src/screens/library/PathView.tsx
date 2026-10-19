import { useState } from 'react';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { buildPaths, PATHS, SHELVES, shelfOf } from '../../lib/library-home.ts';
import { Button } from '../../ui/Button.tsx';
import { Header } from '../../ui/Header.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { IconTile } from '../../ui/glyphs.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { plural } from '../parts/text.ts';
import { SHELF_ICON } from './Home.tsx';

/** A shelf's name for one item: "Book", "Practice". */
const SHELF_LABEL = Object.fromEntries(SHELVES.map((s) => [s.key, s.key === 'practice' ? 'Practice' : s.label.replace(/s$/, '')]));

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
 * highlighted. Alternatives to its steps, the Library's other resources of its family (RESOURCES-ADD, by the year they
 * fit from) and the papers of its tracks wait, folded, under "Optional for this path".
 */
export function PathView({ atlas, pathId, onOpen, onOpenPaper }: { atlas: Atlas; pathId: string; onOpen: (refId: string) => void; onOpenPaper: (id: string) => void }) {
  const { seed, states } = atlas;
  const [extras, setExtras] = useState(false);
  const path = buildPaths(seed, states).find((p) => p.id === pathId);
  const def = PATHS.find((p) => p.id === pathId);
  if (!path || !def) {
    return <Header title="Library" back={<Button variant="icon" icon="chevronLeft" label="Back to the Library" to="/library" />} sub="This path has no steps." />;
  }
  const phases = seed.phases.filter((ph) => path.steps.some((s) => s.phaseId === ph.id));
  const inPath = new Set(path.steps.map((s) => s.refId));
  const familyTracks = new Set(seed.tracks.filter((t) => t.family === def.family).map((t) => t.id));
  const alternatives = [...new Set(path.steps.flatMap((s) => seed.resources.find((r) => r.id === s.refId)?.alternatives ?? []))]
    .filter((id) => !inPath.has(id))
    .map((id) => seed.resources.find((r) => r.id === id))
    .filter((r) => r !== undefined);
  const onPlan = new Set(seed.plan.map((i) => i.resourceId ?? i.projectId));
  const shown = new Set(alternatives.map((r) => r.id));
  const library = seed.resources
    .filter((r) => r.fromYear !== undefined && familyTracks.has(r.tracks[0]!) && !onPlan.has(r.id) && !shown.has(r.id) && states.get(r.id)?.status !== 'dropped')
    .sort((a, b) => a.fromYear! - b.fromYear! || (a.short ?? a.title).localeCompare(b.short ?? b.title));
  const papers = seed.papers.filter((p) => p.tracks.some((t) => familyTracks.has(t)));
  const optional = alternatives.length + library.length + papers.length;

  return (
    <>
      <Header
        title={def.name}
        sub={plural(path.steps.length, 'step') + ' · ' + path.done + ' done'}
        back={<Button variant="icon" icon="chevronLeft" label="Back to the Library" to="/library" />}
      />
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
              {library.map((r) => (
                <Row
                  key={r.id}
                  icon={<IconTile icon={SHELF_ICON[shelfOf(r)]} tone={shelfOf(r) === 'practice' ? 'ice' : 'blue'} />}
                  title={r.short ?? r.title}
                  meta={'Year ' + r.fromYear + ' · ' + SHELF_LABEL[shelfOf(r)] + ' · ' + r.estHours + ' h'}
                  onClick={() => onOpen(r.id)}
                />
              ))}
              {papers.map((p) => (
                <Row key={p.id} icon={<IconTile icon="paper" tone="ice" />} title={p.title} meta={['Paper', p.year].filter(Boolean).join(' · ')} truncate onClick={() => onOpenPaper(p.id)} />
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
