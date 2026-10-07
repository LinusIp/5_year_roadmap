import { useState } from 'react';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { today } from '../../lib/dates.ts';
import { minutesForRef } from '../../lib/logs.ts';
import { adherence } from '../../lib/shipping.ts';
import { isOpen, lane } from '../../lib/schedule.ts';
import type { Phase, Project } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { ItemStatusPill } from '../parts/ItemSheet.tsx';
import { plural, shortTitle } from '../parts/text.ts';

/**
 * Projects: three stacks, this week's build, this month's project and the capstones, each a list. What is
 * shipped folds into one row with a count; "Pick a project" opens the deck.
 */
export function ProjectsView({ atlas, phase, weekly, onOpenItem }: { atlas: Atlas; phase: Phase | null; weekly: Project | null; onOpenItem: (id: string) => void }) {
  const [showDone, setShowDone] = useState<string | null>(null);
  const { seed, states, logs, settings } = atlas;
  const asOf = today();
  const planStart = seed.phases[0]!.start;
  const hoursOn = (id: string): number => Math.round(logs.reduce((sum, l) => sum + minutesForRef(l, id), 0) / 60);
  const open = (p: Project): boolean => isOpen(p.id, states);

  // This month: the phase's monthly projects in Block D order, then any assigned to the phase but not laned.
  const laned = phase ? lane(seed, phase.id, 'D').map((i) => seed.projects.find((p) => p.id === i.projectId)).filter((p): p is Project => p?.cadence === 'monthly') : [];
  const monthly = [...laned, ...seed.projects.filter((p) => p.cadence === 'monthly' && phase && p.phaseId === phase.id && !laned.includes(p))];
  const capstones = seed.projects.filter((p) => p.cadence === 'capstone');
  const weeklyDone = seed.projects.filter((p) => p.cadence === 'weekly' && states.get(p.id)?.status === 'done');

  const [w, m, c] = (['weekly', 'monthly', 'capstone'] as const).map((cadence) => adherence(seed.projects, states, cadence, planStart, asOf, settings.core.weekStartsOn));
  const sentence =
    w!.periods > 0
      ? plural(w!.hit, 'week') + ' of ' + w!.periods + ' with a build shipped · ' + plural(m!.hit, 'month') + ' of ' + m!.periods + ' with a project · ' + plural(c!.shipped, 'capstone')
      : 'The plan has not started yet.';

  const projectRow = (p: Project, meta: string) => (
    <Row key={p.id} title={shortTitle(p.title)} meta={meta} onClick={() => onOpenItem(p.id)} action={<ItemStatusPill kind="project" refId={p.id} title={p.title} state={states.get(p.id)} />} />
  );
  const doneRow = (key: string, done: Project[], noun: string) =>
    done.length > 0 && (
      <Row key={key + '-done'} title={plural(done.length, noun) + ' shipped'} trailing={showDone === key ? 'Hide' : 'Show'} expanded={showDone === key} onClick={() => setShowDone(showDone === key ? null : key)}>
        {showDone === key && (
          <ul className="divide-y divide-line pb-2">
            {done.map((p) => (
              <Row key={p.id} title={shortTitle(p.title)} meta={states.get(p.id)?.repoUrl ?? 'Shipped'} onClick={() => onOpenItem(p.id)} />
            ))}
          </ul>
        )}
      </Row>
    );

  return (
    <div className="space-y-7">
      <p className="text-meta text-ink2">{sentence}</p>

      <div>
        <RowList label="This week">
          {weekly && open(weekly) ? projectRow(weekly, 'Weekly build · ' + hoursOn(weekly.id) + ' of ' + weekly.estHours + ' h done') : <Row title="No build this week" meta="Pick one from the deck" to="/plan/pick" />}
          {doneRow('weekly', weeklyDone, 'weekly build')}
        </RowList>
        <Button className="mt-3" icon="shuffle" to="/plan/pick">
          Pick a project
        </Button>
      </div>

      <RowList label="This month">
        {monthly.filter(open).map((p, i) => projectRow(p, (i === 0 ? 'Next in Block D · ' : '') + (p.number !== undefined ? 'No. ' + p.number + ' · ' : '') + hoursOn(p.id) + ' of ' + p.estHours + ' h'))}
        {monthly.filter(open).length === 0 && <Row title="Every monthly project of this phase is shipped" meta="Pick one from the deck" to="/plan/pick?cadence=monthly" />}
        {doneRow('monthly', monthly.filter((p) => !open(p)), 'monthly project')}
      </RowList>

      <RowList label="Capstones">
        {capstones.filter(open).map((p) => projectRow(p, (seed.phases.find((ph) => ph.id === p.phaseId)?.title ?? 'Capstone') + ' · ' + p.estHours + ' h'))}
        {doneRow('capstone', capstones.filter((p) => !open(p)), 'capstone')}
      </RowList>
    </div>
  );
}
