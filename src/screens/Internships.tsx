import { useState } from 'react';
import { setGateDone, setProjectProgress, setProjectStatus, setRating, setResumeDone, setTargetStatus, useInternProgress } from '../db/internships.ts';
import { usePaperStates } from '../db/state.ts';
import { useAtlas, useLibrary } from '../hooks/useAtlas.ts';
import { useInternships } from '../hooks/useInternships.ts';
import { today as todayDate } from '../lib/dates.ts';
import {
  currentPhase, cycleStatus, daysToApply, fitLabel, gateDone, gateProgress, linkedStatusLabel, nextApplication, orderedPhases, orderedProjects, orderedTargets, phaseAfter,
  phaseLabel, phaseSpan, projectProgress, projectStatus, projectStatusLabel, ratingLabel, readyCount, resolveResources, roleName, targetClosed, targetStatus, targetStatusLabel, weekLabel,
} from '../lib/internships.ts';
import type { InternProgress, Rating } from '../lib/internships.ts';
import { useQueryParam } from '../router/router.tsx';
import type { InternProject, InternshipGoal, Target } from '../seed/internships.ts';
import { Button } from '../ui/Button.tsx';
import { Chips } from '../ui/Chips.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Header } from '../ui/Header.tsx';
import { ScenePanel } from '../ui/ScenePanel.tsx';
import { ProgressLine } from '../ui/ProgressLine.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import { ItemSheet } from './parts/ItemSheet.tsx';
import { plural } from './parts/text.ts';
import type { Atlas } from '../hooks/useAtlas.ts';

type Tab = 'targets' | 'roadmap' | 'projects' | 'prep';
const TABS: { value: Tab; label: string }[] = [
  { value: 'targets', label: 'Targets' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'projects', label: 'Projects' },
  { value: 'prep', label: 'Prep' },
];

interface GoalProps {
  goal: InternshipGoal;
  progress: InternProgress;
  today: string;
}

/* ------------------------------------------------------------------ Targets */

function Targets({ goal, progress, today, atlas, onRoadmap }: GoalProps & { atlas: Atlas; onRoadmap: (phaseId: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const next = nextApplication(goal, progress, today);
  const phase = currentPhase(goal, progress, today);
  const gate = gateProgress(phase, progress);
  const targets = orderedTargets(goal);
  const waves = new Set(targets.map((t) => t.wave)).size;
  const projectTitle = (id: string): string => goal.projects.find((p) => p.id === id)?.title ?? id.replace(/-/g, ' ');
  const firstOpenSource = goal.open_source.find((o) => o.target);
  return (
    <>
      <section aria-labelledby="intern-next" className="tile mt-6 flex flex-col gap-2 overflow-hidden p-[18px]">
        {/* The countdown (ATLAS-DAILY-SCENES): the days to the next application over the scene, on its fade. */}
        {next && (
          <ScenePanel
            slot="internships"
            aspect="8 / 3"
            focal="50% 35%"
            decorative
            bare
            className="-mx-[18px] -mt-[18px] mb-1 rounded-t-[24px]"
            bottom={
              <p className="flex items-baseline gap-2">
                <span className="text-[2.5rem] font-semibold leading-none text-blue-deep">{Math.max(0, next.days)}</span>
                <span className="text-body font-medium">{(next.days === 1 ? 'day' : 'days') + ' to the next application'}</span>
              </p>
            }
          />
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="section-label mb-0">Next application</p>
          {next && <span className="text-meta text-ink2">{'wave ' + next.target.wave + ' of ' + waves + ' · ' + daysToApply(next.days) + ' · ' + next.target.apply.label}</span>}
        </div>
        {next ? (
          <>
            <h2 id="intern-next" className="text-card font-semibold leading-tight">
              {next.target.title}
            </h2>
            <p className="text-meta text-ink2">{next.target.location + ' · ' + next.target.req + ' · ' + next.target.degree}</p>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="text-body font-medium">Gate to apply</span>
              <span className="text-meta text-ink2 tabular-nums">{gate.done + ' of ' + gate.total + ' done'}</span>
            </div>
            <ProgressLine value={gate.total ? gate.done / gate.total : 0} label={'Gate to apply: ' + gate.done + ' of ' + gate.total + ' done'} />
            <Button variant="filled" icon="plan" className="mt-2 w-full" onClick={() => onRoadmap(phase.id)}>
              Open roadmap
            </Button>
          </>
        ) : (
          <h2 id="intern-next" className="text-body font-medium">
            Every dated application is in, or its date has passed.
          </h2>
        )}
      </section>

      <RowList label="Targets" className="mt-4" aside="apply in this order">
        {targets.map((t) => {
          const status = targetStatus(t, progress);
          const expanded = open === t.id;
          return (
            <Row
              key={t.id}
              title={t.title}
              meta={'Wave ' + t.wave + ' · ' + t.location + ' · ' + t.apply.label + ' · ' + targetStatusLabel(status)}
              metaWraps
              trailing={<span className={t.fit === 'strong' ? 'font-semibold text-blue-deep' : t.fit === 'stretch' ? 'font-semibold text-ice-deep' : undefined}>{fitLabel(t.fit)}</span>}
              expanded={expanded}
              onClick={() => setOpen(expanded ? null : t.id)}
            >
              {expanded && <TargetDetail goal={goal} target={t} closed={targetClosed(t, progress)} projectTitle={projectTitle} />}
            </Row>
          );
        })}
      </RowList>

      <RowList label="Roadmap" className="mt-4" aside="gate before moving on">
        {orderedPhases(goal).map((p) => {
          const g = gateProgress(p, progress);
          const isNow = p.id === phase.id;
          return (
            <Row
              key={p.id}
              title={'Phase ' + p.n + ' · ' + p.name}
              meta={phaseSpan(p) + ' · gate ' + g.done + ' of ' + g.total}
              trailing={isNow ? <span className="font-semibold text-blue-deep">Now</span> : gateDone(p, progress) && g.total > 0 ? 'Done' : undefined}
              chevron
              onClick={() => onRoadmap(p.id)}
            />
          );
        })}
      </RowList>

      {goal.open_source.length > 0 && (
        <RowList label="Open source" className="mt-4" aside={firstOpenSource?.target}>
          {goal.open_source.map((o) => (
            <Row key={o.id} title={o.name} meta={o.plan} metaWraps {...(o.resource ? { to: linkTo(o.resource, goal, atlas), chevron: true } : {})} />
          ))}
        </RowList>
      )}
    </>
  );
}

function TargetDetail({ goal, target, closed, projectTitle }: { goal: InternshipGoal; target: Target; closed: boolean; projectTitle: (id: string) => string }) {
  return (
    <div className="flex flex-col gap-2 pb-3 pl-1 pr-1">
      <p className="text-meta">{target.fit_note}</p>
      <p className="text-meta text-ink2">{target.req + ' · ' + target.degree}</p>
      {target.evidence.length > 0 && (
        <p className="text-meta text-ink2">
          <span className="font-semibold text-ink">Evidence · </span>
          {target.evidence.map(projectTitle).join(' · ')}
        </p>
      )}
      <div>
        <Button size="sm" icon={closed ? 'undo' : 'check'} onClick={() => void setTargetStatus(goal.goal.id, target.id, closed ? target.status : 'applied')}>
          {closed ? 'Not applied yet' : 'Mark applied'}
        </Button>
      </div>
    </div>
  );
}

/** Where a library id opens: a resource's sheet over this screen, or the reading queue's sheet for a paper. */
function linkTo(id: string, goal: InternshipGoal, atlas: Atlas): string {
  if (atlas.seed.papers.some((p) => p.id === id)) return '/library?paper=' + encodeURIComponent(id);
  return '/internships?goal=' + goal.goal.id + '&item=' + encodeURIComponent(id);
}

/* ------------------------------------------------------------------ Roadmap */

function Roadmap({ goal, progress, today, atlas, phaseId, onPhase, onItem }: GoalProps & { atlas: Atlas; phaseId: string | null; onPhase: (id: string) => void; onItem: (id: string) => void }) {
  const paperStates = usePaperStates();
  const phases = orderedPhases(goal);
  const current = currentPhase(goal, progress, today);
  const phase = phases.find((p) => p.id === phaseId) ?? current;
  const before = phases[phases.findIndex((p) => p.id === phase.id) - 1];
  const locked = before !== undefined && !gateDone(before, progress) && before.gate.length > 0;
  const after = phaseAfter(goal, phase);
  const gate = gateProgress(phase, progress);
  const items = resolveResources(phase.resources, atlas.seed, atlas.states, paperStates);
  const schedule = goal.schedule;
  return (
    <>
      <div className="mt-6">
        <SegmentedControl label="Phase" value={phase.id} onChange={onPhase} options={phases.map((p) => ({ value: p.id, label: String(p.n) }))} />
      </div>
      <section aria-labelledby="intern-phase" className="tile mt-4 flex flex-col gap-1.5 p-[18px]">
        <h2 id="intern-phase" className="text-card font-semibold leading-tight">
          {'Phase ' + phase.n + ' · ' + phase.name}
        </h2>
        <p className="text-meta text-ink2">{phaseSpan(phase) + ' · ' + weekLabel(phase, today) + (phase.id === current.id ? ' · now' : '')}</p>
        {locked && <p className="text-meta text-ink">{'Locked until the gate to Phase ' + phase.n + ' is done (' + before.gate.filter((g) => progress.gates[g.id] !== true).length + ' left in Phase ' + before.n + '). Looking ahead is fine.'}</p>}
      </section>

      <RowList label={after ? 'Gate to Phase ' + after.n : 'Gate to apply'} className="mt-4" aside={gate.done + ' of ' + gate.total}>
        {phase.gate.map((g) => (
          <Row
            key={g.id}
            height={48}
            title={g.text}
            check={{ checked: progress.gates[g.id] === true, onChange: (checked) => void setGateDone(goal.goal.id, g.id, checked), label: g.text }}
          />
        ))}
        {phase.gate.length === 0 && <Row title="No gate: keep shipping." />}
        <li className="flex flex-col gap-2 pt-3">
          <ProgressLine value={gate.total ? gate.done / gate.total : 1} label={'Gate: ' + gate.done + ' of ' + gate.total + ' done'} />
          {after && <p className="text-meta text-ink2">{"Don't start Phase " + after.n + ' until every box is ticked.'}</p>}
        </li>
      </RowList>

      {phase.weeks.length > 0 && (
        <RowList label="Weeks" className="mt-4" aside={schedule ? schedule.block + ' block · ' + schedule.hours_per_day + ' h/day' : undefined}>
          {phase.weeks.map((w) => (
            <Row key={w.range} title={w.range === 'ongoing' ? 'Ongoing' : 'Weeks ' + w.range} meta={w.focus} metaWraps />
          ))}
        </RowList>
      )}

      {phase.resources.length > 0 && (
        <RowList label="From your library" className="mt-4" aside={plural(items.length, 'linked item')}>
          {items.map((item) =>
            item.to.startsWith('/library/') ? (
              <Row key={item.id} title={item.title} meta={item.kind + ' · ' + linkedStatusLabel(item.status)} chevron onClick={() => onItem(item.id)} />
            ) : (
              <Row key={item.id} title={item.title} meta={item.kind + ' · ' + linkedStatusLabel(item.status)} chevron to={item.to} />
            ),
          )}
        </RowList>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Projects */

function ProjectCard({ goal, project, progress }: { goal: InternshipGoal; project: InternProject; progress: InternProgress }) {
  const status = projectStatus(project, progress);
  const value = projectProgress(project, progress);
  const roles = project.roles.map((id) => goal.targets.find((t) => t.id === id)).filter((t): t is Target => Boolean(t));
  const knob = 'knob !size-11 shrink-0 rounded-knob text-ink';
  return (
    <section aria-labelledby={'intern-project-' + project.id} className="tile flex flex-col gap-2 p-[18px]">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="well grid size-10 shrink-0 place-items-center rounded-[12px] text-lead font-semibold text-blue-deep">
          {project.code}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={'intern-project-' + project.id} className="text-body font-semibold leading-tight">
            <span className="sr-only">{'Project ' + project.code + ': '}</span>
            {project.title}
          </h2>
          <p className="text-meta text-ink2">{[roles.map(roleName).join(', '), phaseLabel(goal, project.phase), project.duration].filter(Boolean).join(' · ')}</p>
        </div>
        <Button size="sm" className="shrink-0" name={'Status of project ' + project.code + ': ' + projectStatusLabel(status) + '. Tap for the next'} onClick={() => void setProjectStatus(goal.goal.id, project.id, cycleStatus(status))}>
          {projectStatusLabel(status)}
        </Button>
      </div>
      {status === 'building' && (
        <div className="flex items-center gap-2.5">
          <Button variant="icon" icon="minus" className={knob} label={'Project ' + project.code + ' progress down'} onClick={() => void setProjectProgress(goal.goal.id, project.id, value - 0.1)} />
          <div className="flex-1">
            <ProgressLine value={value} label={'Project ' + project.code + ' progress'} />
          </div>
          <span className="w-10 text-right text-meta text-ink2 tabular-nums">{Math.round(value * 100) + '%'}</span>
          <Button variant="icon" icon="plus" className={knob} label={'Project ' + project.code + ' progress up'} onClick={() => void setProjectProgress(goal.goal.id, project.id, value + 0.1)} />
        </div>
      )}
      <p className="text-meta">
        <span className="section-label mb-0 mr-1.5 inline">Proves</span>
        {project.proves}
      </p>
      <p className="text-meta">
        <span className="section-label mb-0 mr-1.5 inline">Done when</span>
        {project.done_when}
      </p>
      {project.note && <p className="text-meta text-ink2">{project.note}</p>}
    </section>
  );
}

function Projects({ goal, progress }: GoalProps) {
  return (
    <div className="mt-6 flex flex-col gap-4">
      {orderedProjects(goal).map((p) => (
        <ProjectCard key={p.id} goal={goal} project={p} progress={progress} />
      ))}
      <section aria-label="Rule for every repo" className="tile well-ice flex flex-col gap-1 p-[18px]">
        <h2 className="section-label mb-0">Rule for every repo</h2>
        <p className="text-body font-semibold">README answers how fast, compared to what, on which GPU.</p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Prep */

/** Three dots in one 44 px button: a tap moves the confidence on, from "Not yet" round to "Ready" and back. */
function RatingButton({ name, rating, onChange }: { name: string; rating: Rating; onChange: (r: Rating) => void }) {
  return (
    <button
      type="button"
      aria-label={'Confidence in ' + name + ': ' + ratingLabel(rating) + '. Tap for the next'}
      onClick={() => onChange(((rating + 1) % 4) as Rating)}
      className="press knob grid h-11 w-[72px] shrink-0 place-items-center rounded-knob"
    >
      <span aria-hidden="true" className="flex gap-1.5">
        {[1, 2, 3].map((n) => (
          <span key={n} className={'size-3 rounded-pill ' + (n <= rating ? 'fill-blue' : 'well')} />
        ))}
      </span>
    </button>
  );
}

function Prep({ goal, progress }: GoalProps) {
  const { ready, total } = readyCount(goal, progress);
  return (
    <>
      <RowList label="What the interviews cover" className="mt-6" aside={ready + ' of ' + total + ' ready'}>
        {goal.interview_areas.map((a) => (
          <Row
            key={a.id}
            title={a.name}
            meta={a.be_able_to}
            metaWraps
            action={<RatingButton name={a.name} rating={progress.ratings[a.id] ?? 0} onChange={(r) => void setRating(goal.goal.id, a.id, r)} />}
          />
        ))}
      </RowList>
      {goal.resume_checklist.length > 0 && (
        <RowList label="Resume" className="mt-4" aside={goal.resume_checklist.filter((_, i) => progress.resume[String(i)] === true).length + ' of ' + goal.resume_checklist.length}>
          {goal.resume_checklist.map((line, i) => (
            <Row key={line} height={48} title={line} check={{ checked: progress.resume[String(i)] === true, onChange: (checked) => void setResumeDone(goal.goal.id, i, checked), label: line }} />
          ))}
        </RowList>
      )}
      {goal.recruiter_questions.length > 0 && (
        <RowList label="Ask the recruiter" className="mt-4">
          {goal.recruiter_questions.map((q) => (
            <Row key={q} height={48} title={q} plainTitle />
          ))}
        </RowList>
      )}
      {goal.schedule && goal.schedule.guardrails.length > 0 && (
        <RowList label="Guardrails" className="mt-4" aside={goal.schedule.block + ' · ' + goal.schedule.hours_per_day + ' h/day'}>
          {goal.schedule.guardrails.map((g) => (
            <Row key={g} height={48} title={g} plainTitle />
          ))}
        </RowList>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ the screen */

/**
 * Internships (INTERNSHIPS): one goal at a time (a picker when data/ has more than one file) behind four tabs:
 * Targets (the next application and its gate, the roles in order, the phases, open source), Roadmap (a phase's gate
 * as checkboxes, its weeks, the library items it names), Projects (status and progress) and Prep (interview
 * confidence, the resume checklist, questions for the recruiter). Progress is the device's own (src/db/internships.ts).
 */
export function Internships() {
  const atlas = useAtlas();
  // The phases name resources of the Library's long tail: ask for it at once.
  useLibrary(true);
  const goals = useInternships();
  const [goalParam, setGoalParam] = useQueryParam('goal');
  const [tabParam, setTab] = useQueryParam('tab');
  const [phaseParam, setPhase] = useQueryParam('phase');
  const [itemParam, setItem] = useQueryParam('item');
  const goal = goals?.find((g) => g.goal.id === goalParam) ?? goals?.[0] ?? null;
  const progress = useInternProgress(goal?.goal.id ?? null);
  const today = todayDate();
  const tab: Tab = TABS.some((t) => t.value === tabParam) ? (tabParam as Tab) : 'targets';
  const back = <Button variant="icon" icon="chevronLeft" label="Back to Plan" to="/plan" />;

  if (!atlas || goals === null || (goal && !progress)) {
    return (
      <Screen title="Internships">
        <Header title="Internships" back={back} />
        <p className="pt-6 text-meta text-ink2" role="status">
          Loading…
        </p>
      </Screen>
    );
  }
  if (!goal || !progress) {
    return (
      <Screen title="Internships">
        <Header title="Internships" back={back} sub="No goal yet" />
        <EmptyState>No internship goal yet. Add one as data/internships.json and rebuild.</EmptyState>
      </Screen>
    );
  }
  const phases = orderedPhases(goal);
  const sub = goal.goal.title + ' · ' + plural(goal.targets.length, 'target') + ' · ' + plural(phases.length, 'phase');
  const openRoadmap = (phaseId: string): void => {
    setPhase(phaseId);
    setTab('roadmap', { replace: false });
    window.scrollTo({ top: 0 });
  };

  return (
    <Screen title="Internships">
      <Header title="Internships" back={back} sub={sub} />
      {goals.length > 1 && (
        <div className="mt-3">
          <Chips label="Goal" items={goals.map((g) => ({ key: g.goal.id, label: g.goal.title, pressed: g.goal.id === goal.goal.id, onClick: () => setGoalParam(g.goal.id === goals[0]!.goal.id ? null : g.goal.id) }))} />
        </div>
      )}
      <div className="mt-5">
        <SegmentedControl label="Section" value={tab} onChange={(v) => setTab(v === 'targets' ? null : v)} options={TABS} />
      </div>
      {tab === 'targets' && <Targets goal={goal} progress={progress} today={today} atlas={atlas} onRoadmap={openRoadmap} />}
      {tab === 'roadmap' && <Roadmap goal={goal} progress={progress} today={today} atlas={atlas} phaseId={phaseParam} onPhase={(id) => setPhase(id)} onItem={(id) => setItem(id, { replace: false })} />}
      {tab === 'projects' && <Projects goal={goal} progress={progress} today={today} />}
      {tab === 'prep' && <Prep goal={goal} progress={progress} today={today} />}
      <ItemSheet atlas={atlas} id={itemParam} onClose={() => setItem(null)} />
    </Screen>
  );
}
