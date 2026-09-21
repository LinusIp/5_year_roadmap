import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon.tsx';
import { NotesEditor } from '../components/NotesEditor.tsx';
import { EmptyState, Page } from '../components/Page.tsx';
import { TrackChip } from '../components/TrackDot.tsx';
import { deleteCustomEntity, patchEntity, resetEntity } from '../db/edits.ts';
import { editItemState, setItemStatus, toggleUnit, useItemState } from '../db/state.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import type { Atlas } from '../hooks/useAtlas.ts';
import { formatHours, formatRange } from '../lib/dates.ts';
import { fractionDone } from '../lib/progress.ts';
import { hasRepo, repoLinkProblem, statusBlocker } from '../lib/projects.ts';
import { loadUnits } from '../seed/index.ts';
import type { AppResource, Project, Unit } from '../seed/schema.ts';
import type { ItemStatus, UserItemState } from '../db/types.ts';
import { Link, navigate } from '../router/router.tsx';

const STATUS_LABEL: Record<ItemStatus, string> = { todo: 'To do', active: 'In progress', done: 'Done', dropped: 'Dropped' };

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function StatusControl({ kind, refId, state }: { kind: 'resource' | 'project'; refId: string; state: UserItemState | undefined }) {
  const [message, setMessage] = useState<string | null>(null);
  const status = state?.status ?? 'todo';
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Status">
        {(['todo', 'active', 'done', 'dropped'] as const).map((s) => {
          const blocker = statusBlocker(kind, s, state);
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              className={'btn btn-sm' + (status === s ? ' btn-primary' : '')}
              aria-disabled={blocker !== null}
              title={blocker ?? undefined}
              onClick={() => {
                if (blocker) {
                  setMessage(blocker);
                  return;
                }
                setMessage(null);
                void setItemStatus(refId, s);
              }}
            >
              {STATUS_LABEL[s]}
            </button>
          );
        })}
      </div>
      {message && (
        <p role="alert" className="mt-2 text-sm text-warning-text">
          {message}
        </p>
      )}
    </div>
  );
}

function Checklist({ refId, unitsDone, units }: { refId: string; unitsDone: string[]; units: { id: string; title: string; url?: string; section?: string }[] }) {
  const done = new Set(unitsDone);
  let lastSection: string | undefined;
  return (
    <ul className="space-y-0.5">
      {units.map((unit) => {
        const showSection = unit.section && unit.section !== lastSection;
        lastSection = unit.section;
        return (
          <li key={unit.id}>
            {showSection && <p className="eyebrow mt-3">{unit.section}</p>}
            <label className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-sm hover:bg-raised">
              <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--accent-fill)]" checked={done.has(unit.id)} onChange={() => void toggleUnit(refId, unit.id)} />
              <span className={done.has(unit.id) ? 'text-ink-3 line-through' : ''}>{unit.title}</span>
              {unit.url && (
                <a href={unit.url} target="_blank" rel="noreferrer noopener" className="ml-auto shrink-0 text-ink-3 hover:text-accent-text" aria-label={'Open ' + unit.title}>
                  <Icon name="external" size={14} />
                </a>
              )}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function Placement({ atlas, refId }: { atlas: Atlas; refId: string }) {
  const items = atlas.seed.plan.filter((i) => (i.resourceId ?? i.projectId) === refId);
  if (items.length === 0) return <span className="text-ink-3">Not on the roadmap</span>;
  return (
    <>
      {items.map((item) => {
        const phase = atlas.seed.phases.find((p) => p.id === item.phaseId);
        const block = atlas.settings.core.blocks.find((b) => b.id === item.block);
        return (
          <Link key={item.id} to="/roadmap" className="block text-accent-text hover:underline">
            {phase?.title} · Block {item.block} ({block?.name}){phase ? ', ' + formatRange(phase.start, phase.end) : ''}
          </Link>
        );
      })}
    </>
  );
}

function UrlField({ label, value, onSave, placeholder }: { label: string; value: string | undefined; onSave: (v: string) => void; placeholder: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value ?? '';
  const problem = repoLinkProblem(text);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="flex gap-1.5">
        <input
          className="input"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft === null) return;
            if (!repoLinkProblem(draft)) onSave(draft.trim());
            if (!repoLinkProblem(draft)) setDraft(null);
          }}
          aria-invalid={problem ? true : undefined}
        />
        {value && !problem && (
          <a href={value} target="_blank" rel="noreferrer noopener" className="btn btn-icon shrink-0" aria-label={'Open ' + label}>
            <Icon name="external" size={15} />
          </a>
        )}
      </div>
      {problem && <span className="mt-1 block text-xs text-critical-text">{problem}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ a resource */

function ResourceView({ atlas, resource }: { atlas: Atlas; resource: AppResource }) {
  const state = useItemState(resource.id);
  const [units, setUnits] = useState<Unit[] | null>(null);
  useEffect(() => {
    let live = true;
    void loadUnits(resource.id).then((list) => live && setUnits(list));
    return () => {
      live = false;
    };
  }, [resource.id]);

  const isCustom = !atlas.original.resources.some((r) => r.id === resource.id);
  const edited = !isCustom && JSON.stringify(atlas.original.resources.find((r) => r.id === resource.id)) !== JSON.stringify(resource);
  const subject = atlas.seed.subjects.find((s) => s.id === resource.subject);
  const unitsDone = state?.unitsDone ?? [];
  const fraction = fractionDone(state?.status ?? 'todo', unitsDone.length, resource.unitCount);
  const [editingHours, setEditingHours] = useState(false);

  return (
    <Page
      title={resource.title}
      lead={resource.provider}
      actions={
        resource.url ? (
          <a href={resource.url} target="_blank" rel="noreferrer noopener" className="btn btn-primary">
            <Icon name="external" size={15} />
            Open
          </a>
        ) : resource.searchHint ? (
          <a href={'https://duckduckgo.com/?q=' + encodeURIComponent(resource.searchHint)} target="_blank" rel="noreferrer noopener" className="btn">
            <Icon name="search" size={15} />
            Find link
          </a>
        ) : null
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {resource.summary && <p className="text-sm text-ink-2">{resource.summary}</p>}
          {resource.url === null && (
            <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
              <p className="font-medium text-warning-text">No verified link yet</p>
              <p className="mt-0.5 text-ink-2">
                Search for <span className="font-mono text-ink">{resource.searchHint}</span>, then paste the link in with Edit.
              </p>
            </div>
          )}

          <section className="card p-4">
            <h2 className="mb-2 text-sm font-semibold">Status</h2>
            <StatusControl kind="resource" refId={resource.id} state={state} />
            {resource.unitCount > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                    <div className="h-full rounded-full bg-accent-fill" style={{ width: Math.round(fraction * 100) + '%' }} />
                  </div>
                  <span className="num text-xs text-ink-3">
                    {unitsDone.length}/{resource.unitCount}
                  </span>
                </div>
              </div>
            )}
          </section>

          {resource.unitCount > 0 && (
            <section className="card p-4">
              <h2 className="mb-2 text-sm font-semibold">
                Checklist <span className="num font-normal text-ink-3">· {resource.unitCount}</span>
              </h2>
              {units ? <Checklist refId={resource.id} unitsDone={unitsDone} units={units} /> : <p className="text-sm text-ink-3">Loading…</p>}
            </section>
          )}

          <section className="card p-4">
            {state && <NotesEditor
              label="Notes"
              value={state?.notes}
              placeholder="What you learned, what to come back to, links worth keeping."
              onSave={(notes) =>
                void editItemState(resource.id, (s) => {
                  const next = { ...s };
                  if (notes.trim()) next.notes = notes;
                  else delete next.notes;
                  return next;
                })
              }
            />}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card p-4">
            <dl className="grid grid-cols-2 gap-3">
              <Fact label="Type">{resource.type}</Fact>
              <Fact label="Level">{resource.level}</Fact>
              <Fact label="Cost">{resource.cost === 'audit-free' ? 'free to audit' : resource.cost}</Fact>
              <Fact label="Estimated">
                {editingHours ? (
                  <input
                    className="input num h-7 w-20 px-2 text-sm"
                    style={{ minHeight: '1.75rem' }}
                    defaultValue={resource.estHours}
                    aria-label="Estimated hours"
                    // eslint-disable-next-line jsx-a11y/no-autofocus -- appears only after the user asks to edit
                    autoFocus
                    onBlur={(e) => {
                      const hours = Number(e.target.value);
                      if (Number.isFinite(hours) && hours >= 0 && hours <= 2000) void patchEntity('resource', resource.id, { estHours: hours });
                      setEditingHours(false);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                ) : (
                  <button type="button" className="num hover:text-accent-text" onClick={() => setEditingHours(true)} title="Estimates are yours to change">
                    {formatHours(resource.estHours * 60, 0)} <Icon name="edit" size={11} className="inline text-ink-3" />
                  </button>
                )}
              </Fact>
            </dl>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {resource.tracks.map((t) => (
                <TrackChip key={t} track={atlas.seed.tracks.find((x) => x.id === t)} />
              ))}
            </div>
          </section>

          <section className="card p-4">
            <dl className="space-y-3">
              <Fact label="On the roadmap">
                <Placement atlas={atlas} refId={resource.id} />
              </Fact>
              {resource.prerequisites.length > 0 && (
                <Fact label="Needs first">
                  <ul>
                    {resource.prerequisites.map((id) => {
                      const pre = atlas.seed.resources.find((r) => r.id === id);
                      const preDone = atlas.states.get(id)?.status === 'done';
                      return (
                        <li key={id}>
                          <Link to={'/library/' + id} className="text-accent-text hover:underline">
                            {pre?.title ?? id}
                          </Link>
                          {preDone && <Icon name="check" size={12} className="ml-1 inline text-good-text" />}
                        </li>
                      );
                    })}
                  </ul>
                </Fact>
              )}
              {subject && (
                <Fact label="Counts towards">
                  <Link to={'/certs?subject=' + subject.id} className="text-accent-text hover:underline">
                    {subject.title}
                  </Link>
                </Fact>
              )}
              {resource.lastVerified && <Fact label="Link checked">{resource.lastVerified}</Fact>}
            </dl>
          </section>

          {(isCustom || edited) && (
            <section className="card p-4">
              {isCustom ? (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (!window.confirm('Delete "' + resource.title + '" from your library? Your notes and progress on it go too.')) return;
                    void deleteCustomEntity('resource', resource.id).then(() => navigate('/library'));
                  }}
                >
                  <Icon name="trash" size={13} />
                  Delete this resource
                </button>
              ) : (
                <button type="button" className="btn btn-sm" onClick={() => void resetEntity('resource', resource.id)}>
                  <Icon name="refresh" size={13} />
                  Undo my edits to this resource
                </button>
              )}
            </section>
          )}
        </aside>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ a project */

function ProjectView({ atlas, project }: { atlas: Atlas; project: Project }) {
  const state = useItemState(project.id);
  const ticked = new Set(state?.unitsDone ?? []);
  const save = (change: (s: UserItemState) => UserItemState): void => void editItemState(project.id, change);
  const setField = (key: 'repoUrl' | 'demoUrl' | 'writeUp' | 'partsNotes' | 'budget', value: string): void =>
    save((s) => {
      const next = { ...s };
      if (value.trim()) next[key] = value;
      else delete next[key];
      // Clearing the repository of a finished project reopens it: the rule has to keep holding.
      if (key === 'repoUrl' && !value.trim() && next.status === 'done') next.status = 'active';
      return next;
    });
  const phase = atlas.seed.phases.find((p) => p.id === project.phaseId);

  return (
    <Page
      title={project.title}
      lead={
        <span>
          {project.cadence === 'weekly' ? 'Weekly mini-build' : project.cadence === 'monthly' ? 'Monthly project' : 'Capstone'}
          {project.number !== undefined && ' · No. ' + project.number}
          {phase && ' · ' + phase.title}
          {' · ' + formatHours(project.estHours * 60, 0)}
        </span>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-2">{project.brief}</p>

          <section className="card p-4">
            <h2 className="mb-2 text-sm font-semibold">Done when</h2>
            <ul className="space-y-1">
              {project.acceptance.map((criterion, index) => {
                const id = 'criterion-' + (index + 1);
                return (
                  <li key={id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-sm hover:bg-raised">
                      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--accent-fill)]" checked={ticked.has(id)} onChange={() => void toggleUnit(project.id, id)} />
                      <span className={ticked.has(id) ? 'text-ink-3 line-through' : ''}>{criterion}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card space-y-3 p-4">
            <h2 className="text-sm font-semibold">Ship it</h2>
            <UrlField label="Repository" value={state?.repoUrl} placeholder="https://github.com/you/project" onSave={(v) => setField('repoUrl', v)} />
            <UrlField label="Demo" value={state?.demoUrl} placeholder="Optional: a live demo, video or itch.io page" onSave={(v) => setField('demoUrl', v)} />
            {state && <NotesEditor label="Write-up" value={state.writeUp} placeholder="What you built, the hard part, and what the numbers were." onSave={(v) => setField('writeUp', v)} />}
          </section>

          {project.stage === 2 && (
            <section className="card space-y-3 p-4">
              <h2 className="text-sm font-semibold">Parts and budget</h2>
              {project.parts && project.parts.length > 0 ? (
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-2">
                  {project.parts.map((part) => (
                    <li key={part}>{part}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">Nothing to buy: this one runs on the computer you already have.</p>
              )}
              {state && (
                <label className="block">
                  <span className="label">Budget</span>
                  <input className="input" defaultValue={state.budget ?? ''} placeholder="What you plan to spend, and what you spent" onBlur={(e) => setField('budget', e.target.value)} />
                </label>
              )}
              {state && <NotesEditor label="What you bought" value={state.partsNotes} rows={3} placeholder="Part numbers, suppliers, prices." onSave={(v) => setField('partsNotes', v)} />}
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="card p-4">
            <h2 className="mb-2 text-sm font-semibold">Status</h2>
            <StatusControl kind="project" refId={project.id} state={state} />
            {!hasRepo(state) && <p className="mt-2 text-xs text-ink-3">Add the repository link to be able to mark it done.</p>}
          </section>
          <section className="card p-4">
            <dl className="space-y-3">
              <Fact label="On the roadmap">
                <Placement atlas={atlas} refId={project.id} />
              </Fact>
              {project.skills.length > 0 && <Fact label="Skills">{project.skills.join(', ')}</Fact>}
              {project.source && (
                <Fact label="Source">
                  {project.sourceUrl ? (
                    <a href={project.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-accent-text hover:underline">
                      {project.source}
                    </a>
                  ) : (
                    project.source
                  )}
                </Fact>
              )}
            </dl>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {project.tracks.map((t) => (
                <TrackChip key={t} track={atlas.seed.tracks.find((x) => x.id === t)} />
              ))}
            </div>
          </section>
        </aside>
      </div>
    </Page>
  );
}

export function ItemDetail({ id }: { id: string }) {
  const atlas = useAtlas();
  if (!atlas) {
    return (
      <Page title="Loading…">
        <p className="text-sm text-ink-3">Loading…</p>
      </Page>
    );
  }
  const resource = atlas.seed.resources.find((r) => r.id === id);
  if (resource) return <ResourceView atlas={atlas} resource={resource} />;
  const project = atlas.seed.projects.find((p) => p.id === id);
  if (project) return <ProjectView atlas={atlas} project={project} />;
  return (
    <Page title="Not in the library">
      <EmptyState icon="library" title="No item with that id" action={<Link to="/library" className="btn btn-primary">Open the library</Link>}>
        It may have been renamed or removed from the curriculum. Your notes on it are kept under the old id.
      </EmptyState>
    </Page>
  );
}
