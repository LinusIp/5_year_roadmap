import { useMemo, useState } from 'react';
import { FilterSelect, SearchBox } from '../components/FilterSelect.tsx';
import { Icon } from '../components/Icon.tsx';
import { EmptyState, Page } from '../components/Page.tsx';
import { TrackDot } from '../components/TrackDot.tsx';
import { setWeekPick, useWeekPick } from '../db/state.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import type { Atlas } from '../hooks/useAtlas.ts';
import { formatHours, formatShort, startOfWeek, today as todayDate } from '../lib/dates.ts';
import { hasRepo } from '../lib/projects.ts';
import { effectivePhase, suggestWeeklyBuild } from '../lib/schedule.ts';
import { buildIndex, search } from '../lib/search.ts';
import { adherence, weeklyStrip } from '../lib/shipping.ts';
import type { Project } from '../seed/schema.ts';
import type { ItemStatus } from '../db/types.ts';
import { Link, useQueryParam } from '../router/router.tsx';

const CADENCE_LABEL: Record<Project['cadence'], string> = { weekly: 'Weekly mini-builds', monthly: 'Monthly projects', capstone: 'Capstones' };
const STATUS_LABEL: Record<ItemStatus, string> = { todo: 'To do', active: 'In progress', done: 'Shipped', dropped: 'Dropped' };

/* ------------------------------------------------------------------ pick my next */

function PickNext({ atlas }: { atlas: Atlas }) {
  const asOf = todayDate();
  const weekStart = startOfWeek(asOf, atlas.settings.core.weekStartsOn);
  const pick = useWeekPick(weekStart);
  const [skip, setSkip] = useState(0);
  const phase = effectivePhase(asOf, atlas.seed.phases);
  const ctx = useMemo(() => ({ seed: atlas.seed, states: atlas.states }), [atlas]);
  const current = pick ? atlas.seed.projects.find((p) => p.id === pick.projectId) : undefined;
  const suggestion = suggestWeeklyBuild(phase, ctx, skip);
  const track = suggestion ? atlas.seed.tracks.find((t) => t.id === suggestion.tracks[0]) : undefined;

  return (
    <section className="card mb-4 p-4" aria-labelledby="pick-next">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="pick-next" className="text-sm font-semibold">
            This week&apos;s mini-build
          </h2>
          {current ? (
            <p className="mt-1 text-sm">
              <Link to={'/projects/' + current.id} className="font-medium text-accent-text hover:underline">
                {current.title}
              </Link>
              <span className="text-ink-3"> · picked for the week of {formatShort(weekStart)}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-3">Nothing picked yet: Today shows the top suggestion until you choose.</p>
          )}
        </div>
      </div>

      {suggestion ? (
        <div className="mt-3 rounded-lg border border-line bg-raised/40 p-3">
          <p className="eyebrow">Suggestion for {phase?.title ?? 'now'}</p>
          <div className="mt-1 flex items-start gap-2">
            <span className="mt-1.5">
              <TrackDot track={track} />
            </span>
            <div className="min-w-0 flex-1">
              <Link to={'/projects/' + suggestion.id} className="font-medium hover:text-accent-text">
                {suggestion.title}
              </Link>
              <p className="mt-0.5 text-sm text-ink-2">{suggestion.brief}</p>
              <p className="num mt-1 text-xs text-ink-3">
                {formatHours(suggestion.estHours * 60)} · {suggestion.tracks.map((t) => atlas.seed.tracks.find((x) => x.id === t)?.name ?? t).join(', ')}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                void setWeekPick(weekStart, suggestion.id);
                setSkip(0);
              }}
              disabled={current?.id === suggestion.id}
            >
              <Icon name="check" size={13} />
              {current?.id === suggestion.id ? "It's this week's" : "Make it this week's"}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setSkip((s) => s + 1)}>
              <Icon name="shuffle" size={13} />
              Pick my next project
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-3">Every weekly card is done. Add your own, or pull from the build-your-own-x list.</p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ shipping */

function Shipping({ atlas }: { atlas: Atlas }) {
  const asOf = todayDate();
  const planStart = atlas.seed.phases[0]!.start;
  const weekStartsOn = atlas.settings.core.weekStartsOn;
  const rows = (['weekly', 'monthly', 'capstone'] as const).map((c) => adherence(atlas.seed.projects, atlas.states, c, planStart, asOf, weekStartsOn));
  const strip = weeklyStrip(atlas.seed.projects, atlas.states, planStart, asOf, weekStartsOn);
  const periodName = { weekly: 'weeks', monthly: 'months', capstone: 'plan years' } as const;

  return (
    <section className="mb-4 grid gap-2 sm:grid-cols-3">
      {rows.map((row) => (
        <div key={row.cadence} className="card px-3 py-2.5">
          <div className="eyebrow">{CADENCE_LABEL[row.cadence]}</div>
          <div className="num mt-0.5 text-lg font-semibold">{row.shipped} shipped</div>
          <div className="text-xs text-ink-3">
            {row.periods > 0 ? (
              <>
                {row.hit} of {row.periods} {periodName[row.cadence]} with one
                {row.currentHit ? <span className="text-good-text"> · this one done</span> : null}
              </>
            ) : (
              'The plan has not started yet'
            )}
          </div>
          {row.cadence === 'weekly' && strip.length > 0 && (
            <div className="mt-2 flex gap-1" aria-label="Weekly mini-builds shipped, last 12 weeks">
              {strip.map((week) => (
                <span
                  key={week.weekStart}
                  title={'Week of ' + formatShort(week.weekStart) + ': ' + (week.shipped.length ? week.shipped.length + ' shipped' : 'none')}
                  className={'h-2.5 flex-1 rounded-sm ' + (week.shipped.length > 0 ? 'bg-accent-fill' : 'bg-raised')}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ the list */

function ProjectRow({ atlas, project }: { atlas: Atlas; project: Project }) {
  const state = atlas.states.get(project.id);
  const status = state?.status ?? 'todo';
  const track = atlas.seed.tracks.find((t) => t.id === project.tracks[0]);
  const phase = atlas.seed.phases.find((p) => p.id === project.phaseId);
  const ticked = state?.unitsDone.filter((u) => u.startsWith('criterion-')).length ?? 0;
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className="mt-1.5">
        <TrackDot track={track} />
      </span>
      <div className="min-w-0 flex-1">
        <Link to={'/projects/' + project.id} className="font-medium leading-snug hover:text-accent-text">
          {project.number !== undefined && <span className="num mr-1.5 text-ink-3">{project.number}.</span>}
          {project.title}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
          <span className="num">{formatHours(project.estHours * 60, 0)}</span>
          {phase && (
            <>
              <span aria-hidden="true">·</span>
              <span>{phase.title}</span>
            </>
          )}
          {ticked > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="num">
                {ticked}/{project.acceptance.length} criteria
              </span>
            </>
          )}
          {project.stage === 2 && project.parts && project.parts.length > 0 && <span className="chip px-1.5 text-[0.625rem]">needs parts</span>}
          {project.source?.startsWith('build-your-own-x') && <span className="chip px-1.5 text-[0.625rem]">build-your-own-x</span>}
          {hasRepo(state) && (
            <a href={state!.repoUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-accent-text hover:underline">
              <Icon name="branch" size={11} />
              repo
            </a>
          )}
        </div>
      </div>
      <span className={'chip shrink-0 ' + (status === 'done' ? 'text-good-text' : status === 'active' ? 'text-accent-text' : '')}>{STATUS_LABEL[status]}</span>
    </li>
  );
}

export function Projects() {
  const atlas = useAtlas();
  const [cadence, setCadence] = useQueryParam('cadence');
  const [stage, setStage] = useQueryParam('stage');
  const [track, setTrack] = useQueryParam('track');
  const [status, setStatus] = useQueryParam('status');
  const [query, setQuery] = useQueryParam('q');

  const index = useMemo(
    () => (atlas ? buildIndex(atlas.seed.projects.map((p) => ({ ...p, body: [p.brief, p.skills.join(' '), p.source ?? '', p.tracks.join(' ')].join(' ') }))) : []),
    [atlas],
  );

  if (!atlas) {
    return (
      <Page title="Projects">
        <p className="text-sm text-ink-3">Loading…</p>
      </Page>
    );
  }

  const statusOf = (p: Project): ItemStatus => atlas.states.get(p.id)?.status ?? 'todo';
  const matches = search(index, query ?? '').filter(
    (p) =>
      (!cadence || p.cadence === cadence) &&
      (!stage || String(p.stage) === stage) &&
      (!track || p.tracks.includes(track as never)) &&
      (!status || statusOf(p) === status),
  );
  const count = (pred: (p: Project) => boolean): number => atlas.seed.projects.filter(pred).length;
  const groups = (['capstone', 'monthly', 'weekly'] as const)
    .map((c) => ({ cadence: c, items: matches.filter((p) => p.cadence === c) }))
    .filter((g) => g.items.length > 0);

  return (
    <Page title="Projects" lead="Every week a mini-build, every month a project, every year a capstone. Shipped means pushed to a repository.">
      <PickNext atlas={atlas} />
      <Shipping atlas={atlas} />

      <div className="card mb-4 p-4">
        <SearchBox value={query ?? ''} onChange={(v) => setQuery(v || null)} placeholder="Search projects, skills and sources" />
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <FilterSelect
            label="Cadence"
            value={cadence ?? ''}
            onChange={(v) => setCadence(v || null)}
            options={(['weekly', 'monthly', 'capstone'] as const).map((c) => ({ value: c, label: CADENCE_LABEL[c], count: count((p) => p.cadence === c) }))}
          />
          <FilterSelect
            label="Stage"
            value={stage ?? ''}
            onChange={(v) => setStage(v || null)}
            options={[
              { value: '1', label: 'Stage 1: software', count: count((p) => p.stage === 1) },
              { value: '2', label: 'Stage 2: hardware', count: count((p) => p.stage === 2) },
            ]}
          />
          <FilterSelect label="Track" value={track ?? ''} onChange={(v) => setTrack(v || null)} options={atlas.seed.tracks.map((t) => ({ value: t.id, label: t.name, count: count((p) => p.tracks.includes(t.id)) }))} />
          <FilterSelect
            label="Status"
            value={status ?? ''}
            onChange={(v) => setStatus(v || null)}
            options={(['todo', 'active', 'done', 'dropped'] as const).map((s) => ({ value: s, label: STATUS_LABEL[s], count: count((p) => statusOf(p) === s) }))}
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon="projects" title="Nothing matches">
          Try another filter.
        </EmptyState>
      ) : (
        groups.map((group) => (
          <section key={group.cadence} className="mb-5">
            <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
              {CADENCE_LABEL[group.cadence]}
              <span className="num font-normal text-ink-3">{group.items.length}</span>
            </h2>
            <ul className="card divide-y divide-line">
              {group.items.map((project) => (
                <ProjectRow key={project.id} atlas={atlas} project={project} />
              ))}
            </ul>
          </section>
        ))
      )}
    </Page>
  );
}
