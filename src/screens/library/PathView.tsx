import { useState } from 'react';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { TOPICS, topicsOf } from '../../lib/engineering-topics.ts';
import { useQueryParam } from '../../router/router.tsx';
import { Chips } from '../../ui/Chips.tsx';
import { buildPaths, byFit, fitOf, isCanon, isLesser, pathExtras, pathOfTrack, PATHS, roadmapPage, SHELVES, shelfOf } from '../../lib/library-home.ts';
import { Button } from '../../ui/Button.tsx';
import { Header } from '../../ui/Header.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { IconTile } from '../../ui/glyphs.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { count, plural } from '../parts/text.ts';
import { ArtPanel } from '../../ui/ArtPanel.tsx';
import { pathSlot } from '../../lib/art.ts';
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
 * quality, year and level, wait, folded, under "Optional for this path", forty at a time; the ones the quality pass graded 3 or
 * lower wait under "More resources" at its end, folded too. A path with nothing on the plan
 * (Inference engineering, Software architecture, DevOps) is that list alone, open.
 */
export function PathView({ atlas, pathId, onOpen, onOpenPaper }: { atlas: Atlas; pathId: string; onOpen: (refId: string) => void; onOpenPaper: (id: string) => void }) {
  const { seed, states } = atlas;
  const def = PATHS.find((p) => p.id === pathId);
  const path = buildPaths(seed, states).find((p) => p.id === pathId) ?? (def ? { ...def, steps: [], current: -1, done: 0 } : undefined);
  // The Engineering path's areas (ATLAS-LIBRARY, 13,839 rows): a chip narrows the optional list, in the URL like a filter.
  const [topic, setTopic] = useQueryParam('topic');
  const topics = pathId === 'engineering' ? TOPICS : [];
  const [extras, setExtras] = useState(path?.steps.length === 0 || Boolean(topic));
  const [shownCount, setShownCount] = useState(PAGE);
  // The quality pass (ATLAS-QUALITY-AUDIT): rows graded 3 or lower wait, folded, under "More resources".
  const [lesserOpen, setLesserOpen] = useState(false);
  const [lesserCount, setLesserCount] = useState(PAGE);
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
  const everything = [
    ...pathExtras(seed, states, pathId)
      .filter((r) => !shown.has(r.id))
      .map((r) => ({ kind: 'resource' as const, item: r })),
    ...seed.papers.filter((p) => p.tracks.some((t) => pathOfTrack(seed, t)?.id === pathId)).map((p) => ({ kind: 'paper' as const, item: p })),
  ].sort((a, b) => byFit(fitOf(a.item), fitOf(b.item)) || (a.item.short ?? a.item.title).localeCompare(b.item.short ?? b.item.title));
  // An item's areas, by its title and summary; the Practice chip is the Practice shelf.
  const areasOf = (entry: (typeof everything)[number]): string[] => {
    const areas = topicsOf(entry.item.title, entry.item.summary ?? '');
    if (entry.kind === 'resource' && shelfOf(entry.item) === 'practice') areas.push('practice');
    return areas;
  };
  const counted = topics.length > 0 ? everything.map((entry) => ({ entry, areas: areasOf(entry) })) : [];
  const topicCount = Object.fromEntries(topics.map((t) => [t.key, counted.filter((c) => c.areas.includes(t.key)).length]));
  const picked = topic && topics.length > 0 ? topic : null;
  const inArea = picked ? counted.filter((c) => c.areas.includes(picked)).map((c) => c.entry) : everything;
  const more = inArea.filter((e) => !isLesser(e.item.quality));
  const lesser = inArea.filter((e) => isLesser(e.item.quality));
  // Under a chip the list is that area alone: the plan's alternatives belong to no area.
  const shownAlternatives = picked ? [] : alternatives;
  const optional = shownAlternatives.length + more.length + lesser.length;
  const main = shownAlternatives.length + more.length;
  const visible = more.slice(0, Math.max(0, shownCount - shownAlternatives.length));
  const lesserVisible = lesser.slice(0, lesserCount);
  const metaOf = (entry: (typeof everything)[number]): string =>
    entry.kind === 'paper'
      ? [isCanon(entry.item.quality) ? 'Canon' : null, entry.item.fromYear ? 'Year ' + entry.item.fromYear : null, 'Paper', entry.item.year].filter(Boolean).join(' · ')
      : [isCanon(entry.item.quality) ? 'Canon' : null, entry.item.fromYear ? 'Year ' + entry.item.fromYear : null, SHELF_LABEL[shelfOf(entry.item)], entry.item.estHours + ' h'].filter(Boolean).join(' · ');
  const rowOf = (entry: (typeof everything)[number]) =>
    entry.kind === 'paper' ? (
      <Row key={entry.item.id} icon={<IconTile icon="paper" tone="ice" />} title={entry.item.short ?? entry.item.title} meta={metaOf(entry)} truncate onClick={() => onOpenPaper(entry.item.id)} />
    ) : (
      <Row
        key={entry.item.id}
        icon={<IconTile icon={SHELF_ICON[shelfOf(entry.item)]} tone={shelfOf(entry.item) === 'practice' || shelfOf(entry.item) === 'paper' || shelfOf(entry.item) === 'blog' ? 'ice' : 'blue'} />}
        title={entry.item.short ?? entry.item.title}
        meta={metaOf(entry)}
        onClick={() => onOpen(entry.item.id)}
      />
    );

  return (
    <>
      <Header
        title={def.name}
        sub={path.steps.length > 0 ? plural(path.steps.length, 'step') + ' · ' + path.done + ' done' : 'Not on the plan · ' + count(optional) + ' to browse'}
        back={<Button variant="icon" icon="chevronLeft" label="Back to the Library" to="/library" />}
        actions={pathSlot(def.id) ? <ArtPanel slot={pathSlot(def.id)!} aspect="1 / 1" decorative className="w-14" /> : undefined}
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
      {topics.length > 0 && (
        <div className="mt-3">
          <Chips
            label="Area"
            items={topics.map((t) => ({ key: t.key, label: t.label, count: topicCount[t.key], pressed: topic === t.key, onClick: () => { setTopic(topic === t.key ? null : t.key); setExtras(true); setShownCount(PAGE); } }))}
          />
        </div>
      )}
      {optional > 0 && (
        <section className="tile mt-[18px] px-[18px] py-1">
          <button type="button" aria-expanded={extras} onClick={() => setExtras(!extras)} className="flex min-h-14 w-full items-center gap-3 text-left">
            <span className="min-w-0 flex-1 text-body font-medium">Optional for this path</span>
            <span className="text-meta text-ink2">{optional}</span>
            <Icon name={extras ? 'chevronDown' : 'chevronRight'} size={18} className="text-ink2" />
          </button>
          {extras && (
            <ul className="rows pb-2">
              {shownAlternatives.map((r) => (
                <Row key={r.id} icon={<IconTile icon={SHELF_ICON[shelfOf(r)]} />} title={r.short ?? r.title} meta={'Alternative · ' + r.estHours + ' h'} onClick={() => onOpen(r.id)} />
              ))}
              {visible.map(rowOf)}
              {shownAlternatives.length + visible.length < main && (
                <Row title={'Show ' + Math.min(PAGE, main - shownAlternatives.length - visible.length) + ' more'} meta={count(main - shownAlternatives.length - visible.length) + ' not shown yet'} chevron height={44} onClick={() => setShownCount(shownCount + PAGE)} />
              )}
              {lesser.length > 0 && (
                <li>
                  <button type="button" aria-expanded={lesserOpen} onClick={() => setLesserOpen(!lesserOpen)} className="flex min-h-11 w-full items-center gap-3 text-left">
                    <span className="min-w-0 flex-1 text-body font-medium">More resources</span>
                    <span className="text-meta text-ink2">{count(lesser.length)}</span>
                    <Icon name={lesserOpen ? 'chevronDown' : 'chevronRight'} size={18} className="text-ink2" />
                  </button>
                </li>
              )}
              {lesserOpen && lesserVisible.map(rowOf)}
              {lesserOpen && lesserVisible.length < lesser.length && (
                <Row title={'Show ' + Math.min(PAGE, lesser.length - lesserVisible.length) + ' more'} meta={count(lesser.length - lesserVisible.length) + ' not shown yet'} chevron height={44} onClick={() => setLesserCount(lesserCount + PAGE)} />
              )}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
