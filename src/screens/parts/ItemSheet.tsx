import { useEffect, useState } from 'react';
import { deleteCustomEntity, patchEntity, resetEntity } from '../../db/edits.ts';
import { editItemState, setItemStatus, useItemState } from '../../db/state.ts';
import type { ItemStatus, UserItemState } from '../../db/types.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { monthName } from '../../lib/dates.ts';
import { fractionDone } from '../../lib/progress.ts';
import { hasRepo, repoLinkProblem, statusBlocker } from '../../lib/projects.ts';
import { loadUnits } from '../../seed/index.ts';
import type { AppResource, Project, Unit } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { ProgressLine } from '../../ui/ProgressLine.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { Checklist, criteriaUnits } from './Checklist.tsx';
import { NotesField } from './NotesField.tsx';
import { StatusPill } from './StatusPill.tsx';
import { blockShort, plural } from './text.ts';

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

/** "Year 1 · In flight · Block A, Gamedev": where an item sits on the plan. */
function Placement({ atlas, refId }: { atlas: Atlas; refId: string }) {
  const items = atlas.seed.plan.filter((i) => (i.resourceId ?? i.projectId) === refId);
  if (items.length === 0) return <Row title="Not on the plan" meta="Add it to a lane from Plan" />;
  return (
    <>
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
    void loadUnits(resource.id).then((list) => live && setUnits(list));
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-meta text-ink2">{[resource.provider, resource.type, resource.cost === 'audit-free' ? 'free to audit' : resource.cost].join(' · ')}</p>
        {resource.summary && <p className="mt-2 text-body text-ink2">{resource.summary}</p>}
        {resource.url === null && resource.searchHint && <p className="mt-2 text-meta text-ink2">No checked link yet. Search for “{resource.searchHint}”.</p>}
        <div className="mt-4 flex items-center gap-2">
          {resource.url ? (
            <Button href={resource.url} icon="external">
              Open
            </Button>
          ) : resource.searchHint ? (
            <Button href={'https://duckduckgo.com/?q=' + encodeURIComponent(resource.searchHint)} icon="search">
              Find a link
            </Button>
          ) : null}
          <span className="ml-auto">
            <ItemStatusPill kind="resource" refId={resource.id} title={resource.title} state={state} />
          </span>
        </div>
      </div>

      {resource.unitCount > 0 && (
        <div>
          <ProgressLine value={fractionDone(status, unitsDone.length, resource.unitCount)} label={'Progress on ' + resource.title} />
          <p className="mb-2 mt-1.5 text-meta text-ink2">{unitsDone.length + ' of ' + plural(resource.unitCount, 'unit')} done</p>
          {units ? <Checklist refId={resource.id} units={units} done={unitsDone} /> : <p className="mt-2 text-meta text-ink2">Loading the checklist…</p>}
        </div>
      )}

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

      {(resource.prerequisites.length > 0 || subject) && (
        <RowList label="Related">
          {resource.prerequisites.map((id) => (
            <Row key={id} title={atlas.seed.resources.find((r) => r.id === id)?.title ?? id} meta={atlas.states.get(id)?.status === 'done' ? 'Needed first · done' : 'Needed first'} to={'/library/' + id} />
          ))}
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
  const setField = (key: 'repoUrl' | 'demoUrl' | 'writeUp' | 'partsNotes' | 'budget', value: string): void =>
    void editItemState(project.id, (s) => {
      const next = { ...s };
      if (value.trim()) next[key] = value;
      else delete next[key];
      // Clearing the repository of a finished project reopens it: the rule has to keep holding.
      if (key === 'repoUrl' && !value.trim() && next.status === 'done') next.status = 'active';
      return next;
    });
  const [budget, setBudget] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-meta text-ink2">
          {[CADENCE[project.cadence] + (project.number !== undefined ? ' ' + project.number : ''), phase?.title, project.estHours + ' h'].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-2 text-body text-ink2">{project.brief}</p>
        <div className="mt-4 flex items-center gap-2">
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

      <Checklist label="Done when" refId={project.id} units={criteriaUnits(project.acceptance)} done={state?.unitsDone ?? []} />

      <div className="space-y-3">
        <h3 className="text-meta font-normal text-ink2">Ship it</h3>
        <LinkField label="Repository" value={state?.repoUrl} onSave={(v) => setField('repoUrl', v)} />
        <LinkField label="Demo, video or page" value={state?.demoUrl} onSave={(v) => setField('demoUrl', v)} />
        <NotesField label="Write-up" value={state?.writeUp} onSave={(v) => setField('writeUp', v)} />
      </div>

      {project.stage === 2 && (
        <div className="space-y-3">
          <h3 className="text-meta font-normal text-ink2">Parts and budget</h3>
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

/** A resource's or project's details in a sheet: link, status, checklist, notes, and where it sits on the plan. */
export function ItemSheet({ atlas, id, onClose }: { atlas: Atlas; id: string | null; onClose: () => void }) {
  const resource = id ? atlas.seed.resources.find((r) => r.id === id) : undefined;
  const project = id && !resource ? atlas.seed.projects.find((p) => p.id === id) : undefined;
  const title = resource?.title ?? project?.title ?? 'Not in the library';
  return (
    <Sheet open={id !== null} title={title} onClose={onClose}>
      {resource ? (
        <ResourceBody key={resource.id} atlas={atlas} resource={resource} />
      ) : project ? (
        <ProjectBody key={project.id} atlas={atlas} project={project} />
      ) : (
        <p className="text-body text-ink2">It may have been renamed or removed from the curriculum. Your notes on it are kept under the old id.</p>
      )}
    </Sheet>
  );
}

/** "February 2027": a phase boundary in words. */
export function monthYear(date: string): string {
  return monthName(Number(date.slice(5, 7)) - 1) + ' ' + date.slice(0, 4);
}
