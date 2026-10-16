import { useState } from 'react';
import { startOfWeek, today } from '../../lib/dates.ts';
import { editItemState, setItemStatus, setWeekPick, useItemState } from '../../db/state.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { groupLabel, KIND_LABEL } from '../../lib/catalogue/filters.ts';
import { hasRepo } from '../../lib/projects.ts';
import type { Build, Case, CatalogueItem } from '../../seed/catalogue.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Checklist } from './Checklist.tsx';
import { ItemStatusPill, LinkField } from './ItemSheet.tsx';
import { NotesField } from './NotesField.tsx';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-body font-medium">{title}</h3>
      <div className="mt-1 text-body text-ink2">{children}</div>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-0.5 pl-5">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
}

/** A case or build as the start of its repository's README. */
export function catalogueReadme(item: Build | Case): string {
  const part = (heading: string, body: string): string => '## ' + heading + '\n\n' + body.trim() + '\n';
  const bullets = (xs: string[]): string => xs.map((x) => '- ' + x).join('\n');
  const out = ['# ' + item.title + '\n'];
  if (item.kind === 'case') {
    out.push(item.scenario + '\n');
    out.push(part('Requirements', bullets(item.functional) + (item.nonFunctional.length ? '\n\nNon-functional:\n\n' + bullets(item.nonFunctional) : '')));
    out.push(part('Architecture', item.architecture + (item.components.length ? '\n\n' + bullets(item.components) : '')));
  } else {
    out.push(item.goal + '\n');
    out.push(part('Approach', bullets(item.approach)));
  }
  out.push(part('Stack', item.stack));
  out.push(part('Done when', item.doneWhen));
  out.push('## Results\n\n_To fill in: ' + (item.measure.length ? item.measure.join('; ') : 'the numbers that show it works') + '._\n');
  return out.join('\n');
}

/**
 * A catalogue build or case in a sheet. A case reads as a short tech doc: scenario, requirements, constraints,
 * architecture, data, milestones as checkboxes, deliverables, done when, measure, pitfalls, stretch, parts. Either
 * one needs a repository link to be marked done; "Copy as README skeleton" starts that README.
 */
export function CatalogueBody({ atlas, item }: { atlas: Atlas; item: CatalogueItem }) {
  const state = useItemState(item.id);
  const [copied, setCopied] = useState<string | null>(null);
  if (item.kind === 'challenge') {
    return (
      <div className="space-y-4">
        <p className="text-meta text-ink2">{['Challenge', item.difficulty, item.estMinutes + ' min', groupLabel(item.topic)].join(' · ')}</p>
        <p className="text-body text-ink2">{item.statement}</p>
        <Button variant="filled" to={'/challenge/' + item.id}>
          Open the challenge
        </Button>
      </div>
    );
  }

  const phase = atlas.seed.phases.find((p) => p.id === item.phaseId);
  const setRepo = (value: string): void =>
    void editItemState(item.id, (s) => {
      const next = { ...s };
      if (value.trim()) next.repoUrl = value;
      else delete next.repoUrl;
      if (!value.trim() && next.status === 'done') next.status = 'active';
      return next;
    });
  const setNotes = (value: string): void =>
    void editItemState(item.id, (s) => {
      const next = { ...s };
      if (value.trim()) next.notes = value;
      else delete next.notes;
      return next;
    });
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(catalogueReadme(item));
      setCopied('Copied. Paste it into the README of the repository.');
    } catch {
      setCopied('Could not reach the clipboard. Allow it for this site and try again.');
    }
  };
  const status = state?.status ?? 'todo';
  const now = today();
  const weekStart = startOfWeek(now, atlas.settings.core.weekStartsOn);
  const take = async (): Promise<void> => {
    if (item.kind === 'build') await setWeekPick(weekStart, item.id);
    if (status === 'todo') await setItemStatus(item.id, 'active');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-meta text-ink2">
          {[KIND_LABEL[item.kind] + ' · ' + item.difficulty, groupLabel(item.domain), phase ? 'Year ' + phase.year + ' · ' + phase.title : null, 'level ' + item.level, item.estHours + ' h'].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-2 text-body text-ink2">{item.kind === 'case' ? item.scenario : item.goal}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {status === 'todo' && (
            <Button variant="filled" onClick={() => void take()}>
              {item.kind === 'build' ? "Make it this week's build" : 'Take it into the monthly queue'}
            </Button>
          )}
          <Button size="sm" onClick={() => void copy()}>
            Copy as README skeleton
          </Button>
          <span className="ml-auto">
            <ItemStatusPill kind="project" refId={item.id} title={item.title} state={state} />
          </span>
        </div>
        {copied && (
          <p role="status" className="mt-2 text-meta text-ink2">
            {copied}
          </p>
        )}
        {!hasRepo(state) && <p className="mt-2 text-meta text-ink2">Add the repository link below to be able to mark it done.</p>}
      </div>

      {item.kind === 'case' ? (
        <div className="space-y-4">
          <Section title="Requirements">
            <List items={item.functional} />
          </Section>
          {item.nonFunctional.length > 0 && (
            <Section title="Non-functional requirements">
              <List items={item.nonFunctional} />
            </Section>
          )}
          {item.constraints.length > 0 && (
            <Section title="Constraints">
              <List items={item.constraints} />
            </Section>
          )}
          <Section title="Architecture">
            <p>{item.architecture}</p>
            {item.components.length > 0 && (
              <div className="mt-2">
                <List items={item.components} />
              </div>
            )}
          </Section>
          <Section title="Stack">
            <p>{item.stack}</p>
          </Section>
          <Section title="Data">
            <p>{item.data}</p>
          </Section>
        </div>
      ) : (
        <div className="space-y-4">
          <Section title="Approach">
            <ol className="list-decimal space-y-0.5 pl-5">
              {item.approach.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </Section>
          <Section title="Stack">
            <p>{item.stack}</p>
          </Section>
        </div>
      )}

      {item.kind === 'case' && (
        <Checklist label={'Milestones · ' + item.estHours + ' h'} refId={item.id} units={item.milestones.map((m) => ({ id: m.id, title: m.title + ' (' + m.hours + ' h)' }))} done={state?.unitsDone ?? []} />
      )}

      <div className="space-y-4">
        {item.kind === 'case' && item.deliverables.length > 0 && (
          <Section title="Deliverables">
            <List items={item.deliverables} />
          </Section>
        )}
        <Section title="Done when">
          <p>{item.doneWhen}</p>
        </Section>
        {item.measure.length > 0 && (
          <Section title="Measure and report">
            <List items={item.measure} />
          </Section>
        )}
        {item.pitfalls.length > 0 && (
          <Section title="Pitfalls">
            <List items={item.pitfalls} />
          </Section>
        )}
        {item.kind === 'case' && item.stretch.length > 0 && (
          <Section title="Stretch">
            <List items={item.stretch} />
          </Section>
        )}
        {item.parts.length > 0 && (
          <Section title="Parts and budget">
            <List items={item.parts} />
          </Section>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-meta font-normal text-ink2">Ship it</h3>
        <LinkField label="Repository" value={state?.repoUrl} onSave={setRepo} />
        <NotesField label="Notes" value={state?.notes} onSave={setNotes} />
      </div>

      {(item.refs.length > 0 || item.prereq.length > 0) && (
        <RowList label="Related">
          {item.prereq.map((id) => (
            <Row key={'p' + id} title={'First: ' + (atlas.seed.projects.find((p) => p.id === id)?.title ?? id)} to={'/library/' + id} />
          ))}
          {item.refs.map((id) => {
            const r = atlas.seed.resources.find((x) => x.id === id);
            return r ? <Row key={id} title={r.title} meta={r.provider} to={'/library/' + id} /> : null;
          })}
        </RowList>
      )}
    </div>
  );
}
