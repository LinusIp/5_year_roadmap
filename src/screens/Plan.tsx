import { useMemo, useState } from 'react';
import { useCertStates, useMilestoneStates } from '../db/credentials.ts';
import { usePaperStates, useWeekPick } from '../db/state.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { useUnits } from '../hooks/useUnits.ts';
import { daysBetween, startOfWeek, today as todayDate } from '../lib/dates.ts';
import { weeklyBuildFor } from '../lib/schedule.ts';
import { useQueryParam } from '../router/router.tsx';
import type { BlockId } from '../seed/schema.ts';
import { Header } from '../ui/Header.tsx';
import { Screen } from '../ui/Screen.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import { ItemSheet } from './parts/ItemSheet.tsx';
import { longDate, nameOf } from './parts/text.ts';
import { CredentialsView } from './plan/CredentialsView.tsx';
import { LaneSheet } from './plan/LaneSheet.tsx';
import { buildModel, currentPhase } from './plan/model.ts';
import { PapersView } from './plan/PapersView.tsx';
import { ProjectsView } from './plan/ProjectsView.tsx';
import { ReplanSheet } from './plan/ReplanSheet.tsx';
import { Timeline } from './plan/Timeline.tsx';

type View = 'timeline' | 'projects' | 'papers' | 'credentials';
const VIEWS: { value: View; label: string }[] = [
  { value: 'timeline', label: 'Timeline' },
  { value: 'projects', label: 'Projects' },
  { value: 'papers', label: 'Papers' },
  { value: 'credentials', label: 'Credentials' },
];

/**
 * Plan: Timeline, Projects, Papers and Credentials behind one segmented control. A lane, an item, a paper or a
 * credential opens in a sheet whose address is in the URL, so the back button closes it.
 */
export function Plan() {
  const atlas = useAtlas();
  const units = useUnits();
  const paperStates = usePaperStates();
  const certStates = useCertStates();
  const milestoneStates = useMilestoneStates();
  const [viewParam, setView] = useQueryParam('view');
  const [laneParam, setLane] = useQueryParam('lane');
  const [itemParam, setItem] = useQueryParam('item');
  const [replanOpen, setReplanOpen] = useState(false);
  const asOf = todayDate();
  const view: View = VIEWS.some((v) => v.value === viewParam) ? (viewParam as View) : 'timeline';
  const weekStart = startOfWeek(asOf, atlas?.settings.core.weekStartsOn ?? 1);
  const weekPick = useWeekPick(weekStart);
  const model = useMemo(() => (atlas ? buildModel(atlas, asOf) : null), [atlas, asOf]);

  if (!atlas || !model) {
    return (
      <Screen title="Plan">
        <Header title="Plan" />
      </Screen>
    );
  }

  const phase = currentPhase(atlas, asOf);
  // "ends 31 January", as in the mockup: the year is only written when the end is more than a year away.
  const endsIn = phase ? daysBetween(asOf, phase.end) : 0;
  const ends = phase ? (endsIn < 365 ? longDate(phase.end).replace(/ \d{4}$/, '') : longDate(phase.end)) : '';
  const sub = phase ? 'Year ' + phase.year + ' · ' + phase.title + ' · ends ' + ends : 'The five years are done';
  const weekly = weeklyBuildFor(phase, weekPick?.projectId, { seed: atlas.seed, states: atlas.states });
  const weeklyProject = weekly ? (atlas.seed.projects.find((p) => p.id === weekly.refId) ?? null) : null;

  const [lanePhaseId, laneBlock] = laneParam ? (laneParam.split('.') as [string, BlockId]) : [null, null];
  const laneModel = lanePhaseId ? model.find((m) => m.phase.id === lanePhaseId) : undefined;
  const lane = laneModel?.progress.lanes.find((l) => l.block === laneBlock) ?? null;
  const openItem = (id: string): void => setItem(id, { replace: false });

  return (
    <Screen title="Plan">
      <Header title="Plan" sub={sub} />
      <div className="mt-5">
        <SegmentedControl label="View" value={view} onChange={(v) => setView(v === 'timeline' ? null : v)} options={VIEWS} />
      </div>

      {view === 'timeline' && (
        <Timeline
          atlas={atlas}
          model={model}
          currentId={phase?.id ?? null}
          units={units}
          weekly={weekly ? nameOf(weekly) : null}
          onLane={(phaseId, block) => setLane(phaseId + '.' + block, { replace: false })}
          onReplan={() => setReplanOpen(true)}
        />
      )}
      {view !== 'timeline' && (
        <div className="mt-6">
          {view === 'projects' && <ProjectsView atlas={atlas} phase={phase} weekly={weeklyProject} onOpenItem={openItem} />}
          {view === 'papers' && paperStates && <PapersView atlas={atlas} states={paperStates} />}
          {view === 'credentials' && certStates && milestoneStates && <CredentialsView atlas={atlas} certStates={certStates} milestoneStates={milestoneStates} onOpenItem={openItem} />}
        </div>
      )}

      <LaneSheet atlas={atlas} phase={laneModel?.phase ?? null} lane={itemParam ? null : lane} units={units} onClose={() => setLane(null)} onOpenItem={openItem} />
      <ItemSheet atlas={atlas} id={itemParam} onClose={() => setItem(null)} />
      <ReplanSheet open={replanOpen} onClose={() => setReplanOpen(false)} seed={atlas.seed} settings={atlas.settings} states={atlas.states} asOf={asOf} />
    </Screen>
  );
}
