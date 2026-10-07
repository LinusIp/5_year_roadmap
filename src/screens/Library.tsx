import { useMemo, useState } from 'react';
import { useCertStates } from '../db/credentials.ts';
import { usePaperStates } from '../db/state.ts';
import type { ItemStatus, PaperStatus } from '../db/types.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import type { Atlas } from '../hooks/useAtlas.ts';
import { useUnits } from '../hooks/useUnits.ts';
import { defaultCertStatus } from '../lib/credentials.ts';
import { monthName, today } from '../lib/dates.ts';
import { buildIndex, search } from '../lib/search.ts';
import { navigate, useLocation, useQueryParam } from '../router/router.tsx';
import type { Unit } from '../seed/schema.ts';
import { Chips } from '../ui/Chips.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Header } from '../ui/Header.tsx';
import { Button } from '../ui/Button.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { TextField } from '../ui/TextField.tsx';
import { AddResourceSheet } from './library/AddResourceSheet.tsx';
import { ItemSheet } from './parts/ItemSheet.tsx';
import { PickerSheet } from './parts/PickerSheet.tsx';
import { partOf, plural, shortTitle, unitShort } from './parts/text.ts';
import { PaperSheet } from './plan/PapersView.tsx';

const TYPE_CHIPS: { key: string; label: string }[] = [
  { key: 'course', label: 'Courses' },
  { key: 'book', label: 'Books' },
  { key: 'paper', label: 'Papers' },
  { key: 'article', label: 'Articles' },
  { key: 'lectures', label: 'Lectures' },
  { key: 'tutorial', label: 'Tutorials' },
  { key: 'repo', label: 'Repositories' },
  { key: 'cert', label: 'Certifications' },
  { key: 'project', label: 'Projects' },
];
const STATUS_CHIPS: { key: ItemStatus; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'todo', label: 'To do' },
  { key: 'done', label: 'Done' },
  { key: 'dropped', label: 'Dropped' },
];
const PAPER_AS_ITEM: Record<PaperStatus, ItemStatus> = { queued: 'todo', reading: 'active', read: 'done', implemented: 'done' };
const PAPER_LABEL: Record<PaperStatus, string> = { queued: '', reading: 'Reading', read: 'Read', implemented: 'Implemented' };
const CADENCE: Record<string, string> = { weekly: 'Weekly build', monthly: 'Monthly project', capstone: 'Capstone' };
const PAGE = 60;

interface Entry {
  kind: 'resource' | 'project' | 'paper';
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
}

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

function buildEntries(atlas: Atlas, units: Record<string, Unit[]> | undefined, paperStates: Map<string, { status: PaperStatus }>): Entry[] {
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
    return monthName(Number(m) - 1) + (y === thisYear ? '' : ' ' + y);
  };
  const trailingFor = (ref: string, status: ItemStatus): string => (status === 'active' ? 'Active' : status === 'done' ? 'Done' : status === 'dropped' ? 'Dropped' : when(ref));
  const sortFor = (ref: string, status: ItemStatus, title: string): string =>
    (status === 'active' ? '0' : status === 'todo' && startOf.has(ref) ? '1' + startOf.get(ref) : status === 'todo' ? '2' : '3') + title.toLowerCase();

  const resources: Entry[] = seed.resources.map((r) => {
    const state = states.get(r.id);
    const status = state?.status ?? 'todo';
    return {
      kind: 'resource',
      id: r.id,
      title: shortTitle(r.title),
      body: [r.title, r.provider, r.summary ?? '', r.tracks.join(' '), r.type, state?.notes ?? ''].join(' '),
      type: r.type,
      tracks: r.tracks,
      status,
      meta: [r.provider, r.estHours > 0 ? r.estHours + ' h' : null, progressOf(r.id, state?.unitsDone ?? [], units)].filter(Boolean).join(' · '),
      trailing: trailingFor(r.id, status),
      sortKey: sortFor(r.id, status, r.title),
    };
  });
  const projects: Entry[] = seed.projects.map((p) => {
    const state = states.get(p.id);
    const status = state?.status ?? 'todo';
    return {
      kind: 'project',
      id: p.id,
      title: shortTitle(p.title),
      body: [p.title, p.brief, p.skills.join(' '), p.source ?? '', p.tracks.join(' '), state?.notes ?? ''].join(' '),
      type: 'project',
      tracks: p.tracks,
      status,
      meta: [CADENCE[p.cadence], partOf(p.title), p.estHours + ' h'].filter(Boolean).join(' · '),
      trailing: trailingFor(p.id, status),
      sortKey: sortFor(p.id, status, p.title),
    };
  });
  const papers: Entry[] = seed.papers.map((p) => {
    const paperStatus = paperStates.get(p.id)?.status ?? 'queued';
    const status = PAPER_AS_ITEM[paperStatus];
    return {
      kind: 'paper',
      id: p.id,
      title: p.title,
      body: [p.authors ?? '', p.note ?? '', String(p.year ?? '')].join(' '),
      type: 'paper',
      tracks: p.tracks,
      status,
      meta: [p.authors, p.year].filter(Boolean).join(' · '),
      trailing: PAPER_LABEL[paperStatus],
      sortKey: (status === 'active' ? '0' : status === 'todo' ? '2' : '3') + p.title.toLowerCase(),
    };
  });
  return [...resources, ...projects, ...papers];
}

/**
 * Library: a search field, filter chips (type, then track and status), and one flat list of everything in the
 * plan. A row opens its details in a sheet; `/library/:id` is that sheet's address.
 */
export function Library({ openId }: { openId?: string }) {
  const atlas = useAtlas();
  const units = useUnits();
  const paperStates = usePaperStates();
  const certStates = useCertStates();
  const { query: params } = useLocation();
  const [query, setQuery] = useQueryParam('q');
  const [type, setType] = useQueryParam('type');
  const [track, setTrack] = useQueryParam('track');
  const [status, setStatus] = useQueryParam('status');
  const [paperId, setPaperId] = useQueryParam('paper');
  const [draft, setDraft] = useState<string | null>(null);
  const [pickingTrack, setPickingTrack] = useState(false);
  const [adding, setAdding] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const entries = useMemo(() => (atlas && paperStates ? buildEntries(atlas, units, paperStates) : []), [atlas, units, paperStates]);
  const index = useMemo(() => buildIndex(entries), [entries]);

  if (!atlas || !paperStates || !certStates) {
    return (
      <Screen title="Library">
        <Header title="Library" />
      </Screen>
    );
  }

  const { seed } = atlas;
  const text = draft ?? query ?? '';
  const filtered = search(index, query ?? '').filter((e) => (!type || e.type === type) && (!track || e.tracks.includes(track)) && (!status || e.status === status));
  const results = query ? filtered : [...filtered].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  const queued = seed.papers.filter((p) => (paperStates.get(p.id)?.status ?? 'queued') === 'queued').length;
  const certsPlanned = seed.certs.filter((c) => (certStates.get(c.id)?.status ?? defaultCertStatus(c)) === 'planned').length;
  const trackName = seed.tracks.find((t) => t.id === track)?.name;
  const keep = params.toString();
  const open = (entry: Entry): void => {
    if (entry.kind === 'paper') setPaperId(entry.id, { replace: false });
    else navigate('/library/' + entry.id + (keep ? '?' + keep : ''));
  };
  const clear = (): void => {
    for (const set of [setQuery, setType, setTrack, setStatus]) set(null);
    setDraft(null);
  };

  return (
    <Screen title="Library">
      <Header
        title="Library"
        sub={plural(seed.resources.length, 'resource') + ' · ' + plural(queued, 'paper') + ' queued · ' + plural(certsPlanned, 'credential') + ' planned'}
        actions={<Button variant="icon" icon="plus" label="Add a resource" onClick={() => setAdding(true)} />}
      />

      <TextField
        label="Search courses, books, papers"
        type="search"
        searchBox
        value={text}
        onChange={(v) => {
          setDraft(v);
          setQuery(v.trim() ? v : null);
          setShown(PAGE);
        }}
      />

      <div className="mt-3 space-y-2">
        <Chips
          label="Type"
          items={TYPE_CHIPS.map((chip) => ({
            key: chip.key,
            label: chip.label,
            count: entries.filter((e) => e.type === chip.key).length,
            pressed: type === chip.key,
            onClick: () => setType(type === chip.key ? null : chip.key),
          })).filter((chip) => chip.count > 0)}
        />
        <Chips
          label="Track and status"
          items={[
            { key: 'track', label: trackName ?? 'Track', pressed: Boolean(trackName), onClick: () => setPickingTrack(true) },
            ...STATUS_CHIPS.map((chip) => ({ key: chip.key, label: chip.label, pressed: status === chip.key, onClick: () => setStatus(status === chip.key ? null : chip.key) })),
          ]}
        />
      </div>

      {results.length === 0 ? (
        <EmptyState action={<Button onClick={clear}>Clear the search and filters</Button>}>Nothing matches. Try fewer words, or a different filter.</EmptyState>
      ) : (
        <RowList flat className="mt-5" label={query || type || track || status ? plural(results.length, 'match', 'matches') : undefined}>
          {results.slice(0, shown).map((entry) => (
            <Row key={entry.kind + entry.id} title={entry.title} meta={entry.meta} trailing={entry.trailing ? <span className={entry.status === 'active' ? 'text-accent' : ''}>{entry.trailing}</span> : undefined} onClick={() => open(entry)} />
          ))}
          {results.length > shown && <Row title={'Show ' + Math.min(PAGE, results.length - shown) + ' more'} meta={results.length - shown + ' not shown yet'} onClick={() => setShown((n) => n + PAGE)} />}
        </RowList>
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
    </Screen>
  );
}
