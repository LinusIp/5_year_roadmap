import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useCertStates } from '../db/credentials.ts';
import { usePaperStates } from '../db/state.ts';
import type { ItemStatus, PaperStatus } from '../db/types.ts';
import { useAtlas, useLibrary } from '../hooks/useAtlas.ts';
import type { Atlas } from '../hooks/useAtlas.ts';
import { useUnits } from '../hooks/useUnits.ts';
import { useCatalogueIndex, useChallengeEvents } from '../hooks/useCatalogue.ts';
import { groupLabel, HOUR_BUCKETS, KIND_LABEL, matchesFilter, solvedSet } from '../lib/catalogue/filters.ts';
import type { Filterable, HourBucket, LibraryFilter } from '../lib/catalogue/filters.ts';
import type { CatalogueEntry, CatalogueKind, Difficulty } from '../seed/catalogue.ts';
import { monthName, today } from '../lib/dates.ts';
import { buildIndex, search } from '../lib/search.ts';
import { navigate, useLocation, useQueryParam } from '../router/router.tsx';
import type { Unit } from '../seed/schema.ts';
import { Chips } from '../ui/Chips.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Header } from '../ui/Header.tsx';
import { DifficultyDots, IconTile, KindIcon, StatusIcon } from '../ui/glyphs.tsx';
import { buildPaths, byFit, fitOf, inProgress, PATH_ALIASES, priorityOf, shelfCounts, groupResults, shelfOf, upNext } from '../lib/library-home.ts';
import type { Fit } from '../lib/library-home.ts';
import type { ShelfKey } from '../lib/library-home.ts';
import { LibraryHome, SHELF_ICON } from './library/Home.tsx';
import { PathView } from './library/PathView.tsx';
import { ResearchView } from './library/ResearchView.tsx';

import { Button } from '../ui/Button.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { SearchField } from '../ui/TextField.tsx';
import { AddResourceSheet } from './library/AddResourceSheet.tsx';
import { ItemSheet } from './parts/ItemSheet.tsx';
import { PickerSheet } from './parts/PickerSheet.tsx';
import { plural, shortTitle, unitShort } from './parts/text.ts';
import { PaperSheet } from './plan/PapersView.tsx';

/** One shelf's name, for its own page: "Courses", "Blogs to follow". */
const SHELF_TITLE: Record<ShelfKey, string> = { course: 'Courses', book: 'Books', paper: 'Papers', article: 'Articles', blog: 'Blogs to follow', tool: 'Tools', practice: 'Practice', project: 'Projects' };
const SHELF_NOUN: Record<ShelfKey, [string, string]> = { course: ['course', 'courses'], book: ['book', 'books'], paper: ['paper', 'papers'], article: ['article', 'articles'], blog: ['blog', 'blogs'], tool: ['tool', 'tools'], practice: ['practice item', 'practice items'], project: ['project', 'projects'] };
const STATUS_CHIPS: { key: ItemStatus; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'todo', label: 'Not started' },
  { key: 'done', label: 'Done' },
];
const PAPER_AS_ITEM: Record<PaperStatus, ItemStatus> = { queued: 'todo', reading: 'active', read: 'done', implemented: 'done' };
const PAPER_LABEL: Record<PaperStatus, string> = { queued: '', reading: 'Reading', read: 'Read', implemented: 'Implemented' };

interface Entry {
  kind: 'resource' | 'project' | 'paper' | 'catalogue';
  id: string;
  title: string;
  body: string;
  type: string;
  tracks: string[];
  status: ItemStatus;
  meta: string;
  trailing: string;
  /** For the default order: active first, then by when the plan starts it. */
  sortKey: string;
  /** Projects: what Library › Projects filters on. A curriculum project has no catalogue entry. */
  project?: Filterable;
  /** Resources and papers that have them: what the Level and Roadmap chips filter on (MORE-RESOURCES, ATLAS-LIBRARY). */
  level?: 'intro' | 'intermediate' | 'advanced' | undefined;
  roadmap?: string | undefined;
  /** Priority, year and level: the order of every list (ATLAS-LIBRARY). */
  fit: Fit;
}

/** The order of every list but Projects' (ATLAS-LIBRARY): what is in progress, then by fit, done and dropped last. */
const STATUS_RANK: Record<ItemStatus, number> = { active: 0, todo: 1, done: 2, dropped: 3 };
function byPlanFit(a: Entry, b: Entry): number {
  return STATUS_RANK[a.status] - STATUS_RANK[b.status] || byFit(a.fit, b.fit) || a.title.localeCompare(b.title);
}

/** The level chips of the shelves and search: the data's levels, as a learner names them. */
const LEVEL_CHIPS = [
  { key: 'intro', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
] as const;

/** "day 19", or "55%" when the units have no numbered names. */
function progressOf(id: string, unitsDone: string[], units: Record<string, Unit[]> | undefined): string | null {
  const list = units?.[id];
  if (!list || list.length === 0 || unitsDone.length === 0) return null;
  const done = new Set(unitsDone);
  const next = list.find((u) => !done.has(u.id));
  if (!next) return null;
  const short = unitShort(next.title);
  return short !== next.title ? short : Math.round((unitsDone.length / list.length) * 100) + '%';
}

function buildEntries(
  atlas: Atlas,
  units: Record<string, Unit[]> | undefined,
  paperStates: Map<string, { status: PaperStatus }>,
  catalogue: readonly CatalogueEntry[] | null,
  solved: ReadonlySet<string>,
): Entry[] {
  const { seed, states } = atlas;
  const thisYear = today().slice(0, 4);
  const startOf = new Map<string, string>();
  for (const item of [...seed.plan].sort((a, b) => a.order - b.order)) {
    const ref = item.resourceId ?? item.projectId!;
    const phase = seed.phases.find((p) => p.id === item.phaseId);
    if (phase && !startOf.has(ref)) startOf.set(ref, phase.start + ':' + item.block + ':' + String(item.order).padStart(5, '0'));
  }
  const when = (ref: string): string => {
    const start = startOf.get(ref);
    if (!start) return '';
    const [y, m] = start.split('-');
    return monthName(Number(m) - 1, true) + (y === thisYear ? '' : ' ' + y);
  };
  const trailingFor = (ref: string, status: ItemStatus): string => (status === 'active' ? 'Active' : status === 'done' ? 'Done' : status === 'dropped' ? 'Dropped' : when(ref));
  // A planned item fits the year of its phase; one off the plan, the year the Library gives it.
  const planYear = new Map<string, number>();
  for (const item of seed.plan) {
    const ref = item.resourceId ?? item.projectId!;
    const year = seed.phases.find((p) => p.id === item.phaseId)?.year;
    if (year && !planYear.has(ref)) planYear.set(ref, year);
  }
  const sortFor = (ref: string, status: ItemStatus, title: string): string =>
    (status === 'active' ? '0' : status === 'todo' && startOf.has(ref) ? '1' + startOf.get(ref) : status === 'todo' ? '2' : '3') + title.toLowerCase();

  const resources: Entry[] = seed.resources.map((r) => {
    const state = states.get(r.id);
    const status = state?.status ?? 'todo';
    return {
      kind: 'resource',
      id: r.id,
      title: r.short ?? shortTitle(r.title),
      body: [r.title, r.short ?? '', r.provider, r.summary ?? '', r.tracks.join(' '), (r.tags ?? []).join(' '), r.type, state?.notes ?? ''].join(' '),
      type: shelfOf(r),
      tracks: r.tracks,
      status,
      meta: [r.type === 'paper' && r.fromYear ? 'Year ' + r.fromYear : null, r.provider, r.estHours > 0 ? r.estHours + ' h' : null, progressOf(r.id, state?.unitsDone ?? [], units)].filter(Boolean).join(' · '),
      trailing: trailingFor(r.id, status),
      sortKey: sortFor(r.id, status, r.title),
      level: r.level,
      roadmap: r.roadmap,
      fit: { ...fitOf(r), year: planYear.get(r.id) ?? r.fromYear },
    };
  });
  const papers: Entry[] = seed.papers.map((p) => {
    const paperStatus = paperStates.get(p.id)?.status ?? 'queued';
    const status = PAPER_AS_ITEM[paperStatus];
    return {
      kind: 'paper',
      id: p.id,
      title: p.short ?? p.title,
      body: [p.title, p.authors ?? '', p.note ?? '', p.summary ?? '', p.tracks.join(' '), String(p.year ?? '')].join(' '),
      type: 'paper',
      tracks: p.tracks,
      status,
      meta: [p.fromYear ? 'Year ' + p.fromYear : null, p.authors, p.year].filter(Boolean).join(' · '),
      trailing: PAPER_LABEL[paperStatus],
      sortKey: (status === 'active' ? '0' : status === 'todo' ? '2' : '3') + p.title.toLowerCase(),
      level: p.level,
      roadmap: p.roadmap,
      fit: fitOf(p),
    };
  });
  // Projects follow everything else in the default order ("5…"), so the list opens as it always has; the Projects
  // chip and search find them.
  const projects: Entry[] = seed.projects.map((p) => {
    const status = states.get(p.id)?.status ?? 'todo';
    return {
      kind: 'project',
      id: p.id,
      title: shortTitle(p.title),
      body: [p.title, p.brief, p.cadence, p.tracks.join(' ')].join(' '),
      type: 'project',
      tracks: p.tracks,
      status,
      meta: ['Curriculum ' + p.cadence, p.estHours + ' h'].join(' · '),
      trailing: trailingFor(p.id, status),
      sortKey: '5' + sortFor(p.id, status, p.title),
      fit: { priority: priorityOf(p), year: planYear.get(p.id) },
      project: { kind: 'curriculum', group: p.cadence, phaseId: p.phaseId, hours: p.estHours, tracks: p.tracks },
    };
  });
  const fromCatalogue: Entry[] = (catalogue ?? []).map((e) => {
    const status: ItemStatus = e.kind === 'challenge' ? (solved.has(e.id) ? 'done' : 'todo') : (states.get(e.id)?.status ?? 'todo');
    const size = e.kind === 'challenge' ? e.estMinutes + ' min' : e.hours + ' h';
    const phase = e.phaseId ? seed.phases.find((p) => p.id === e.phaseId) : undefined;
    const entry: Entry = {
      kind: 'catalogue',
      id: e.id,
      title: e.title,
      body: [e.title, e.kind, e.difficulty, e.group, groupLabel(e.group), e.tracks.join(' ')].join(' '),
      type: 'project',
      tracks: e.tracks,
      status,
      meta: [KIND_LABEL[e.kind] + ' · ' + e.difficulty, groupLabel(e.group), phase ? 'Year ' + phase.year : null, size].filter(Boolean).join(' · '),
      trailing: status === 'done' ? (e.kind === 'challenge' ? 'Solved' : 'Done') : status === 'active' ? 'Active' : '',
      sortKey: '5' + (status === 'active' ? '0' : status === 'done' ? '3' : '2') + e.title.toLowerCase(),
      fit: { priority: priorityOf(e), year: phase?.year },
      project: { kind: e.kind, difficulty: e.difficulty, group: e.group, hours: e.hours, tracks: e.tracks },
    };
    if (e.phaseId) entry.project!.phaseId = e.phaseId;
    if (e.level) entry.project!.level = e.level;
    return entry;
  });
  // In the Library's order, so that search, which keeps the order among equal matches, follows it too.
  return [...[...resources, ...papers].sort(byPlanFit), ...projects, ...fromCatalogue];
}

/**
 * The long list, windowed: only the rows near the viewport are rendered, the rest are padding of the same height.
 * Row heights are measured from a rendered row, so the scrollbar and the window stay true.
 */
function VirtualList<T>({ items, keyOf, render, label }: { items: T[]; keyOf: (item: T) => string; render: (item: T) => ReactNode; label?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [rowHeight, setRowHeight] = useState(61);
  const [range, setRange] = useState<[number, number]>([0, 40]);
  useEffect(() => {
    const update = (): void => {
      const list = ref.current;
      if (!list) return;
      const first = list.querySelector('li:not(:first-child)');
      const measured = first ? first.getBoundingClientRect().height : rowHeight;
      const height = measured > 20 ? measured : rowHeight;
      if (Math.abs(height - rowHeight) > 0.5) setRowHeight(height);
      const top = list.getBoundingClientRect().top + window.scrollY;
      const start = Math.max(0, Math.floor((window.scrollY - top) / height) - 10);
      const end = Math.min(items.length, start + Math.ceil(window.innerHeight / height) + 30);
      setRange((r) => (r[0] === start && r[1] === end ? r : [start, end]));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [items, rowHeight]);
  const [start, end] = [Math.min(range[0], items.length), Math.min(Math.max(range[1], 40), items.length)];
  return (
    <section className="tile mt-[18px] px-[18px] pb-2 pt-3.5">
      {label && <h2 className="section-label">{label}</h2>}
      <ul ref={ref} className="rows" style={{ paddingTop: start * rowHeight, paddingBottom: (items.length - end) * rowHeight }}>
        {items.slice(start, end).map((item) => (
          <ListKey key={keyOf(item)}>{render(item)}</ListKey>
        ))}
      </ul>
    </section>
  );
}

function ListKey({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

type FilterKey = 'kind' | 'difficulty' | 'group' | 'phase' | 'level' | 'hours';

const PROJECT_FILTERS: { key: FilterKey; label: string; show: (value: string, seed: Atlas['seed']) => string }[] = [
  { key: 'kind', label: 'Kind', show: (v) => (v === 'curriculum' ? 'Curriculum' : KIND_LABEL[v as CatalogueKind] + 's') },
  { key: 'difficulty', label: 'Difficulty', show: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  { key: 'group', label: 'Topic or domain', show: (v) => groupLabel(v) },
  { key: 'phase', label: 'Phase', show: (v, seed) => phaseName(v, seed) },
  { key: 'level', label: 'Level', show: (v) => 'Level ' + v },
  { key: 'hours', label: 'Hours', show: (v) => HOUR_BUCKETS.find((b) => b.key === v)?.label ?? v },
];

function phaseName(id: string, seed: Atlas['seed']): string {
  const p = seed.phases.find((x) => x.id === id);
  return p ? 'Year ' + p.year + ' · ' + p.title : id;
}

function filterOptions(key: FilterKey, seed: Atlas['seed'], catalogue: readonly CatalogueEntry[]): { value: string; label: string }[] {
  switch (key) {
    case 'kind':
      return [...(['challenge', 'build', 'case'] as const).map((k) => ({ value: k, label: KIND_LABEL[k] + 's' })), { value: 'curriculum', label: 'Curriculum projects' }];
    case 'difficulty':
      return (['easy', 'medium', 'advanced'] as const).map((d) => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }));
    case 'group':
      return [...new Set(catalogue.map((e) => e.group))].sort().map((g) => ({ value: g, label: groupLabel(g) }));
    case 'phase':
      return seed.phases.map((p) => ({ value: p.id, label: phaseName(p.id, seed) }));
    case 'level':
      return [1, 2, 3, 4, 5].map((l) => ({ value: String(l), label: 'Level ' + l }));
    case 'hours':
      return HOUR_BUCKETS.map((b) => ({ value: b.key, label: b.label }));
  }
}

/**
 * Library: a search field, filter chips (type, then track and status), and one flat list of everything in the
 * plan. A row opens its details in a sheet; `/library/:id` is that sheet's address.
 */
export function Library({ openId }: { openId?: string }) {
  const atlas = useAtlas();
  // The Library's long tail (ATLAS-LIBRARY) loads right after the first screen; the Library waits for it.
  const library = useLibrary(true);
  const units = useUnits();
  const paperStates = usePaperStates();
  const certStates = useCertStates();
  const { query: params } = useLocation();
  const [query, setQuery] = useQueryParam('q');
  const [type, setType] = useQueryParam('type');
  const [track, setTrack] = useQueryParam('track');
  const [status, setStatus] = useQueryParam('status');
  const [paperId, setPaperId] = useQueryParam('paper');
  const [pathParam] = useQueryParam('path');
  // An old link to Electrical and embedded or Mechanical opens Engineering (ATLAS-LIBRARY).
  const pathId = pathParam ? (PATH_ALIASES[pathParam] ?? pathParam) : pathParam;
  const [draft, setDraft] = useState<string | null>(null);
  const [pickingTrack, setPickingTrack] = useState(false);
  const [adding, setAdding] = useState(false);
  // Library › Projects: the project filters, also in the URL.
  const [kind, setKind] = useQueryParam('kind');
  const [difficulty, setDifficulty] = useQueryParam('difficulty');
  const [group, setGroup] = useQueryParam('group');
  const [phaseParam, setPhase] = useQueryParam('phase');
  const [level, setLevel] = useQueryParam('level');
  const [hours, setHours] = useQueryParam('hours');
  // The shelves' and search's level and roadmap (MORE-RESOURCES, ATLAS-LIBRARY).
  const [paperLevel, setPaperLevel] = useQueryParam('lvl');
  const [roadmap, setRoadmap] = useQueryParam('roadmap');
  const [pickingRoadmap, setPickingRoadmap] = useState(false);
  const [picking, setPicking] = useState<null | 'kind' | 'difficulty' | 'group' | 'phase' | 'level' | 'hours'>(null);
  const catalogue = useCatalogueIndex();
  const events = useChallengeEvents();
  const solved = useMemo(() => solvedSet(events ?? []), [events]);

  const entries = useMemo(() => (atlas && paperStates && library ? buildEntries(atlas, units, paperStates, catalogue, solved) : []), [atlas, library, units, paperStates, catalogue, solved]);
  const index = useMemo(() => buildIndex(entries), [entries]);
  // A few thousand entries (ATLAS-LIBRARY): the search runs on a deferred query, so typing never waits for the results.
  const deferredQuery = useDeferredValue(query ?? '');
  const matched = useMemo(() => search(index, deferredQuery), [index, deferredQuery]);
  // The home's counts and line, once per change to the curriculum or the user's progress.
  const summary = useMemo(() => {
    if (!atlas) return null;
    const activeCount = inProgress(atlas.seed.resources, atlas.states, Infinity).length;
    const nextCount = upNext(buildPaths(atlas.seed, atlas.states), atlas.seed).length;
    return {
      counts: shelfCounts(atlas.seed, catalogue?.length ?? 0),
      homeSub: activeCount + ' in progress · ' + nextCount + ' up next · ' + Math.max(0, atlas.seed.resources.length - activeCount - nextCount) + ' more when you need them',
    };
  }, [atlas, catalogue]);

  if (!atlas || !paperStates || !certStates || !library || !summary) {
    return (
      <Screen title="Library">
        <Header title="Library" />
      </Screen>
    );
  }

  const { seed } = atlas;
  const text = draft ?? query ?? '';
  const projectFilter: LibraryFilter = {
    kind: kind as LibraryFilter['kind'],
    difficulty: difficulty as Difficulty | null,
    group,
    phaseId: phaseParam,
    level: level ? Number(level) : null,
    hours: hours as HourBucket | null,
  };
  const projectFiltersOn = Boolean(kind || difficulty || group || phaseParam || level || hours);
  const matchesProject = (e: Entry): boolean => !projectFiltersOn || (e.project ? matchesFilter(e.project, projectFilter) : false);
  const filtered = matched.filter(
    (e) => (!type || e.type === type) && (!track || e.tracks.includes(track)) && (!status || e.status === status) && (!paperLevel || e.level === paperLevel) && (!roadmap || e.roadmap === roadmap) && matchesProject(e),
  );
  // Every shelf but Projects reads by fit: in progress first, then priority, year and level (ATLAS-LIBRARY). Projects
  // keep their order: the plan's first, then the catalogue.
  const results = deferredQuery ? filtered : type === 'project' ? [...filtered].sort((a, b) => a.sortKey.localeCompare(b.sortKey)) : filtered;
  const trackName = seed.tracks.find((t) => t.id === track)?.name;
  const keep = params.toString();
  const open = (entry: Entry): void => {
    if (entry.kind === 'paper') setPaperId(entry.id, { replace: false });
    else if (entry.kind === 'catalogue' && entry.project?.kind === 'challenge') navigate('/challenge/' + entry.id);
    else navigate('/library/' + entry.id + (keep ? '?' + keep : ''));
  };
  const clear = (): void => {
    for (const set of [setQuery, setType, setTrack, setStatus, setKind, setDifficulty, setGroup, setPhase, setLevel, setHours, setPaperLevel, setRoadmap]) set(null);
    setDraft(null);
  };

  const shelf = (type as ShelfKey | null) ?? null;
  const filtersOn = Boolean(type || track || status || projectFiltersOn);
  // The deferred query switches home to results too, so the first keystroke only updates the field.
  const mode: 'home' | 'path' | 'search' | 'shelf' = pathId ? 'path' : deferredQuery && !filtersOn ? 'search' : filtersOn ? 'shelf' : 'home';
  const { counts, homeSub } = summary;
  const goShelf = (key: ShelfKey): void => navigate('/library?type=' + key + (query ? '&q=' + encodeURIComponent(query) : ''), { replace: false });

  const row = (entry: Entry): ReactNode => (
    <Row
      key={entry.kind + entry.id}
      height={60}
      truncate
      icon={
        entry.project ? (
          <KindIcon kind={entry.project.kind === 'curriculum' ? (entry.project.group === 'weekly' ? 'build' : 'case') : entry.project.kind} />
        ) : (
          <IconTile icon={SHELF_ICON[entry.type as ShelfKey] ?? 'course'} tone={entry.kind === 'paper' || entry.type === 'paper' || entry.type === 'blog' || entry.type === 'practice' ? 'ice' : 'blue'} />
        )
      }
      title={entry.title}
      meta={
        entry.project?.difficulty ? (
          <>
            <DifficultyDots difficulty={entry.project.difficulty} /> {entry.meta}
          </>
        ) : (
          entry.meta
        )
      }
      trailing={
        entry.trailing ? (
          <>
            {entry.status === 'done' && <StatusIcon status="done" />}
            <span className={entry.status === 'active' ? 'font-semibold text-blue-deep' : ''}>{entry.trailing}</span>
          </>
        ) : undefined
      }
      onClick={() => open(entry)}
    />
  );

  const searchField = (
    <SearchField
      className="mt-5"
      label={shelf ? 'Search ' + SHELF_TITLE[shelf].toLowerCase() : 'Search the library'}
      placeholder={shelf ? 'Search ' + SHELF_TITLE[shelf].toLowerCase() : 'Search courses, books, papers'}
      searchBox
      value={text}
      onChange={(v) => {
        setDraft(v);
        setQuery(v.trim() ? v : null);
      }}
    />
  );

  // Level and roadmap (ATLAS-LIBRARY): on every shelf but Projects, and on search.
  const roadmapName = seed.roadmaps.find((r) => r.id === roadmap)?.title;
  const fitChips = (
    <div className="mt-2">
      <Chips
        label="Level and roadmap"
        items={[
          ...LEVEL_CHIPS.map((chip) => ({ key: chip.key, label: chip.label, pressed: paperLevel === chip.key, onClick: () => setPaperLevel(paperLevel === chip.key ? null : chip.key) })),
          { key: 'roadmap', label: roadmapName ?? 'Roadmap', pressed: Boolean(roadmapName), chevron: true, onClick: () => setPickingRoadmap(true) },
        ]}
      />
    </div>
  );

  // A shelf's line: how many it holds and how many are active.
  const shelfTotal = shelf ? entries.filter((e) => e.type === shelf).length : entries.length;
  const shelfActive = shelf ? entries.filter((e) => e.type === shelf && e.status === 'active').length : 0;

  return (
    <Screen title="Library">
      {mode === 'path' && pathId === 'research' && <ResearchView atlas={atlas} onOpen={(id) => navigate('/library/' + id + (keep ? '?' + keep : ''))} onOpenPaper={(id) => setPaperId(id, { replace: false })} />}
      {mode === 'path' && pathId && pathId !== 'research' && <PathView atlas={atlas} pathId={pathId} onOpen={(id) => navigate('/library/' + id + (keep ? '?' + keep : ''))} onOpenPaper={(id) => setPaperId(id, { replace: false })} />}

      {/* Home and search share one header and one search box, so typing the first letter keeps focus. */}
      {(mode === 'home' || mode === 'search') && (
        <>
          <Header title="Library" sub={mode === 'home' ? homeSub : plural(results.length, 'match', 'matches')} />
          {searchField}
          {mode === 'search' && fitChips}
          {mode === 'home' ? (
            <LibraryHome
              atlas={atlas}
              units={units}
              counts={counts}
              today={today()}
              onOpen={(id) => navigate('/library/' + id)}
              onPath={(id) => navigate('/library?path=' + id, { replace: false })}
              onShelf={goShelf}
            />
          ) : results.length === 0 ? (
            <EmptyState action={<Button onClick={clear}>Clear filters</Button>}>No matches. Clear filters.</EmptyState>
          ) : (
            groupResults(results.map((e) => ({ ...e, shelf: e.type as ShelfKey }))).map((g) => (
              <RowList key={g.shelf} label={SHELF_TITLE[g.shelf] + ' · ' + g.total} className="mt-[18px]">
                {g.items.map((e) => row(e))}
                {g.total > g.items.length && <Row title={'Show all ' + g.total} chevron height={44} onClick={() => goShelf(g.shelf)} />}
              </RowList>
            ))
          )}
        </>
      )}

      {mode === 'shelf' && (
        <>
          <Header
            title={shelf ? SHELF_TITLE[shelf] : 'Library'}
            sub={shelf ? plural(shelfTotal, ...SHELF_NOUN[shelf]) + (shelfActive > 0 ? ' · ' + shelfActive + ' active' : '') : plural(results.length, 'match', 'matches')}
            back={<Button variant="icon" icon="chevronLeft" label="Back to the Library" to="/library" />}
          />
          {searchField}
          <div className="mt-3">
            <Chips
              label="Status and track"
              items={[
                ...STATUS_CHIPS.map((chip) => ({ key: chip.key, label: chip.label, pressed: status === chip.key, onClick: () => setStatus(status === chip.key ? null : chip.key) })),
                { key: 'track', label: trackName ?? 'Track', pressed: Boolean(trackName), chevron: true, onClick: () => setPickingTrack(true) },
              ]}
            />
          </div>
          {type !== 'project' && fitChips}
          {(type === 'project' || projectFiltersOn) && (
            <div className="mt-2">
              <Chips
                label="Project filters"
                items={PROJECT_FILTERS.map((f) => {
                  const value = { kind, difficulty, group, phase: phaseParam, level, hours }[f.key];
                  return { key: f.key, label: value ? f.show(value, seed) : f.label, pressed: Boolean(value), chevron: true, onClick: () => setPicking(f.key) };
                })}
              />
            </div>
          )}
          {results.length === 0 ? (
            <EmptyState action={<Button onClick={() => { for (const set of [setQuery, setTrack, setStatus, setKind, setDifficulty, setGroup, setPhase, setLevel, setHours, setPaperLevel, setRoadmap]) set(null); setDraft(null); }}>Clear filters</Button>}>No matches. Clear filters.</EmptyState>
          ) : (
            <VirtualList items={results} label={results.length + ' of ' + shelfTotal} keyOf={(entry) => entry.kind + entry.id} render={row} />
          )}
          {type !== 'project' && type !== 'paper' && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button icon="plus" onClick={() => setAdding(true)}>
                Add a resource
              </Button>
            </div>
          )}
        </>
      )}

      <ItemSheet atlas={atlas} id={openId ?? null} onClose={() => navigate('/library' + (keep ? '?' + keep : ''))} />
      <PaperSheet paper={paperId ? (seed.papers.find((p) => p.id === paperId) ?? null) : null} state={paperId ? paperStates.get(paperId) : undefined} onClose={() => setPaperId(null)} />
      <AddResourceSheet open={adding} onClose={() => setAdding(false)} seed={seed} />
      <PickerSheet
        open={pickingTrack}
        title="Track"
        searchLabel="Search tracks"
        value={track}
        clearLabel="Every track"
        options={seed.tracks.map((t) => ({ value: t.id, label: t.name, keywords: t.summary }))}
        onPick={(v) => setTrack(v)}
        onClose={() => setPickingTrack(false)}
      />
      <PickerSheet
        open={pickingRoadmap}
        title="Roadmap"
        searchLabel="Search roadmaps"
        value={roadmap}
        clearLabel="Every roadmap"
        options={seed.roadmaps.map((r) => ({ value: r.id, label: r.title + ' (roadmap.sh)' }))}
        onPick={(v) => setRoadmap(v)}
        onClose={() => setPickingRoadmap(false)}
      />
      {picking && (
        <PickerSheet
          open
          title={PROJECT_FILTERS.find((f) => f.key === picking)!.label}
          searchLabel={'Search ' + PROJECT_FILTERS.find((f) => f.key === picking)!.label.toLowerCase()}
          value={{ kind, difficulty, group, phase: phaseParam, level, hours }[picking]}
          clearLabel="Any"
          options={filterOptions(picking, seed, catalogue ?? [])}
          onPick={(v) => ({ kind: setKind, difficulty: setDifficulty, group: setGroup, phase: setPhase, level: setLevel, hours: setHours })[picking](v)}
          onClose={() => setPicking(null)}
        />
      )}
    </Screen>
  );
}
