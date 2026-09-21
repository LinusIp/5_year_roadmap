import { useMemo, useState } from 'react';
import { FilterSelect, SearchBox } from '../components/FilterSelect.tsx';
import { Icon } from '../components/Icon.tsx';
import { EmptyState, Page } from '../components/Page.tsx';
import { TrackDot } from '../components/TrackDot.tsx';
import { AddResourceDialog } from '../components/AddResourceDialog.tsx';
import { useAtlas } from '../hooks/useAtlas.ts';
import { formatHours } from '../lib/dates.ts';
import { buildIndex, search } from '../lib/search.ts';
import { COSTS, LEVELS, RESOURCE_TYPES } from '../seed/schema.ts';
import type { AppResource } from '../seed/schema.ts';
import type { ItemStatus } from '../db/types.ts';
import { Link, useQueryParam } from '../router/router.tsx';

const TYPE_LABEL: Record<string, string> = {
  course: 'Course',
  lectures: 'Lecture series',
  book: 'Book',
  tutorial: 'Tutorial',
  article: 'Article',
  paper: 'Paper',
  repo: 'Repository',
  cert: 'Certification',
};
const COST_LABEL: Record<string, string> = { free: 'Free', 'audit-free': 'Free to audit', paid: 'Paid' };
const LEVEL_LABEL: Record<string, string> = { intro: 'Intro', intermediate: 'Intermediate', advanced: 'Advanced' };
const STATUS_LABEL: Record<ItemStatus, string> = { todo: 'To do', active: 'In progress', done: 'Done', dropped: 'Dropped' };

export function Library() {
  const atlas = useAtlas();
  const [query, setQuery] = useQueryParam('q');
  const [type, setType] = useQueryParam('type');
  const [track, setTrack] = useQueryParam('track');
  const [provider, setProvider] = useQueryParam('provider');
  const [level, setLevel] = useQueryParam('level');
  const [cost, setCost] = useQueryParam('cost');
  const [status, setStatus] = useQueryParam('status');
  const [adding, setAdding] = useState(false);

  const index = useMemo(() => {
    if (!atlas) return [];
    return buildIndex(
      atlas.seed.resources.map((r) => ({
        ...r,
        body: [r.provider, r.summary ?? '', r.tracks.join(' '), r.type, atlas.states.get(r.id)?.notes ?? ''].join(' '),
      })),
    );
  }, [atlas]);

  if (!atlas) {
    return (
      <Page title="Library">
        <p className="text-sm text-ink-3">Loading…</p>
      </Page>
    );
  }

  const planned = new Set(atlas.seed.plan.map((i) => i.resourceId));
  const statusOf = (r: AppResource): ItemStatus => atlas.states.get(r.id)?.status ?? 'todo';

  const results = search(index, query ?? '').filter(
    (r) =>
      (!type || r.type === type) &&
      (!track || r.tracks.includes(track as never)) &&
      (!provider || r.provider === provider) &&
      (!level || r.level === level) &&
      (!cost || r.cost === cost) &&
      (!status || statusOf(r) === status),
  );

  const providers = [...new Set(atlas.seed.resources.map((r) => r.provider))].sort((a, b) => a.localeCompare(b));
  const count = (pred: (r: AppResource) => boolean): number => atlas.seed.resources.filter(pred).length;
  const anyFilter = Boolean(query || type || track || provider || level || cost || status);
  const clear = (): void => {
    for (const set of [setQuery, setType, setTrack, setProvider, setLevel, setCost, setStatus]) set(null);
  };

  return (
    <Page
      title="Library"
      lead="Every course, book, lecture series and repository in the plan, and anything you add."
      actions={
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" size={15} />
          Add resource
        </button>
      }
    >
      <div className="card mb-4 p-4">
        <SearchBox value={query ?? ''} onChange={(v) => setQuery(v || null)} placeholder="Search titles, providers, summaries and your notes" />
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <FilterSelect label="Type" value={type ?? ''} onChange={(v) => setType(v || null)} options={RESOURCE_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] ?? t, count: count((r) => r.type === t) })).filter((o) => o.count > 0)} />
          <FilterSelect label="Track" value={track ?? ''} onChange={(v) => setTrack(v || null)} options={atlas.seed.tracks.map((t) => ({ value: t.id, label: t.name, count: count((r) => r.tracks.includes(t.id)) }))} />
          <FilterSelect label="Provider" value={provider ?? ''} onChange={(v) => setProvider(v || null)} options={providers.map((p) => ({ value: p, label: p, count: count((r) => r.provider === p) }))} />
          <FilterSelect label="Level" value={level ?? ''} onChange={(v) => setLevel(v || null)} options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] ?? l, count: count((r) => r.level === l) }))} />
          <FilterSelect label="Cost" value={cost ?? ''} onChange={(v) => setCost(v || null)} options={COSTS.map((c) => ({ value: c, label: COST_LABEL[c] ?? c, count: count((r) => r.cost === c) }))} />
          <FilterSelect label="Status" value={status ?? ''} onChange={(v) => setStatus(v || null)} options={(['todo', 'active', 'done', 'dropped'] as const).map((s) => ({ value: s, label: STATUS_LABEL[s], count: count((r) => statusOf(r) === s) }))} />
        </div>
        <p className="mt-3 flex items-center justify-between gap-2 text-xs text-ink-3">
          <span className="num">
            {results.length} of {atlas.seed.resources.length}
          </span>
          {anyFilter && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
              Clear filters
            </button>
          )}
        </p>
      </div>

      {results.length === 0 ? (
        <EmptyState icon="search" title="Nothing matches" action={<button type="button" className="btn" onClick={clear}>Clear filters</button>}>
          Try fewer words, or a different filter.
        </EmptyState>
      ) : (
        <ul className="card divide-y divide-line">
          {results.map((resource) => {
            const itemStatus = statusOf(resource);
            const track = atlas.seed.tracks.find((t) => t.id === resource.tracks[0]);
            return (
              <li key={resource.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-1.5">
                  <TrackDot track={track} />
                </span>
                <div className="min-w-0 flex-1">
                  <Link to={'/library/' + resource.id} className="font-medium leading-snug hover:text-accent-text">
                    {resource.title}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
                    <span>{resource.provider}</span>
                    <span aria-hidden="true">·</span>
                    <span>{TYPE_LABEL[resource.type]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{LEVEL_LABEL[resource.level]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{COST_LABEL[resource.cost]}</span>
                    {resource.estHours > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="num">{formatHours(resource.estHours * 60, 0)}</span>
                      </>
                    )}
                    {resource.reference && <span className="chip px-1.5 text-[0.625rem]">reference</span>}
                    {resource.stretch && <span className="chip px-1.5 text-[0.625rem]">stretch</span>}
                    {planned.has(resource.id) && <span className="chip px-1.5 text-[0.625rem]">on the roadmap</span>}
                    {resource.url === null && (
                      <span className="chip border-warning/50 px-1.5 text-[0.625rem] text-warning-text">find link</span>
                    )}
                  </div>
                </div>
                <span className={'chip shrink-0 ' + (itemStatus === 'done' ? 'text-good-text' : itemStatus === 'active' ? 'text-accent-text' : '')}>
                  {STATUS_LABEL[itemStatus]}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <AddResourceDialog open={adding} onClose={() => setAdding(false)} seed={atlas.seed} />
    </Page>
  );
}
