import { startOfWeek, today } from '../../lib/dates.ts';
import { editItemState, setItemStatus, setWeekPick, useItemState } from '../../db/state.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { groupLabel } from '../../lib/catalogue/filters.ts';
import { hasRepo } from '../../lib/projects.ts';
import { DONE_WHEN_ID, stepId } from '../../seed/catalogue.ts';
import type { Build, Case, CatalogueItem } from '../../seed/catalogue.ts';
import type { Design } from '../../seed/design.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { TechDoc, useDesign } from './TechDoc.tsx';
import type { TechDocModel } from './TechDoc.tsx';
import { ItemStatusPill, LinkField } from './ItemSheet.tsx';
import { NotesField } from './NotesField.tsx';

/** A design as README text: what you build, its parts, and one request through them. */
function designReadme(design: Design): string {
  const name = (id: string): string => design.components.find((c) => c.id === id)?.name ?? id;
  return [
    design.overview,
    design.components.map((c) => '- **' + c.name + '** (' + c.tech + '): ' + c.role).join('\n'),
    design.flow.map((f, i) => i + 1 + '. **' + name(f.component) + '** ' + f.text).join('\n'),
  ].join('\n\n');
}

/** A case or build as the start of its repository's README. */
export function catalogueReadme(item: Build | Case, design?: Design | null): string {
  const part = (heading: string, body: string): string => '## ' + heading + '\n\n' + body.trim() + '\n';
  const bullets = (xs: string[]): string => xs.map((x) => '- ' + x).join('\n');
  const out = ['# ' + item.title + '\n'];
  if (item.kind === 'case') {
    out.push(item.scenario + '\n');
    out.push(part('Requirements', bullets(item.functional) + (item.nonFunctional.length ? '\n\nNon-functional:\n\n' + bullets(item.nonFunctional) : '')));
    out.push(part('Architecture', design ? designReadme(design) : item.architecture + (item.components.length ? '\n\n' + bullets(item.components) : '')));
  } else {
    out.push(item.goal + '\n');
    if (design) out.push(part('How it works', designReadme(design)));
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
export function CatalogueBody({ atlas, item, taking, footer }: { atlas: Atlas; item: CatalogueItem; taking?: boolean; footer?: boolean }) {
  const state = useItemState(item.id);
  const design = useDesign(item.kind === 'challenge' ? '' : item.id);
  if (item.kind === 'challenge') {
    return (
      <div className="space-y-6">
        <p className="text-meta text-ink2">{['Challenge', item.difficulty, item.estMinutes + ' min', groupLabel(item.topic)].join(' · ')}</p>
        <p className="doc-text text-body text-ink2">{item.statement}</p>
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
  const status = state?.status ?? 'todo';
  const now = today();
  const weekStart = startOfWeek(now, atlas.settings.core.weekStartsOn);
  const take = async (): Promise<void> => {
    // Both writes start at once, so nothing can navigate away between them.
    await Promise.all([item.kind === 'build' ? setWeekPick(weekStart, item.id) : null, status === 'todo' ? setItemStatus(item.id, 'active') : null]);
  };
  const model: TechDocModel = {
    id: item.id,
    title: item.title,
    meta: [(item.kind === 'case' ? 'Monthly' : 'Weekly') + ' · ' + item.difficulty, groupLabel(item.domain), phase ? 'Year ' + phase.year : null, item.estHours + ' h'].filter(Boolean).join(' · '),
    light: item.kind === 'build',
    situation: item.kind === 'case' ? item.scenario : item.goal,
    overviewMore:
      item.kind === 'case'
        ? [
            { title: 'Requirements', items: item.functional },
            ...(item.nonFunctional.length ? [{ title: 'Non-functional requirements', items: item.nonFunctional }] : []),
            ...(item.constraints.length ? [{ title: 'Constraints', items: item.constraints }] : []),
          ]
        : [],
    designMore: [{ title: 'Stack', text: item.stack }, ...(item.kind === 'case' ? [{ title: 'Data', text: item.data }] : [])],
    steps:
      item.kind === 'case'
        ? { label: 'Milestones', units: item.milestones.map((m) => ({ id: m.id, title: m.title, hours: m.hours })), hours: item.estHours }
        : { label: 'Approach', units: item.approach.map((x, i) => ({ id: stepId(i), title: x })), hours: 0 },
    buildMore: [...(item.pitfalls.length ? [{ title: 'Pitfalls', items: item.pitfalls }] : []), ...(item.parts.length ? [{ title: 'Parts and budget', items: item.parts }] : [])],
    doneWhen: [{ id: DONE_WHEN_ID, title: item.doneWhen }],
    checksMore: [...(item.kind === 'case' && item.deliverables.length ? [{ title: 'Ship', items: item.deliverables }] : []), ...(item.measure.length ? [{ title: 'Measure', items: item.measure }] : [])],
    stretch: item.kind === 'case' ? item.stretch : [],
    readme: () => catalogueReadme(item, design),
  };

  return (
    <div className="space-y-6">
      <TechDoc
        atlas={atlas}
        model={model}
        design={design}
        done={state?.unitsDone ?? []}
        actions={
          status === 'todo' && !taking && !footer ? (
            <Button variant="filled" onClick={() => void take()}>
              {item.kind === 'build' ? "Make it this week's build" : 'Take it into the monthly queue'}
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-2">
        <span className="text-meta text-ink2">{hasRepo(state) ? 'Status' : 'Add the repository link below to be able to mark it done.'}</span>
        <span className="ml-auto">
          <ItemStatusPill kind="project" refId={item.id} title={item.title} state={state} />
        </span>
      </div>

      <div className="space-y-3">
        <h3 className="section-label">Ship it</h3>
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
