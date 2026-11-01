import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { deleteCustomEntity, patchEntity, resetEntity } from '../../db/edits.ts';
import { editItemState, setItemStatus, useItemState } from '../../db/state.ts';
import type { ItemStatus, UserItemState } from '../../db/types.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { monthName, today } from '../../lib/dates.ts';
import { isCertificate } from '../../lib/quick-filters.ts';
import { fractionDone, itemProgress } from '../../lib/progress.ts';
import { hasRepo, repoLinkProblem, statusBlocker } from '../../lib/projects.ts';
import { loadCatalogue, loadUnits } from '../../seed/index.ts';
import type { CatalogueItem } from '../../seed/catalogue.ts';
import { CatalogueBody } from './CatalogueBody.tsx';
import type { AppResource, Project, Unit } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { ProgressLine } from '../../ui/ProgressLine.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { ScenePanel } from '../../ui/ScenePanel.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { Checklist, criteriaUnits } from './Checklist.tsx';
import { LessonList, lessonLabel } from './LessonChecklist.tsx';
import { checklistMeta, currentUnit, isChecklist } from '../../lib/checklist.ts';
import { planDocModel, useProjectDoc } from './PlanDoc.tsx';
import { TechDoc, useDesign } from './TechDoc.tsx';
import { Markdown } from '../../lib/markdown.tsx';
import { NotesField } from './NotesField.tsx';
import { RunningTime } from './RunningTime.tsx';
import { StatusPill } from './StatusPill.tsx';
import { AddToPlanSheet } from '../plan/EditSheets.tsx';
import { blockShort, longDate, plural } from './text.ts';
import { pathOf, RESEARCH, shelfOf } from '../../lib/library-home.ts';
import { SHELF_ICON } from '../library/Home.tsx';
import { laneSlot } from '../../lib/scenes.ts';
import { minutesForRef } from '../../lib/logs.ts';
import { Icon } from '../../ui/Icon.tsx';

export const ITEM_STATUSES: { value: ItemStatus; label: string }[] = [
  { value: 'todo', label: 'To do' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
  { value: 'dropped', label: 'Dropped' },
];

const CADENCE: Record<Project['cadence'], string> = { weekly: 'Weekly build', monthly: 'Monthly project', research: 'Research', capstone: 'Capstone' };

/** A status pill for a resource or project, with the rule that a project is only done once it has a repository. */
export function ItemStatusPill({ kind, refId, title, state }: { kind: 'resource' | 'project'; refId: string; title: string; state: UserItemState | undefined }) {
  return (
    <StatusPill
      label={'Status of ' + title}
      value={state?.status ?? 'todo'}
      options={ITEM_STATUSES}
      onChange={(s) => void setItemStatus(refId, s)}
      blocked={(s) => statusBlocker(kind, s, state)}
    />
  );
}

/** "Year 1 · In flight · Block A, Gamedev": where an item sits on the plan, and "Add to the plan". */
function Placement({ atlas, refId }: { atlas: Atlas; refId: string }) {
  const [adding, setAdding] = useState(false);
  const items = atlas.seed.plan.filter((i) => (i.resourceId ?? i.projectId) === refId);
  return (
    <>
      {items.length === 0 && <Row title="Not on the plan" />}
      {items.map((item) => {
        const phase = atlas.seed.phases.find((p) => p.id === item.phaseId);
        const block = atlas.settings.core.blocks.find((b) => b.id === item.block);
        return (
          <Row
            key={item.id}
            title={'Year ' + (phase?.year ?? '?') + ' · ' + (phase?.title ?? item.phaseId)}
            meta={'Block ' + item.block + ', ' + blockShort(block?.name ?? '') + (item.hours ? ' · ' + item.hours + ' h here' : '')}
            to={'/plan?lane=' + item.phaseId + '.' + item.block}
          />
        );
      })}
      <Row title={items.length === 0 ? 'Add to the plan' : 'Add it to another lane too'} meta="Pick a phase, a lane and a position" onClick={() => setAdding(true)} />
      {adding && <AddToPlanSheet atlas={atlas} refId={refId} open onClose={() => setAdding(false)} />}
    </>
  );
}

/** A link field that only saves a full http(s) address. */
export function LinkField({ label, value, onSave }: { label: string; value: string | undefined; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value ?? '';
  const problem = repoLinkProblem(text);
  return (
    <TextField
      label={label}
      type="url"
      value={text}
      onChange={setDraft}
      error={draft !== null ? problem : null}
      onBlur={() => {
        if (draft === null || repoLinkProblem(draft)) return;
        onSave(draft.trim());
        setDraft(null);
      }}
    />
  );
}

function ResourceBody({ atlas, resource }: { atlas: Atlas; resource: AppResource }) {
  const state = useItemState(resource.id);
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [hoursDraft, setHoursDraft] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    let live = true;
    if (resource.customUnits) setUnits(resource.customUnits);
    else void loadUnits(resource.id).then((list) => live && setUnits(list));
    return () => {
      live = false;
    };
  }, [resource.id]);

  const unitsDone = state?.unitsDone ?? [];
  const status = state?.status ?? 'todo';
  const isCustom = !atlas.original.resources.some((r) => r.id === resource.id);
  const edited = !isCustom && JSON.stringify(atlas.original.resources.find((r) => r.id === resource.id)) !== JSON.stringify(resource);
  const subject = atlas.seed.subjects.find((s) => s.id === resource.subject);
  const hoursProblem = hoursDraft !== null && !(Number(hoursDraft) >= 0 && Number(hoursDraft) <= 2000) ? 'Enter a number of hours, like 40.' : null;

  // The resource's lane (its colours) and path: the block that plans it, the path that holds it.
  const planItem = atlas.seed.plan.find((i) => i.resourceId === resource.id);
  const lane = planItem ? laneSlot(planItem.block) : 0;
  const path = pathOf(atlas.seed, resource);
  const progress = resource.unitCount > 0 && units ? (isChecklist(units) ? itemProgress({ refId: resource.id, estHours: resource.estHours, unitCount: resource.unitCount, state, checklist: resource.checklist?.counted }).fraction : fractionDone(status, unitsDone.length, resource.unitCount)) : null;
  const unitNoun = resource.type === 'book' ? 'chapter' : 'unit';
  const loggedMinutes = atlas.logs.reduce((sum, l) => sum + minutesForRef(l, resource.id), 0);
  const openLabel = resource.type === 'book' ? 'Open the book' : resource.type === 'course' ? 'Open course' : 'Open';
  const levelLabel = resource.level === 'intro' ? 'Beginner' : resource.level === 'intermediate' ? 'Intermediate' : resource.level === 'advanced' ? 'Advanced' : null;

  return (
    <div className="space-y-6">
      {/* The head (the mockup's resource sheet): the scene's strip with the lane's icon knob on it, the provider line, the
          tags, the progress and the two buttons. */}
      <section className={'tile overflow-hidden !p-0 lane-' + lane}>
        <div className="relative h-[130px]">
          <ScenePanel slot="resource" decorative bare focal="50% 55%" className="absolute inset-0 rounded-t-[24px]" fallback={<div className="lane-tile absolute inset-0 rounded-t-[24px]" />} />
          <div className="art-fade-bottom absolute inset-x-0 bottom-0 h-[70px]" aria-hidden="true" />
          <span aria-hidden="true" className={'absolute left-[18px] top-4 grid size-[52px] place-items-center rounded-[16px] bg-bg text-[var(--x' + lane + ')] shadow-[3px_3px_8px_rgba(0,0,0,.18)]'}>
            <Icon name={SHELF_ICON[shelfOf(resource)] ?? 'course'} size={24} />
          </span>
        </div>
        <div className="flex flex-col gap-2.5 px-5 pb-5 pt-1">
          <p className="section-label mb-0">{'Library' + (path ? ' · ' + path.name : '')}</p>
          <p className="text-meta text-ink2">{[resource.provider, resource.type, resource.estHours > 0 ? '~' + resource.estHours + ' h' : null, resource.cost === 'audit-free' ? 'free to audit' : resource.cost === 'paid' ? 'paid' : resource.cost].filter(Boolean).join(' · ')}</p>
          <div className="flex flex-wrap gap-1.5">
            {path && <span className="pill-tint lane-0 rounded-pill px-2.5 py-1 text-small font-semibold">{path.name}</span>}
            {levelLabel && <span className="pill-neutral rounded-pill px-2.5 py-1 text-small font-semibold">{levelLabel}</span>}
            {resource.quality === 5 && <span className="pill-tint lane-2 rounded-pill px-2.5 py-1 text-small font-semibold">Canon</span>}
            {isCertificate(resource.id) && <span className="pill-tint lane-4 rounded-pill px-2.5 py-1 text-small font-semibold">Certificate</span>}
            {resource.cost === 'paid' && <span className="pill-neutral rounded-pill px-2.5 py-1 text-small font-semibold">Paid</span>}
          </div>
          {progress !== null && (
            <>
              <ProgressLine value={progress} label={'Progress on ' + resource.title} lane={lane} size={12} />
              <p className="-mt-1 text-label text-ink2">
                {units && isChecklist(units) ? checklistMeta(units, unitsDone) : unitsDone.length + ' of ' + plural(resource.unitCount, unitNoun)}
                {loggedMinutes > 0 ? ' · ' + Math.round(loggedMinutes / 60) + ' h logged' : ''}
              </p>
            </>
          )}
          {((resource.note && resource.note !== 'Paid') || resource.doFirst) && <p className="text-meta text-ink2">{[resource.note !== 'Paid' && resource.note, resource.doFirst && 'Do first: ' + resource.doFirst].filter(Boolean).join(' · ')}</p>}
          {resource.url === null && resource.searchHint && <p className="text-meta text-ink2">No checked link yet. Search for “{resource.searchHint}”.</p>}
          <div className="flex gap-2.5 [&>*]:min-w-0 [&>*]:flex-1">
            {resource.url ? (
              <Button variant="filled" lane={lane as 0 | 1 | 2 | 3 | 4} href={resource.url} icon="external" name={openLabel} className="!flex-[1.25] !px-3">
                <span className="truncate">{openLabel}</span>
              </Button>
            ) : resource.searchHint ? (
              <Button variant="filled" lane={lane as 0 | 1 | 2 | 3 | 4} href={'https://duckduckgo.com/?q=' + encodeURIComponent(resource.searchHint)} icon="search">
                Find a link
              </Button>
            ) : null}
            {/* The day's log entry about it (ATLAS-LIBRARY): the blog post screen, its outline started with this resource. */}
            <Button to={'/blog?ref=' + resource.id} icon="doc" name="Write log entry" className="!px-3">
              Write log
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <ItemStatusPill kind="resource" refId={resource.id} title={resource.title} state={state} />
          </div>
        </div>
      </section>

      {/* Why it is on the plan (the mockup's tile): the summary, and how it fits. */}
      {(resource.summary || resource.priority || resource.roadmap || resource.research) && (
        <section className="tile flex flex-col gap-1.5 px-[18px] py-3.5">
          <h3 className="section-label mb-0 uppercase">Why it&apos;s on your plan</h3>
          {resource.summary && <p className="doc-text text-meta">{resource.summary}</p>}
          {(resource.priority || resource.roadmap || resource.research) && (
            <p className="text-meta text-ink2">
              {[
                resource.priority && 'Priority ' + resource.priority,
                resource.fromYear && 'Year ' + resource.fromYear,
                resource.roadmap && (atlas.seed.roadmaps.find((r) => r.id === resource.roadmap)?.title ?? resource.roadmap) + ' roadmap',
                resource.research && 'Research: ' + (RESEARCH.find((a) => a.id === resource.research)?.name ?? resource.research),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </section>
      )}

      <div>
        {/* "I own this" on a paid book: then Up next may suggest it like a free one; kept in the item state, by id. A paid
            certificate exam is earned, not owned: its sheet has Earned below instead. */}
        {resource.cost === 'paid' && !isCertificate(resource.id) && (
          <ul className="rows mt-3 border-t-[1.5px] border-dashed border-dash">
            <Row height={48} title="I own this" meta={state?.owned ? 'Suggested like a free book' : 'Not suggested until it is owned'} toggle={{ on: state?.owned === true, onChange: (on) => void editItemState(resource.id, (s) => (on ? { ...s, owned: true } : (({ owned: _o, ...rest }) => rest)(s))) }} />
          </ul>
        )}
        {/* "Earned" on a certificate row (the plan gap fill): the day and the credential's link when given, in the item state. */}
        {isCertificate(resource.id) && (
          <ul className="rows mt-3 border-t-[1.5px] border-dashed border-dash">
            <Row
              height={48}
              title="Earned"
              meta={state?.earned ? (state.earnedOn ? 'On ' + longDate(state.earnedOn) : 'Counted on Plan › Credentials') : 'Not earned yet'}
              toggle={{ on: state?.earned === true, onChange: (on) => void editItemState(resource.id, (s) => (on ? { ...s, earned: true } : (({ earned: _e, earnedOn: _d, credentialUrl: _u, ...rest }) => rest)(s))) }}
            />
            {state?.earned && (
              <li className="flex flex-col gap-3 py-3">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-body font-medium">Earned on</span>
                  <input
                    type="date"
                    value={state.earnedOn ?? ''}
                    max={today()}
                    onChange={(e) => {
                      const value = e.target.value;
                      void editItemState(resource.id, (s) => (value ? { ...s, earnedOn: value } : (({ earnedOn: _d, ...rest }) => rest)(s)));
                    }}
                    className="well h-11 rounded-[14px] px-3 text-body tabular-nums"
                  />
                </label>
                <LinkField label="Credential link" value={state.credentialUrl} onSave={(v) => void editItemState(resource.id, (s) => (v ? { ...s, credentialUrl: v } : (({ credentialUrl: _u, ...rest }) => rest)(s)))} />
              </li>
            )}
          </ul>
        )}
      </div>

      {resource.unitCount > 0 && units && isChecklist(units) ? (
        // A lesson checklist (ZOOMCAMP-CHECKLIST): the course's progress by hours, where you are, every module.
        <div>
          <p className="mb-3 text-meta text-ink2">{checklistMeta(units, unitsDone) + (currentUnit(units, unitsDone) ? ' · now ' + lessonLabel(currentUnit(units, unitsDone)!) : '')}</p>
          <LessonList refId={resource.id} units={units} done={unitsDone} />
        </div>
      ) : resource.unitCount > 0 ? (
        <div>
          {units ? <Checklist label={resource.type === 'book' ? 'Chapters' : 'Units'} aside="tap to tick" refId={resource.id} units={units} done={unitsDone} /> : <p className="mt-2 text-meta text-ink2">Loading the checklist…</p>}
        </div>
      ) : null}

      <NotesField
        label="Notes"
        value={state?.notes}
        onSave={(notes) =>
          void editItemState(resource.id, (s) => {
            const next = { ...s };
            if (notes.trim()) next.notes = notes;
            else delete next.notes;
            return next;
          })
        }
      />

      <RowList label="On the plan">
        <Placement atlas={atlas} refId={resource.id} />
      </RowList>

      {(resource.prerequisites.length > 0 || (resource.after?.length ?? 0) > 0 || subject) && (
        <RowList label="Related">
          {resource.prerequisites.map((id) => (
            <Row key={id} title={atlas.seed.resources.find((r) => r.id === id)?.title ?? id} meta={atlas.states.get(id)?.status === 'done' ? 'Needed first · done' : 'Needed first'} to={'/library/' + id} />
          ))}
          {/* Soft prerequisites (RESOURCES-ADD): worth doing first, never enforced. */}
          {(resource.after ?? []).map((id) => {
            // A paper of the reading queue opens its own sheet (MORE-RESOURCES).
            const paper = atlas.seed.papers.find((p) => p.id === id);
            return paper ? (
              <Row key={id} title={paper.short ?? paper.title} meta="Do first" to={'/library?paper=' + id} />
            ) : (
              <Row key={id} title={atlas.seed.resources.find((r) => r.id === id)?.title ?? id} meta={atlas.states.get(id)?.status === 'done' ? 'Do first · done' : 'Do first'} to={'/library/' + id} />
            );
          })}
          {subject && <Row title={subject.title} meta="Counts towards" to={'/plan?view=credentials&subject=' + subject.id} />}
        </RowList>
      )}

      <TextField
        label="Estimated hours"
        type="numeric"
        value={hoursDraft ?? String(resource.estHours)}
        onChange={setHoursDraft}
        error={hoursProblem}
        hint={resource.lastVerified ? 'Estimates are yours to change. Link checked ' + resource.lastVerified + '.' : 'Estimates are yours to change.'}
        onBlur={() => {
          if (hoursDraft === null || hoursProblem) return;
          void patchEntity('resource', resource.id, { estHours: Number(hoursDraft) });
          setHoursDraft(null);
        }}
      />

      {isCustom &&
        (confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void deleteCustomEntity('resource', resource.id)}>Delete it and its notes</Button>
            <Button variant="icon" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
          </div>
        ) : (
          <Button onClick={() => setConfirmDelete(true)}>Delete this resource</Button>
        ))}
      {edited && <Button onClick={() => void resetEntity('resource', resource.id)}>Undo my edits to this resource</Button>}
    </div>
  );
}

function ProjectBody({ atlas, project }: { atlas: Atlas; project: Project }) {
  const state = useItemState(project.id);
  const phase = atlas.seed.phases.find((p) => p.id === project.phaseId);
  const setField = (key: 'repoUrl' | 'demoUrl' | 'writeUp' | 'partsNotes' | 'budget' | 'notes', value: string): void =>
    void editItemState(project.id, (s) => {
      const next = { ...s };
      if (value.trim()) next[key] = value;
      else delete next[key];
      // Clearing the repository of a finished project reopens it: the rule has to keep holding.
      if (key === 'repoUrl' && !value.trim() && next.status === 'done') next.status = 'active';
      return next;
    });
  const [budget, setBudget] = useState<string | null>(null);
  const doc = useProjectDoc(project.id);
  const design = useDesign(doc ? project.id : '');
  const meta = [CADENCE[project.cadence] + (project.number !== undefined ? ' ' + project.number : ''), phase?.title, project.estHours + ' h'].filter(Boolean).join(' · ');

  return (
    <div className="space-y-6">
      {doc ? (
        <TechDoc atlas={atlas} model={planDocModel({ seed: atlas.seed, project, doc, meta })} design={design} done={state?.unitsDone ?? []} />
      ) : (
        <div>
          <p className="text-meta text-ink2">{meta}</p>
          <div className="mt-2 flex">
            <RunningTime atlas={atlas} refId={project.id} pill />
          </div>
          <p className="doc-text mt-2 text-body text-ink2">{project.brief}</p>
        </div>
      )}
      <div>
        <div className="flex items-center gap-2">
          {project.sourceUrl && (
            <Button href={project.sourceUrl} icon="external">
              Open the source
            </Button>
          )}
          <span className="ml-auto">
            <ItemStatusPill kind="project" refId={project.id} title={project.title} state={state} />
          </span>
        </div>
        {!hasRepo(state) && <p className="mt-2 text-meta text-ink2">Add the repository link below to be able to mark it done.</p>}
      </div>

      {doc === undefined && <p className="text-meta text-ink2">Loading the tech doc…</p>}
      {doc === null && <Checklist label="Done when" refId={project.id} units={criteriaUnits(project.acceptance)} done={state?.unitsDone ?? []} />}

      <div className="space-y-3">
        <h3 className="section-label">Ship it</h3>
        <LinkField label="Repository" value={state?.repoUrl} onSave={(v) => setField('repoUrl', v)} />
        <LinkField label="Demo, video or page" value={state?.demoUrl} onSave={(v) => setField('demoUrl', v)} />
        <NotesField label="Write-up" value={state?.writeUp} onSave={(v) => setField('writeUp', v)} />
        <NotesField label="Notes" value={state?.notes} onSave={(v) => setField('notes', v)} />
      </div>

      {project.stage === 2 && (
        <div className="space-y-3">
          <h3 className="section-label">Parts and budget</h3>
          {doc?.sections['Parts and budget'] && <Markdown source={doc.sections['Parts and budget']} className="doc-text text-body text-ink2" />}
          {project.parts && project.parts.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-5 text-body text-ink2">
              {project.parts.map((part) => (
                <li key={part}>{part}</li>
              ))}
            </ul>
          ) : (
            <p className="text-meta text-ink2">Nothing to buy: this one runs on the computer you already have.</p>
          )}
          <TextField
            label="Budget"
            value={budget ?? state?.budget ?? ''}
            onChange={setBudget}
            onBlur={() => {
              if (budget === null) return;
              setField('budget', budget);
              setBudget(null);
            }}
          />
          <NotesField label="What you bought" value={state?.partsNotes} onSave={(v) => setField('partsNotes', v)} />
        </div>
      )}

      <RowList label="On the plan">
        <Placement atlas={atlas} refId={project.id} />
      </RowList>

      {(project.skills.length > 0 || project.source) && (
        <RowList label="About">
          {project.skills.length > 0 && <Row title="Skills" meta={project.skills.join(', ')} />}
          {project.source && <Row title="Source" meta={project.source} href={project.sourceUrl} />}
        </RowList>
      )}
    </div>
  );
}

/**
 * A resource's or project's details in a sheet: link, status, checklist, notes, and where it sits on the plan. For a
 * project this is its tech doc, one tap from every card and row that names it. The header keeps a running timer in
 * view, the sheet reopens at the place it was scrolled to, and Escape closes it with focus back on the row.
 * `onTake` adds "Take it" (the Deck), `footer` one action pinned under the doc, `after` rows at its end (Today's
 * choices for Block D).
 */
export function ItemSheet({ atlas, id, onClose, onTake, footer, after }: { atlas: Atlas; id: string | null; onClose: () => void; onTake?: () => void; footer?: ReactNode; after?: ReactNode }) {
  const resource = id ? atlas.seed.resources.find((r) => r.id === id) : undefined;
  const project = id && !resource ? atlas.seed.projects.find((p) => p.id === id) : undefined;
  // Not in the curriculum: perhaps a catalogue build, case or challenge, whose chunk loads on demand.
  const [catalogue, setCatalogue] = useState<CatalogueItem[] | null>(null);
  useEffect(() => {
    if (!id || resource || project || catalogue) return;
    let live = true;
    void loadCatalogue().then((items) => live && setCatalogue(items));
    return () => {
      live = false;
    };
  }, [id, resource, project, catalogue]);
  const fromCatalogue = id && !resource && !project ? catalogue?.find((i) => i.id === id) : undefined;
  const loading = Boolean(id && !resource && !project && !catalogue);
  const title = resource?.title ?? project?.title ?? fromCatalogue?.title ?? (loading ? 'Loading…' : 'Not in the library');
  const actions =
    onTake || footer ? (
      <>
        {onTake && (
          <Button variant="filled" onClick={onTake}>
            Take it
          </Button>
        )}
        {footer}
      </>
    ) : undefined;
  return (
    <Sheet open={id !== null} title={title} onClose={onClose} scrollKey={id ? 'item:' + id : undefined} aside={resource ? <RunningTime atlas={atlas} refId={id} /> : undefined} footer={actions}>
      {resource ? (
        <>
          <ResourceBody key={resource.id} atlas={atlas} resource={resource} />
        </>
      ) : project ? (
        <ProjectBody key={project.id} atlas={atlas} project={project} />
      ) : fromCatalogue ? (
        <CatalogueBody key={fromCatalogue.id} atlas={atlas} item={fromCatalogue} taking={Boolean(onTake)} footer={Boolean(footer)} />
      ) : loading ? (
        <p className="text-meta text-ink2" role="status">
          Loading…
        </p>
      ) : (
        <p className="text-body text-ink2">It may have been renamed or removed from the curriculum. Your notes on it are kept under the old id.</p>
      )}
      {after && (
        <RowList label="On Today" className="mt-6">
          {after}
        </RowList>
      )}
    </Sheet>
  );
}

/** "February 2027": a phase boundary in words. */
export function monthYear(date: string): string {
  return monthName(Number(date.slice(5, 7)) - 1) + ' ' + date.slice(0, 4);
}
